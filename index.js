const { createBot } = require("./bot");
const { createMcpServer, startMcpHttp } = require("./mcp");

async function main() {
  const required = ["TELEGRAM_BOT_TOKEN", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("❌ Отсутствуют переменные: " + missing.join(", "));
    process.exit(1);
  }

  console.log("🤖 Запуск Task Manager...");

  const mcpServer = createMcpServer();
  startMcpHttp(mcpServer);

  const bot = createBot();
  bot.launch();
  console.log("✅ Telegram бот запущен");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error("💥 Ошибка:", err);
  process.exit(1);
});
