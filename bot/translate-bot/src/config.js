const tgbot=require("node-telegram-bot-api")
let bot,token;
const adminId = 1591775154 // YOUR TELEGRAM ID

if(process.env.NODE_ENV==="production"){
  token = process.env.TRANSLATE_BOT_TOKEN || "1869324755:AAEYjYu3b5cbg1M7VrCJUzmk5HnuPHUAxaA" // REPLACE WITH YOUR NEW BOT TOKEN
  bot=new tgbot(token)
  bot.stopPolling()
  bot.setWebHook(process.env.HEROKU_URL+"/translate/"+token)
}else{
  console.log("translate bot working locally");
  token = "5367698671:AAETky8B52O2sC278lZWgCnz0foEH9YkIyg"
  bot=new tgbot(token)
  bot.startPolling().catch(e=>console.log(e.body))
}

const sleep=async (time)=>{
  await new Promise(r=>{setTimeout(function() {r()},time )})
  return
}

module.exports={
  bot,token,adminId,root:process.cwd()+"/bot/translate-bot",sleep
}
