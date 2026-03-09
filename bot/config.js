const tgbot = require("node-telegram-bot-api");
const adminId = 1591775154; // Your Telegram ID
const token = process.env.BOT_TOKEN || "8434857501:AAFji7-GGfutfdpF8_fZtamz-VwxMgEY_ZM";

let bot;

if (process.env.NODE_ENV === "production") {
  bot = new tgbot(token);
  // Determine the correct base URL (Render first, then Heroku)
  const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL;
  if (!baseUrl) {
    console.error("❌ No base URL set! Please define RENDER_EXTERNAL_URL or HEROKU_URL.");
  } else {
    bot.setWebHook(`${baseUrl}/bot/webhook`)
      .then(() => console.log("✅ Webhook set to", baseUrl + "/bot/webhook"))
      .catch(err => console.error("❌ Failed to set webhook:", err));
  }
} else {
  bot = new tgbot(token, { polling: true });
  console.log("🤖 Unified bot running locally with polling");
}

module.exports = {
  bot,
  token,
  adminId,
  tmdb_key: "121310dc95670906b7feaad3bfa5a510", // Shared across bots
  root: process.cwd() + "/bot"
};
