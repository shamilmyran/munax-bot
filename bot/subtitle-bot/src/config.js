const tgbot=require("node-telegram-bot-api"),
got=require("got"),
adminId=1591775154 // YOUR TELEGRAM ID

let bot,token,root=process.cwd()+"/bot/subtitle-bot"

if(process.env.NODE_ENV==="production"){
  token=process.env.SUBTITLE_BOT_TOKEN || "8434857501:AAFji7-GGfutfdpF8_fZtamz-VwxMgEY_ZM"
  bot=new tgbot(token)
  bot.setWebHook(process.env.HEROKU_URL+"/subtitle/"+token)
}else{
  token="5270684607:AAGzJ12xneNfr6kTgpue8CKKJ2rP1OQ1cUA" // Keep for local testing
  bot=new tgbot(token)
  console.log("Bot strated successfully");
  bot.startPolling()
}

let deploy=false,
process_started=Date.now()
function refresh_server(strict=false){
  if(((Date.now()-process_started)>3.5*60*60*1000||strict) && !deploy){
    deploy=true
    
    got.get("https://api.render.com/deploy/srv-ccdhcgirrk0f5cdfvvmg?key=DDtapEdKJ-4").catch(e=>null)
  }
}

module.exports={token,bot,adminId,root,refresh_server}
