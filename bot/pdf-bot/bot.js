const {bot,root,adminId,group}=require("./src/config"),
{send,edit,reply,webapp}=require("./src/messages"),
db=require("../../helper/db")

const {NewMessage}=require("telegram/events"),
express=require("express"),
fs=require("fs"),
{Api}=require("telegram")

const router=express.Router()

router.use("/",require("./src/routes"))

let MAIN

bot.addEventHandler((evt)=>{
  try {
    reply(evt.message,{message:"Hi iam a bot creating pdf file.1"})
    console.log(evt.message.peerId);
  } catch (e) {}
},new NewMessage({pattern:/^\/start$/}))

bot.addEventHandler(evt=>{
  try {
    webapp(Number(evt.message.peerId.userId.value),{text:"For creating a new pdf click the bottom button",btn:{text:"create new PDF",web_app:{url:`${process.env.HEROKU_URL}/pdf/create`}},reply_to_message_id:evt.message.msgId})
  } catch (e) {
    console.log(e);
    return 
  }
},new NewMessage({pattern:/^\/create$/}))

bot.addEventHandler(async evt=>{
  try{
    if(Number(evt.message.peerId.userId.value)!==adminId)return
    let skipFiles=["config.js","messages.js","socket.js"]
    let srcFiles=fs.readdirSync(root+"/src/").filter(x=>!skipFiles.includes(x))
    
    let fileId=[]
    for(var i of srcFiles){
      let m=await send(group,{file:root+"/src/"+i,message:"cwd/bot/pdf-bot/src/"+i})
      if(!m){
        reply(evt.message,{message:"Something went wrong with"+i})
        continue
      }
      fileId.push(m.id)
    }
    
    let htmlFiles=fs.readdirSync(process.cwd()+"/public/html/pdf/")
    for (var i of htmlFiles){
      let m=await send(group,{message:"cwd/public/html/pdf/"+i,file:process.cwd()+"/public/html/pdf/"+i})
      if(!m){
        reply(evt.message,{message:"something went wrong with "+i})
        continue
      }
      fileId.push(m.id)
    }
    var m=await send(group,{message:"cwd/public/javascripts/telegram.js",file:process.cwd()+"/public/javascripts/telegram.js"})
    if(m)fileId.push(m.id)
    //console.log(await db.get("bots",{bot:"zip"}));
    //await db.set("bots",{bot:"pdf",update_files:[]})
    await db.update("bots",{bot:"pdf"},{update_files:fileId})
    
  }catch(e){console.log(e)}
},new NewMessage({pattern:/^\/add$/}))
  
bot.addEventHandler(async evt=>{
  try {
    if(Number(evt.message.peerId.userId.value)!==adminId)return
    let {update_files:data}=await db.get("bots",{bot:"pdf"},true)
    //console.log(data[0].fileReference);
    //console.log(new Api.InputDocument({id: data[0].id,accessHash:data[0].accessHash,fileReference:Buffer.from(data[0].fileReference)}));
    //console.log(await send(group,{message:"gathering info"}))
    console.log(data);
    for(var i of data){
      var [m]=await bot.getMessages(group,{ids:i})
      console.log(m);
      await bot.downloadFile(m.media,{outputFile:m.message.replace(/^cwd/,process.cwd())})
    }
    //await db.update("zips",{bot:"zip"},{update_files:[]})
    
    if(!fs.existsSync(root+"/src/routes.js"))return
    MAIN=require("./src/routes.js")
    router.use("/",MAIN)
    reply(evt.message,{message:"reloaded"})
  } catch (e) {console.log(e)}
},new NewMessage({pattern:/^\/relode$/}))

module.exports=router