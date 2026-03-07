const tgbot=require("node-telegram-bot-api"),
adminId="1504314507"


let bot,//telegram bot
groupId,token, botuser

if(process.env.NODE_ENV==="production"){
    // Setting Webhook for production server
  token="5026568551:AAFYbLzkB3DRzmA0Lr0sCeOEz3XSnxXmc3k"
  bot=new tgbot(token)
  bot.stopPolling()
  bot.setWebHook(process.env.HEROKU_URL+"/translate/group/"+token)
  botuser="malayalamTranslateBot"
  
  //Setting group id for production
  groupId= -1001591796704
}else{
  // Setting Polling for devolepment Server
  token="1501660172:AAGIQGRZ_b_Ei3TvLgm9F7T6_zNi5TrLxY4",//This Token Only For devolepment server
  bot=new tgbot(token)
  bot.startPolling()
  botuser="compress_video_files_bot"
  console.log("group translate bot was started loccally");
  
  //Setting group id for dovolpment
  groupId= -1001628730051
}

module.exports={
  bot,
  token,
  adminId,
  groupId,
  tmdb_key:"121310dc95670906b7feaad3bfa5a510",
  botuser,
  root:process.cwd()+"/bot/group-translate"
}