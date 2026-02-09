import { Server as HttpServer, createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Типы событий
interface GameRoom {
  gameId: string;
  code: string;
  hostSocketId: string;
  players: Map<string, { userId: string; name: string; socketId: string }>;
}

// Хранилище активных комнат (в памяти)
const activeRooms = new Map<string, GameRoom>();

export function createSocketServer(httpServer?: HttpServer) {
  const server = httpServer || createServer();

  const io = new SocketServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Подключение: ${socket.id}`);

    // =============================================
    // Создание комнаты (хост)
    // =============================================
    socket.on("create_game", async (data: { gameId: string; code: string; userId: string; name: string }) => {
      const { gameId, code, userId, name } = data;
      const roomKey = code;

      // Создаём комнату
      const room: GameRoom = {
        gameId,
        code,
        hostSocketId: socket.id,
        players: new Map(),
      };
      room.players.set(userId, { userId, name, socketId: socket.id });

      activeRooms.set(roomKey, room);
      socket.join(roomKey);

      console.log(`🏠 Комната создана: ${code} хостом ${name}`);

      socket.emit("game_created", {
        gameId,
        code,
        players: [{ userId, name }],
      });
    });

    // =============================================
    // Подключение игрока
    // =============================================
    socket.on("join_game", async (data: { code: string; userId: string; name: string }) => {
      const { code, userId, name } = data;
      const room = activeRooms.get(code);

      if (!room) {
        socket.emit("error", { message: "Комната не найдена" });
        return;
      }

      if (room.players.size >= 99) {
        socket.emit("error", { message: "Комната заполнена" });
        return;
      }

      // Добавляем игрока
      room.players.set(userId, { userId, name, socketId: socket.id });
      socket.join(code);

      const playersList = Array.from(room.players.values()).map((p) => ({
        userId: p.userId,
        name: p.name,
      }));

      console.log(`👤 ${name} присоединился к ${code} (${room.players.size} игроков)`);

      // Уведомляем всех в комнате
      io.to(code).emit("player_joined", {
        player: { userId, name },
        players: playersList,
        count: room.players.size,
      });

      // Подтверждение игроку
      socket.emit("joined_game", {
        gameId: room.gameId,
        code,
        players: playersList,
      });
    });

    // =============================================
    // Старт игры (только хост)
    // =============================================
    socket.on("start_game", async (data: { code: string }) => {
      const { code } = data;
      const room = activeRooms.get(code);

      if (!room) {
        socket.emit("error", { message: "Комната не найдена" });
        return;
      }

      if (socket.id !== room.hostSocketId) {
        socket.emit("error", { message: "Только хост может начать игру" });
        return;
      }

      if (room.players.size < 1) {
        socket.emit("error", { message: "Недостаточно игроков" });
        return;
      }

      try {
        // Обновляем статус игры в БД
        await prisma.gameSession.update({
          where: { id: room.gameId },
          data: { status: "PLAYING", currentRound: 1 },
        });

        // Получаем вопросы
        const game = await prisma.gameSession.findUnique({
          where: { id: room.gameId },
        });

        if (!game) return;

        const questions = await prisma.question.findMany({
          include: {
            answers: {
              select: { id: true, text: true },  // НЕ отправляем isCorrect!
            },
            category: { select: { name: true, icon: true } },
          },
          take: game.totalRounds,
          orderBy: { createdAt: "asc" },
        });

        console.log(`🚀 Игра ${code} началась! ${room.players.size} игроков, ${questions.length} вопросов`);

        // Уведомляем всех о старте
        io.to(code).emit("game_started", {
          totalRounds: questions.length,
          playersCount: room.players.size,
        });

        // Отправляем первый вопрос с задержкой
        setTimeout(() => {
          if (questions.length > 0) {
            const question = questions[0];
            io.to(code).emit("new_question", {
              round: 1,
              totalRounds: questions.length,
              question: {
                id: question.id,
                text: question.text,
                imageUrl: question.imageUrl,
                difficulty: question.difficulty,
                timeLimit: question.timeLimit,
                category: question.category,
                answers: question.answers,
              },
            });
          }
        }, 3000); // 3 сек на подготовку

      } catch (error) {
        console.error("Ошибка старта игры:", error);
        socket.emit("error", { message: "Ошибка при запуске игры" });
      }
    });

    // =============================================
    // Отключение игрока
    // =============================================
    socket.on("disconnect", () => {
      console.log(`❌ Отключение: ${socket.id}`);

      // Удаляем игрока из всех комнат
      for (const [code, room] of activeRooms) {
        for (const [userId, player] of room.players) {
          if (player.socketId === socket.id) {
            room.players.delete(userId);

            const playersList = Array.from(room.players.values()).map((p) => ({
              userId: p.userId,
              name: p.name,
            }));

            io.to(code).emit("player_left", {
              player: { userId, name: player.name },
              players: playersList,
              count: room.players.size,
            });

            console.log(`👤 ${player.name} покинул ${code} (${room.players.size} игроков)`);

            // Если хост отключился — уведомляем всех
            if (socket.id === room.hostSocketId) {
              io.to(code).emit("host_disconnected", {
                message: "Хост отключился. Игра отменена.",
              });
              activeRooms.delete(code);
              console.log(`🏠 Комната ${code} удалена (хост отключился)`);
            }

            // Если комната пустая — удаляем
            if (room.players.size === 0) {
              activeRooms.delete(code);
              console.log(`🏠 Комната ${code} удалена (пустая)`);
            }

            break;
          }
        }
      }
    });
  });

  return { io, server };
}

// === Запуск как отдельный сервер ===
if (require.main === module) {
  const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);
  const { server } = createSocketServer();

  server.listen(PORT, () => {
    console.log(`\n🍷 Socket.io сервер запущен на порту ${PORT}\n`);
  });
}
