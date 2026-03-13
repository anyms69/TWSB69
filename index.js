const { createBot } = require("./bot");

async function main() {
  const required = ["TELEGRAM_BOT_TOKEN", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("вќЊ РћС‚СЃСѓС‚СЃС‚РІСѓСЋС‚ РїРµСЂРµРјРµРЅРЅС‹Рµ: " + missing.join(", "));
    process.exit(1);
  }

  console.log("рџ¤– Р—Р°РїСѓСЃРє Task Manager...");

  const bot = createBot();
  bot.launch();
  console.log("вњ… Telegram Р±РѕС‚ Р·Р°РїСѓС‰РµРЅ!");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error("рџ’Ґ РћС€РёР±РєР°:", err);
  process.exit(1);
});
