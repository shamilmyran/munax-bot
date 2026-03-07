// requiring npm packages
const got=require("got"),
{urlSegmentToInstagramId:mid}=require("instagram-id-to-url-segment"),
{encode:htmlEnc}=require("html-entities")

// requiring local packages
const settings=require("./settings"),
{bot}=require("./config"),
{sendMessage:send,sendVideo,sendPhoto,Button}=require("./message"),
{ig,api}=require("./insta")

// supporting function
function getHighRes(m){
  m.sort((a,b)=>{
    return (a.width+a.height)-(b.width+b.height)
  })
  return m.pop()
}
const normalize=async(media,save=true)=>{
  const module_name=()=>{
    const modules=["feed_timeline","feed_contextual_post","profile","newsfeed"]
    let sl_mod=modules[Math.floor(Math.random()*4)]
    if(sl_mod=="profile"){
      if(media.product_type=="carousel_container"){
        sl_mod="media_view_profile"
      }else if(media.video_versions){
        sl_mod="video_view_profile"
      }
      return {username:media.user.username, user_id:media.user.pk,module_name:sl_mod}
    }
    return {module_name:sl_mod}
  }
  if(!media.like_and_view_counts_disabled&&!media.has_liked&&Math.floor(Math.random()*2))await ig().media.like({mediaId:media.id,d:1,moduleInfo:module_name()})
  if(!save)return
  var save_rand=[0,1,0,0,0,0,0,0]
  if(media.can_viewer_save&&save_rand[Math.floor(Math.random()*8)]){
    await ig().media.save(media.id)
  }
}
const seen_story=(story)=>{
  return ig().story.seen([{id:story.id,taken_at:story.taken_at,user:{pk:story.pk}}])
}

// exporting downloader
module.exports.post=async(url,msg)=>{
  try{
    let code=mid(url.replace(/.+\/p\/|\/.*$/g,""))
    console.log(code,url.replace(/.+\/p\/|\/.*$/g,""));
    let media=await ig().media.info(code).catch(e=>{api(1);console.log(e);throw "No post found for your request \nplease check the url\nbug"})
    media=media.items.pop()
    normalize(media)
    let caption=media.caption
    api(1)
    if(!media)throw "No post found for your request \nplease check the url"
    if(media.product_type==="feed"||media.product_type==="clips"){
      let meth,max_len
      if(media.video_codec){
        meth=sendVideo
        media=media.video_versions
        max_len=20*1024*1024
      }else{
        meth=sendPhoto
        media=media.image_versions2.candidates
        max_len=5*1024*1024
      }
      media=getHighRes(media)
      let head=await got.head(media.url)
      if(Number(head.headers["content-length"])<max_len){
        return meth(msg.chat.id,media.url,{reply:msg,caption:(caption?`<code>${caption.user.username}</code>\n\n<code>${caption.user.full_name}</code>\n\n<code>${htmlEnc(caption.text).trim().slice(0,800)}</code>\n\n<u><b>To get more quality options and thumbnail please <a href="${process.env.HEROKU_URL}/instagram/media/?id=${code}">click this link</a></b></u>`:`\n\n<u><b>To get more quality options and thumbnail please <a href="${process.env.HEROKU_URL}/instagram/media/?id=${code}">click this link</a></b></u>`),parse_mode:"html"})
      }else{
        return send(msg.chat.id,`Due to telegram bot limitations i can only upload files upto 20MB\n\nSo please click the link to download your video ${process.env.HEROKU_URL}/instagram/media/?id=${code}`)
      }
    }else if(media.product_type==="carousel_container"){
      let carousel_media=media.carousel_media
      let max_len,files=[],meth
      for(media of carousel_media){
        if(media.video_codec){
          meth="video"
          media=media.video_versions
          max_len=20*1024*1024
        }else{
          meth="photo"
          media=media.image_versions2.candidates
          max_len=5*1024*1024
        }
        media=getHighRes(media)
        let head=await got.head(media.url)
        if(Number(head.headers["content-length"])<max_len){
          files.push({media:media.url,type:meth})
        }else{
          return send(msg.chat.id,`Due to telegram bot limitations i can only upload files upto 20MB\n\nSo please click the link to download your video ${process.env.HEROKU_URL}/instagram/media/?id=${code}`)
        }
      }
      while(files.length){
      let f=files.splice(0,10)
      f[0].caption=(caption?`<code>${caption.user.username}</code>\n\n<code>${caption.user.full_name}</code>\n\n<code>${htmlEnc(caption.text).trim().slice(0,950)}</code>\n\n<u><b>To get more quality options and thumbnail please <a href="${process.env.HEROKU_URL}/instagram/media/?id=${code}">click this link</a></b></u>`:`\n\n<u><b> To get more quality options and thumbnail please <a href="${process.env.HEROKU_URL}/instagram/media/?id=${code}">click this link</a></b></u>`)
      f[0].parse_mode="html"
      return bot.sendMediaGroup(msg.chat.id,f,{reply:msg,parse_mode:"html"}).catch(e=>{console.log(e);return send(msg.chat.id,"Unexpected error occured while uploading your file \n\nPlease click the link for download your files "+process.env.HEROKU_URL+"/instagram/media?id="+code)})
      }
    }
  }catch(e){
    if(typeof e==="string"){
      if(e.match("bug"))throw "relog"
      return send(msg.chat.id,e,{reply:msg})
    }
    console.log(e);
    return send(msg.chat.id,"unexpected error occured\nPlease try again")
  }
}

