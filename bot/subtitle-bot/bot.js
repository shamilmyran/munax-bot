/* npm packages requiring*/
const express = require("express"),
router = express.Router(),
got=require("got")

/*local packages requiring*/
const {bot,token,adminId, refresh_server}=require("./src/config"),
{sendMessage:send_m,editMessage:edit,Button,deleteMsg,sendPhoto}=require("./src/message"),
db=require("../../helper/db"),
{addGroup}=require("./src/settings")

/*requiring supporting packages*/
require("./callback/index")
require("./callback/ss")
require("./callback/sd")
router.use("/os",require("./callback/os").Router)

// setup the global vars
let data_col=true

/*start message handler*/
bot.onText(/^\/start$/,async (msg)=>{
  console.log(msg);
  let chat=msg.chat.id
  let rpl=`Hi ${msg.from.first_name} 👋\nIam a bot 🤖 to find subtitles 📄\nJust send the movie 🎞️ series 🎥drama 📽️ name , i will send the subtitle 📄 if available`
  send_m(chat,rpl,{reply_to_message_id:msg.message_id})
  //await db.delete("user_datas",{user:msg.from.id})
  
  let usercheck=await db.get("user_datas",{user:msg.from.id},true)
  if(usercheck&&usercheck.bots.includes("subtitle"))return
  console.log(usercheck);
  
  send_m(adminId,`new user joined\n user id : ${msg.from.id}\nname : ${msg.from.first_name||""} ${msg.from.last_name||""}\nusername : ${msg.from.username||"no username"}`)
  if(!usercheck){
    await db.set("user_datas",{user:msg.from.id, bots:["subtitle"]})
    return
  }
  usercheck.bots.push("subtitle")
  await db.update("user_datas",{user:msg.from.id},{bots:usercheck.bots})
})

/*Handle subtitle find request*/
bot.on("text",msg=>{
  try{
    /*Checking that , whatever it is a command or includes any unallowed special characters*/
    if(msg.chat.id<0)addGroup(msg.chat)
    if(msg.text.match(/^\//))return
    if(msg.text.match(/[^a-z0-9A-Z .,;:&()[\]"'`+\-!\\×@/]|http(s){0,1}:\/\/([a-z0-9A-Z]+)\.([a-zA-Z]{2,3})/))return send_m(msg.chat.id,"Query should not contain any special characters, except . , ; & () [] \" ' ` + - ! \\ × : @/")
  
    let chat=msg.chat.id
    
    let rpl=`Please select a website for searching subtitles`,
    btn=Button([[["SUBSCENE",{t:"ss",w:"ss"}]],[["OPEN SUBTITLES",{t:"ss",w:"os"}],["SUBDL",{t:"ss",w:"sd"}]]])
    return send_m(chat,rpl,{reply_to_message_id:msg.message_id, reply_markup:btn})
  }catch(e){
    console.log(e);
  }
})

bot.onText(/^\/collect$/,async msg=>{
  try{
    if(adminId!=msg.chat.id)return
    data_col=true
    
    let {last_coll}=(await db.get("bots",{bot:"subtitle"},true))||{last_coll:0}
    if(!last_coll)await db.set("bots",{bot:"subtitle",last_coll:1})
    let {message_id:end}=await send_m(adminId,"collecting datas ")
    
    let found=0
    for (var i =Number(last_coll);i<end;i++){
      if(!(i%10)){
        await edit(`total message checked : ${i}\nuser founded : ${found}\nmessage id : ${end}`,{chat_id:adminId,message_id:end})
        await db.update("bots",{bot:"subtitle"},{last_coll:i})
      }
      
      if(!data_col)break
      let m=await bot.sendMessage(adminId,"collecting message "+i,{reply_to_message_id:i}).catch(e=>e)
      await deleteMsg(adminId,m.message_id)
      
      if(m instanceof Error||!m.reply_to_message||!m.reply_to_message.from.is_bot||!m.reply_to_message.text)continue
      
      let id=m.reply_to_message.text.toLowerCase().match(/id( ){0,5}:( ){0,5}[0-9]{5,15}/)
      
      if(!id)continue
      
      id=Number(id[0].replace(/[^0-9]{0,}/g,""))
      m=await bot.sendMessage(id,"checking").catch(e=>e)
      if(m instanceof Error){
        console.log(m);
        continue
      }
      await deleteMsg(id,m.message_id)
      
      let is_user=await db.get("user_datas",{user:id},true)
      if(!is_user){
        await db.set("user_datas",{user:id, bots:["subtitle"]})
        found++
        continue
      }
      if(is_user.bots.includes("subtitle"))continue
      is_user.bots.push("subtitle")
      await db.update("user_datas",{user:id},{bots:is_user.bots})
      found++
      send_m(adminId,"commen user id : "+id)
      continue
    }
  }catch(e){
    console.log(e)
    return;
  }
})

bot.onText(/^\/stop_col$/,async m=>{
  if(m.chat.id!=adminId)return
  send_m(adminId,"collecting data is stopped")
  data_col =false
})

bot.onText(/^\/count$/,async(msg)=>{
  if(msg.chat.id!=adminId)return
  
  let count=await db.count("user_datas",{bots:{$in:["subtitle"]}})
  send_m(adminId,"total users : "+count)
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
    let test=text.match(/test::.+/)
    let users
    if(test)users=[{user:adminId}]
    else users=await db.get("user_datas",{bots:{$in:["subtitle"]}})
    console.log(img,text);
    var i=0
    let m=await send_m(adminId,"message send notification")
    let time=Date.now()/1000
    let len=users.length
    for(let {user} of users){
      if(!(i%25)){
        var nt=Date.now()/1000
        edit(`total message to be sended : ${users.length}\ntotal message sended : ${i}\nest time to  be done: ${Math.round((((nt-time)/i*len))-(nt-time))} sec`,{chat_id:adminId,message_id:m.message_id})
      }
      if(img){
        sendPhoto(user,img,{reply_markup:btn, caption:text,parse_mode:"html"})
      }
      else send_m(user,text,{reply_markup:btn})
      i++
      await sleep(50)
    }
    var nt=Date.now()/1000
    edit(`total message to be sended : ${users.length}\ntotal message sended : ${i}\nest time to  be done: ${Math.round((((nt-time)/i*len))-(nt-time))} sec`,{chat_id:adminId,message_id:m.message_id})
    send_m(adminId,"message sending ended")
    
  } catch (e) {
    console.log(e);
    return
  }
})

bot.on("photo",async msg=>{
  if(adminId==msg.chat.id){
    let url=await bot.getFileLink(msg.photo.pop().file_id)
    send_m(adminId, url+"\n\n"+msg.photo.pop().file_id+"\n\nokey")
  }
})

bot.onText(/^\/send \d{5,15} .+/,msg=>{
  let id=msg.chat.id
  if(id!=adminId)return
  let [full,chat,m]=msg.text.match(/^\/send (\d{5,15}) ((.+|\n|\r)+)/i)
  send_m(Number(chat),m)
})

const sleep=(time=>{
  return new Promise(r=>{
    setTimeout(function() {
      r()
    }, time);
  })
})



/*telegram updates handler webhook handler*/
router.post("/"+token, (req, res)=> {
  try{
  res.sendStatus(200)
  bot.processUpdate(req.body)
  refresh_server()
  return
  }catch(e){
    console.log(e);
    return 
  }
})

router.get("/render",(req,res)=>{
  try{
    got.stream(req.query.url).pipe(res)
  }catch(e){
    res.end()
  }
})

module.exports = router