import { Telegraf, Context } from "telegraf";
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  Task,
} from "./db";

// --- Форматирование задач ---

const PRIORITY_EMOJI: Record<string, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🔴",
};

const STATUS_EMOJI: Record<string, string> = {
  todo: "📋",
  in_progress: "⏳",
  done: "✅",
};

function formatTask(task: Task): string {
  const priority = PRIORITY_EMOJI[task.priority] || "⚪";
  const status = STATUS_EMOJI[task.status] || "❓";
  const due = task.due_date ? `\n📅 Срок: ${task.due_date}` : "";
  const desc = task.description ? `\n📝 ${task.description}` : "";
  return `${status} *[#${task.id}]* ${task.title}${desc}\n${priority} Приоритет: ${task.priority}${due}`;
}

function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) return "Задач нет 🎉";
  return tasks.map(formatTask).join("\n\n");
}

// --- Инициализация бота ---

export function createBot(): Telegraf {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан!");

  const bot = new Telegraf(token);

  // /start
  bot.start((ctx: Context) => {
    ctx.replyWithMarkdown(
      `👋 *Менеджер задач*\n\n` +
        `Команды:\n` +
        `/list — все задачи\n` +
        `/todo — только активные\n` +
        `/done_list — выполненные\n` +
        `/add <текст> — добавить задачу\n` +
        `/done <id> — отметить выполненной\n` +
        `/progress <id> — в работу\n` +
        `/delete <id> — удалить\n` +
        `/task <id> — детали задачи\n` +
        `/priority <id> <low|medium|high> — изменить приоритет\n` +
        `/due <id> <дата> — установить срок (ГГГГ-ММ-ДД)\n\n` +
        `*Пример:* /add Позвонить врачу`
    );
  });

  // /help
  bot.help((ctx: Context) => {
    ctx.replyWithMarkdown(
      `📖 *Помощь*\n\n` +
        `/add Купить продукты — добавить задачу\n` +
        `/add !Срочно сделать отчёт — высокий приоритет\n` +
        `/list — все задачи\n` +
        `/done 5 — выполнить задачу #5\n` +
        `/delete 5 — удалить задачу #5\n` +
        `/due 5 2025-12-31 — срок для задачи #5`
    );
  });

  // /list — все задачи
  bot.command("list", async (ctx: Context) => {
    try {
      const tasks = await getTasks();
      await ctx.replyWithMarkdown(`📋 *Все задачи (${tasks.length}):*\n\n${formatTaskList(tasks)}`);
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // /todo — только активные
  bot.command("todo", async (ctx: Context) => {
    try {
      const tasks = await getTasks("todo");
      const inProgress = await getTasks("in_progress");
      const all = [...inProgress, ...tasks];
      await ctx.replyWithMarkdown(`⏳ *Активные задачи (${all.length}):*\n\n${formatTaskList(all)}`);
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // /done_list — выполненные
  bot.command("done_list", async (ctx: Context) => {
    try {
      const tasks = await getTasks("done");
      await ctx.replyWithMarkdown(`✅ *Выполнено (${tasks.length}):*\n\n${formatTaskList(tasks)}`);
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // /add <text> — добавить задачу
  bot.command("add", async (ctx: Context) => {
    const message = ctx.message as any;
    const text = message?.text?.replace("/add", "").trim();
    if (!text) {
      ctx.reply("❌ Укажите текст задачи: /add Позвонить врачу");
      return;
    }

    try {
      // Определяем приоритет по префиксу ! или !!
      let priority: "low" | "medium" | "high" = "medium";
      let title = text;
      if (text.startsWith("!!")) {
        priority = "high";
        title = text.slice(2).trim();
      } else if (text.startsWith("!")) {
        priority = "high";
        title = text.slice(1).trim();
      } else if (text.startsWith("-")) {
        priority = "low";
        title = text.slice(1).trim();
      }

      const task = await createTask({ title, priority });
      await ctx.replyWithMarkdown(
        `✨ *Задача добавлена!*\n\n${formatTask(task)}`
      );
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // /done <id>
  bot.command("done", async (ctx: Context) => {
    const message = ctx.message as any;
    const id = parseInt(message?.text?.split(" ")[1]);
    if (!id) {
      ctx.reply("❌ Укажите ID: /done 5");
      return;
    }
    try {
      const task = await completeTask(id);
      await ctx.replyWithMarkdown(`✅ *Выполнено!*\n\n${formatTask(task)}`);
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // /progress <id>
  bot.command("progress", async (ctx: Context) => {
    const message = ctx.message as any;
    const id = parseInt(message?.text?.split(" ")[1]);
    if (!id) {
      ctx.reply("❌ Укажите ID: /progress 5");
      return;
    }
    try {
      const task = await updateTask(id, { status: "in_progress" });
      await ctx.replyWithMarkdown(`⏳ *В работе!*\n\n${formatTask(task)}`);
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // /delete <id>
  bot.command("delete", async (ctx: Context) => {
    const message = ctx.message as any;
    const id = parseInt(message?.text?.split(" ")[1]);
    if (!id) {
      ctx.reply("❌ Укажите ID: /delete 5");
      return;
    }
    try {
      await deleteTask(id);
      await ctx.reply(`🗑️ Задача #${id} удалена`);
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // /task <id> — детали
  bot.command("task", async (ctx: Context) => {
    const message = ctx.message as any;
    const id = parseInt(message?.text?.split(" ")[1]);
    if (!id) {
      ctx.reply("❌ Укажите ID: /task 5");
      return;
    }
    try {
      const task = await getTask(id);
      if (!task) {
        ctx.reply(`❌ Задача #${id} не найдена`);
        return;
      }
      await ctx.replyWithMarkdown(`🔍 *Задача #${id}:*\n\n${formatTask(task)}\n\n🕐 Создана: ${new Date(task.created_at).toLocaleString("ru")}`);
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // /priority <id> <low|medium|high>
  bot.command("priority", async (ctx: Context) => {
    const message = ctx.message as any;
    const parts = message?.text?.split(" ");
    const id = parseInt(parts?.[1]);
    const priority = parts?.[2] as "low" | "medium" | "high";
    if (!id || !["low", "medium", "high"].includes(priority)) {
      ctx.reply("❌ Пример: /priority 5 high");
      return;
    }
    try {
      const task = await updateTask(id, { priority });
      await ctx.replyWithMarkdown(`${PRIORITY_EMOJI[priority]} *Приоритет обновлён!*\n\n${formatTask(task)}`);
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // /due <id> <дата>
  bot.command("due", async (ctx: Context) => {
    const message = ctx.message as any;
    const parts = message?.text?.split(" ");
    const id = parseInt(parts?.[1]);
    const due_date = parts?.[2];
    if (!id || !due_date) {
      ctx.reply("❌ Пример: /due 5 2025-12-31");
      return;
    }
    try {
      const task = await updateTask(id, { due_date });
      await ctx.replyWithMarkdown(`📅 *Срок установлен!*\n\n${formatTask(task)}`);
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // Обычный текст — быстрое добавление задачи
  bot.on("text", async (ctx: Context) => {
    const message = ctx.message as any;
    const text = message?.text;
    if (!text || text.startsWith("/")) return;

    try {
      const task = await createTask({ title: text });
      await ctx.replyWithMarkdown(
        `✨ *Задача добавлена!*\n\n${formatTask(task)}\n\n_Просто напиши текст — и задача создастся автоматически_`
      );
    } catch (e: any) {
      ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  return bot;
}
