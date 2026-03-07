
let {bot,Api,adminId,sleep}=require("./src/config")
const {NewMessage}=require("telegram/events"),
{Button}=require("telegram/tl/custom/button"),
db=require("../../helper/db"),
{encode:htmlEnc}=require("html-entities")


;(async()=>{
  bot=await bot()
  
  require("./src/createZip")
  require("./src/unzip")
  
  bot.addEventHandler(async evt=>{
    try{
    let chat=await evt.message.getSender()
    await bot.sendMessage(chat,{message:`Hi <i>${htmlEnc(chat.firstName)||""} ${htmlEnc(chat.lastName)||""}</i> 👋👋\n\n<code>I a 🤖 for creating and unzipping zip file 🗃️</code>\n\n  <b>•</b>  <i><b>📝 For creating zip files please use /create command</b></i>\n  <b>•</b>  <i><b>🗂️ For unzipping zip file send the zip file</b></i>\n\n<u>Currently zip and rar files are supported for decompression , and only zip format for compression</u>😢`,parseMode:"html"})
    
    let usercheck=await db.get("user_datas",{user:Number(chat.id.value)},true)
    if(usercheck&&usercheck.bots.includes("zip"))return
    console.log(usercheck);
    
    await bot.sendMessage(adminId,{message:`new user joined\n user id : ${chat.id.value}\nname : ${chat.firstName||""} ${chat.lastName||""}\nusername : ${chat.username||"no username"}`}).catch(e=>null)
    if(!usercheck){
      await db.set("user_datas",{user:Number(chat.id.value), bots:["zip"]})
      return
    }
    usercheck.bots.push("zip")
    await db.update("user_datas",{user:Number(chat.id.value)},{bots:usercheck.bots})
    }catch(e){}
  },new NewMessage({pattern:/^\/start$/}))

bot.addEventHandler(async evt=>{
  try {
    if(Number(evt.message.peerId.userId.value)!=adminId)return
    let count=await db.count("user_datas",{bots:{$in:["zip"]}})
    await evt.message.reply({message:"total users : "+count})
  } catch (e) {}
},new NewMessage({pattern:/^\/count$/}))

bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.message.peerId.userId.value)
    if(chat!=adminId)return
    
    let text=evt.message.patternMatch[1]
    
    let btn=text.match(/btn::(.+)/)
    if(btn){
      text=text.replace(btn[0],"")
      btn=JSON.parse(btn[1]);
      btn=btn.map(x=>{
        var row=x.map(x=>{
          return Button[(x[2]||"url")](x[0],x[1])
        })
        return row
      })
    }
    
    let file=null
    if(evt.message.media&&(evt.message.media.document||evt.message.media.photo)){
      file=evt.message.media
    }
    console.log(file);
    let users,test=text.match(/test::.+/)
    if(test){
      text=text.replace(test,"")
      users=[{user:adminId}]
    }else users=await db.get("user_datas",{bots:{$in:["zip"]}})
    
    let i=1,time=Date.now()/1000,len=users.length
    
    let msg=await bot.sendMessage(adminId,{message:"Message sending stareted"})
    
    for(const {user} of users){
      try{
        if(!(i%25)){
          var nt=Date.now()/1000
          msg.edit({text:`total message to be sended : ${len}\ntotal message sended : ${i}\nest time to  be done: ${Math.round((((nt-time)/i*len))-(nt-time))} sec`}).catch(e=>null)
        }
        bot.sendMessage(user,{message:text,file,parseMode:"html",buttons:btn}).catch(console.log)
        i++
        await sleep(50)
      }catch(e){}
    }
    msg.edit({text:"Compleated"})
  } catch (e) {console.log(e);}
},new NewMessage({pattern:/^\/notify ((.|\n|\r|\n\r)*)/}))


})()