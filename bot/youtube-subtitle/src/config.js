const tgbot=require("node-telegram-bot-api"),
adminId="1504314507"


let bot,//telegram bot
groupId,token

if(process.env.NODE_ENV==="production"){
    // Setting Webhook for production server
  token="2147278557:AAF5KKM1BkF8Xoe4u0GbbXuboSaew7M-igg"
  bot=new tgbot(token)
  bot.stopPolling()
  bot.setWebHook(process.env.HEROKU_URL+"/ytsubs/"+token)
  
}else{
  // Setting Polling for devolepment Server
  token="1501660172:AAGIQGRZ_b_Ei3TvLgm9F7T6_zNi5TrLxY4",//This Token Only For devolepment server
  bot=new tgbot(token)
  bot.startPolling()
  console.log("group translate bot was started loccally");
  
  //Setting group id for dovolpmen
}

module.exports={
  bot,
  token,
  adminId
}