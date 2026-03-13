const { Telegraf, Markup } = require("telegraf");
const {
  getTasks, getTask, searchTasks, createTask, updateTask,
  deleteTask, completeTask, addSubtask, completeSubtask,
  getStats, getReminders, getCategories
} = require("./db");

const PRIORITY_EMOJI = { low: "🟢", medium: "🟡", high: "🔴" };
const STATUS_EMOJI = { todo: "📋", in_progress: "⏳", done: "✅" };
const CATEGORY_EMOJI = {
  work: "💼", personal: "👤", health: "❤️", finance: "💰",
  study: "📚", home: "🏠", shopping: "🛒", other: "📌"
};

// Состояние пользователей (ожидание ввода)
const userState = {};

function formatTask(task, short = false) {
  const priority = PRIORITY_EMOJI[task.priority] || "⚪";
  const status = STATUS_EMOJI[task.status] || "❓";
  const cat = task.category ? ` ${CATEGORY_EMOJI[task.category] || "📌"}${task.category}` : "";
  const due = task.due_date ? `\n📅 Срок: ${task.due_date}` : "";
  const remind = task.remind_at ? `\n⏰ Напомнить: ${new Date(task.remind_at).toLocaleString("ru")}` : "";
  const desc = !short && task.description ? `\n📝 ${task.description}` : "";
  const notes = !short && task.notes ? `\n🗒 ${task.notes}` : "";
  const tags = task.tags && task.tags.length ? `\n🏷 ${task.tags.map(t => "#" + t).join(" ")}` : "";
  const subtasks = !short && task.subtasks && task.subtasks.length
    ? `\n📌 Подзадачи:\n` + task.subtasks.map(s => `  ${s.done ? "✅" : "⬜"} ${s.title}`).join("\n")
    : "";
  return `${status} *[#${task.id}]* ${task.title}${cat}\n${priority} ${task.priority}${due}${remind}${desc}${notes}${tags}${subtasks}`;
}

function formatList(tasks) {
  if (!tasks.length) return "Задач нет 🎉";
  return tasks.map(t => formatTask(t, true)).join("\n\n");
}

function mainMenu() {
  return Markup.keyboard([
    ["📋 Все задачи", "⏳ Активные"],
    ["✅ Выполненные", "📊 Статистика"],
    ["➕ Добавить задачу", "🔍 Поиск"],
    ["📁 По категории", "🔴 Срочные"],
  ]).resize();
}

