(async()=>{
// requiring npm packages
const tgbot=require("node-telegram-bot-api")

// setting global variobles
let token,bot,adminId=1504314507,USERNAME, PASSWORD;

  // setup the bot for both production and devolepment servers
  if(process.env.NODE_ENV!=="production"){
    token="1501660172:AAGIQGRZ_b_Ei3TvLgm9F7T6_zNi5TrLxY4"
    bot=new tgbot(token)
    bot.startPolling()
    USERNAME="tgway_7"
    PASSWORD="afsalcp1"
  }else{
    token="5799384482:AAF8NF1Jyr4YVu9DqyH7-sP_BnyPBj8IfkA"
    bot=new tgbot(token)
    bot.setWebHook(process.env.HEROKU_URL+"/instagram/"+token)
    USERNAME="tgway.bot"
    PASSWORD="afsalcp4"
  }

module.exports={token,bot,adminId,USERNAME,PASSWORD}
})()