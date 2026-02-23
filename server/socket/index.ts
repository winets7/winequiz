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
  currentRound: number;
  totalRounds: number;
  currentRoundId: string | null;
  /** Лобби открыто: игроки могут присоединяться, хост может запускать раунды */
  lobbyOpen: boolean;
  /** Игра завершена: присоединение и ответы на раунды невозможны */
  gameEnded: boolean;
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

      // Проверяем, есть ли уже комната (при рекреации после рестарта)
      const existingRoom = activeRooms.get(roomKey);
      if (existingRoom) {
        // Обратная совместимость: могли быть созданы до добавления lobbyOpen/gameEnded
        if (existingRoom.lobbyOpen === undefined) existingRoom.lobbyOpen = false;
        if (existingRoom.gameEnded === undefined) existingRoom.gameEnded = false;

        // Обновляем hostSocketId и добавляем хоста обратно
        existingRoom.hostSocketId = socket.id;
        existingRoom.players.set(userId, { userId, name, socketId: socket.id });
        socket.join(roomKey);

        const playersList = Array.from(existingRoom.players.values()).map((p) => ({
          userId: p.userId,
          name: p.name,
        }));

        console.log(`🔄 Хост ${name} переподключился к ${code}`);

        // Получаем актуальный статус игры из БД
        const gameFromDb = await prisma.gameSession.findUnique({
          where: { id: gameId },
          select: { status: true, currentRound: true, totalRounds: true },
        });

        socket.emit("game_created", {
          gameId,
          code,
          players: playersList,
          status: gameFromDb?.status || "WAITING",
          currentRound: existingRoom.currentRound,
          currentRoundId: existingRoom.currentRoundId,
          totalRounds: existingRoom.totalRounds,
          lobbyOpen: existingRoom.lobbyOpen,
          gameEnded: existingRoom.gameEnded,
        });

        // Если игра идёт — восстанавливаем состояние хоста
        if (gameFromDb?.status === "PLAYING") {
          socket.emit("game_started", {
            totalRounds: existingRoom.totalRounds,
            playersCount: existingRoom.players.size,
          });

          // Если есть активный раунд — сообщаем хосту
          if (existingRoom.currentRoundId) {
            socket.emit("round_started", {
              roundNumber: existingRoom.currentRound,
              roundId: existingRoom.currentRoundId,
              totalRounds: existingRoom.totalRounds,
            });
            console.log(`📢 Хосту ${name} восстановлен активный раунд ${existingRoom.currentRound}`);
          } else {
            // Пробуем найти активный раунд из БД
            try {
              const activeRound = await prisma.round.findFirst({
                where: { gameId, status: "ACTIVE" },
                select: { id: true, roundNumber: true },
              });
              if (activeRound) {
                existingRoom.currentRoundId = activeRound.id;
                existingRoom.currentRound = activeRound.roundNumber;
                socket.emit("round_started", {
                  roundNumber: activeRound.roundNumber,
                  roundId: activeRound.id,
                  totalRounds: existingRoom.totalRounds,
                });
                console.log(`📢 Хосту ${name} восстановлен активный раунд ${activeRound.roundNumber} (из БД)`);
              }
            } catch (err) {
              console.error("Ошибка поиска активного раунда для хоста:", err);
            }
          }
        }

        // Если раунд активен — отправляем хосту текущий счётчик ответов
        if (existingRoom.currentRoundId) {
          try {
            const guessCount = await prisma.playerGuess.count({
              where: { roundId: existingRoom.currentRoundId },
            });
            socket.emit("guess_update", {
              roundId: existingRoom.currentRoundId,
              guessCount,
              totalPlayers: existingRoom.players.size,
              playerName: null,
            });
          } catch (err) {
            console.error("Ошибка получения счётчика ответов:", err);
          }
        }

        // Сообщаем игрокам, что хост вернулся
        io.to(roomKey).emit("host_reconnected", {
          message: "Хост вернулся!",
        });

        return;
      }

      // Получаем данные из БД
      const game = await prisma.gameSession.findUnique({
        where: { id: gameId },
      });

      // Создаём комнату
      const room: GameRoom = {
        gameId,
        code,
        hostSocketId: socket.id,
        players: new Map(),
        currentRound: game?.currentRound || 0,
        totalRounds: game?.totalRounds || 0,
        currentRoundId: null,
        lobbyOpen: false,
        gameEnded: false,
      };
      room.players.set(userId, { userId, name, socketId: socket.id });

      activeRooms.set(roomKey, room);
      socket.join(roomKey);

      console.log(`🏠 Комната создана: ${code} хостом ${name}`);

      socket.emit("game_created", {
        gameId,
        code,
        players: [{ userId, name }],
        lobbyOpen: room.lobbyOpen,
        gameEnded: room.gameEnded,
      });
    });

    // =============================================
    // Подключение игрока
    // =============================================
    socket.on("join_game", async (data: { code: string; userId: string; name: string }) => {
      const { code, userId, name } = data;
      let room = activeRooms.get(code);

      // Если комната не найдена в памяти — пробуем восстановить из БД
      if (!room) {
        try {
          const game = await prisma.gameSession.findUnique({
            where: { code },
            select: { id: true, status: true, totalRounds: true, currentRound: true, hostId: true },
          });

          if (!game) {
            socket.emit("error", { message: "Комната не найдена" });
            return;
          }

          if (game.status === "FINISHED") {
            socket.emit("error", { message: "Игра уже завершена" });
            return;
          }

          // Восстанавливаем комнату из БД
          const isHost = game.hostId === userId;

          // Ищем активный раунд
          let activeRoundId: string | null = null;
          let activeRoundNumber = game.currentRound || 0;
          try {
            const activeRound = await prisma.round.findFirst({
              where: { gameId: game.id, status: "ACTIVE" },
              select: { id: true, roundNumber: true },
            });
            if (activeRound) {
              activeRoundId = activeRound.id;
              activeRoundNumber = activeRound.roundNumber;
            }
          } catch (err) {
            console.error("Ошибка поиска активного раунда при восстановлении:", err);
          }

          // Восстанавливаем lobbyOpen/gameEnded по раундам (храним только в памяти)
          let lobbyOpen = false;
          let gameEnded = false;
          try {
            const roundsList = await prisma.round.findMany({
              where: { gameId: game.id },
              select: { status: true },
            });
            const totalRounds = game.totalRounds || 0;
            if (roundsList.length === totalRounds && roundsList.every((r) => r.status === "CLOSED")) {
              lobbyOpen = true;
              gameEnded = true;
            } else if (roundsList.some((r) => r.status === "ACTIVE" || r.status === "CLOSED")) {
              lobbyOpen = true;
            }
          } catch (err) {
            console.error("Ошибка проверки раундов при восстановлении комнаты:", err);
          }

          room = {
            gameId: game.id,
            code,
            hostSocketId: isHost ? socket.id : "",
            players: new Map(),
            currentRound: activeRoundNumber,
            totalRounds: game.totalRounds,
            currentRoundId: activeRoundId,
            lobbyOpen,
            gameEnded,
          };
          activeRooms.set(code, room);
          console.log(`🔄 Комната ${code} восстановлена из БД (статус: ${game.status}, раунд: ${activeRoundNumber}, lobbyOpen: ${lobbyOpen}, gameEnded: ${gameEnded})`);
        } catch (err) {
          console.error("Ошибка восстановления комнаты:", err);
          socket.emit("error", { message: "Ошибка подключения к комнате" });
          return;
        }
      }

      if (room.gameEnded) {
        socket.emit("error", { message: "Игра завершена" });
        return;
      }

      const gameForHost = await prisma.gameSession.findUnique({
        where: { id: room.gameId },
        select: { hostId: true, status: true },
      });
      const isHostJoining = gameForHost?.hostId === userId;
      if (!room.lobbyOpen && !isHostJoining) {
        socket.emit("error", { message: "Ожидайте, пока хост начнёт игру" });
        return;
      }

      if (room.players.size >= 99) {
        socket.emit("error", { message: "Комната заполнена" });
        return;
      }

      // Если это хост — обновляем его socketId
      if (gameForHost?.hostId === userId) {
        room.hostSocketId = socket.id;
      }

      // Добавляем или обновляем игрока (переподключение)
      const existingPlayer = room.players.get(userId);
      room.players.set(userId, { userId, name, socketId: socket.id });
      socket.join(code);

      const playersList = Array.from(room.players.values()).map((p) => ({
        userId: p.userId,
        name: p.name,
      }));

      if (existingPlayer) {
        console.log(`🔄 ${name} переподключился к ${code} (${room.players.size} игроков)`);
      } else {
        console.log(`👤 ${name} присоединился к ${code} (${room.players.size} игроков)`);
      }

      // Уведомляем всех в комнате
      io.to(code).emit("player_joined", {
        player: { userId, name },
        players: playersList,
        count: room.players.size,
      });

      const gameStatus = gameForHost?.status || "WAITING";

      // Подтверждение игроку
      socket.emit("joined_game", {
        gameId: room.gameId,
        code,
        players: playersList,
        status: gameStatus,
      });

      // Если игра уже идёт — сразу уведомляем игрока
      if (gameStatus === "PLAYING") {
        socket.emit("game_started", {
          totalRounds: room.totalRounds,
          playersCount: room.players.size,
        });

        // Если раунд уже активен — отправляем round_started
        if (room.currentRoundId) {
          socket.emit("round_started", {
            roundNumber: room.currentRound,
            roundId: room.currentRoundId,
            totalRounds: room.totalRounds,
          });
          console.log(`📢 Игроку ${name} отправлен активный раунд ${room.currentRound}`);
        } else {
          // Пробуем найти активный раунд из БД
          try {
            const activeRound = await prisma.round.findFirst({
              where: { gameId: room.gameId, status: "ACTIVE" },
              select: { id: true, roundNumber: true },
            });
            if (activeRound) {
              room.currentRoundId = activeRound.id;
              room.currentRound = activeRound.roundNumber;
              socket.emit("round_started", {
                roundNumber: activeRound.roundNumber,
                roundId: activeRound.id,
                totalRounds: room.totalRounds,
              });
              console.log(`📢 Игроку ${name} отправлен активный раунд ${activeRound.roundNumber} (из БД)`);
            }
          } catch (err) {
            console.error("Ошибка поиска активного раунда:", err);
          }
        }
      }
    });

    // =============================================
    // Открыть лобби (только хост): игроки могут присоединяться, доступны кнопки раундов
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

      if (room.gameEnded) {
        socket.emit("error", { message: "Игра уже завершена" });
        return;
      }

      room.lobbyOpen = true;

      try {
        await prisma.gameSession.update({
          where: { id: room.gameId },
          data: { status: "PLAYING" },
        });
      } catch (err) {
        console.error("Ошибка обновления статуса игры:", err);
        socket.emit("error", { message: "Не удалось сохранить статус игры" });
        return;
      }

      console.log(`🚀 Лобби ${code} открыто, игроки могут присоединяться`);

      io.to(code).emit("lobby_opened", {});
    });

    // =============================================
    // Завершить игру (только хост): присоединение и ответы на раунды невозможны
    // =============================================
    socket.on("finish_game", async (data: { code: string }) => {
      const { code } = data;
      const room = activeRooms.get(code);

      if (!room) {
        socket.emit("error", { message: "Комната не найдена" });
        return;
      }

      if (socket.id !== room.hostSocketId) {
        socket.emit("error", { message: "Только хост может завершить игру" });
        return;
      }

      const rounds = await prisma.round.findMany({
        where: { gameId: room.gameId },
        select: { status: true },
      });
      const totalRounds = room.totalRounds || 0;
      const allClosed = rounds.length === totalRounds && rounds.every((r) => r.status === "CLOSED");

      if (!allClosed) {
        socket.emit("error", { message: "Завершите все раунды, чтобы завершить игру" });
        return;
      }

      room.gameEnded = true;
      console.log(`🏁 Игра ${code} завершена`);

      io.to(code).emit("game_finished", {});
    });

    // =============================================
    // Хост активирует раунд (раунд уже создан через REST API)
    // =============================================
    socket.on("activate_round", async (data: {
      code: string;
      roundId: string;
      roundNumber: number;
    }) => {
      const { code, roundId, roundNumber } = data;
      const room = activeRooms.get(code);

      if (!room) {
        socket.emit("error", { message: "Комната не найдена" });
        return;
      }

      if (socket.id !== room.hostSocketId) {
        socket.emit("error", { message: "Только хост может активировать раунд" });
        return;
      }

      if (!room.lobbyOpen || room.gameEnded) {
        socket.emit("error", { message: "Сначала начните игру" });
        return;
      }

      room.currentRound = roundNumber;
      room.currentRoundId = roundId;

      // Обновляем статус раунда и текущий раунд в БД
      try {
        await prisma.round.update({
          where: { id: roundId },
          data: { status: "ACTIVE" },
        });
        await prisma.gameSession.update({
          where: { id: room.gameId },
          data: { currentRound: roundNumber },
        });
      } catch (err) {
        console.error("Ошибка обновления статуса раунда:", err);
      }

      console.log(`🍷 Раунд ${roundNumber} активирован в игре ${code}`);

      // Уведомляем всех участников (БЕЗ правильных ответов и фото!)
      io.to(code).emit("round_started", {
        roundNumber,
        roundId,
        totalRounds: room.totalRounds,
      });
    });

    // =============================================
    // Участник отправляет догадку
    // =============================================
    socket.on("submit_guess", async (data: {
      code: string;
      roundId: string;
      userId: string;
      guess: {
        grapeVarieties: string[];
        sweetness: string;
        vintageYear: number;
        country: string;
        alcoholContent: number;
        isOakAged: boolean;
        color: string;
        composition: string;
      };
    }) => {
      const { code, roundId, userId, guess } = data;
      const room = activeRooms.get(code);

      if (!room) {
        socket.emit("error", { message: "Комната не найдена" });
        return;
      }

      if (room.gameEnded) {
        socket.emit("error", { message: "Игра завершена" });
        return;
      }

      try {
        // Находим gamePlayer
        const gamePlayer = await prisma.gamePlayer.findUnique({
          where: { gameId_userId: { gameId: room.gameId, userId: userId } },
        });

        if (!gamePlayer) {
          socket.emit("error", { message: "Игрок не найден в этой игре" });
          return;
        }

        // Сохраняем догадку
        await prisma.playerGuess.upsert({
          where: {
            roundId_gamePlayerId: { roundId, gamePlayerId: gamePlayer.id },
          },
          update: {
            grapeVarieties: guess.grapeVarieties,
            sweetness: guess.sweetness as "DRY" | "SEMI_DRY" | "SEMI_SWEET" | "SWEET",
            vintageYear: guess.vintageYear,
            country: guess.country,
            alcoholContent: guess.alcoholContent,
            isOakAged: guess.isOakAged,
            color: guess.color as "RED" | "WHITE" | "ROSE" | "ORANGE",
            composition: guess.composition as "MONO" | "BLEND",
          },
          create: {
            roundId,
            gamePlayerId: gamePlayer.id,
            grapeVarieties: guess.grapeVarieties,
            sweetness: guess.sweetness as "DRY" | "SEMI_DRY" | "SEMI_SWEET" | "SWEET",
            vintageYear: guess.vintageYear,
            country: guess.country,
            alcoholContent: guess.alcoholContent,
            isOakAged: guess.isOakAged,
            color: guess.color as "RED" | "WHITE" | "ROSE" | "ORANGE",
            composition: guess.composition as "MONO" | "BLEND",
          },
        });

        const player = room.players.get(userId);
        console.log(`🎯 ${player?.name || userId} отправил догадку в раунде ${room.currentRound}`);

        // Подтверждение участнику
        socket.emit("guess_received", { roundId });

        // Уведомляем хоста о полученных ответах
        const guessCount = await prisma.playerGuess.count({
          where: { roundId },
        });

        io.to(room.hostSocketId).emit("guess_update", {
          roundId,
          guessCount,
          totalPlayers: room.players.size,
          playerName: player?.name,
        });
      } catch (error) {
        console.error("Ошибка сохранения догадки:", error);
        socket.emit("error", { message: "Ошибка при сохранении догадки" });
      }
    });

    // =============================================
    // Хост закрывает раунд — подсчёт баллов
    // =============================================
    socket.on("close_round", async (data: { code: string; roundId: string }) => {
      const { code, roundId } = data;
      const room = activeRooms.get(code);

      if (!room) {
        socket.emit("error", { message: "Комната не найдена" });
        return;
      }

      if (socket.id !== room.hostSocketId) {
        socket.emit("error", { message: "Только хост может закрыть раунд" });
        return;
      }

      try {
        // Получаем раунд с правильными ответами и фотографиями
        const round = await prisma.round.findUnique({
          where: { id: roundId },
          include: {
            photos: { orderBy: { sortOrder: "asc" } },
            guesses: {
              include: {
                gamePlayer: {
                  include: { user: { select: { id: true, name: true } } },
                },
              },
            },
          },
        });

        if (!round) {
          socket.emit("error", { message: "Раунд не найден" });
          return;
        }

        // Подсчитываем баллы для каждого участника
        const results = [];
        for (const guess of round.guesses) {
          let score = 0;

          // Цвет вина — 2 балла
          if (guess.color === round.color) score += 2;

          // Сладость — 2 балла
          if (guess.sweetness === round.sweetness) score += 2;

          // Состав (бленд/моно) — 1 балл
          if (guess.composition === round.composition) score += 1;

          // Выдержка в бочке — 1 балл
          if (guess.isOakAged === round.isOakAged) score += 1;

          // Страна — 2 балла
          if (guess.country && round.country &&
              guess.country.toLowerCase().trim() === round.country.toLowerCase().trim()) {
            score += 2;
          }

          // Год урожая — 3 балла (точно), 1 балл (±2 года)
          if (guess.vintageYear && round.vintageYear) {
            const diff = Math.abs(guess.vintageYear - round.vintageYear);
            if (diff === 0) score += 3;
            else if (diff <= 2) score += 1;
          }

          // Крепость — 3 балла (точно ±0.5), 1 балл (±1.5)
          if (guess.alcoholContent != null && round.alcoholContent != null) {
            const diff = Math.abs(guess.alcoholContent - round.alcoholContent);
            if (diff <= 0.5) score += 3;
            else if (diff <= 1.5) score += 1;
          }

          // Сорта винограда — 2 балла за каждый угаданный
          if (guess.grapeVarieties.length > 0 && round.grapeVarieties.length > 0) {
            const correctGrapes = round.grapeVarieties.map((g) => g.toLowerCase().trim());
            for (const grape of guess.grapeVarieties) {
              if (correctGrapes.includes(grape.toLowerCase().trim())) {
                score += 2;
              }
            }
          }

          // Обновляем баллы в БД
          await prisma.playerGuess.update({
            where: { id: guess.id },
            data: { score },
          });

          // Обновляем общий счёт игрока
          await prisma.gamePlayer.update({
            where: { id: guess.gamePlayerId },
            data: { score: { increment: score } },
          });

          results.push({
            userId: guess.gamePlayer.user.id,
            name: guess.gamePlayer.user.name,
            guess: {
              grapeVarieties: guess.grapeVarieties,
              sweetness: guess.sweetness,
              vintageYear: guess.vintageYear,
              country: guess.country,
              alcoholContent: guess.alcoholContent,
              isOakAged: guess.isOakAged,
              color: guess.color,
              composition: guess.composition,
            },
            score,
          });
        }

        // Закрываем раунд
        await prisma.round.update({
          where: { id: roundId },
          data: { status: "CLOSED", closedAt: new Date() },
        });

        // Сбрасываем активный раунд в комнате (раунд завершён)
        room.currentRoundId = null;

        // Сортируем по баллам
        results.sort((a, b) => b.score - a.score);

        console.log(`📊 Раунд ${room.currentRound} закрыт в игре ${code}`);

        // Отправляем результаты ВСЕМ (включая фото и правильные ответы)
        io.to(code).emit("round_results", {
          roundNumber: room.currentRound,
          totalRounds: room.totalRounds,
          correctAnswer: {
            grapeVarieties: round.grapeVarieties,
            sweetness: round.sweetness,
            vintageYear: round.vintageYear,
            country: round.country,
            alcoholContent: round.alcoholContent,
            isOakAged: round.isOakAged,
            color: round.color,
            composition: round.composition,
          },
          photos: round.photos.map((p) => p.imageUrl),
          results,
        });
      } catch (error) {
        console.error("Ошибка закрытия раунда:", error);
        socket.emit("error", { message: "Ошибка при закрытии раунда" });
      }
    });

    // =============================================
    // Хост завершает игру
    // =============================================
    socket.on("finish_game", async (data: { code: string }) => {
      const { code } = data;
      const room = activeRooms.get(code);

      if (!room) {
        socket.emit("error", { message: "Комната не найдена" });
        return;
      }

      if (socket.id !== room.hostSocketId) {
        socket.emit("error", { message: "Только хост может завершить игру" });
        return;
      }

      try {
        // Получаем финальный рейтинг
        const players = await prisma.gamePlayer.findMany({
          where: { gameId: room.gameId },
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { score: "desc" },
        });

        // Устанавливаем позиции
        for (let i = 0; i < players.length; i++) {
          await prisma.gamePlayer.update({
            where: { id: players[i].id },
            data: { position: i + 1 },
          });
        }

        // Завершаем игру
        await prisma.gameSession.update({
          where: { id: room.gameId },
          data: { status: "FINISHED", finishedAt: new Date() },
        });

        const rankings = players.map((p, i) => ({
          position: i + 1,
          userId: p.user.id,
          name: p.user.name,
          avatar: p.user.avatar,
          score: p.score,
        }));

        console.log(`🏁 Игра ${code} завершена!`);

        io.to(code).emit("game_finished", { rankings });

        // Удаляем комнату из памяти
        activeRooms.delete(code);
      } catch (error) {
        console.error("Ошибка завершения игры:", error);
        socket.emit("error", { message: "Ошибка при завершении игры" });
      }
    });

    // =============================================
    // Отключение игрока
    // =============================================
    socket.on("disconnect", () => {
      console.log(`❌ Отключение: ${socket.id}`);

      for (const [code, room] of activeRooms) {
        for (const [userId, player] of room.players) {
          if (player.socketId === socket.id) {
            const isHost = socket.id === room.hostSocketId;

            if (isHost) {
              // Хост отключился — НЕ удаляем комнату, просто помечаем
              // Хост может переподключиться (обновление страницы, потеря связи)
              room.hostSocketId = "";
              console.log(`👑 Хост ${player.name} временно отключился от ${code}`);

              // Уведомляем игроков, что хост временно офлайн
              io.to(code).emit("host_temporarily_disconnected", {
                message: "Хост временно отключился. Ожидайте переподключения...",
              });
            } else {
              // Обычный игрок — НЕ удаляем из комнаты, помечаем как офлайн
              // Он может вернуться (обновление страницы)
              player.socketId = "";
              console.log(`👤 ${player.name} временно отключился от ${code}`);
            }

            const onlinePlayers = Array.from(room.players.values())
              .filter((p) => p.socketId !== "")
              .map((p) => ({
                userId: p.userId,
                name: p.name,
              }));

            io.to(code).emit("player_left", {
              player: { userId, name: player.name },
              players: onlinePlayers,
              count: onlinePlayers.length,
            });

            // Если ВСЕ отключены (и хост, и все игроки) — удаляем через таймаут
            const anyoneOnline = Array.from(room.players.values()).some((p) => p.socketId !== "");
            if (!anyoneOnline) {
              console.log(`⏳ Комната ${code}: все отключены, удаление через 5 мин`);
              setTimeout(() => {
                const currentRoom = activeRooms.get(code);
                if (currentRoom) {
                  const stillOnline = Array.from(currentRoom.players.values()).some((p) => p.socketId !== "");
                  if (!stillOnline) {
                    activeRooms.delete(code);
                    console.log(`🏠 Комната ${code} удалена (все отключены, таймаут)`);
                  }
                }
              }, 5 * 60 * 1000); // 5 минут
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
