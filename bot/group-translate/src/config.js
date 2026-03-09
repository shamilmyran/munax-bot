const tgbot=require("node-telegram-bot-api"),
adminId=1591775154 // YOUR TELEGRAM ID

let bot,//telegram bot
groupId,token, botuser

if(process.env.NODE_ENV==="production"){
    // Setting Webhook for production server
  token=process.env.GROUP_BOT_TOKEN || "5026568551:AAFYbLzkB3DRzmA0Lr0sCeOEz3XSnxXmc3k" // REPLACE WITH YOUR NEW BOT TOKEN
  bot=new tgbot(token)
  bot.stopPolling()
  bot.setWebHook(process.env.HEROKU_URL+"/translate/group/"+token)
  botuser="munax_bot" // Change to your bot's username
  
  // Setting group id for production - YOU NEED TO CREATE A GROUP AND PUT ITS ID HERE
  groupId= -1001591796704 // REPLACE WITH YOUR GROUP ID
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
