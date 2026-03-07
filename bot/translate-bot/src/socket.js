const io=new require("socket.io")({path:"/socket.io"}),
got=require("got"),
router=require("express").Router(),
{sendMessage,editMessage,deleteMsg,sendDocument}=require("./messenger"),
fs=require("fs"),
root=process.cwd()+"/bot/translate-bot",
url=require("url"),
db=require("../../../helper/db"),
{adminId}=require("./config")

function checkRoom(ident){
  return io.sockets.adapter.rooms.has(Number(ident))
}

io.on("connection",async socket=>{
  try{
  //console.log(socket.rooms);
  socket.on("join",async uId=>{
    await socket.join(Number(uId))
    io.sockets.in(Number(uId)).emit("msg","Your Request Was Successfully Sended To The Server")
  })
  socket.on("addUser",async d=>{
  try{
     console.log("in add user");
    
    if(!checkRoom(d.uId))return
    
    if(!d.uId) throw "User Id Is Not Specified Please Check The Url And Try Again"
    
    let user
    let base_url=`${process.env.HEROKU_URL}/api/translate`
    
    var {sts,data,err}=await got.get(base_url+"/checkValid?uId="+d.uId).json();
    
    user=data
    if(!sts)throw err;
    
    if(data.stop)await got.post(base_url+"/updateUser?user="+data.user,{json:{stop:false}})
    
    var {sts,err}=await got.get(base_url+"/addUserById?id="+data.user).json();
    
    console.log(sts,err);
    if(!sts||err)throw {}
    
    if(user.type){
      return await io.sockets.in(user.type,user.msg||user.file)
    }
    
    return 
  }catch(e){
    if(typeof e==="string")return io.sockets.in(Number(d.uId)).emit("err",e)
    console.log(e);
    io.sockets.in(Number(d.uId)).emit("err","Unexpected Error Occured")
  }
  })
  
  socket.on("removeUser",async ({uId})=>{
    try{
    if(!uId)return
    let base_url=process.env.HEROKU_URL+"/api/translate"
    let {data,sts}=await got.get(base_url+"/checkValid?uId="+uId).json()
    if(!data&&!sts)return
    await got.get(base_url+"/removeUser?user="+data.user)
    return
    }catch(e){
      return console.log(e);
    }
  })
  socket.on("stop",async(uId)=>{
    try{
    let {sts,data,err}=await got.get(process.env.HEROKU_URL+"/api/translate/checkValid?uId="+uId).json()
    console.log("socket stoped",sts,data,err);
    if(!sts)return
    await got.post(`${process.env.HEROKU_URL}/api/translate/updateUser?user=${data.user}`,{json:{stop:true}})
    await editMessage(`We Found That You Are Lefted From TGWAY \nSo the translation process has been stopped`,{chat_id:data.group||data.user,message_id:data.edit_msg_id})
    await got.get(`${process.env.HEROKU_URL}/api/translate/removeUser?user=${data.user}`)
    return
    }catch(e){
      return console.log(e);
    }
  })
  }catch(e){
    console.log(e);
    return
  }
})
router.post("/",async(req,res)=>{
    try{
    let user=req.body
    if(!user)return res.end()
    let base_url=`${process.env.HEROKU_URL}/api/translate`
    res.end()
    let {data,err}=await got.get(base_url+"/checkUser?user="+user.user).json()
    
    if(!data) return io.sockets.in(user.id).emit("err",err)
    
    if(user.type==="file"){
      
      if(data.stop)return
      
      if(!checkRoom(user.id)){
        await editMessage(`We Found That You Are Lefted From TGWAY \nSo the translation process has been stopped`,{chat_id:data.group||data.user,message_id:data.edit_msg_id})
        await got.get(base_url+"/removeUser?user="+user.user)
        return
      }
      
      let file=(await got.get(user.file)).body.toString("utf8");
      
      if(!file){
        await got.get(base_url+"/removeUser?user="+user.user)
        return await io.sockets.in(user.id).emit("err","Unexpected Error Occurred When Translated File Downloading")
      }
      
      await got.post(base_url+"/updateUser?user="+user.user,{json:{type:"file",file:user.file}})
      
      await fs.writeFileSync(root+"/subtitles/"+user.user+".srt",file.toString("utf8"))
    
      let filename=data.filename.split(".").reduce((t,v,i,a)=>i!=a.length-1?t+=(v+"."):t+="@subtitle_translate_bot.srt","")
      let sendedFile=await sendDocument(data.group||data.user,root+"/subtitles/"+data.user+".srt",{
          disable_notification:true,
          caption:`Subtitle Translated By : @subtitle_translate_bot\n\n<code>After Using The Subtitle, Please Rate Your Opinion About The Subtitle Using Inline Button</code>`,parse_mode:"html",reply_markup:{inline_keyboard:[[{text:"Share Your Opinion",url:"https://telegramic.org/bot/subtitle_translate_bot/"}]]}},{
       filename})
       await fs.unlinkSync(root+"/subtitles/"+data.user+".srt")
       if(!sendedFile||typeof sendedFile.sts!=="undefined"){
         await got.get(base_url+"/removeUser?user="+user.user)
         return await io.sockets.in(user.id).emit("err","Unexpected error while Translated file uploading")
       }
       await db.updateUsage(data.user)
       sendMessage(adminId,`file : <code>${filename.replace(/>|</g,"")}</code>\nlang : <code>${data.lang}</code>\nid : <code>${data.user}</code>`)
       await deleteMsg(data.group||data.user,data.edit_msg_id)
       
       await got.get(base_url+"/removeUser?user="+data.user)
       
       return io.sockets.in(user.id).emit("file",{msg_id:sendedFile.message_id,user:user.group||user.user})
    }else{
      if(!checkRoom(user.id))return;
      await io.sockets.in(Number(user.id)).emit(user.type,user.msg);
      return;
    }
    }catch(e){
      console.log(e);
      return
    }
  })

module.exports.io=io
module.exports.Router=router