// downloadinh Instagram stories
module.exports.storie=async (url,msg)=>{
  try{
    let {username,id}=settings.storyUrlCat(url)
    code=id
    let media=await ig().media.info(id).catch(e=>{api(1);throw "Media not found \nPlease make sure that the story is still accessible. if its a bug please report @afsalcp66"})
    api(1)
    console.log(media);
    if(!media||!media.items)throw "No story found for your request"
    media=media.items.pop()
    seen_story(media)
    if(media.product_type!=="story")throw "Look like you send an Instagram story url\nBut Instagram send a "+media.product_type
    let meth,caption=media.caption,max_len
    if(media.video_codec){
      meth=sendVideo
      max_len=20*1024*1024
      media=media.video_versions
    }else{
      meth=sendPhoto
      max_len=5*1024*1024
      media=media.image_versions2.candidates
    }
    media=getHighRes(media)
    let head=await got.head(media.url)
    if(Number(head.headers["content-length"])<max_len){
      meth(msg.chat.id,media.url,{reply:msg,caption:(caption?`${(`<code>${caption.user.username}</code>\n\n<code>${htmlEnc(caption.user.full_name)}</code>\n\n<code>${htmlEnc(caption.text)}`).slice(0,1020)}</code>\n\n<u><b>To get more quality options and thumbnail please <a href="${process.env.HEROKU_URL}/instagram/media/?id=${code}">click this link</a></b></u>`:`\n\n<u><b>To get more quality options and thumbnail please <a href="${process.env.HEROKU_URL}/instagram/media/?id=${code}">click this link</a></b></u>`),parse_mode:"html"})
    }else{
      return send(msg.chat.id,`Due to telegram bot limitations i can only upload files upto 20MB\n\nSo please click the link to download your video ${process.env.HEROKU_URL}/instagram/media/?id=${code}`)
    }
  }catch(e){
     if(typeof e !="string"){console.log(e) ;e="unexpected error please try again later"}
     if(e.includes("bug")) throw e
     return send(msg.chat.id,e,{reply:msg})
  }
}

module.exports.reels=async(url,msg)=>{
  try{
  let code=mid(url.replace(/https.+?\/reel\/|\/(.*)/g,""))
  let media=await ig().media.info(code).catch(e=>{api(1);console.log(e); throw "No media found for your request\n<code>make sure that the link is valid</code>\n\nIf it is a bug please report @afsalcp66"})
  api(1)
  if(!media||!media.items)throw "No media found for your request"
  media=media.items.pop()
  normalize(media)
  let caption=media.caption
  if(media.product_type==="clips"){
    media=getHighRes(media.video_versions)
    let head=await got.head(media.url)
    console.log(head,media);
    if(Number(head.headers["content-length"])<(20*1024*1024)){
      return sendVideo(msg.chat.id,media.url,{reply:msg,caption:(caption?`${(`<code>${caption.user.username}</code>\n\n<code>${settings.toPlainText(caption.user.full_name)}</code>\n\n<code>${htmlEnc(caption.text)}`).slice(0,1020)}</code>\n\n<u><b>To get more quality options and thumbnail please <a href="${process.env.HEROKU_URL}/instagram/media/?id=${code}">click this link</a></b></u>`:`\n\n<u><b>To get more quality options and thumbnail please <a href="${process.env.HEROKU_URL}/instagram/media/?id=${code}">click this link</a></b></u>`),parse_mode:"html"})
    }else return send(msg.chat.id,`Due to telegram bot limitations i can only upload files upto 20MB\n\nSo please click the link to download your video ${process.env.HEROKU_URL}/instagram/media/?id=${code}`)
  }else throw "Look like you sended an Instagram reels link \nBut Instagram return another media\n\nPlease check the url"
  }catch(e){
    if(typeof e !=="string"){console.log(e);e="Unexpected error occured please try again"}
    if(e.includes("bug"))throw e
    return send(msg.chat.id,e)
  }
}

