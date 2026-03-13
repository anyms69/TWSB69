const { createBot, startReminderScheduler } = require("./bot");
const http = require("http");

async function main() {
  const required = ["TELEGRAM_BOT_TOKEN", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("вќЊ РћС‚СЃСѓС‚СЃС‚РІСѓСЋС‚ РїРµСЂРµРјРµРЅРЅС‹Рµ: " + missing.join(", "));
    process.exit(1);
  }

  // РџСЂРѕСЃС‚РѕР№ HTTP СЃРµСЂРІРµСЂ С‡С‚РѕР±С‹ Render Р±С‹Р» РґРѕРІРѕР»РµРЅ
  const port = process.env.PORT || 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Task Bot is running!");
  });
  server.listen(port, () => console.log(`рџЊђ HTTP СЃРµСЂРІРµСЂ РЅР° РїРѕСЂС‚Сѓ ${port}`));

  console.log("рџ¤– Р—Р°РїСѓСЃРє Task Manager...");
  const bot = createBot();

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (chatId) {
    startReminderScheduler(bot, chatId);
    console.log("вЏ° РџР»Р°РЅРёСЂРѕРІС‰РёРє РЅР°РїРѕРјРёРЅР°РЅРёР№ Р·Р°РїСѓС‰РµРЅ");
  }

  bot.launch();
  console.log("вњ… Telegram Р±РѕС‚ Р·Р°РїСѓС‰РµРЅ!");

  process.once("SIGINT", () => { bot.stop("SIGINT"); server.close(); });
  process.once("SIGTERM", () => { bot.stop("SIGTERM"); server.close(); });
}

main().catch((err) => {
  console.error("рџ’Ґ РћС€РёР±РєР°:", err);
  process.exit(1);
});
