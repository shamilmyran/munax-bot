// getting local libraries
const {bot,token, adminId}=require("./lib/config"),
{sendMessage:send,Button,answerCallback:answer,sendVideo,sendPhoto,sendDocument,editMessage:edit,deleteMsg}=require("./lib/message"),
settings=require("./lib/settings"),
{post,storie,reels,igtv,profile,igtimeout}=require("./lib/downloader"),
{ig,login,api, checkpoint,relogin}=require("./lib/insta"),
db=require("../../helper/db")

let last_req=Date.now()-15000

// getting npm packages
const {Router}=require("express"),
router=Router(),
fs=require("fs"),
got=require("got"),
mime=require("mime-types"),
{encode:htmlEnc}=require("html-entities")

let last_logined=Date.now()-60000,
clname=(process.env.NODE_ENV==="production"?"instagram":"instagram"),
root=process.cwd()+"/bot/instagram-bot"

login()

// check login status function
async function check_login_sts(){
  try{
  let login=await db().collection("bots").findOne({bot:"instagram"})
  let error=await ig().user.getIdByUsername(login.username).catch(e=>e)
  if(error instanceof Error&& error.toString().includes("login_required")){
    console.log(error.toString(),"its am error");
    let log_diff=Date.now()- last_logined
    if(log_diff<600000)return false
    await ig().account.login(login.username,login.password)
    last_logined=Date.now()
    return true
  }
  return false
  }catch(e){
    console.log(e,"it is catch");
    return false
  }
}


// /start messsage handler
bot.onText(/^\/start$/,async msg=>{
 try {
   let rpl=`Hi ${msg.from.first_name||""} ${msg.from.last_name||""} 👋\n\nIam a bot for download <code>Instagram reels 📽️ ,photos 🖼️ ,thumbnail 🎞️ ,stories and profile pictures </code>\n\nJust send the link of the post or the username`.trim()
   send(msg.chat.id,rpl)
   
  // await db.delete("user_datas",{user:msg.from.id})
  let usercheck=await db.get("user_datas",{user:msg.from.id},true)
  if(usercheck&&usercheck.bots.includes("instagram"))return
  console.log(usercheck);
  
  send(adminId,`new user joined\n user id : ${msg.from.id}\nname : ${msg.from.first_name||""} ${msg.from.last_name||""}\nusername : ${msg.from.username||"no username"}`)
  if(!usercheck){
    await db.set("user_datas",{user:msg.from.id, bots:["instagram"]})
    return
  }
  usercheck.bots.push("instagram")
  await db.update("user_datas",{user:msg.from.id},{bots:usercheck.bots})
 } catch (e) {return}
})

const check_the_mes= async msg=>{
  try {
    if(msg.text.match(/^\/|\n|\r/))return
    if(msg.reply_to_message)return
    let chat=msg.chat.id,user=msg.from.id
    let cat=settings.categorize(msg.text)
    console.log(cat,Date.now(),last_req,Date.now()-last_req);
    if(cat.match(/^err_/))return send(chat,settings.setError(cat),{reply:msg})
<<<<<<< HEAD
    if(Date.now()- last_req<30000)return igtimeout(msg,last_req)
=======
    if(Date.now()- last_req<15000)return igtimeout(msg,last_req)
>>>>>>> tgwayorg/stable
    last_req=Date.now()
    send(msg.chat.id,"trying to get the file please wait")
    if(cat.match("username")){
      await profile(msg.text,msg);
      return 
    }
    if(cat==="stories"){
      await storie(msg.text,msg)
      return
    }
    if(cat==="reel"){
      await reels(msg.text,msg)
      return
    }
    if(cat==="igtv"){
      await igtv(msg.text,msg)
      return
    }
    await post(msg.text,msg)
    return
  } catch (e) {
    console.log(e,"hi how");
    if(typeof e==="string"){
      send(msg.chat.id,e)
      ig().user.getIdByUsername("afsal__shazz_").catch(async e=>{
        send(adminId,e.toString())
        if(e.toString().includes("login_required")){
          let data=await db.get("bots",{bot:clname},true)
          console.log(data);
          let acc=data.account
          try{
          let sts=await relogin(data.creds[acc].username,data.creds[acc].password)
          if(!sts)return send(adminId,"relogin error")
          }catch(e){
            console.log(e);
          }
        }else if(e.toString().includes("IgCheckpointError")){
          checkpoint()
        }
      })
    }
    return
  }
}

