// npm packages
const router=require("express").Router(),
io=new require("socket.io")({path:"/translate/batch/socket"}),
got=require("got"),
fs=require("fs"),
{encode:htmlEnt}=require("html-entities")

// local packages 
const db=require("../../../helper/db"),
settings=require("./settings"),
{bot, root,adminId}=require("./config"),
advertise=require("./advertise"),
{sendDocument:document,Button,deleteMsg,sendMessage:send}=require("./messenger")

/*
*****************************************
*              socket io                *
*****************************************
*/

function isInRoom(ident){
  return io.sockets.adapter.rooms.has(ident)
}

io.on("connection",socket=>{
  
  socket.on("join",async ({user})=>{
    try {
      console.log(user);
      await socket.join(user)
      
      let data=await db.get("translate",{user},true)
      
      if(!data)throw "We can't find any translation request from you"
      
      let files=data.files.map((x,i)=>{return {id:x,filename:data.filenames[i], query_guss:settings.gussTheQuery(data.filenames[i])}})
      
      await io.sockets.in(user).emit("tr_req",files)
    } catch (e) {
      if(typeof e!=="string"){
        console.log(e);
        e="something went wrong"
      }
      if(isInRoom(user))return io.sockets.in(user).emit("stop",e)
    }
  })
  
  socket.on("completed",async user=>{
    let data=await db.get("translate",{user},true)
    if(!data)return
    db.delete("translate",{user})
    
    settings.removeUser(user)
    
    deleteMsg(user,data.edit_msg_id)
  })
})




/*
*****************************************
*                routes                 *
*****************************************
*/
router.get("/",(req,res)=>{
  res.render("translate/batch",{title:"batch translation page",headerChange:true,telegram:true})
})

router.get("/download",async(req,res)=>{
  try {
    let {id,user}=req.query
    
    let url=await bot.getFileLink(id)
    if(!url)throw Error()
    
    let file=(await got.get(url,{responseType:"buffer"})).body.toString("utf8")
    if(!file)throw Error()
    
    
    file=settings.subtitle_convert(file)
    if(!file.sts){
      if(isInRoom(Number(user)))io.sockets.in(Number(user)).emit("sub_error",id)
      return
    }
    
    id=Date.now()
    file=file.subtitle
    
    let fullOne=settings.fullOne(file),
    lineByLine=settings.lineByLine(fullOne),
    order=settings.ordering(lineByLine)
    order=settings.find_unended_lines(order,true)
    let qlty=order.qlty
    order=order.order
    
    fs.writeFileSync(root+"/"+id+".txt",JSON.stringify(order))
    
    order=(await advertise(root+"/"+id+".txt"))||order
    
    var fullText = order.reduce((t,c)=>{
      if(c.text)t+=c.text+"\n"
      return t
    },'')
    
    let resData={sts:true,id,data:htmlEnt(fullText.replace(/<(\/{0,1})(br|i).*?>/g,"")),qlty}
    
    res.json(resData)
  } catch (e) {
    if(typeof e!=="string"){
      console.log(e);
      e="Something went wrong"
    }
    res.json({sts:false})
    if(req.query.user&&isInRoom(Number(req.query.user)))io.sockets.in(Number(req.query.user)).emit("stop",e)
  }
})

router.post("/upload",async(req,res)=>{
  try{
    let {text,order:oid,filename,user,id,lang,qlty}=req.body
    user=Number(user)
    
    res.end()
    
    order=JSON.parse(fs.readFileSync(root+"/"+oid+".txt"))
    fs.unlinkSync(root+"/"+oid+".txt")
    
    //let {qlty}=settings.find_unended_lines(order,true)
    
    let textarr=text.split("\n")
    console.log(textarr.length,"tarr");
    text=""
    for(var i of order){
      if(!i.text){
        text+="\n"
        continue
      }
      text+=textarr.splice(0,1)[0]+"\n"
    }
    console.log(text.split("\n").length);
    await new Promise(r=>{
      settings.decode(text.split("\n"),order,async sub=>{
        sub=await settings.decodeAds(sub)
        fs.writeFileSync(root+"/subtitles/"+oid+".srt",sub)
        r()
      })
    })
    
    filename=filename.split(".")
    filename.pop()
    filename=filename.join(".")+"@subtitle_translate_bot.srt"
    
    await document(user,root+"/subtitles/"+oid+".srt",{caption:`<pre>${filename}</pre>\n\nQuality rating : ${qlty}/10 (${qlty>=7?"GOOD SUB":"BAD SUB"})\n\nSubtitle translated by @subtitle_translate_bot\n\n<b><i>Share your opinion about the translated subtitle</i></b>`,reply_markup:Button([[["Share your opinion","https://t.me/tlgrmcbot?start=subtitle_translate_bot-review","url"]]]),parse_mode:"html"},{filename})
    fs.unlinkSync(root+"/subtitles/"+oid+".srt")
    send(adminId,`file : ${filename}\nlang : ${lang}\nid : ${user}\nbatch translation`)
    if(isInRoom(user))return io.sockets.in(user).emit("sub_success",id)
  }catch(e){
    console.log(e);
    if(!isInRoom(Number(req.body.user)))return
    
    if(typeof e!=="string")e="Something went wrong while uploading "+req.body.filename
    io.sockets.in(Number(req.body.user)).emit("alert",e)
  }
})

module.exports.routes=router
module.exports.io=io
module.exports.emit=(i,e,d)=>{
  if(isInRoom(Number(i))){
    io.sockets.in(Number(i)).emit(e,d)
  }
}