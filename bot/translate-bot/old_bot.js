var request = require("request")
var fs = require("fs"),
FormData=require("form-data")

var settings = require("./src/settings")
const translater = require("./src/translate"),
{bot,token,adminId}=require("./src/config"),
{sendMessage:send_m,editMessage,sendDocument,deleteMsg,Button,sendPhoto} = require("./src/messenger"),
db=require("../../helper/db"),
socket=require("./src/socket").Router,
got=require("got")

var root = process.cwd()+"/bot/translate-bot"
var express = require("express")
var router = express.Router()
const groupId = parseInt(process.env.GroupId) || -1001591796704

let mainData=[],
helperGape=true,
rq=async(data)=>{
  return new Promise(async(resolve,reject)=>{
    request(data,(err,res,body)=>{
      resolve({err,res, body})
    })
  })
}

router.use("/webhook",socket)

//const groupId = -644230914
try{
  /*if (process.env.NODE_ENV === 'production') {
    bot = new telegramBot(token);
    bot.setWebHook(process.env.HEROKU_URL + "/translate/"+token);
  } else {
    bot = new telegramBot(token, {
      polling: true
    });
  }*/

  function sendMessage(id, text, markup, cb) {
    if(markup&&!markup.parse_mode)markup.parse_mode="Markdown"
    else if(!markup) markup={parse_mode:"Markdown"}
    bot.sendMessage(id, text, markup).then((res)=> {
      if (cb) return cb(res, null)
    }).catch(err=> {
      if (cb) return cb(null, err)
      console.log(err, "__message_sending_error__")
    })
  }
  function editMessageText(text,opt,cb){
    if(!opt.parse_mode)opt.parse_mode="Markdown"
    bot.editMessageText(text,opt).then(m=>{
      if(cb) return cb(m)
    }).catch(err=>{
      console.log(err,"__message_editing_error__")
      if(cb) return cb(null,err)
    })
  }
  
  async function helperForTranslate(){
    if(mainData.length&&translater.status()){
      translater.change(false)
      helperGape=false
      let sel=mainData.splice(0,1)[0]
      var {sts,data}=await settings.getData(sel)
      if(!sts){
        translater.change(true)
        helperForTranslate()
       
              }
      else{
        editMessageText(`Translation Process Started \n\nPlease Wait A Few Seconds\n\n\`Your File Translating To ${settings.isAvileLang(data.lang).name}\``,{chat_id:data.group||data.user,message_id:data.edit_msg_id})
        var file_url=data.file_url
        request(file_url,async(err,buff)=>{
          if(!err&&buff.body){
            buff.body=buff.body.toString("utf8")
            var {sts,subtitle}=settings.subtitle_convert(buff.body)
            if(sts){
              await fs.writeFileSync(root+"/subtitles/"+data.user+".srt",subtitle)
              translater.translate(data.user,data.lang).then(([err,id])=>{
                console.log(err,id,"hi how are you");
                if(err){
                  translater.change(true)
                  editMessageText("`Unexpected Error Occurred While` __Translation__ Process\n\nPlease Try Again",{chat_id:data.group||data.user,message_id:data.edit_msg_id})
                  settings.removeUser(data.user)
                  helperForTranslate()
                }else{
                  var reply_markup={inline_keyboard:[[{
                    text:"Share Your Opinion",
                    url:"https://telegramic.org/bot/subtitle_translate_bot/"
                  }]]},
                  filename=data.filename.split(".")
                  filename[filename.length-1]="@subtitle_translate_bot"
                  filename.push(".srt")
                  filename=filename.join(".")
                  bot.sendDocument(data.group||data.user,root+"/subtitles/"+id+".srt",{caption:"Subtitle Translated By : <u>@subtitle_translate_bot</u>\n\n<i>After Using The Subtitle, Please Share Your Opinion By Clicking The Inline Button</i>",parse_mode:"html",reply_to_message_id:data.msg_id,reply_markup},{filename}).then(async()=>{
                    
                    await db.updateUsage(data.user)
                    sendMessage(adminId,`Filename : ${data.filename.replace(/</g,"")}\n\nLanguage : ${data.lang}\nId : ${data.user}\nGroup : ${data.group||"Not in a group"}`,{parse_mode:"html"})
                    await fs.unlinkSync(root+"/subtitles/"+id+".srt")
                    settings.removeUser(id)
                    bot.deleteMessage(data.group||data.user,data.edit_msg_id)
                    helperForTranslate()
                  }).catch(()=>{
                    translater.change(true)
                    editMessageText("Unexpected error While File Uploading\n`Please Try Again`" ,{chat_id:data.group||data.user,message_id:edit_msg_id})
                    settings.removeUser(data.user)
                    helperForTranslate()
                  })
                }
              }).catch(e=>{
                translater.change(true)
                helperForTranslate()
              })
            }else{
              settings.removeUser(data.user)
              translater.change(true)
              editMessageText("*File Converting Error*\n\n`This file cannot be translated\n\nTry To Translate Another File`",{chat_id:data.group||data.user,message_id:data.edit_msg_id})
              helperForTranslate()
            }
          }else{
            settings.removeUser(data.user)
            translater.change(true)
            editMessageText("Unexpected Error Occurred While File Downloading",{chat_id:data.group||data.user,message_id:data.edit_msg_id})
            helperForTranslate()
          }
        })
      }
    }else{
      if(mainData.length) {
        setTimeout(()=>{
        helperForTranslate()
          },2000)
                          }
      else helperGape=true
    }
  }
  
  
  bot.onText(/\/start/,
    async(msg, match)=> {
      try {
        let id=msg.chat.id
          var text ;
          (msg.chat.type=="private")?text=`<b>Hi</b> ${(msg.chat.first_name||"").replace(/>|</g,"")} ${(msg.chat.last_name||"").replace(/>|</g,"")}\`\n\n  I am a bot to translate subtitles\n\n  <b>Send A subtitle File...</b> 📁📁📁\n\n<b><code>Use the /languages ​​command to see if your language is supported</code></b>`:text=`<code>Hi ${msg.from.first_name||""} ${msg.from.last_name||""}</code>\n\n  I am a bot 🤖 to translate 🅰️🏳️‍🌈 subtitles\n\n <b>Send A subtitle File...📁📁📁</b>`;
          
          sendMessage(id, text, {
            parse_mode: "html"
          })
          let usercheck=await db.get("user_datas",{user:msg.from.id},true)
          if(usercheck&&usercheck.bots.includes("translate"))return
          console.log(usercheck);
          
          send_m(adminId,`new user joined\n user id : ${msg.from.id}\nname : ${msg.from.first_name||""} ${msg.from.last_name||""}\nusername : ${msg.from.username||"no username"}`)
          if(!usercheck){
            await db.set("user_datas",{user:msg.from.id, bots:["translate"]})
            return
          }
          usercheck.bots.push("translate")
          await db.update("user_datas",{user:msg.from.id},{bots:usercheck.bots})
      }catch(err) {
        console.log(err)
      }
    })

  bot.on("document",
    async(msg)=> {
      try {
        var limit=await settings.limitSts(msg.from.id)
        if(limit){
        if (msg.chat.type !== "private" && msg.chat.id !== groupId) throw "Not supported Group"
        var id = msg.from.id
        var checkAlready = JSON.parse(await fs.readFileSync(`${root}/requesters.txt`)).findIndex(x=>x.user == id),
        fileExt = msg.document.file_name.split("."),
        fileExtns = ["ass","srt","ttml","dfxp","vtt","scc","ssa","xml"]
        fileExt = fileExt[fileExt.length-1]
        if (msg.document.file_size <= 1050000 && checkAlready===-1 && fileExtns.indexOf(fileExt)!=-1) {
          var requesters = JSON.parse(await fs.readFileSync(`${root}/requesters.txt`));
      
          var text;
          if (msg.chat.type == "private") {
            text = `Please Send Your Language name\n\nEg : English\n\nTIP : You Can Also send *ISO-2* code,In The Case Of English It Is *en*`
          } else {
            
            text = `Your Are In *Q*\nPlease Wait A Few Seconds..`
          }
          sendMessage(msg.chat.id, text, {
            parse_mode: "Markdown", reply_to_message_id: msg.message_id
          }, async(m, e)=> {
            if (!e) {
              var file_url=await bot.getFileLink(msg.document.file_id),
              webhook=process.env.HEROKU_URL+"/translate/webhook/vip"
              if (msg.chat.type == "private") {
                requesters.push({
                  user: id,
                  filename: msg.document.file_name,
                  msg_id: msg.message_id,
                  file_url,
                  webhook,
                  edit_msg_id: m.message_id,
               
                })
              } else {
                requesters.push({
                  user: id,
                  group: msg.chat.id,
                  filename: msg.document.file_name,
               
                  msg_id: msg.message_id,
                  lang: "ml",
                  file_id: msg.document.file_id,
                  edit_msg_id: m.message_id,
                  file_url,
                  webhook
                })
                mainData.push(msg.from.id)
              }
              await fs.writeFileSync(`${root}/requesters.txt`, JSON.stringify(requesters))
              if(helperGape) helperForTranslate()
            }

          })


        } else {
          var error;
          if(fileExt=="zip"){
            error="`Please Extract The`* Zip *`File And Send The Subtitle File`"
          }
          else if(fileExtns.indexOf(fileExt)==-1){
            error=`The file format you sent (${fileExt}) is not supported\n\n*SUPPORTED FILE FORMATS :*\n\n${JSON.stringify(fileExtns).replace("[","").replace("]","").replace(/"/g,"`").replace(/,/g,"  ")}`
          }else if(checkAlready!=-1){
            error="`A translation request you previously submitted has not been cancelled`\n\n*Delete the request using the /cancel command*"
          }else if(msg.document.file_size>=1050000){
            error="`The File You Sended Is Bigger Than 1MB File Size`\n\n*Please make sure the file you sent is a subtitle*"
          }else error="`There is a server error`\n\n*Please Try Again*"
          sendMessage(msg.chat.id,error,{parse_mode:"Markdown"})
        }
        }else{
          
          var data=await db.get("limit",{user:msg.from.id}),
          planData=await db.get("vip",{user:msg.from.id}),
          reply=`<b>Hi ${msg.from.first_name}</b>Your daily translation limit has been exceeded\nYou can purchase a plan for translate more files \nClick The Link for purchase a plan ${process.env.HEROKU_URL}/plans?id=${msg.from.id}`
          console.log(data,planData);
          sendMessage(msg.chat.id,reply,{parse_mode:"html"})
        }
      }catch(err) {
        console.log(err)
        return
      }

    })

  bot.on("text",(msg)=>{
    if(msg.text.replace(/ /g,"")==="cancel"||msg.text.replace(/ /g,"")==="Cancel")return
    let id=msg.chat.id
    if(!msg.entities&&msg.chat.type==="private"){
      settings.getData(msg.from.id,async({sts,data})=>{
      if(sts&&data&&!data.lang){
        bot.deleteMessage(id,msg.message_id)
        if(settings.isAvileLang(msg.text)){
          await settings.updateUser(msg.from.id,{key:'lang',value:msg.text})
          let uId=Date.now()
          await settings.updateUser(msg.from.id,{key:'id',value:uId})
          await bot.editMessageText(`Your In *Q*\n\n Waiting To Be Translated\n\`Please Wait A Few Seconds\``,{chat_id:id,message_id:data.edit_msg_id}).catch(e=>{return})
          request.get(process.env.HEROKU_URL+"/api/translate/addUserById?id="+msg.from.id,(err,body)=>{
            console.log(body,"in request data");
          })
        console.log(sts,data);
        }else{
          editMessageText(`This Language *${msg.text}* Is Not Available\n\n\`Please Check The Spelling And Try Again\`\n\nUse The /languages Command To Check Is Your Language Is Available ,\`AND TRY TO RESEND THE LANGUAGE NAME\``,{chat_id:id,message_id:data.edit_msg_id})
        }
      }else if(!data){
       sendMessage(id,"🙄🙄 First Send A Subtitle File 📁📁 And Try Again")
      }
      })
    }
  })

  bot.onText(/\/cancel|^cancel$|^Cancel$/,
    async msg=> {
      try{
      bot.deleteMessage(msg.chat.id,msg.message_id).catch(e=>console.log(e)).catch(e=>{return})
      let id = msg.chat.id
      var reqList = JSON.parse(await fs.readFileSync(`${root}/requesters.txt`))
      if (reqList.findIndex(x=>x.user == msg.from.id)!==-1) {
        var inline = {
          parse_mode:"html",
          reply_markup: {
            one_time_keyboard: true,
            resize_keyboard: true,
            inline_keyboard: [
              [{
                text: "Yes",
                callback_data: JSON.stringify({
                  command: "cancel",
                  data: "yes",
                  user: msg.from.id
                })
              }],
              [{
                text: "No",
                callback_data: JSON.stringify({
                  command: "cancel",
                  data: "no",
                  user: msg.from.id
                })
              }]
            ]
          }}
          var filename=(reqList.filter(x=>x.user===msg.from.id)[0].filename||"<file name not defined").replace(/\>|\</g,"")
        sendMessage(id, `Are you sure want to cancel\n\n<b>File details</b>\n\nfile_name : <u>${filename}</u>`, inline)

      } else {
        sendMessage(id, "None of your requests exist")
      }
      }catch(e){
        console.log(e);
        return
      }
    })
  bot.onText(/\/languages/,
    (msg)=> {
      if (msg.chat.type == "private") {
        let id = msg.chat.id
        settings.showLangs(list=> {
          sendMessage(id, list.replace("Automatic`", ""), {
            parse_mode: "Markdown"
          })
        })
      }
    })
  bot.onText(/\/send/,
    (msg, match)=> {
      let id = msg.chat.id
      if (adminId == id) {
        var text = match.input.replace("/send ", '').split("|")
        var userId = text[0]
        var adminMsg = text[1]
        sendMessage(userId, adminMsg)
      }
    })
    
  bot.onText(/\/donate/,(msg)=>{
    let id=msg.chat.id
   
    sendMessage(id,`Hi *${msg.from.first_name||""} ${msg.from.last_name||""}* _Thanks for deciding to donate_ \n \`Donation is not mandatory, donate only if you like the bot\`\n\nDonate to promote the bot developer`,{reply_markup:{inline_keyboard:[[{text:"Donate Now (paypal)",url:"https://www.paypal.com/paypalme/afsalcp66"}]]}})
  })
  
  bot.onText(/\/plans/,msg=>{
    let id=msg.chat.id,
    name=(msg.from.first_name||"")+' '+(msg.from.last_name||""),
    url=`${process.env.HEROKU_URL||"http://localhost:3000"}/plans/?id=${msg.from.id}`
    var reply=`Hi ${name}\nTankyou For deciding To Purchase A Plan\nClick The Url Or The Inline Button To Know About Plans ,And Purchase a Plan\nURL:- ${url}`
    sendMessage(id,reply,{reply_markup:{inline_keyboard:[[{text:"Click To View Plans",url}]]}})
  })
  
  bot.onText(/\/logs/,(msg)=>{
    let id=msg.chat.id
    var url=`${process.env.HEROKU_URL}/logs/?id=${msg.from.id}`
    var txt=`Hi <b>${msg.from.first_name}</b>\n\nYou Can View Your Translation Logs By Clicking The Url Below \n<a href="${url}"><b>view translation logs</b></a>`
    sendMessage(id,txt,{parse_mode:"html",reply_markup:{inline_keyboard:[[{text:"View Logs",url}]]}})
  })

  bot.on("callback_query",
    async msg=> {
      try{
      let id = msg.message.chat.id
      var callback = JSON.parse(msg.data);
      if (callback.command == "cancel" && callback.user == msg.from.id) {
          var {sts,data} = await settings.getData(msg.from.id)
        if (callback.data == "yes") {
          if (!sts) {
            bot.answerCallbackQuery(msg.id, "None of your requests are currently in progress".toUpperCase(), true).catch(e=>{return})
            bot.deleteMessage(id, msg.message.message_id).catch(e=>{return})
          } else {
            await settings.removeUser(msg.from.id)
            bot.deleteMessage(id,data.edit_msg_id).catch(e=>console.log(e))
            bot.answerCallbackQuery(msg.id, "Your request has been successfully deleted".toUpperCase(), true).catch(e=>{return})
            bot.deleteMessage(id, msg.message.message_id).catch(e=>console.log(e))
          }

        } else {
          bot.answerCallbackQuery(msg.id, "Your File Seccessfully Saved".toUpperCase(), true).catch(e=>{return})
          bot.deleteMessage(id,msg.message.message_id).catch(e=>console.log(e))
          if(data.lang){
            editMessageText(`*Your Activation Link is :* [ACTIVATION LINK](${settings.genarateLink(data.id)})\n\n\`${Date().toString()}\``, {
            chat_id: (data.group || data.user), message_id: data.edit_msg_id, parse_mode: "Markdown"
          })
          }else {
           
            editMessageText("Please Send Your Language\nEg : `English`\n*Just Send The Language Name*\n\n`"+Date().toString()+"`",{chat_id:data.user,message_id:data.edit_msg_id,parse_mode:"Markdown"})
          }
        }
      } else if (callback.command == "cancel") {
        bot.answerCallbackQuery(msg.id, "This is not for you".toUpperCase(), true).catch(err=>console.log(err))
      }
      }catch(err){
        console.log(err)
      }
    })

  bot.onText(/\/get_member/,
    async(msg)=> {
      try{
      if (adminId == String(msg.from.id)) {
        var memberId = (msg.text.split(" ")[1]) || adminId
        let user=JSON.stringify( await bot.getChat(memberId))
        
        //user=user.replace(/>|<|"|&|\=/g,"")
        bot.sendMessage(adminId,user).catch(e=>e)
        //bot.getChat(memberId).then(m=>sendMessage(adminId, JSON.stringify(m).replace(/>|</g,"")) ,{parse_mode:"html"}).catch(err=>console.log(err));
      }
      }catch(e){
        console.log(e);
        return
      }
    })

bot.onText(/\/id/,(msg)=>{
  sendMessage(msg.chat.id,`User Id : \`${msg.from.id}\``)
})

let data_collection=true

bot.onText(/^\/collect$/,async msg=>{
  try{
  if(msg.chat.id!=adminId)return
  data_collection=true
  let {last_coll}=(await db.get("bots",{bot:"translate"},true))||{last_coll:1}
  if(last_coll===1)await db.set("bots",{bot:"translate",last_coll:1})
  let {message_id:end}=await bot.sendMessage(adminId,"collecting datas please wait")
  console.log(end);
  let founded=0
  for(var i=Number(last_coll);i<end;i++){
    if(!(i%20)){
      console.log(await editMessage(`total message checked : ${i}\ntotal user founded : ${founded}`,{message_id:end,chat_id:adminId}))
      await db.update("bots",{bot:"translate"},{last_coll:i})
    }
    
    if(!data_collection)break
    var t="checking message "+i
    let m=await bot.sendMessage(adminId,t,{reply_to_message_id:i}).catch(e=>e)
    await deleteMsg(adminId,m.message_id)
    if(m instanceof Error||!m.reply_to_message||!m.reply_to_message.from.is_bot||!m.reply_to_message.text) continue
    if(!m.reply_to_message.text.toLowerCase().match(/\n[0-9]{5,15}|id( ){0,5}(:){0,1}( ){0,5}[0-9]{5,15}|user( ){0,5}(:){0,1}( ){0,5}[0-9]{5,15}/))continue
    let id=m.reply_to_message.text.toLowerCase().match(/\n[0-9]{5,15}|id( ){0,5}(:){0,1}( ){0,5}[0-9]{5,15}|user( ){0,5}(:){0,1}( ){0,5}[0-9]{5,15}/)
    id=Number(id[0].replace(/[^0-9]{0,}/g,""))
    m=await bot.sendMessage(id,"checking").catch(e=>e)
    deleteMsg(id,m.message_id)
    if(m instanceof Error)continue
    var is_user=await db.get("user_datas",{user: id},true)
    if(!is_user){
      await db.set("user_datas",{user:id,bots:["translate"]})
      founded++
      continue
    }
    if(is_user.bots.includes("translate")) continue
    is_user.bots.push("translate")
    await db.update("user_datas",{user:id},{bots:is_user.bots})
    founded++
    continue
  }
  console.log("loop ended i",i);
  }catch(e){
    console.log(e);
    return
  }
  
})

bot.onText(/^\/stop_col$/,async m=>{
  if(m.chat.id!=adminId)return
  data_collection=false
  sendMessage(adminId,"collecting data is stopped")
})

bot.onText(/^\/count$/,async(msg)=>{
  if(msg.chat.id!=adminId)return
  
  let count=await db.count("user_datas",{bots:{$in:["translate"]}})
  sendMessage(adminId,"total users : "+count)
})

bot.onText(/^\/notify/,async msg=>{
  try {
    if(msg.chat.id!=adminId)return
    let text=msg.text.replace("/notify","")
    
    // extracting buttons
    let btn=text.match(/btn::\[\[\[.+\]\]\]/)
    if(btn){
      btn=btn[0].replace("btn::","")
      btn=Button(JSON.parse(btn))
      text=text.replace(/btn::\[\[\[.+/,"")
    }
    let img=text.match(/img::.+/)
    if(img){
      img=img[0].replace("img::","")
      text=text.replace("img::"+img,"")
    }
    let users
    let test=text.match(/test::.+/)
    
    if(test)users=[{user:adminId}]
    else users=await db.get("user_datas",{bots:{$in:["translate"]}})
    console.log(img,text);
    //let users=[{user:adminId}]
    var i=0
    let m=await send_m(adminId,"message send notification")
    let time=Date.now()/1000
    let len=users.length
    for(let {user} of users){
      if(!(i%25)){
        var nt=Date.now()/1000
        editMessage(`total message to be sended : ${users.length}\ntotal message sended : ${i}\nest time to  be done: ${Math.round((((nt-time)/i*len))-(nt-time))} sec`,{chat_id:adminId,message_id:m.message_id})
      }
      if(img){
        sendPhoto(user,img,{reply_markup:btn, caption:text,parse_mode:"html"})
      }
      else send_m(user,text,{reply_markup:btn})
      i++
      await sleep(50)
    }
    var nt=Date.now()/1000
    editMessage(`total message to be sended : ${users.length}\ntotal message sended : ${i}\nest time to  be done: ${Math.round((((nt-time)/i*len))-(nt-time))} sec`,{chat_id:adminId,message_id:m.message_id})
    send_m(adminId,"message sending ended")
    
  } catch (e) {
    console.log(e);
    return
  }
})

bot.on("photo",async msg=>{
  if(adminId==msg.chat.id){
    let url=await bot.getFileLink(msg.photo.pop().file_id)
    send_m(adminId, url+"\n\n"+msg.photo.pop().file_id)
  }
})

  /*bot.on("new_chat_members", (msg)=> {
  var group = msg.chat.id
  if (group ==groupId) {
    var msgTxt = `
 *ഹായ് ${msg.from.first_name || ""} ${msg.from.last_name || ""}*\n\n*മലയാളം സബ്ടൈറ്റിൽ ഗ്രൂപ്പിലേക്ക് സ്വാഗതം 👋*\n മറ്റു ഭാഷകളിലുള സബ്ടൈറ്റിലുകൾ 📁📁📁 നിങ്ങൾക്ക് മലയാളത്തിലേക്ക് പരിഭാഷ 🀄🀄🀄 ചെയ്യാൻ ഈ ഗ്രൂപ്പ് ഉപയോഗിക്കാം\n\n*നിങ്ങളുടെ കയ്യിലുള്ള സബ്ടൈറ്റിലുകൾ ഈ ഗ്രൂപ്പിലേക്ക് അയച്ചുകൊണ്ട് അവ പെട്ടന്ന് 🕒🕒🕒 തന്നെ പരിഭാഷ ചെയ്യാം*\n\n*നിങ്ങളുടെ കയ്യിൽ സബ്ടൈറ്റിലുകൾ ഇല്ലെങ്കിൽ \n@subtitle_dl_bot\n പോലെയുള്ള ബോട്ടുകളുടെ ഉപയോഗിച്ച് ഡൗണ്ലോഡ് ചെയ്യു* \n\n ഏകദേശം 1️⃣5️⃣ സെക്കൻഡ് കൊണ്ടുതന്നെ നിങ്ങളുടെ സബ്ടൈറ്റിൽ പരിഭാഷ ചെയ്യാം\n *ശ്രദ്ധിക്കുക:-\n ഇത് mson ഇല് നിന്നുള്ള സബ്ടൈറ്റിലുകൾ നൽകുന്ന ഗ്രൂപ്പ് അല്ല .mson ഇല്‍‌ ഇല്ലാത്ത സബ്ടൈറ്റിലുകൾ ഗൂഗിൾ ട്രാൻസ്ലേഷൻ ഉപയോഗിച്ച് പരിഭാഷ ചെയ്യുകയാണ് ചെയ്യുന്നത്,അതുകൊണ്ട് തന്നെ നൽകുന്ന സബ്ടൈറ്റിലുകൾ 100% പെർഫെക്റ്റ് ആയിരിക്കില്ല.പരിഭാഷ ചെയ്യുന്നതിന് മുൻപ് പരിഭാഷ ചെയ്യേണ്ട ഫയൽ mson പുറത്തിറക്കിയിട്ടുണ്ടോ എന്ന് ഉറപ്പ് വരുത്തുക,ഉണ്ടെങ്കിൽ അത് ഉപയോഗിക്കുന്നത് ആണ് കൂടുതൽ നല്ലത് * url:https://www.malayalamsubtitles.org`
    sendMessage(group, msgTxt, {
      parse_mode: "Markdown"
    })
  }
})*/

  bot.on("polling_error",
    (err)=> {
      console.log(err)
    })
  bot.on("webhook_error",
    (err)=> {
      console.log(err)
    })

  
    
  
  router.post("/"+token, (req,
    res)=> {
     try{
      settings.clear()
      if(req.body.document)bot.sendMessage(adminId,"One User Used detials "+JSON.stringify(req.body))
      bot.processUpdate(req.body)
      res.sendStatus(200)
     }catch(e){
       console.log(e);
       return res.end()
     }finally{
       return
     }
  })
  router.get("/reqs", async(req,
    res)=> {
    try {
      var reqs = JSON.parse(await fs.readFileSync(`${root}/requesters.txt`).toString());
      res.json(reqs)
    }catch(err) {
      res.json({
        err,
      })
    }
  })
  router.get("/start",async(req,res)=>{
  try{
  var uId=req.query.uId
  if(!uId) throw "Required Data is not found"
  let data=await settings.checkValid(uId)
  console.log(data,"__data_from_function__");
  if(!data)throw "Request Not Found. Please check the url"
  var ads=await settings.getAds()
  let org=process.env.HEROKU_URL.split("//")[1].split(".")[0]
  org=(org==="tgway"?true:false)
  res.render("translate/translator",{headerChange:true,ads,uId,org})
  }catch(e){
    if(typeof e=="string")res.end(e)
    else{
      res.end("Unexpected Error Occurred Please Refresh The Page")
    }
  }
})
  
  router.get("/download",async(req,res)=>{
    try{
    if(req.query.id&&req.query.user){
      var m=await bot.editMessageCaption(`Subtitle Translated By : @subtitle_translate_bot\n\n<code>After Using The Subtitle, Please Rate Your Opinion About The Subtitle Using Inline Button</code>\n\n<b>Tankyou :)</b>\n<code>${Date.now()}</code>`,{message_id:req.query.id,chat_id:req.query.user,parse_mode:'html',reply_markup:{inline_keyboard:[[{text:"Share Your Opinion",url:"https://telegramic.org/bot/subtitle_translate_bot/"}]]}}).catch(e=>{return})
      if(!m)return res.end()
      var link=await bot.getFileLink(m.document.file_id)
      var {body,err}=await rq(link)
      if(err)return res.end()
      body=body.toString("utf8")
      if(!req.query.force) body=body+"[{$filename:"+m.document.file_name
      body=Buffer.from(body,"utf-8")
      res.set({'Content-Type':`${m.document.mime_type};charset=utf-8`,'Content-Length':m.document.file_size});
      if(req.query.force)res.attachment(m.document.file_name)
  //   var f=await fs.readFileSync("./public/videos/imdb_tutorial.mp4")
      res.send(body).end()
    }else{
      return res.end()
    }
    }catch(e){
      console.log(e);
      return
    }
  })
  router.post("/webhook/vip",async(req,res)=>{
    try {
      let data=req.body,
      base_url=`${process.env.HEROKU_URL}/api/translate`
      if(data.type==="msg"||data.type==="err"){
        await editMessage(data.msg||data.err||"Unknown Text",{chat_id:data.group||data.user,message_id:data.edit_msg_id})
        if(data.type==="msg")return res.end()
        await got.get(base_url+"/removeUser?user="+data.user)
        return res.end()
      }
      if(data.type!=="file")return res.end()
      let file=(await got.get(data.file)).body.toString("utf8")
      if(!file){
        await editMessage("Unexpected Error Occurred While File Downloading Please Try To Translate New One",{chat_id:data.group||data.user,message_id:data.edit_msg_id})
        await got.get(base_url+"/removeUser?user="+data.user)
        return res.end()
      }
      await fs.writeFileSync(root+"/subtitles/"+data.user+".srt",file.toString("utf8"))
      let sendedFile=await sendDocument(data.group||data.user,root+"/subtitles/"+data.user+".srt",{
        disable_notification:true,
        caption:`Subtitle Translated By : @subtitle_translate_bot\n\n<code>After Using The Subtitle, Please Rate Your Opinion About The Subtitle Using Inline Button</code>`,parse_mode:"html",reply_markup:{inline_keyboard:[[{text:"Share Your Opinion",url:"https://telegramic.org/bot/subtitle_translate_bot/"}]]}},{
        filename:data.filename.split(".").reduce((t,v,i,a)=>i!=a.length-1?t+=(v+"."):t+="@subtitle_translate_bot.srt","")})
      await fs.unlinkSync(root+"/subtitles/"+data.user+".srt")
      if(!sendedFile||typeof sendedFile.sts!=="undefined"){
        await editMessage("Unexpected Error Occurred While File Translated File Uploading\nPlease Try Again",{chat_id:data.group||data.user,message_id:data.edit_msg_id})
        await got.get(base_url+"/removeUser?user="+data.user)
        return res.end()
      }
      
      await db.updateUsage(data.user)
      await deleteMsg(data.group||data.user,data.edit_msg_id)
      await got.get(base_url+"/removeUser?user="+data.user)
      sendMessage(adminId,`file : <code>${data.filename.replace(/>|</g,"")}</code>\nlang : <code>${data.lang}</code>\nid : <code>${data.user}</code>`,{parse_mode:"html"})
      return res.end()
    } catch (e) {
      console.log(e);
      res.end()
    }
  })
}catch(err){
  console.log(err);
  return res.end()
}
module.exports = router

let sleep=async (time)=>{
  return new Promise((resolve,reject)=>{
    setTimeout(()=>{
      resolve()
    },time)
  })
}