bot.on("text",check_the_mes)

let data_col=false

const sleep=(time=>{
  return new Promise(r=>{
    setTimeout(function() {
      r()
    }, time);
  })
})

bot.onText(/^\/collect$/,async msg=>{
  try{
    if(adminId!=msg.chat.id)return
    data_col=true
    
    let {last_coll}=(await db.get("bots",{bot:"instagram"},true))||{last_coll:0}
    if(!last_coll)await db.set("bots",{bot:"instagram",last_coll:1})
    let {message_id:end}=await send(adminId,"collecting datas ")
    
    let found=0
    for (var i =Number(last_coll);i<end;i++){
      if(!(i%10)){
        await edit(`total message checked : ${i}\nuser founded : ${found}\nmessage id : ${end}`,{chat_id:adminId,message_id:end})
        await db.update("bots",{bot:"instagram"},{last_coll:i})
      }
      
      if(!data_col)break
      let m=await bot.sendMessage(adminId,"collecting message "+i,{reply_to_message_id:i}).catch(e=>new Error())
      await deleteMsg(adminId,m.message_id)
      
      if(m instanceof Error||!m.reply_to_message||!m.reply_to_message.from.is_bot||!m.reply_to_message.caption)continue
      
      let id=m.reply_to_message.caption.toLowerCase().match(/id( ){0,5}:( ){0,5}[0-9]{5,20}$/)
      
      if(!id)continue
      
      id=Number(id[0].replace(/[^0-9]{0,}/g,""))
      m=await bot.getChat(id).catch(e=>new Error())
      if(m instanceof Error){
        console.log(m);
        continue
      }
      
      let is_user=await db.get("user_datas",{user:id},true)
      console.log(is_user);
      if(!is_user){
        await db.set("user_datas",{user:id, bots:["instagram"]})
        found++
        continue
      }
      if(is_user.bots.includes("instagram"))continue
      is_user.bots.push("instagram")
      await db.update("user_datas",{user:id},{bots:is_user.bots})
      found++
      send(adminId,"commen user id : "+id)
      continue
    }
  }catch(e){
    console.log(e)
    return;
  }
})

bot.onText(/^\/count$/,async(msg)=>{
  if(msg.chat.id!=adminId)return
  
  let count=await db.count("user_datas",{bots:{$in:["instagram"]}})
  send_m(adminId,"total users : "+count)
})

bot.onText(/^\/stop_col$/,async m=>{
  if(m.chat.id!=adminId)return
  send(adminId,"collecting data is stopped")
  data_col =false
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
    let users=await db.get("user_datas",{bots:{$in:["instagram"]}})
    console.log(img,text);
    //let users=[{user:adminId}]
    var i=0
    let m=await send(adminId,"message send notification")
    let time=Date.now()/1000
    let len=users.length
    for(let {user} of users){
      if(!(i%25)){
        var nt=Date.now()/1000
        edit(`total message to be sended : ${users.length}\ntotal message sended : ${i}\nest time to  be done: ${Math.round((((nt-time)/i*len))-(nt-time))} sec`,{chat_id:adminId,message_id:m.message_id})
      }
      if(img){
        sendPhoto(user,img,{reply_markup:btn, caption:text},{},false)
      }
      else send(user,text,{reply_markup:btn})
      i++
      await sleep(50)
    }
    var nt=Date.now()/1000
    edit(`total message to be sended : ${users.length}\ntotal message sended : ${i}\nest time to  be done: ${Math.round((((nt-time)/i*len))-(nt-time))} sec`,{chat_id:adminId,message_id:m.message_id})
    send(adminId,"message sending ended")
    
  } catch (e) {
    console.log(e);
    return
  }
})

const seen_story=(story)=>{
  return ig().story.seen([{id:story.id,taken_at:story.taken_at,user:{pk:story.pk}}])
}

