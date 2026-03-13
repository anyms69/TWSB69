import { createBot } from "./bot";
import { createMcpServer, startMcpHttp } from "./mcp";

async function main() {
  // Проверяем обязательные переменные окружения
  const required = ["TELEGRAM_BOT_TOKEN", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Отсутствуют переменные окружения: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("🤖 Запуск Task Manager...");

  // Запускаем MCP-сервер
  const mcpServer = createMcpServer();
  startMcpHttp(mcpServer);

  // Запускаем Telegram-бота
  const bot = createBot();
  bot.launch();
  console.log("✅ Telegram бот запущен");

  // Graceful shutdown
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error("💥 Критическая ошибка:", err);
  process.exit(1);
});
