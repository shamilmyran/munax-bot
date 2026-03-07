const router = require("express").Router(), //Setuping The Express For Setting The WebHook

{bot,adminId,groupId,token}=require("./src/config") //bot configurations
const {sendMessage,editMessage,sendDocument,deleteMsg,Button}=require("./src/messenger"),//Message Options
request=require ("request"),
fs=require("fs"),
settings=require("./src/settings"),
got=require("got"),
db=require("../../helper/db"),
SS=require("./src/SS")

require("./src/OS")
require("./src/SS")
require("./src/MS"),
app=require("express")(),
socket=require("./src/socket")

let root=process.cwd()+"/bot/group-translate"

router.use("/webhook",socket.Router)

//Work when user send a /start command
bot.onText(/^\/start$/,(msg)=>{
  try{
    let chat=msg.chat.id,
    user=`${msg.from.first_name||""} ${msg.from.last_name||""}`.replace(/>|</g,""),
    reply;
 
    console.log(msg);
    if(msg.chat.type==="private")reply=`Hi <code>${user}</code> \n Welcome to subtitle translate and finding bot\n<b>This bot made for malayalam users,<u>And iam only work in @malayalam_subtitles_zone</u></b>\nIf you want to translate subtitles use this bot @subtitle_translate_bot`
    else{
      if(msg.chat.id!==groupId)throw "not supprted group"  //checking that is it the messge from my group if not throw an message
      reply=`ഹായ് <code>${user}</code>\n\n<b>ഞാൻ സബ്ടൈറ്റിലുകൾ കണ്ടെത്താനും പരിഭാഷ ചെയ്യാനും വേണ്ടി ഉള്ള ബോട്ട് ആണ്</b>\n\n <u>നിങ്ങൾക്ക് പരിഭാഷ ചെയ്യേണ്ട സിനിമയുടെയോ/സീരീസിന്റെയോ പേര് എനിക്ക് അയച്ച് തരുക</u>\n\n അല്ലെങ്കിൽ പരിഭാഷ ചെയ്യേണ്ട ഫയൽ എനിക്ക് അയച്ച് തരിക` 
    }
    sendMessage(chat,reply,{reply_to_message_id:msg.message_id})
    return
  }catch(e){
    console.log(e);
    return
  }
})

