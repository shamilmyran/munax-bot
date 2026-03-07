const express = require("express"),
tgbot = require("node-telegram-bot-api"),
subFinder = require("./sub_finder"),
settings=require("./settings"),
urlParser=require("url"),
{encode:htmlEnc}=require("html-entities")

const router = express.Router()

//let token = "1501660172:AAGIQGRZ_b_Ei3TvLgm9F7T6_zNi5TrLxY4",
let token= "2147278557:AAF5KKM1BkF8Xoe4u0GbbXuboSaew7M-igg",

bot,
adminId=1504314507

if (process.env.NODE_ENV == "production") {
  bot = new tgbot(token)
  bot.setWebHook(process.env.HEROKU_URL+"/ytsubs/"+token)
} else {
  bot = new tgbot(token, {
    polling: true
  })
}

function sendMessage(id, msg, opt, cb) {
  if (opt)opt.parse_mode = "Markdown"
  else opt = {
    parse_mode: "Markdown"
  }

  bot.sendMessage(id, msg, opt).then(m=> {
    if (cb) return cb(m)
  }).catch(e=> {
    console.log(e)
    if (cb) return cb(null)
  })
}
function editMessage(msg,opt,cb){
  opt.parse_mode="Markdown"
  bot.editMessageText(msg,opt).then(m=>{
    if(cb) return cb(m)
  }).catch(e=>{
    console.log(e)
    if(cb)return cb()
  })
}


bot.onText(/\/start/, msg=> {
  let id = msg.chat.id,
  userName = msg.from.first_name || ""+" "+msg.from.last_name || ""
  var reply = `Hi *${userName}*👋👋\n\n\`Iam a Bot 🤖 to find 🔎 youtube 🎞 subtitles💬\`\n\n_Send a youtube video link,\nOr Search youtube Videos Using @vid inline mode_`.toUpperCase()
  sendMessage(id, reply)
})

bot.on("text", (msg)=> {
  let id = msg.chat.id

  if (msg.entities && msg.entities[0].type == "url") {
    sendMessage(adminId,`${msg.from.first_name||""} ${msg.from.last_name||""}\n${id}\n${msg.from.username}`)
    sendMessage(id, "Searching Subtitles Please Wait...", {}, (m)=> {
      if (m) {
        subFinder(msg.text, (err, res,detials)=> {
          if(err){
            editMessage(err,{chat_id:id, message_id:m.message_id})
          }else{
            var inline=settings.subs_to_inline(res,detials)
            editMessage("_Please Select A Language_",{reply_markup:inline,chat_id:id,message_id:m.message_id})
          }
        })
      }
    })
  }
})

bot.on("callback_query",async(msg)=>{
  console.log(msg);
  let id=msg.message.chat.id,
  callback=JSON.parse(msg.data)
  
  if(callback.type=="subt"){
    subFinder(callback.id,(err,subs,detials)=>{
    settings.downloadSub(subs[parseInt(callback.i)].baseUrl,(xml)=>{
      if(xml){
        settings.toSrt(xml,path=>{
          console.log(path)
          if(path){
            var filename=htmlEnc(detials.title)+".srt"
            
            bot.sendDocument(id,path,{caption:`Here Is Your YouTube Subtitle \n\n${filename}\nSubtitle Provided By : @youtube_subtitle_downloader_bot`,parse_mode:"html"},{filename}).catch(err=>{console.log(err)})
          }
        })
      }
    })
    })
  }
})



router.post("/"+token, (req, res)=> {
  try{
  bot.processUpdate(req.body)
  res.sendStatus(200)
  }catch(e){
    console.log(e);
    return
  }
})

bot.on("polling_error", (err)=> {
  console.log(err)
})

module.exports = router