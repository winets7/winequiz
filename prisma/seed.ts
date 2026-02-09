import { PrismaClient, Difficulty } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🍷 Заполняем базу данных начальными данными...\n");

  // =============================================
  // 1. Создаём администратора
  // =============================================
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@winequiz.ru" },
    update: {},
    create: {
      name: "Администратор",
      email: "admin@winequiz.ru",
      passwordHash: adminPassword,
      role: "ADMIN",
      level: 1,
      xp: 0,
    },
  });
  console.log(`✅ Администратор создан: ${admin.email}`);

  // =============================================
  // 2. Создаём категории
  // =============================================
  const categories = [
    { name: "Красные вина", icon: "🍷" },
    { name: "Белые вина", icon: "🥂" },
    { name: "Регионы и терруары", icon: "🌍" },
    { name: "Сорта винограда", icon: "🍇" },
    { name: "История виноделия", icon: "📜" },
    { name: "Дегустация и подача", icon: "🍾" },
  ];

  const createdCategories: Record<string, string> = {};

  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    createdCategories[cat.name] = created.id;
  }
  console.log(`✅ Создано ${categories.length} категорий`);

  // =============================================
  // 3. Создаём вопросы с ответами
  // =============================================
  const questions = [
    // --- Красные вина ---
    {
      text: "Какой сорт винограда является основой для вин Бордо?",
      category: "Красные вина",
      difficulty: Difficulty.EASY,
      timeLimit: 15,
      answers: [
        { text: "Каберне Совиньон", isCorrect: true },
        { text: "Пино Нуар", isCorrect: false },
        { text: "Темпранильо", isCorrect: false },
        { text: "Сира", isCorrect: false },
      ],
    },
    {
      text: "При какой температуре рекомендуется подавать красное вино?",
      category: "Красные вина",
      difficulty: Difficulty.EASY,
      timeLimit: 15,
      answers: [
        { text: "16–18°C", isCorrect: true },
        { text: "4–6°C", isCorrect: false },
        { text: "25–30°C", isCorrect: false },
        { text: "8–10°C", isCorrect: false },
      ],
    },
    {
      text: "Какое красное вино традиционно производится в Тоскане?",
      category: "Красные вина",
      difficulty: Difficulty.MEDIUM,
      timeLimit: 15,
      answers: [
        { text: "Кьянти", isCorrect: true },
        { text: "Риоха", isCorrect: false },
        { text: "Мальбек", isCorrect: false },
        { text: "Бароло", isCorrect: false },
      ],
    },
    {
      text: "Что означает термин «танины» в красном вине?",
      category: "Красные вина",
      difficulty: Difficulty.MEDIUM,
      timeLimit: 20,
      answers: [
        { text: "Вяжущие полифенольные соединения из кожицы и косточек", isCorrect: true },
        { text: "Сахар, оставшийся после ферментации", isCorrect: false },
        { text: "Ароматические спирты", isCorrect: false },
        { text: "Кислота, определяющая свежесть вина", isCorrect: false },
      ],
    },
    {
      text: "Какой регион Франции знаменит винами из Пино Нуар?",
      category: "Красные вина",
      difficulty: Difficulty.HARD,
      timeLimit: 15,
      answers: [
        { text: "Бургундия", isCorrect: true },
        { text: "Прованс", isCorrect: false },
        { text: "Эльзас", isCorrect: false },
        { text: "Луара", isCorrect: false },
      ],
    },

    // --- Белые вина ---
    {
      text: "Какой сорт винограда используется для производства Шабли?",
      category: "Белые вина",
      difficulty: Difficulty.EASY,
      timeLimit: 15,
      answers: [
        { text: "Шардоне", isCorrect: true },
        { text: "Совиньон Блан", isCorrect: false },
        { text: "Рислинг", isCorrect: false },
        { text: "Гевюрцтраминер", isCorrect: false },
      ],
    },
    {
      text: "Какая страна является крупнейшим производителем Рислинга?",
      category: "Белые вина",
      difficulty: Difficulty.MEDIUM,
      timeLimit: 15,
      answers: [
        { text: "Германия", isCorrect: true },
        { text: "Франция", isCorrect: false },
        { text: "Италия", isCorrect: false },
        { text: "Австрия", isCorrect: false },
      ],
    },
    {
      text: "Что такое «малолактическая ферментация» в белых винах?",
      category: "Белые вина",
      difficulty: Difficulty.HARD,
      timeLimit: 20,
      answers: [
        { text: "Превращение яблочной кислоты в молочную", isCorrect: true },
        { text: "Добавление молока для смягчения вкуса", isCorrect: false },
        { text: "Вторичное брожение в бутылке", isCorrect: false },
        { text: "Выдержка на дрожжевом осадке", isCorrect: false },
      ],
    },

    // --- Регионы и терруары ---
    {
      text: "В какой стране находится винодельческий регион Мендоса?",
      category: "Регионы и терруары",
      difficulty: Difficulty.EASY,
      timeLimit: 15,
      answers: [
        { text: "Аргентина", isCorrect: true },
        { text: "Чили", isCorrect: false },
        { text: "Испания", isCorrect: false },
        { text: "Португалия", isCorrect: false },
      ],
    },
    {
      text: "Что означает французский термин «терруар»?",
      category: "Регионы и терруары",
      difficulty: Difficulty.MEDIUM,
      timeLimit: 20,
      answers: [
        { text: "Совокупность почвы, климата и рельефа виноградника", isCorrect: true },
        { text: "Технология производства вина", isCorrect: false },
        { text: "Сорт винограда", isCorrect: false },
        { text: "Классификация вин по качеству", isCorrect: false },
      ],
    },
    {
      text: "Какой регион Италии известен производством Бароло?",
      category: "Регионы и терруары",
      difficulty: Difficulty.HARD,
      timeLimit: 15,
      answers: [
        { text: "Пьемонт", isCorrect: true },
        { text: "Тоскана", isCorrect: false },
        { text: "Венето", isCorrect: false },
        { text: "Сицилия", isCorrect: false },
      ],
    },

    // --- Сорта винограда ---
    {
      text: "Какой сорт винограда наиболее распространён в мире?",
      category: "Сорта винограда",
      difficulty: Difficulty.MEDIUM,
      timeLimit: 15,
      answers: [
        { text: "Каберне Совиньон", isCorrect: true },
        { text: "Мерло", isCorrect: false },
        { text: "Шардоне", isCorrect: false },
        { text: "Совиньон Блан", isCorrect: false },
      ],
    },
    {
      text: "Какой сорт винограда лежит в основе Шампанского (наряду с Пино Нуар)?",
      category: "Сорта винограда",
      difficulty: Difficulty.MEDIUM,
      timeLimit: 15,
      answers: [
        { text: "Шардоне", isCorrect: true },
        { text: "Рислинг", isCorrect: false },
        { text: "Совиньон Блан", isCorrect: false },
        { text: "Вионье", isCorrect: false },
      ],
    },
    {
      text: "Мальбек — визитная карточка виноделия какой страны?",
      category: "Сорта винограда",
      difficulty: Difficulty.EASY,
      timeLimit: 15,
      answers: [
        { text: "Аргентина", isCorrect: true },
        { text: "Франция", isCorrect: false },
        { text: "Австралия", isCorrect: false },
        { text: "ЮАР", isCorrect: false },
      ],
    },

    // --- История виноделия ---
    {
      text: "В какой стране зародилось виноделие более 8000 лет назад?",
      category: "История виноделия",
      difficulty: Difficulty.HARD,
      timeLimit: 20,
      answers: [
        { text: "Грузия", isCorrect: true },
        { text: "Франция", isCorrect: false },
        { text: "Италия", isCorrect: false },
        { text: "Египет", isCorrect: false },
      ],
    },
    {
      text: "Кто такой Дом Периньон?",
      category: "История виноделия",
      difficulty: Difficulty.EASY,
      timeLimit: 15,
      answers: [
        { text: "Монах-бенедиктинец, усовершенствовавший шампанское", isCorrect: true },
        { text: "Итальянский винодел, создатель Кьянти", isCorrect: false },
        { text: "Французский король, покровитель виноделия", isCorrect: false },
        { text: "Испанский учёный, изучавший ферментацию", isCorrect: false },
      ],
    },
    {
      text: "Что такое «филлоксера», едва не уничтожившая европейские виноградники в XIX веке?",
      category: "История виноделия",
      difficulty: Difficulty.HARD,
      timeLimit: 20,
      answers: [
        { text: "Насекомое-вредитель, поражающее корни лозы", isCorrect: true },
        { text: "Грибковое заболевание листьев", isCorrect: false },
        { text: "Засуха, длившаяся десятилетие", isCorrect: false },
        { text: "Налог на вино, введённый Наполеоном", isCorrect: false },
      ],
    },

    // --- Дегустация и подача ---
    {
      text: "Что такое «декантация» вина?",
      category: "Дегустация и подача",
      difficulty: Difficulty.EASY,
      timeLimit: 15,
      answers: [
        { text: "Переливание вина в графин для аэрации", isCorrect: true },
        { text: "Охлаждение вина перед подачей", isCorrect: false },
        { text: "Процесс выдержки в бочке", isCorrect: false },
        { text: "Добавление сахара в вино", isCorrect: false },
      ],
    },
    {
      text: "Какой формы бокал рекомендуется для красного вина Бордо?",
      category: "Дегустация и подача",
      difficulty: Difficulty.MEDIUM,
      timeLimit: 15,
      answers: [
        { text: "Высокий с широкой чашей", isCorrect: true },
        { text: "Узкий и вытянутый (флейта)", isCorrect: false },
        { text: "Маленький рюмочный", isCorrect: false },
        { text: "Плоский и широкий (купе)", isCorrect: false },
      ],
    },
    {
      text: "Что оценивают на этапе «нос» при дегустации вина?",
      category: "Дегустация и подача",
      difficulty: Difficulty.EASY,
      timeLimit: 15,
      answers: [
        { text: "Аромат вина", isCorrect: true },
        { text: "Цвет вина", isCorrect: false },
        { text: "Температуру вина", isCorrect: false },
        { text: "Вязкость вина", isCorrect: false },
      ],
    },
  ];

  let questionCount = 0;
  for (const q of questions) {
    const categoryId = createdCategories[q.category];
    if (!categoryId) {
      console.warn(`⚠️ Категория "${q.category}" не найдена, пропускаем вопрос`);
      continue;
    }

    const existingQuestion = await prisma.question.findFirst({
      where: { text: q.text },
    });

    if (!existingQuestion) {
      await prisma.question.create({
        data: {
          text: q.text,
          difficulty: q.difficulty,
          timeLimit: q.timeLimit,
          categoryId,
          answers: {
            create: q.answers,
          },
        },
      });
      questionCount++;
    }
  }
  console.log(`✅ Создано ${questionCount} вопросов с ответами`);

  // =============================================
  // 4. Создаём достижения
  // =============================================
  const achievements = [
    {
      name: "Первый глоток",
      description: "Сыграть первую игру",
      icon: "🥂",
      condition: JSON.stringify({ type: "games_played", value: 1 }),
      xpReward: 50,
    },
    {
      name: "Завсегдатай",
      description: "Сыграть 10 игр",
      icon: "🎮",
      condition: JSON.stringify({ type: "games_played", value: 10 }),
      xpReward: 100,
    },
    {
      name: "Меткий стрелок",
      description: "10 правильных ответов подряд",
      icon: "🎯",
      condition: JSON.stringify({ type: "correct_streak", value: 10 }),
      xpReward: 150,
    },
    {
      name: "Спринтер",
      description: "Ответить правильно менее чем за 2 секунды",
      icon: "⚡",
      condition: JSON.stringify({ type: "fast_answer", value: 2000 }),
      xpReward: 75,
    },
    {
      name: "Непобедимый",
      description: "5 побед подряд",
      icon: "🏆",
      condition: JSON.stringify({ type: "win_streak", value: 5 }),
      xpReward: 300,
    },
    {
      name: "Энциклопедист",
      description: "Правильно ответить на вопросы из всех категорий",
      icon: "📚",
      condition: JSON.stringify({ type: "all_categories", value: true }),
      xpReward: 200,
    },
    {
      name: "Сомелье",
      description: "100 правильных ответов",
      icon: "🍷",
      condition: JSON.stringify({ type: "total_correct", value: 100 }),
      xpReward: 500,
    },
    {
      name: "Легенда",
      description: "Достичь 50-го уровня",
      icon: "👑",
      condition: JSON.stringify({ type: "level", value: 50 }),
      xpReward: 1000,
    },
    {
      name: "Первая победа",
      description: "Занять 1-е место в игре",
      icon: "🥇",
      condition: JSON.stringify({ type: "first_win", value: 1 }),
      xpReward: 100,
    },
    {
      name: "Знаток",
      description: "50 правильных ответов",
      icon: "🧠",
      condition: JSON.stringify({ type: "total_correct", value: 50 }),
      xpReward: 250,
    },
  ];

  let achievementCount = 0;
  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { name: ach.name },
      update: {},
      create: ach,
    });
    achievementCount++;
  }
  console.log(`✅ Создано ${achievementCount} достижений`);

  console.log("\n🎉 База данных успешно заполнена!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Ошибка при заполнении БД:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