// for batch translatation
bot.onText(/^\/start ss-(\d+)/i,async(msg,path)=>{
  try{
    path=Number(path[1])
    
    path=await bot.forwardMessage(msg.chat.id,groupId,path)
    deleteMsg(msg.chat.id,path.message_id)
    path = path.text.match(/\*#@\$::(.+)/)[1]
    
    msg=await sendMessage(msg.chat.id,"Processing....\nPlease wait")
    
    let data=await db.get("translate",{user:msg.chat.id},true)
    if(data)return editMessage("You are already in batch mode please remove the old request using /cancel command",{chat_id:msg.chat.id,message_id:msg.message_id})
    
    let files=await SS.download(path)
    
    await db.set("translate",{user:msg.chat.id,edit_msg_id:msg.message_id,files:[],filenames:[]})
    
    got.post(`${process.env.HEROKU_URL}/api/translate/addUser`,{json:{user:msg.chat.id,file_url:process.env.HEROKU_URL,lang:"ml",webhook:process.env.HEROKU_URL+"/translate/group/webhook",notStart:true}})
    console.log(files);
    for(const file of files){
      let id=Date.now()
      
      fs.writeFileSync(root+"/subs/"+id+".srt",new Buffer.from(file.file.data))
      
      await db.db.get().collection("translate").updateOne({user:msg.chat.id},{$push:{files:id,filenames:file.filename}})
    }
    
    editMessage("ട്രാൻസ്‌ലേഷൻ തുടങ്ങാൻ വേണ്ടി താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്യുക",{
      chat_id:msg.chat.id,
      message_id:msg.message_id,
      reply_markup:Button([[["Start translation",process.env.HEROKU_URL+"/translate/group/webhook/batch","webapp"]]])
    })
  }catch(e){
    console.log(e);
    return
  }
})



//for cancel a request 
bot.onText(/\/cancel|^cancel$|^Cancel$/,(msg)=>{
  let id=msg.chat.id
  var baseUrl=`${process.env.HEROKU_URL||"http://localhost:3000"}/api/translate`
  bot.deleteMessage(id,msg.message_id).catch(err=>{return})
  request(baseUrl+"/checkUser?user="+msg.from.id,(err,res)=>{
    if(!err){
      res=JSON.parse(res.body);
      if(res.sts){
        var inline={inline_keyboard:[[{text:"YES",callback_data:JSON.stringify({type:"cancel",user:msg.from.id})}]]}
        sendMessage(id,`<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>\nAre You Sure Want To Cancel The Request\n\n<b>FILE DETAILS : </b>\n\n<u>Filename : </u><code>${res.data.filename}</code>`,{parse_mode:"html",reply_markup: inline})
      }else{
        sendMessage(id,`<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>\n_None Of Your Previous Request Found..._`)
      }
    }else{
      sendMessage(id,`Unexpected Error While Fetching User Data...\n\n\`Please Try Again\`\n<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>`)
    }
  })
})

// When user send a message to bot, this emitter will be detect is it wanted message
bot.on("text",msg=>{
  try {
    if(msg.text.replace(/ /g,"")==="cancel"||msg.text.replace(/ /g,"")==="Cancel")return
    if(msg.text.match(/[@<>/\\{}]/))return
    if(msg.chat.type==="private")throw "It is Only Work In @malayalam_subtitles_zone group"
    if(msg.chat.id!=groupId)return
    let markup={
      inline_keyboard:[
        [
          {
            text:"Open Subtitles",
            callback_data:JSON.stringify({t:"web",d:"OS"})
          }
        ],
        [
          {
            text:"Subscene",
            callback_data:JSON.stringify({t:"web",d:"SS"})
          }
        ],
        [
          {
            text:"Msone",
            callback_data:JSON.stringify({t:"web",d:"MS"})
          }
        ]
      ]
    }
    throw [
      msg.chat.id,
      "ഏത് വെബ്സൈറ്റിൽ നിന്നാണ് സബ്ടൈറ്റിൽ ഡൗൺലോഡ്/സേർച്ച് ചെയ്യേണ്ടത് എന്ന് സെലക്ട് ചെയ്യുക\n\n<u><code>ആദ്യം mson ഇൽ സേർച്ച് ചെയ്തു സബ്ടൈറ്റിൽ ഒന്നും കിട്ടിയില്ലെങ്കിൽ മറ്റു വെബ്സൈറ്റുകളിൽ സേർച്ച് ചെയ്യുന്നതാണ് നല്ലത്</code></u>",
      {reply_markup:markup,reply_to_message_id:msg.message_id}
      ]
  } catch (e) {
    if(e instanceof Error){console.log(e);return;}
    if(Array.isArray(e))sendMessage(...e)
    if(typeof e ==="string")sendMessage(msg.chat.id,e)
    return
  }
})


//for a message verification ,maybe this option will a temporary part ,it will be remove any time or not
bot.onText(/\/get_message/,(msg)=>{
  let id=msg.chat.id,
  msgId=msg.text.split(" ")[1]
  if(id==adminId&&msgId){
    sendMessage(groupId,"This a checking for bugg fix",{reply_to_message_id:msgId},(m)=>{
      try{
        if(!m) throw "No Message Found Or An Error"
        bot.deleteMessage(groupId,m.message_id).catch(e=>console.log(e))
        sendMessage(id,JSON.stringify(m.reply_to_message).replace(/\<|\>|\//g,""),{parse_mode:"html"})
        console.log(m);
      }catch(e){
        sendMessage(id,"there is an error : "+e.toString())
      }
    })
  }
})

// to know about our other bots
bot.onText(/^\/ourbots/,msg=>{
  try {
      sendMessage(msg.chat.id,`<a href="${process.env.HEROKU_URL}">Click here</a> to view our other bots`)
  } catch (e) {
    console.log(e);
    return
  }
})


//if user send a subtititle to the group this callback will be work
bot.on("document",async msg=>{
  try {
    let chat=msg.chat.id
    if(msg.chat.type==="private")throw `<b>Hi ${msg.from.first_name.replace(/>|</g,"")} !!</b> . <code>Welcome To Subtitle 📁 Translate Bot 🅰️🉐</code>\n\n This bot made for <b>@malayalam_subtitles_zone</b>  👥👥.\n\n<u>If You Want To Translate Use This</u> <a href="https://t.me/subtitle_translate_bot">bot</a>`
    if(chat!==groupId)return
    let doc=msg.document,
    fileExt=doc.file_name.split(".").pop(),
    exts=["ass","srt","ttml","dfxp","vtt","scc","ssa","xml","txt"]
    if(fileExt.toLowerCase()==="zip")throw "നിങ്ങള് സെന്റ് ചെയ്തു തന്ന ഫയൽ സിപ് ടൈപിൽ ഉള്ളതാണ്\n സിപ് ഫയൽ എക്സ്ട്രാക്ട് ചെയ്തത് സബ്ടൈറ്റിൽ ഫയല് സെന്റ് ചെയ്യുക"
    if(exts.indexOf(fileExt)===-1)throw "നിങ്ങള് സെന്റ് ചെയ്തു തന്ന "+fileExt+" ഫയല് ടൈപ്പ് സപ്പോർട്ട് ചെയ്യില്ല\n സപ്പോർട്ട് ചെയ്യുന്ന ഫയൽ ടിപുകൾ "+exts.join(" , ")
    if(doc.file_size>2*1024*1024)throw "മാക്സിമം 2 MB സൈസ്‌ വരെയുള്ള ഫയലുകളെ പരിഭാഷ ചെയ്യാൻ സാധിക്കുക യുള്ളു\n നിങ്ങള് സെന്റ് ചെയ്തു തന്ന ഫയൽ 2MB യേക്കൾ കൂടുതലാണ്"
    let vip=await db.get("vip",{user:String(msg.from.id)}, true)
    let m,res,
    file_url=await bot.getFileLink(doc.file_id),
    webhook=`${process.env.HEROKU_URL}/translate/group/webhook/vip`
    console.log(vip);
    if(vip){
      m=await sendMessage(chat,"പരിഭാഷ തുടങ്ങാൻ വേണ്ടി കാത്തു നിൽക്കുന്നു\n ദയവായി കാത്തു നിൽക്കുക",{reply_to_message_id:msg.message_id})
      if(!m)throw "an server error occurred \nPlease Try Again"
      res=await got.post(`${process.env.HEROKU_URL}/api/translate/addUser?`,{json:{
        user:msg.from.id,
        group:chat,
        lang:"ml",
        webhook:webhook,
        file_url,
        msg_id:msg.message_id,
        edit_msg_id:m.message_id,
        filename:doc.file_name
      }}).json()
    }
    else{
      let uId=Date.now(),
      url=`${process.env.HEROKU_URL}/translate/group/start?uId=${uId}`
      
      m=await sendMessage(chat,`പരിഭാഷ തുടങ്ങാൻ വേണ്ടി കാത്തു നിൽക്കുന്നു\n ദയവായി കാത്തു നിൽക്കുക\n<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>`,{reply_to_message_id:msg.message_id})
      url=`${process.env.HEROKU_URL}/api/translate/addUser`
      res=await got.post(url,{json:{
        filename:doc.file_name,
        file_url,
        lang:"ml",
        user:msg.from.id,
        group:chat,
        msg_id:msg.message_id,
        edit_msg_id:m.message_id,
        webhook,
        id:uId
      }}).json()
    }
    if(res.sts)return
    console.log(res);
    return await editMessage("നിങ്ങളുടെ ഒരു പഴയ റിക്വസ്റ്റ് സെർവറിൽ ഉണ്ട്, താഴെയുള്ള ബട്ടൺ ഉപയോഗിച്ച് പഴയ റിക്വസ്റ്റ് ഇല്ലാതാക്കുക\n\n<code>പഴയ റിക്കസ്റിന്റെ വിവരങ്ങൾ അറിയാൻ വേണ്ടി /cancel കമ്മണ്ട് സെന്റ് ചെയ്യുക</code>",{reply_to_message_id:msg.message_id,reply_markup:{inline_keyboard:[[{text:"പഴയ റിക്വസ്റ്റ് ഇല്ലാതാക്കുക",callback_data:`{"type":"cancel","user":${msg.from.id}}`}]]},chat_id:chat,message_id:m.message_id})
  } catch (e) {
    if(typeof e==="string")return sendMessage(msg.chat.id,e,{reply_to_message_id:msg.message_id})
    console.log(e);
    return
  }
})



bot.on("callback_query",(msg)=>{
  let id=msg.message.chat.id,
  callback=JSON.parse(msg.data);
  
  if(callback.type==="cancel"){
    if(callback.user==msg.from.id){
      var baseUrl=`${process.env.HEROKU_URL||"http://localhost:3000"}/api/translate`
      db.delete("translate",{user:Number(callback.user)})
      request(baseUrl+"/checkUser?user="+msg.from.id,(err,res)=>{
        res=res.body?JSON.parse(res.body):null
        if(err)bot.answerCallbackQuery(msg.id,"unexpected error occurred while fetching user data".toUpperCase(),true).catch(err=>{return})
        else if(res.sts){
          request(baseUrl+"/removeUser?user="+msg.from.id,(err,r)=>{
            if(err)bot.answerCallbackQuery(msg.id,"unexpected error occurred while removing data".toUpperCase(),true).catch(err=>{return})
            else{
              bot.answerCallbackQuery(msg.id,"successfully removed your request\nTry to request new one".toUpperCase(),true).catch(err=>{return})
             deleteMsg(id,msg.message.message_id)
             deleteMsg(res.data.group,res.data.edit_msg_id)
            }
          })
        }else {
          bot.answerCallbackQuery(msg.id,"NO DATA FOUND FOR YOUR REQUEST",true).catch(err=>{return})
          
          bot.deleteMessage(id,msg.message.message_id).catch(e=>console.log(e))
        }
      })
    }else{
      bot.answerCallbackQuery(msg.id,"THIS IS NOT FOR YOU",true).catch(err=>{return})
    }
  }
})

// This Callback for subscene search movie select

//for Getting Subscene File From This Bot server

router.get("/getFile",async(req,res)=>{
  try {
    let id=req.query.id
    var file=await fs.readFileSync(`${root}/subs/${id}.srt`).toString("utf8")
    await fs.unlinkSync(`${root}/subs/${id}.srt`)
    return res.send(file).status(200)
  } catch (e) {
    await fs.unlinkSync(`${root}/subs/${id}.srt`).catch(e=>{return res.end("Unexpected Error")})
    return res.end("Unexpected Error While Getting File")
  }finally{
    return res.end()
  }
})


bot.on("polling_error",
  (err)=> {
    console.log(err,"__pollingError__")
  })

router.post("/"+token,(req,res)=>{
  console.log(req.body);
  bot.processUpdate(req.body)
  res.sendStatus(200)
  
})
  

router.get("/start",async(req,res)=>{
  try{
  var uId=req.query.uId
  let base_url=`${process.env.HEROKU_URL}/api/translate`,
  url;
  if(!uId) throw "Required Data is not found"
  url=base_url+"/checkValid?uId="+uId
  let data=await got.get(url).json()
  
  console.log(data,"__data_from_function__");
  if(!data)throw "Request Not Found. Please check the url"
  var ads=await settings.getAds()
  let org=process.env.HEROKU_URL.split("//")[1].split('.')[0]
  org=(org==="tgway"?true:false)
  return res.render("translate/translator",{headerChange:true,ads,uId,group:true,org})
  }catch(e){
    console.log(e);
    if(typeof e=="string")return res.end(e)
    else{
      return res.end("Unexpected Error Occurred Please Refresh The Page")
    }
  }
});

  router.get("/download",async(req,res)=>{
    try{
    if(req.query.id&&req.query.user){
      var m=await bot.editMessageCaption(`Subtitle Translated By : @subtitle_translate_bot\n\n<code>After Using The Subtitle, Please Rate Your Opinion About The Subtitle Using Inline Button</code>\n\n<b>Tankyou :)</b>\n<code>${Date.now()}</code>`,{message_id:req.query.id,chat_id:req.query.user,parse_mode:'html',reply_markup:{inline_keyboard:[[{text:"Share Your Opinion",url:"https://telegramic.org/bot/subtitle_translate_bot/"}]]}}).catch(e=>{console.log(e);return})
      if(!m)return res.end()
      var link=await bot.getFileLink(m.document.file_id)
      var {body}=await got.get(link)
      if(!body)return res.end()
      body=body.toString("utf8")
      if(!req.query.force) body=body+"[{$filename:"+m.document.file_name
      body=Buffer.from(body,"utf-8")
      res.set({'Content-Type':`${m.document.mime_type};charset=utf-8`,'Content-Length':m.document.file_size});
      if(req.query.force)res.attachment(m.document.file_name)
  //   var f=await fs.readFileSync("./public/videos/imdb_tutorial.mp4")
      return res.send(body).end()
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
        await editMessage((data.msg||data.err||"Unknown Text")+`\n<a href="tg://user?id=${data.user}">user</a>`,{chat_id:data.group,message_id:data.edit_msg_id})
        if(data.type==="msg")return res.end()
        await got.get(base_url+"/removeUser?user="+data.user)
        return res.end()
      }
      if(data.type!=="file")return res.end()
      let file=(await got.get(data.file)).body.toString("utf8")
      if(!file){
        await editMessage("Unexpected Error Occurred While File Downloading Please Try To Translate New One",{chat_id:data.group,message_id:data.edit_msg_id})
        await got.get(base_url+"/removeUser?user="+data.user)
        return res.end()
      }
      await fs.writeFileSync(root+"/subs/"+data.user+".srt",file.toString("utf8"))
      let sendedFile=await sendDocument(data.group,root+"/subs/"+data.user+".srt",{
        disable_notification:true,
        caption:`Subtitle Translated By : @subtitle_translate_bot\nSubtitle Provided By : @subtitles_downloader_bot\nRequested User : <a href="tg://user?id=${data.user}">User</a>\n\n<code>After Using The Subtitle, Please Rate Your Opinion About The Subtitle Using Inline Button</code>`,parse_mode:"html",reply_markup:{inline_keyboard:[[{text:"Share Your Opinion",url:"https://telegramic.org/bot/subtitle_translate_bot/"}]]}},{
        filename:data.filename.split(".").reduce((t,v,i,a)=>i!=a.length-1?t+=(v+"."):t+="@subtitle_translate_bot.srt","")})
      if(!sendedFile||typeof sendedFile.sts!=="undefined"){
        await editMessage("Unexpected Error Occurred While File Translated File Uploading\nPlease Try Again",{chat_id:data.group,message_id:data.edit_msg_id})
        await got.get(base_url+"/removeUser?user="+data.user)
        return res.end()
      }
      await deleteMsg(data.group,data.edit_msg_id)
      await got.get(base_url+"/removeUser?user="+data.user)
      return res.end()
    } catch (e) {
      console.log(e);
      res.end()
    }
  })

module.exports = router;