function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан!");
  const bot = new Telegraf(token);

  // /start
  bot.start((ctx) => {
    ctx.replyWithMarkdown(
      `👋 *Менеджер задач*\n\nПросто напиши текст — задача создастся автоматически!\n\nИли используй кнопки меню 👇`,
      mainMenu()
    );
  });

  // /help
  bot.command("help", (ctx) => {
    ctx.replyWithMarkdown(
      `📖 *Команды:*\n\n` +
      `*/add* текст — добавить задачу\n` +
      `*/done* id — выполнить\n` +
      `*/delete* id — удалить\n` +
      `*/task* id — детали задачи\n` +
      `*/progress* id — взять в работу\n` +
      `*/priority* id high|medium|low\n` +
      `*/due* id 2025-12-31 — срок\n` +
      `*/remind* id 2025-12-31 14:00 — напоминание\n` +
      `*/category* id work|personal|health|finance|study|home|shopping\n` +
      `*/note* id текст — добавить заметку\n` +
      `*/subtask* id текст — добавить подзадачу\n` +
      `*/search* текст — поиск задач\n` +
      `*/stats* — статистика\n` +
      `*/digest* — дайджест на сегодня\n\n` +
      `*Быстрое добавление:*\n` +
      `! текст — высокий приоритет\n` +
      `- текст — низкий приоритет`,
      mainMenu()
    );
  });

  // Кнопки меню
  bot.hears("📋 Все задачи", async (ctx) => {
    try {
      const tasks = await getTasks();
      await ctx.replyWithMarkdown(`📋 *Все задачи (${tasks.length}):*\n\n${formatList(tasks)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.hears("⏳ Активные", async (ctx) => {
    try {
      const [todo, inProgress] = await Promise.all([getTasks({ status: "todo" }), getTasks({ status: "in_progress" })]);
      const all = [...inProgress, ...todo];
      await ctx.replyWithMarkdown(`⏳ *Активные (${all.length}):*\n\n${formatList(all)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.hears("✅ Выполненные", async (ctx) => {
    try {
      const tasks = await getTasks({ status: "done" });
      await ctx.replyWithMarkdown(`✅ *Выполнено (${tasks.length}):*\n\n${formatList(tasks)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.hears("🔴 Срочные", async (ctx) => {
    try {
      const tasks = await getTasks({ priority: "high" });
      const active = tasks.filter(t => t.status !== "done");
      await ctx.replyWithMarkdown(`🔴 *Срочные задачи (${active.length}):*\n\n${formatList(active)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.hears("📊 Статистика", async (ctx) => {
    try {
      const s = await getStats();
      await ctx.replyWithMarkdown(
        `📊 *Статистика:*\n\n` +
        `📋 Всего задач: ${s.total}\n` +
        `📌 К выполнению: ${s.todo}\n` +
        `⏳ В работе: ${s.in_progress}\n` +
        `✅ Выполнено: ${s.done}\n` +
        `🔴 Срочных: ${s.high}\n` +
        `🏆 Сделано сегодня: ${s.done_today}`,
        mainMenu()
      );
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.hears("➕ Добавить задачу", (ctx) => {
    userState[ctx.from.id] = { action: "adding" };
    ctx.reply("✏️ Напишите название задачи:", Markup.keyboard([["❌ Отмена"]]).resize());
  });

  bot.hears("🔍 Поиск", (ctx) => {
    userState[ctx.from.id] = { action: "searching" };
    ctx.reply("🔍 Введите текст для поиска:", Markup.keyboard([["❌ Отмена"]]).resize());
  });

  bot.hears("📁 По категории", async (ctx) => {
    try {
      const cats = await getCategories();
      if (!cats.length) return ctx.reply("Категорий пока нет", mainMenu());
      const buttons = cats.map(c => [`${CATEGORY_EMOJI[c] || "📌"} ${c}`]);
      buttons.push(["❌ Отмена"]);
      userState[ctx.from.id] = { action: "filter_category" };
      ctx.reply("Выберите категорию:", Markup.keyboard(buttons).resize());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.hears("❌ Отмена", (ctx) => {
    delete userState[ctx.from.id];
    ctx.reply("Отменено", mainMenu());
  });

  // /add
  bot.command("add", async (ctx) => {
    const text = ctx.message.text.replace("/add", "").trim();
    if (!text) return ctx.reply("❌ Пример: /add Купить молоко");
    await addTask(ctx, text);
  });

  // /done
  bot.command("done", async (ctx) => {
    const id = parseInt(ctx.message.text.split(" ")[1]);
    if (!id) return ctx.reply("❌ Пример: /done 5");
    try {
      const task = await completeTask(id);
      await ctx.replyWithMarkdown(`✅ *Выполнено!*\n\n${formatTask(task, true)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /progress
  bot.command("progress", async (ctx) => {
    const id = parseInt(ctx.message.text.split(" ")[1]);
    if (!id) return ctx.reply("❌ Пример: /progress 5");
    try {
      const task = await updateTask(id, { status: "in_progress" });
      await ctx.replyWithMarkdown(`⏳ *В работе!*\n\n${formatTask(task, true)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /delete
  bot.command("delete", async (ctx) => {
    const id = parseInt(ctx.message.text.split(" ")[1]);
    if (!id) return ctx.reply("❌ Пример: /delete 5");
    try {
      await deleteTask(id);
      await ctx.reply(`🗑️ Задача #${id} удалена`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /task
  bot.command("task", async (ctx) => {
    const id = parseInt(ctx.message.text.split(" ")[1]);
    if (!id) return ctx.reply("❌ Пример: /task 5");
    try {
      const task = await getTask(id);
      if (!task) return ctx.reply(`❌ Задача #${id} не найдена`);
      await ctx.replyWithMarkdown(formatTask(task), mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /priority
  bot.command("priority", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const id = parseInt(parts[1]);
    const priority = parts[2];
    if (!id || !["low","medium","high"].includes(priority))
      return ctx.reply("❌ Пример: /priority 5 high");
    try {
      const task = await updateTask(id, { priority });
      await ctx.replyWithMarkdown(`${PRIORITY_EMOJI[priority]} *Приоритет обновлён!*\n\n${formatTask(task, true)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /due
  bot.command("due", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const id = parseInt(parts[1]);
    const due_date = parts[2];
    if (!id || !due_date) return ctx.reply("❌ Пример: /due 5 2025-12-31");
    try {
      const task = await updateTask(id, { due_date });
      await ctx.replyWithMarkdown(`📅 *Срок установлен!*\n\n${formatTask(task, true)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /remind
  bot.command("remind", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const id = parseInt(parts[1]);
    const date = parts[2];
    const time = parts[3] || "09:00";
    if (!id || !date) return ctx.reply("❌ Пример: /remind 5 2025-12-31 14:00");
    try {
      const remind_at = new Date(`${date}T${time}:00`).toISOString();
      const task = await updateTask(id, { remind_at });
      await ctx.replyWithMarkdown(`⏰ *Напоминание установлено!*\n\n${formatTask(task, true)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /category
  bot.command("category", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const id = parseInt(parts[1]);
    const category = parts[2];
    if (!id || !category) return ctx.reply("❌ Пример: /category 5 work");
    try {
      const task = await updateTask(id, { category });
      await ctx.replyWithMarkdown(`📁 *Категория установлена!*\n\n${formatTask(task, true)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /note
  bot.command("note", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const id = parseInt(parts[1]);
    const notes = parts.slice(2).join(" ");
    if (!id || !notes) return ctx.reply("❌ Пример: /note 5 Позвонить до 18:00");
    try {
      const task = await updateTask(id, { notes });
      await ctx.replyWithMarkdown(`🗒 *Заметка добавлена!*\n\n${formatTask(task)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /subtask
  bot.command("subtask", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const id = parseInt(parts[1]);
    const title = parts.slice(2).join(" ");
    if (!id || !title) return ctx.reply("❌ Пример: /subtask 5 Купить билеты");
    try {
      const task = await addSubtask(id, title);
      await ctx.replyWithMarkdown(`📌 *Подзадача добавлена!*\n\n${formatTask(task)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /search
  bot.command("search", async (ctx) => {
    const query = ctx.message.text.replace("/search", "").trim();
    if (!query) return ctx.reply("❌ Пример: /search молоко");
    try {
      const tasks = await searchTasks(query);
      await ctx.replyWithMarkdown(`🔍 *Результаты (${tasks.length}):*\n\n${formatList(tasks)}`, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /stats
  bot.command("stats", async (ctx) => {
    try {
      const s = await getStats();
      await ctx.replyWithMarkdown(
        `📊 *Статистика:*\n\n` +
        `📋 Всего: ${s.total}\n📌 К выполнению: ${s.todo}\n⏳ В работе: ${s.in_progress}\n✅ Выполнено: ${s.done}\n🔴 Срочных: ${s.high}\n🏆 Сделано сегодня: ${s.done_today}`,
        mainMenu()
      );
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // /digest — дайджест на сегодня
  bot.command("digest", async (ctx) => {
    try {
      const [todo, inProgress, stats] = await Promise.all([
        getTasks({ status: "todo" }),
        getTasks({ status: "in_progress" }),
        getStats()
      ]);
      const urgent = todo.filter(t => t.priority === "high");
      const today = new Date().toISOString().split("T")[0];
      const dueToday = [...todo, ...inProgress].filter(t => t.due_date === today);

      let text = `🌅 *Дайджест на сегодня*\n\n`;
      text += `📊 Всего активных: ${stats.todo + stats.in_progress}\n`;
      text += `🏆 Сделано сегодня: ${stats.done_today}\n\n`;

      if (inProgress.length) {
        text += `⏳ *В работе (${inProgress.length}):*\n${formatList(inProgress)}\n\n`;
      }
      if (urgent.length) {
        text += `🔴 *Срочные (${urgent.length}):*\n${formatList(urgent)}\n\n`;
      }
      if (dueToday.length) {
        text += `📅 *Срок сегодня (${dueToday.length}):*\n${formatList(dueToday)}\n\n`;
      }
      if (!inProgress.length && !urgent.length && !dueToday.length) {
        text += `✨ Нет срочных задач на сегодня!`;
      }

      await ctx.replyWithMarkdown(text, mainMenu());
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  // Обработка состояний и обычного текста
  bot.on("text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return;
    const state = userState[ctx.from.id];

    // Режим добавления задачи
    if (state?.action === "adding") {
      delete userState[ctx.from.id];
      await addTask(ctx, ctx.message.text);
      return;
    }

    // Режим поиска
    if (state?.action === "searching") {
      delete userState[ctx.from.id];
      try {
        const tasks = await searchTasks(ctx.message.text);
        await ctx.replyWithMarkdown(`🔍 *Результаты (${tasks.length}):*\n\n${formatList(tasks)}`, mainMenu());
      } catch (e) { ctx.reply("❌ " + e.message); }
      return;
    }

    // Фильтр по категории
    if (state?.action === "filter_category") {
      delete userState[ctx.from.id];
      const category = ctx.message.text.replace(/^[^\s]+\s/, "").trim();
      try {
        const tasks = await getTasks({ category });
        await ctx.replyWithMarkdown(`📁 *${category} (${tasks.length}):*\n\n${formatList(tasks)}`, mainMenu());
      } catch (e) { ctx.reply("❌ " + e.message); }
      return;
    }

    // Быстрое добавление задачи обычным текстом
    await addTask(ctx, ctx.message.text);
  });

  return bot;
}

async function addTask(ctx, text) {
  try {
    let priority = "medium", title = text;
    if (text.startsWith("!!") || text.startsWith("!")) {
      priority = "high";
      title = text.replace(/^!+/, "").trim();
    } else if (text.startsWith("-")) {
      priority = "low";
      title = text.slice(1).trim();
    }
    const task = await createTask({ title, priority });
    await ctx.replyWithMarkdown(
      `✨ *Задача добавлена!*\n\n${formatTask(task, true)}\n\n` +
      `_/priority ${task.id} high — изменить приоритет_\n` +
      `_/due ${task.id} 2025-12-31 — установить срок_\n` +
      `_/category ${task.id} work — добавить категорию_`,
      Markup.keyboard([
        [`✅ Выполнить #${task.id}`, `🗑 Удалить #${task.id}`],
        ["📋 Все задачи", "➕ Добавить ещё"]
      ]).resize()
    );
  } catch (e) { ctx.reply("❌ " + e.message); }
}

// Планировщик напоминаний
function startReminderScheduler(bot, chatId) {
  setInterval(async () => {
    try {
      const reminders = await getReminders();
      for (const task of reminders) {
        await bot.telegram.sendMessage(
          chatId,
          `⏰ *Напоминание!*\n\n${formatTask(task, true)}`,
          { parse_mode: "Markdown" }
        );
        await updateTask(task.id, { remind_at: null });
      }
    } catch (e) {
      console.error("Ошибка планировщика:", e.message);
    }
  }, 60 * 1000); // каждую минуту
}

module.exports = { createBot, startReminderScheduler };
