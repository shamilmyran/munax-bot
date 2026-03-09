const tgbot = require("node-telegram-bot-api")
const adminId = 1591775154 // Your Telegram ID
const token = process.env.BOT_TOKEN || "8434857501:AAFji7-GGfutfdpF8_fZtamz-VwxMgEY_ZM"

let bot

if (process.env.NODE_ENV === "production") {
  bot = new tgbot(token)
  bot.setWebHook(`${process.env.RENDER_EXTERNAL_URL}/bot/webhook`)
} else {
  bot = new tgbot(token, { polling: true })
  console.log("🤖 Unified bot running locally")
}

module.exports = {
  bot,
  token,
  adminId,
  tmdb_key: "121310dc95670906b7feaad3bfa5a510", // Shared across bots
  root: process.cwd() + "/bot"
}
