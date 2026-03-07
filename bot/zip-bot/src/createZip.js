let {bot,sleep}=require("./config")
const db=require("../../../helper/db"),
zipper=require("./zipperHandle")

const {NewMessage}=require("telegram/events"),
{CallbackQuery}=require("telegram/events/CallbackQuery"),
{Button}=require("telegram/tl/custom/button"),
{getExtension}=require("telegram/Utils")

const showCurrentStatus=async(user,msg)=>{
  try {
    [msg]=await bot.getMessages(user,{ids:msg})
    
    let data=await db.get("zips",{user}, true)
    if(!data)return
    
    await msg.edit({text:`You can add new file to this zip by sending it to this bot\n\n<u><b>Current Zip Detials</b></u>\n<i>Folders</i> : \n<code>     🔗 ${data.paths.join("\n     🔗 ")}</code>\n<i>Files : </i>\n<code>     🔗 ${Object.keys(data.files).join("\n     🔗 ")}</code>\n\n<b> Current File :</b> <i>${data.currentFile}</i> \n\n<b>Current Folder : </b><i>${data. current}</i>\n\n<b>Current Zip Size : </b> ${Math.ceil(data.size/1024/1024)} MB\n\n<i>If you want to change the file name please send that</i>\n\n<b><u>If you complete your zip editing please click the Create zip button</u></b>\n\n<u>You can navigate through the zip files using the other buttons</u>`,parseMode:"html",buttons:bot.buildReplyMarkup([[Button.inline("Create Zip",Buffer.from("cz"))],[Button.inline("Create folder"),Button.inline("Change folder")],[Button.inline("Change Current File"),Button.inline("Compression level")],[Button.inline("Set zip file name")]])})
  } catch (e) {
    console.log(e);
    return
  }
}

;(async()=>{
bot=await bot()

// handle new files //
bot.addEventHandler(async evt=>{
  try{
  if(!evt.message.media)return 
  
  let chat=await evt.message.getSender()
  let userdata=await db.get("zips",{user:parseInt(chat.id.value)},true)
  
  if(!userdata)return
  
  let file=evt.message.media.document||evt.message.media.photo;

  !file.size?file.size={value:file.sizes.pop().size}:null
  if(Number(file.size.value)>50*1024*1024)return bot.sendMessage(chat,{message:`<b>Oh 😢</b>\n\n<b><u>Unfortunately we don't support files more than 50MB currently</u> \n Sorry 🙏</b>`,parseMode:"html"}).catch(e=>null)
  if(Number(file.size.value)+userdata.size>50*1024*1024)return bot.sendMessage(chat,{message:`<code>You can only create zip file upto 50MB in size</code>\n\n<i>But if you add this file to current zip it will be became ${Math.ceil((Number(file.size.value)+userdata.size)/1024/1024)}MB</i>\n\n<b>Sorry for the limitation</b>`,parseMode:"html"}).catch(e=>null)
  
  let fileExt=getExtension(file)
  let filename=(file.attributes&&file.attributes.length?file.attributes[0].fileName:undefined)||Date.now()+"."+fileExt.replace(".","")
  userdata.currentFile=userdata.current+filename
  userdata.files[userdata.currentFile]=evt.message.id
  userdata.size+=Number(file.size.value)
  await db.update("zips",{user:parseInt(chat.id.value)},userdata)
  
  //console.log(await db.get("zips",{user:parseInt(chat.id.value)},true));
  
  let msg=await bot.sendMessage(chat,{message:`<b>Filename: </b><code>${filename}</code>\n\nNow you can add new file by sending to this bot\n\n<u>Current Zip Detials</u>\n     Folder :\n       🔗 <code>${userdata.paths.join("\n   🔗 ")}</code>\n     Files :\n       🔗 <code>${Object.keys(userdata.files).join("\n   🔗 ")}</code>\n\n<b>Current folder</b> : <i>${userdata.current}</i>\n\n<b>Current file</b> : <i>${userdata.currentFile}</i>\n\n<b>Current zip size : </b><i>${Math.ceil(userdata.size/1024/1024)} MB</i>\n\n<i>If you want to change the file name please send that</i>\n\n<b><u>If you complete your zip editing please click the Create zip button</u></b>\n\n<u>You can navigate through the zip files using the other buttons</u>`,parseMode:"html",buttons:bot.buildReplyMarkup([[Button.inline("Create Zip",Buffer.from("cz"))],[Button.inline("Create folder"),Button.inline("Change folder")],[Button.inline("Change current file"),Button.inline("Compression level")],[Button.inline("Set zip file name")]])}).catch(e=>null)
  console.log(Button.inline("hello"));
  await db.update("zips",{user:userdata.user},{msg:msg.id})
  await bot.deleteMessages(chat,[userdata.msg],{revoke:true})
  }catch(e){}
},new NewMessage())


// handle Create Zip Callback query
bot.addEventHandler(async evt=>{
  try {
    
    let chat=evt.query.peer
    
    bot.deleteMessages(chat,[evt.query.msgId],{revoke:true}).catch(e=>null)
    
    let msg=await bot.sendMessage(chat,{message:"Zip Creation started\nTrying to download files"})
    let data=await db.get("zips",{user:Number(chat.userId.value)},true)
    if(!data)return msg.edit({text:"you are not created any zip file . create a new zip file using /create command "}).catch(e=>null)
    var q=zipper.add(Number(chat.userId.value),msg.id)
    if(!q)return msg.edit({text:"You are already in waiting que\nTry after that complete"}).catch(e=>null)
    await msg.edit({text:"You are added to the waiting que\nYour current que position is "+q})
  } catch (e) {
    console.log(e);
    if(typeof e!=="string")e="Unexpected Error , please try again"
    return evt.answer({message:e,alert:true}).catch(e=>null)
  }
},new CallbackQuery({pattern:/^cz$/}))


// handle create folder callback
bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.query.userId.value)
    let [msg]=await bot.getMessages(chat,{ids:evt.query.msgId})
    
    await db.update("zips",{user:chat},{create_folder:true})
    
    await msg.edit({text:`Okey !\n\n<u><i>Now you can send the new folder name</i></u>\n\n<b>Please not that this folder will be created inside the current selected folder</b>`,parseMode:"html", buttons:bot.buildReplyMarkup(Button.inline("Back to menu"))})
  } catch (e) {
    console.log(e);
    if(typeof e!=="string")e="Unexpected error \nPlease try again"
    evt.answer({message:e,alert:true}).catch(e=>null)
  }
},new CallbackQuery({pattern:/^Create folder$|^cf$/}))