module.exports.igtv=async (url,msg)=>{
  try {
    let code=mid(url.replace(/.+\/tv\/?|\/(.*)/g,""))
    let media=await ig().media.info(code).catch(e=>{api(1);throw "No media found\nPlease check the url\n\nif it is an bug please report @afsalcp66"})
    api(1)
    if(!media||!media.items)throw "No media Found for your request \nplease check the url"
    media=media.items.pop()
    normalize(media)
    let caption=media.caption
    if(media.product_type!=="igtv")throw "look like you sended a igtv link \nBut instagram return another media type\n\nPlease check the url"
    media=getHighRes(media.video_versions)
    let {headers}=await got.head(media)
    if(Number(headers["content-length"])<(20*1024*1024)){
        return sendVideo(msg.chat.id,media.url,{reply:msg,caption:(caption?`${(`<code>${caption.user.username}</code>\n\n<code>${htmlEnc(caption.user.full_name)}</code>\n\n<code>${htmlEnc(caption.text)}`).slice(0,1020)}</code>\n\n<u><b>To get more quality options and thumbnail please <a href="${process.env.HEROKU_URL}/instagram/media/?id=${code}">click this link</a></b></u>`:`\n\n<u><b>To get more quality options and thumbnail please <a href="${process.env.HEROKU_URL}/instagram/media/?id=${code}">click this link</a></b></u>`),parse_mode:"html"})
    }else{
      return send(msg.chat.id,`Due to telegram bot limitations i can only upload files upto 20MB\n\nSo please click the link to download your video ${process.env.HEROKU_URL}/instagram/media/?id=${code}`)
    } 
  } catch (e) {
    if(typeof e !=="string"){console.log(e);e="unexpected error occured \nplease try again"}
    if(e.includes("bug"))throw e
    return send(msg.chat.id,e)
  }
}

module.exports.profile=async(user,query)=>{
  try {
    let msg=query
    if(query.entities){
      query.text=query.text.split(""),i=0
      query.entities.map((e)=>{
        if(e.type==="italic"){
          query.text.splice((e.offset+e.length)+(i*2),0,"__")
          query.text.splice(e.offset+(i*2),0,"__")
          i++
        }
      })
      user=query.text.join("")
    }
    user=user.replace(/https:\/\/.+?\/|\/(.*)|\?(.*)/g,"")
    console.log(user);
    let name=user
    let user_id=await ig().user.getIdByUsername(user).catch(e=>{api(1);console.log(e);throw "No user found for "+user+"\nPlease check the username\nif it is a bug please report @afsalcp66"})
    user=await ig().user.info(user_id)
    api(2)
    let profile
    if(user.hd_profile_pic_url_info)profile=user.hd_profile_pic_url_info.url
    else profile=user.hd_profile_pic_version.pop().url
    sendPhoto(msg.chat.id,profile,{reply:msg,parse_mode:"html",caption:(`username : <code>${user.username}</code>\n\nfull name : <code>${htmlEnc(user.full_name||"")}</code>\n\ntotel media : <code>${user.media_count||""}</code>\n\n   <u>Follwers</u>    <u>Following</u>\n  <code>${user.follower_count||""}</code>    ${user.following_count||""}\n\nbio : <code>${user.biography.slice(0,800)||""}</code>`),reply_markup:Button([[["get all stories",{type:"story", user_id}]]])})
    
  } catch (e) {
    if(typeof e !=="string"){console.log(e);e="unexpected error occured please try again later"}
    if(e.includes("bug"))throw e
    return send(query.chat.id,e)
  }
}

module.exports.igtimeout=async(msg,time)=>{
  try {
<<<<<<< HEAD
    var tdiff=Math.abs(30-(Date.now()-time)/1000)
    var rpl=`Due to instagram restriction i can only download medias 1/30s\nSo please send new request after ${parseInt(tdiff)} seconds`
=======
    var tdiff=Math.abs(15-(Date.now()-time)/1000)
    var rpl=`Due to instagram restriction i can only download medias 1/15s\nSo please send new request after ${parseInt(tdiff)} seconds`
>>>>>>> tgwayorg/stable
    //console.log(rpl);
    send(msg.chat.id,rpl,{reply_markup:Button([[["Retry",{type:"retry_s"}]]]),reply_to_message_id:msg.message_id})
  } catch (e) {
    console.log(e);
    return
  }
}