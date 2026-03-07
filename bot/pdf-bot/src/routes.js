const router=require("express").Router(),
bigInt=require("big-integer"),
{getFileInfo}=require("telegram/Utils"),
fs=require("fs")

const {bot,group,root}=require("./config"),
{send}=require("./messages")

router.get("/create",(req,res)=>{
  res.render("pdf/index",{title:"create pdf",headerChange:true,telegram:true})
})

router.post("/upload/image",async(req,res)=>{
  try{
    if(!req.files||!req.files.image||!req.body.user)return res.end()
    
    let filepath=`${root}/files/${req.body.user}.${req.files.image.name.split(".").pop()}`
    
    await req.files.image.mv(filepath)
    
    let m=await send(group,{file:filepath,message:`user : ${req.body.user}`,forceDocument:true})
    
    fs.unlinkSync(filepath)
    
    if(!m)return res.end()
    
    let randkey=1+Math.floor(Math.random()*9),
    key=(randkey*m.id)+String(randkey)
    
    let url=`${process.env.HEROKU_URL}/pdf/download/image?key=${key}`
    
    return res.end(url)
    
  }catch(e){console.log(e);res.end()}
})

router.get("/download/image",async(req,res)=>{
  try {
    let key=req.query.key,
    randkey=Number(key.at(-1))
    key=key.split("")
    key.pop()
    let id=Number(key.join(""))/randkey
    
    let [m]=await bot.getMessages(group,{ids:id})
    let limit=Number(getFileInfo(m.media).size.value)
    if(!m)return res.end()
    
    res.set({
      "Content-Length":limit,
      "Content-Type":m.media.document.mimeType
    })
    
    let iter=bot.iterDownload({file:m.media, requestSize:256*1024, offset:bigInt(0),limit})
    
    for await (const chunk of iter){
      res.write(chunk)
    }
    res.end()
    
  } catch (e) {console.log(e);res.end()}
})

module.exports=router