// set folder name , zip file name and file name 
bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.message.peerId.userId.value)
    let data=await db.get("zips",{user:chat},true)
    
    if(!data)return
    if(!data.create_folder&&!data.set_zip_name&&!evt.message.media){
      let filename=evt.message.message.replace(/\\|\/|\?|%|\*|:|\||"|\>|\</g,"")
      data.files=Object.keys(data.files).reduce((t,c)=>{
        if(c===data.currentFile){
          let cc=c.split("/")
          cc.pop()
          t[cc.join("/")+"/"+filename]=data.files[c]
          return t
        }
        t[c]=data.files[c]
        return t
      },{})
      let current=data.currentFile.split("/")
      current.pop()
      data.currentFile=current.join("/")+"/"+filename
      await db.update("zips",{user:chat},{currentFile:data.currentFile,files:data.files})
      await bot.editMessage(chat,{message:data.msg,text:"Filename changed to "+filename+" successfully",buttons:null})
      await sleep(2000)
    }
    else if(data.create_folder){
      let foldername=data.current+evt.message.message.replace(/\\|\/|\?|%|\*|:|\||"|\>|\<|\./g,"")+"/"
      
      data.paths.push(foldername)
      await db.update("zips",{user:chat},{paths:data.paths,create_folder:false,current:foldername})
    }else if(data.set_zip_name){
      let filename=evt.message.message.replace(/\\|\/|\?|%|\*|:|\||"|\>|\<|\./g,"")+".zip"
      await db.update("zips",{user:chat},{filename,set_zip_name:false})
    }else return
    
    showCurrentStatus(chat,data.msg)
    
    await evt.message.delete({revoke:true})
  } catch (e) {
    console.log(e);
    return
  }
},new NewMessage({pattern:/^[^\/]/}))

// back to menue button handler
bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.query.userId.value)
    db.update("zips",{user:chat},{create_folder:false})
    
    showCurrentStatus(chat,evt.query.msgId)
  } catch (e) {
    if(typeof e!=="string")e="Unexpected Error Occured \nPlease try again"
    evt.answer({message:e,alert:true}).catch(e=>null)
  }
},new CallbackQuery({pattern:/^Back to menu$/}))

// handle the change selected folder Callback
bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.query.userId.value)
    
    let data=await db.get("zips",{user:chat},true)
    
    let btns=data.paths.map((x,i)=>[Button.inline(x,Buffer.from("fold : "+i))]).filter(x=>x[0].text!==data.current)
    btns.push([Button.inline("Back to menu")])
    
    await bot.editMessage(chat,{message:evt.query.msgId,text:"Okey ! \n\nYou can select a folder by clicking on below buttons",buttons:bot.buildReplyMarkup(btns)})
  } catch (e) {
    console.log(e);
    if(typeof e!=="string")e="Unexpected Error Occurred"
    evt.answer({message:e,alert:true}).catch(e=>null)
  }
},new CallbackQuery({pattern:/^Change folder$/}))

bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.query.userId.value),
    ind=evt.patternMatch[1]
    
    let data=await db.get("zips",{user:chat},true)
    
    let sel_path=data.paths[ind]

    await db.update("zips",{user:chat},{current:sel_path})
    await evt.answer({message:"Folder was changed\n\nNow if you add any files to zip it will be added to this folder",alert:true}).catch(e=>null)
    showCurrentStatus(chat,evt.query.msgId)
  } catch (e) {
    if(typeof e!=="string")e="Unexpected Erorr Occured\nPlease try again"
    bot.answer({message:e,alert:true}).catch(e=>null)
  }
},new CallbackQuery({pattern:/^fold : (\d+)$/}))

bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.query.userId.value)
    
    let data=await db.get("zips",{user:chat},true)
    
    let btns=Object.keys(data.files).map((e,i)=>[Button.inline(e,Buffer.from("file : "+i))]).filter(x=>x[0].text!==data.currentFile)
    btns.push([Button.inline("Back to menu")])
    
    await bot.editMessage(chat,{message:evt.query.msgId,text:"Okey! \nNow you can select a file by using below buttons",buttons:btns})
  } catch (e) {
    console.log(e);
    if(typeof e!=="string")e="Unexpected error occured\nPlease try again"
    evt.answer({message:e,alert:true}).catch(e=>null)
  }
},new CallbackQuery({pattern:/^Change (c|C)urrent (F|f)ile$/}))

bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.query.userId.value)
    
    let data=await db.get("zips",{user:chat},true)
    
    let file=Object.keys(data.files)[evt.patternMatch[1]]
    
    await db.update("zips",{user:chat},{currentFile:file})
    
    await evt.answer({message:"Current file was changed successfully\n\nNow if you send any text message it will consider as file name of this file",alert:true}).catch(e=>null)
    showCurrentStatus(chat,evt.query.msgId)
  } catch (e) {
    console.log(e);
    if(typeof e!=="string")e="Unexpected error occurred \nPlease try again"
    evt.answer({message:e,alert:true}).catch(e=>null)
  }
},new CallbackQuery({pattern:/^file : (\d+)$/}))

bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.query.userId.value),
    compression=[1,2,3,4,5]
    
    let data=await db.get("zips",{user:chat},true)
    
    compression=compression.filter(x=>x!==data.compression)
    
    let btns=[]
    while(compression.length){
      var two=compression.splice(0,2)
      btns.push(two.map((e)=>Button.inline(String(e),Buffer.from("comp : "+e))))
    }
    
    btns.push([Button.inline("Back to menu")])
    
    await bot.editMessage(chat,{message:evt.query.msgId,text:"Okey ! \n\nYou can select compression level using below button\n\n<u>1 - Means high file size and fast compression\n5 - Means low file size slow compression</u>",buttons:btns,parseMode:'html'})
    
  } catch (e) {
    console.log(e);
    if(typeof e!=="string")e="Unexpected error occurred\nPlease try again"
    evt.answer({message:e,alert:true}).catch(e=>null)
  }
},new CallbackQuery({pattern:/^Compression level$/}))

bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.query.userId.value)
    
    await db.update("zips",{user:chat},{compression:Number(evt.patternMatch[1])})
    
    evt.answer({message:"Compression level updated to "+evt.patternMatch[1],alert:true}).catch(e=>null)
    showCurrentStatus(chat,evt.query.msgId)
  } catch (e) {
    console.log(e);
    if(typeof e!=="string")e="Unexpected error occurred\nPlease try again"
    
    evt.answer({message:e,alert:true}).catch(e=>null)
  }
},new CallbackQuery({pattern:/^comp : (\d+)$/}))

bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.query.userId.value)
    
    await db.update("zips",{user:chat},{set_zip_name:true})
    await bot.editMessage(chat,{message:evt.query.msgId,text:"Okey !\n\nNow you can send zip file name",buttons:[[Button.inline("Back to menu")]]})
  } catch (e) {
    console.log(e);
    if(typeof e!=="string")e="Unexpected error occurred\nPlease try again"
    evt.answer({message:e,alert:true}).catch(e=>null)
  }
},new CallbackQuery({pattern:/^Set zip file name$/}))

bot.addEventHandler(async evt=>{
  try{
    let chat=await evt.message.getSender()
    let userdata=await db.get("zips",{user:parseInt(chat.id.value)},true)
    if(userdata)return bot.sendMessage(chat,{message:"One of your request already in server please remove it using /remove command"})
    evt=await bot.sendMessage(chat,{message:"Send files that you want to zip or <code>Create a folder by clicking the below button</code>",buttons: bot.buildReplyMarkup(Button.inline("Create Folder",Buffer.from("cf"))),parseMode:"html"})
    await db.set("zips",{user:parseInt(chat.id.value),paths:["./"], current:"./",currentFile:null,files:{},size:0,msg:evt.id, compression:1,filename:(Date.now()+".zip")})
  }catch(e){}
  },new NewMessage({pattern:/^\/create$/}))

bot.addEventHandler(async evt=>{
  try{
    let chat=Number(evt.message.peerId.userId.value)
    if(!await db.get("zips",{user:chat},true))return
    await db.delete("zips",{user:chat})
    evt.message.reply({message:"Your zipping request was cancelled"})
  }catch(e){}
},new NewMessage({pattern:/^\/remove$/}))


bot.on("error",err=>{
  console.log(err);
})

})()
