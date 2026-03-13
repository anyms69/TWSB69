const { Telegraf } = require("telegraf");
const { getTasks, getTask, createTask, updateTask, deleteTask, completeTask } = require("./db");

const PRIORITY_EMOJI = { low: "🟢", medium: "🟡", high: "🔴" };
const STATUS_EMOJI = { todo: "📋", in_progress: "⏳", done: "✅" };

function formatTask(task) {
  const priority = PRIORITY_EMOJI[task.priority] || "⚪";
  const status = STATUS_EMOJI[task.status] || "❓";
  const due = task.due_date ? `\n📅 Срок: ${task.due_date}` : "";
  const desc = task.description ? `\n📝 ${task.description}` : "";
  return `${status} *[#${task.id}]* ${task.title}${desc}\n${priority} Приоритет: ${task.priority}${due}`;
}

function formatList(tasks) {
  if (!tasks.length) return "Задач нет 🎉";
  return tasks.map(formatTask).join("\n\n");
}

function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан!");
  const bot = new Telegraf(token);

  bot.start((ctx) => ctx.replyWithMarkdown(
    `👋 *Менеджер задач*\n\n` +
    `/list — все задачи\n/todo — активные\n/add <текст> — добавить\n` +
    `/done <id> — выполнить\n/progress <id> — в работу\n` +
    `/delete <id> — удалить\n/priority <id> <low|medium|high>\n` +
    `/due <id> <ГГГГ-ММ-ДД>\n\n_Или просто напиши текст — задача создастся сама_`
  ));

  bot.command("list", async (ctx) => {
    try {
      const tasks = await getTasks();
      await ctx.replyWithMarkdown(`📋 *Все задачи (${tasks.length}):*\n\n${formatList(tasks)}`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.command("todo", async (ctx) => {
    try {
      const [todo, inProgress] = await Promise.all([getTasks("todo"), getTasks("in_progress")]);
      const all = [...inProgress, ...todo];
      await ctx.replyWithMarkdown(`⏳ *Активные (${all.length}):*\n\n${formatList(all)}`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.command("done_list", async (ctx) => {
    try {
      const tasks = await getTasks("done");
      await ctx.replyWithMarkdown(`✅ *Выполнено (${tasks.length}):*\n\n${formatList(tasks)}`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.command("add", async (ctx) => {
    const text = ctx.message.text.replace("/add", "").trim();
    if (!text) return ctx.reply("❌ Пример: /add Купить молоко");
    try {
      let priority = "medium", title = text;
      if (text.startsWith("!")) { priority = "high"; title = text.slice(1).trim(); }
      else if (text.startsWith("-")) { priority = "low"; title = text.slice(1).trim(); }
      const task = await createTask({ title, priority });
      await ctx.replyWithMarkdown(`✨ *Добавлено!*\n\n${formatTask(task)}`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.command("done", async (ctx) => {
    const id = parseInt(ctx.message.text.split(" ")[1]);
    if (!id) return ctx.reply("❌ Пример: /done 5");
    try {
      const task = await completeTask(id);
      await ctx.replyWithMarkdown(`✅ *Выполнено!*\n\n${formatTask(task)}`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.command("progress", async (ctx) => {
    const id = parseInt(ctx.message.text.split(" ")[1]);
    if (!id) return ctx.reply("❌ Пример: /progress 5");
    try {
      const task = await updateTask(id, { status: "in_progress" });
      await ctx.replyWithMarkdown(`⏳ *В работе!*\n\n${formatTask(task)}`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.command("delete", async (ctx) => {
    const id = parseInt(ctx.message.text.split(" ")[1]);
    if (!id) return ctx.reply("❌ Пример: /delete 5");
    try {
      await deleteTask(id);
      await ctx.reply(`🗑️ Задача #${id} удалена`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.command("task", async (ctx) => {
    const id = parseInt(ctx.message.text.split(" ")[1]);
    if (!id) return ctx.reply("❌ Пример: /task 5");
    try {
      const task = await getTask(id);
      if (!task) return ctx.reply(`❌ Задача #${id} не найдена`);
      await ctx.replyWithMarkdown(`🔍 *Задача #${id}:*\n\n${formatTask(task)}`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.command("priority", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const id = parseInt(parts[1]);
    const priority = parts[2];
    if (!id || !["low","medium","high"].includes(priority))
      return ctx.reply("❌ Пример: /priority 5 high");
    try {
      const task = await updateTask(id, { priority });
      await ctx.replyWithMarkdown(`${PRIORITY_EMOJI[priority]} *Приоритет обновлён!*\n\n${formatTask(task)}`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.command("due", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const id = parseInt(parts[1]);
    const due_date = parts[2];
    if (!id || !due_date) return ctx.reply("❌ Пример: /due 5 2025-12-31");
    try {
      const task = await updateTask(id, { due_date });
      await ctx.replyWithMarkdown(`📅 *Срок установлен!*\n\n${formatTask(task)}`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  bot.on("text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return;
    try {
      const task = await createTask({ title: ctx.message.text });
      await ctx.replyWithMarkdown(`✨ *Задача добавлена!*\n\n${formatTask(task)}`);
    } catch (e) { ctx.reply("❌ " + e.message); }
  });

  return bot;
}

module.exports = { createBot };