const check_the_cb= async msg=>{
  try{
    let callback=JSON.parse(msg.data);
    if(callback.type!=="story")return
    
    var tdiff=Date.now()-last_req
<<<<<<< HEAD
    if(tdiff<30000)throw `Due to instagram restriction i can only download medias 1/30s\nSo please send new request after ${parseInt(Math.abs(30-(tdiff/1000)))} seconds`
=======
    if(tdiff<15000)throw `Due to instagram restriction i can only download medias 1/15s\nSo please send new request after ${parseInt(Math.abs(15-(tdiff/1000)))} seconds`
>>>>>>> tgwayorg/stable
    
    last_req=Date.now()
    
    let chat=msg.message.chat.id  
    
    let reel_feed=await ig().feed.reelsMedia({userIds:[callback.user_id]})
    let stories=await reel_feed.items()
    api(2)
    if(!stories.length)throw "No story availble to download \nPlease double check that it is not a private user\n\nif it is a bug please report @afsalcp66"
    console.log(stories);
    seen_story(stories[0])
    while(stories.length){
      let sl_storyies=stories.splice(0,10)
      if(sl_storyies.length==1){
        let story=sl_storyies[0]
        let caption=`${story.caption||""}\n\nTo get more quality or get thumbnail <a href="${process.env.HEROKU_URL}/instagram/media?id=${story.id}">Click the link</a>`
        if(story.video_versions){
          return sendVideo(chat,story.video_versions[0].url,{caption,parse_mode:"html"})
        }else{
          return sendPhoto(chat,story.image_versions2.candidates[0].url,{parse_mode:"html",caption})
        }
      }
      let snd=[]
      for(var i of sl_storyies){
        if(i.video_versions){
          let {headers}=await got.head(i.video_versions[0].url)
          if(Number(headers["content-length"])>20*1024*1024){
            send(chat,`Due to telegram bot api limitation i can only upload files upto 20 MB \nthis story is bigger than 50MB , so i can't upload file via telegram \nPlease <a href="${process.env.HEROKU_URL}/instagram/media?id=${i.id}"> click the link</a> for download your video`)
            continue
          }
          snd.push({media:i.video_versions[0].url,type:"video",caption:`${i.caption||""}\n\nTo get more quality or download thumbnail click this link ${process.env.HEROKU_URL}/instagram/media/?id=${i.id}`,parse_mode:"html"})
        }else if(i.image_versions2){
          let {headers}=await got.head(i.image_versions2.candidates[0].url)
          if(Number(headers["content-length"])>5*1024*1024){
            send(chat,`Due to telegram bot api limitation i can only upload files upto 5 MB \nthis story is bigger than 5 MB , so i can't upload file via telegram \nPlease <a href="${process.env.HEROKU_URL}/instagram/media?id=${i.id}"> click the link</a> for download your image`)
            continue
          }
          snd.push({media:i.image_versions2.candidates[0].url,type:"photo",caption:`${i.caption||""}\n\nTo get more quality or download thumbnail click this link ${process.env.HEROKU_URL}/instagram/media/?id=${i.id}`})
        }
      }
      bot.sendMediaGroup(chat,snd,{parse_mode:"html"}).catch(e=>{
        console.log(e.body);
        var btns=[]
        for(i in sl_storyies){
          btns.push([[`${Number(i)+1}th story`,`${process.env.HEROKU_URL}/instagram/media?id=${sl_storyies[i].id}`,"url"]])
        }
        send(chat,"unexpected error occured , please use the below buttons to download stories \n<b>Sorry for the bug</b>",{reply_markup:Button(btns)})
      })
    }
  }catch(e){
    if(typeof e!=="string"){console.log(e);e="unexpected error occured\n\nplease try again"}
    if(e.includes("bug")){
      let login=await check_login_sts()
      if(login)return check_the_cb(msg)
    }
    return answer(msg.id,e)
  }
}

bot.on("callback_query",check_the_cb)

bot.on("callback_query",msg=>{
  try{
    let callback=JSON.parse(msg.data);
  
    if(callback.type!="retry_s")return
    if(Date.now()-last_req<15000)return answer(msg.id,`Due to instagram restriction i can only download medias 1/15s\nSo please send new request after ${parseInt(Math.abs(15-((Date.now()-last_req)/1000)))} seconds`)
    //console.log(msg);
    check_the_mes(msg.message.reply_to_message)
  }
  catch(e){
    console.log(e);
    return 
  }
})

// change creditionals of Instagram user
bot.onText(/^\/login$/,async msg=>{
  let chat=msg.from.id
  if(chat!==adminId)return
  
  let login=await db().collection("bots").findOne({bot:"instagram"})
  
  if(login)send(chat,`Current login detials : \n\n<b>USERNAME : </b>${login.username}\n<b>PASSWORD : </b>${login.password}\nEnter new password details`)
  send(chat,"username")
})

bot.onText(/^\/media/,async msg=>{
  try{
  let id=msg.text.split(" ")[1]
  let data=await ig().media.info(id)
  console.log(data);
  await fs.writeFileSync(root+"/media.json",JSON.stringify(data))
  await sendDocument(adminId,process.cwd()+"/bot/instagram-bot/media.json")
  await fs.unlinkSync(root+"/media.json")
  }catch(e){
    console.log(e);
    return
  }
})

bot.on("text",async msg=>{
  console.log("on texting");
  let chat=msg.from.id
  if(chat!==adminId)return
  if(!msg.reply_to_message)return
  
  let mtype=msg.reply_to_message.text
  if(mtype!=="username"&&mtype!=="password")return
  
  let login=await db().collection("bots").findOne({bot:"instagram"})
  
  if(!login){
    await db().collection("bots").insertOne({bot:"instagram"})
  }
  
  await db().collection("bots").updateOne({bot:"instagram"},{
    $set:{
      [mtype]:msg.text
    }
  })
  if (mtype==="username")return send(adminId,"password")
  if (mtype==="password"){
    await ig().account.login(login.username,msg.text)
    send(adminId,"Successfully relogined")
  }
})


router.post("/"+token,(req,res)=>{
  res.sendStatus(200)
  bot.processUpdate(req.body)
})
router.get("/media",async(req,res)=>{
try {
  let {id}=req.query
  if(!id)throw "id not mentioned"
  
  send(adminId,"one user used the website information sended")
  
  var tdiff=Date.now()-last_req
<<<<<<< HEAD
  if (tdiff<30000)return res.render("instagram/timeout",{loc:"/instagram/media?id="+id,time:last_req+30000})
=======
  if (tdiff<15000)return res.render("instagram/timeout",{loc:"/instagram/media?id="+id,time:last_req+15000})
>>>>>>> tgwayorg/stable
  last_req=Date.now()
  
  let media=await ig().media.info(id).catch(e=>{api(1);throw e})
  api(1)
  media=media.items.pop()
  console.log(id);
  res.render("instagram/index",{media,headerChange:true})
} catch (e) {
  console.log(e);
  if(typeof e!=="string")e="Unexpected error occured please try again later"
  return res.end(e)
}
})

router.get("/getFile",async(req,res)=>{
  try{
    console.log(req.query);
    got.stream(req.query.url).pipe(res)
  }catch(e){
    console.log(e);
    res.setHeader("content-type","image/png")
    fs.createReadStream(process.cwd()+"/public/images/icon.png").pipe(res)
  }
})

router.get("/download",async(req,res)=>{
  try{
    let {url,filename}=req.query
    console.log(url);
    filename=filename.replace(/[^a-zA-Z0-9,_.]/g,"")
    if(filename.replace(/\.\w+$/,"").trim()=="")filename=Date.now()+filename.replace(/^(.+\.)?/,"")
    let {headers}=await got.head(url)
    headers["Content-Disposition"]=`attachment; filename="${filename||"no name"}.${mime.extension(headers["content-type"])||"bin"}"`
    console.log(headers);
    res.header({"content-type":headers["content-type"],"content-length":headers["content-length"],"Content-Disposition":headers["Content-Disposition"]})
    got.stream(url).pipe(res)
  }catch(e){
    return res.end("filed to lookup")
  }
})

// exporting Router
module.exports=router