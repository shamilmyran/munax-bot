/*requiring local packages*/
const {bot,root,adminId}=require("../src/config"),
{answerCallback:answer,editMessage:edit,Button,editMarkup,sendDocument,sendMessage}=require("../src/message"),
{search,getSubs,download,getAllSubs}=require("../src/subscene"),
settings=require("../src/settings")

/*requiring npm packages*/
const fs=require("fs"),
encode=require("detect-file-encoding-and-language"),
encoder=require("encoding")

/*setting some global vatibles*/
const noToLet={
  1:"First",
  2:"Second",
  3:"Third",
  4:"Fourth",
  5:"Fifth",
  6:"Sixth",
  7:"Seventh",
  8:"Eighth",
  9:"Ninth",
  10:"Tenth",
  11:"Eleventh",
  12:"Twelfth",
  13:"Thirteenth",
  14:"Fourteenth",
  15:"Fifteenth",
  16:"Sixteenth",
  17:"seventeen",
  18:"Eighteenth",
  19:"Nineteenth",
  20:"Twentieth",
  21:"Twenty first",
  22:"Twenty Second",
  23:"Twenty Third",
  24:"Twenty Fourth",
  25:"Twenty Fifth",
  26:"Twenty Sixth",
  27:"Twenty Seventh",
  28:"Twenty Eighth",
  29:"Twenty Ninth",
  30:"Thirtieth"
}

/*Searching in subscene callback*/
bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="ss"||callback.w!=="ss")return
    if(!msg.message.reply_to_message)throw "The message you sent is missing\nPlease make sure that ,your not deleted that message"
    
    /*settings some variobles*/
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
    query=msg.message.reply_to_message.text,
    query_data=settings.gussTheQuery(query)
    query=`${query_data.title} ${query_data.year||""} ${(query_data.season?(noToLet[String(parseInt(query_data.season))]?noToLet[String(parseInt(query_data.season))]:query_data.season)+" Season":"")}`.trim()
    
    console.log(query);
    let sub=await search(query)
    if(!sub||!sub.length)return edit("No subtitles found for your request \nPlease check the spelling OR search in OPEN SUBTITILE or SUBDL",{chat_id,message_id,reply_markup:Button([[["Open Subtitle",{t:"ss",w:"os"}]],[["Subdl",{t:"ss",w:"sd"}]]])})
    let btn=settings.toMarkupBtnSSsearch(sub,1)
    edit("Please select a movie",{chat_id,message_id,reply_markup:Button(btn)})
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})

/*change the search result page callback*/
bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="csrss")return
    if(!msg.message.reply_to_message)throw "The message you sent is missing\nPlease make sure that ,your not deleted that message"
    if((callback.ct=="p"&&callback.p<=0)||(callback.ct=="n"&&callback.tp<callback.p))throw "No more page"
    
    /*settings some variobles*/
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
    query=msg.message.reply_to_message.text,
    query_data=settings.gussTheQuery(query)
    query=`${query_data.title} ${(query_data.season?noToLet[String(parseInt(query_data.season))]+" Season":"")} ${query_data.year||""}`.trim()
    
    let sub=await search(query)
    if(!sub.length)throw "Unexpected error occured please try agian"
    let btn=settings.toMarkupBtnSSsearch(sub,callback.p)
    
    return editMarkup(Button(btn),{chat_id,message_id})
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})

/*search subtitles for selected results*/
bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="srss")return
    if(!msg.message.reply_to_message)throw "The message you sent is missing\nPlease make sure that ,your not deleted that message"
    
    /*settings some variobles*/
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
    query=msg.message.reply_to_message.text,
    query_data=settings.gussTheQuery(query)
    query=`${query_data.title} ${(query_data.season?noToLet[String(parseInt(query_data.season))]+" Season":"")} ${query_data.year||""}`.trim()
    
    let sub=await search(query)
    if(!sub.length)throw Error()
    sub=sub[callback.p*10+callback.i]
    
    let allSubs=await getAllSubs(sub.path,true)
    //console.log(allSubs);
    let allLang=Object.keys(allSubs).filter(x=>x!="datas")
    let btn=[]
    for(var i of allLang){
      btn.push([[i.toUpperCase(),{t:"slss",l:i}]])
    }
    btn.push([["Search in Open Subtitles",{t:"ss",w:"os"}]])
    return edit(`<a href="${allSubs.datas.poster}">POSTER</a>\n\nPlease select a language\nIf the language list doesn't contain your language, please download a subtitle in any language, and translate to your language using our @subtitle_translate_bot\n\n<code>path :: ${sub.path.replace(/\//g,"#$")}</code>`,{chat_id,message_id,reply_markup:Button(btn),disable_web_page_preview:false})
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})

/*getting all subtitles for a specific language*/
bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="slss")return
    if(!msg.message.reply_to_message)throw "The message you sent is missing\nPlease make sure that ,your not deleted that message"
    
    /*settings some variobles*/
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
    path=msg.message.text.match(/\n\npath :: .+/)
    if(!path)throw Error()
    path=path[0].replace("\n\npath :: ","").replace(/#\$/g,"/")
    
    let [subs,datas]=await getSubs(path,[callback.l],true)
    
    // sorting for the query
    let q=msg.message.reply_to_message.text
    q=settings.gussTheQuery(q)
    subs.subs.sort((a,b)=>{
      if(!a.title.match(/[a-zA-Z]/))return -1
      if(!b.title.match(/[a-zA-Z]/))return 1
      
      a=a.title.replace(/[^a-z0-9A-Z .,;:&()[\]"'`+\-!\\×@]/g,"")
      b=b.title.replace(/[^a-z0-9A-Z .,;:&()[\]"'`+\-!\\×@]/g,"")
      
      a=settings.gussTheQuery(a)
      b=settings.gussTheQuery(b)
      
      let c=0,d=0
      
      if(q.episode&&a.episode){
        c+=(q.episode==a.episode?1:0)
      }
      if(q.episode&&b.episode){
        d+=(q.episode==b.episode?1:0)
      }
      return d-c
    })
    
    let btn=settings.toMarkupBtnSSSubs(subs.subs,1,callback.l)
    
    return edit(`<a href="${datas.poster}">Poster</a>\nSelect subtitles you want\n\n<code>path :: ${path.replace(/\//g,"#$")}</code>`,{chat_id,message_id,reply_markup:Button(btn)})
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})

/*change subtitle page callback handler*/
bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="csss")return
    if((callback.ct==="p"&&callback.p<=0)||(callback.ct==="n"&&callback.p>callback.tp))throw "no more pages"
    
    /*settings some variobles*/
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
    path=msg.message.text.match(/\n\npath :: .+/)
    console.log(path,msg.message.text);
    if(!path)throw Error()
    path=path[0].replace("\n\npath :: ","").replace(/#\$/g,"/")
    
    let subs=await getSubs(path,[callback.l])
    
    // sorting for the query
    let q=msg.message.reply_to_message.text
    q=settings.gussTheQuery(q)
    subs.subs.sort((a,b)=>{
      if(!a.title.match(/[a-zA-Z]/))return -1
      if(!b.title.match(/[a-zA-Z]/))return 1
      
      a=a.title.replace(/[^a-z0-9A-Z .,;:&()[\]"'`+\-!\\×@]/g,"")
      b=b.title.replace(/[^a-z0-9A-Z .,;:&()[\]"'`+\-!\\×@]/g,"")
      
      a=settings.gussTheQuery(a)
      b=settings.gussTheQuery(b)
      
      let c=0,d=0
      
      if(q.episode&&a.episode){
        c+=(q.episode==a.episode?1:0)
      }
      if(q.episode&&b.episode){
        d+=(q.episode==b.episode?1:0)
      }
      return d-c
    })
    
    let btn=settings.toMarkupBtnSSSubs(subs.subs,callback.p,callback.l)
    
    return editMarkup(Button(btn),{chat_id,message_id})
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})

/*Select subtitle subscene callback handler*/
bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    if(callback.t!=="ssss")return
    
    /*settings some variobles*/
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
    path=msg.message.text.match(/\n\npath :: .+/)
    console.log(path,msg.message.text);
    if(!path)throw Error()
    path=path[0].replace("\n\npath :: ","").replace(/#\$/g,"/")
    
    let sub=(await getSubs(path,[callback.l])).subs
    
    // sorting for the query
    let q=msg.message.reply_to_message.text
    q=settings.gussTheQuery(q)
    sub.sort((a,b)=>{
      if(!a.title.match(/[a-zA-Z]/))return -1
      if(!b.title.match(/[a-zA-Z]/))return 1
      
      a=a.title.replace(/[^a-z0-9A-Z .,;:&()[\]"'`+\-!\\×@]/g,"")
      b=b.title.replace(/[^a-z0-9A-Z .,;:&()[\]"'`+\-!\\×@]/g,"")
      
      a=settings.gussTheQuery(a)
      b=settings.gussTheQuery(b)
      
      let c=0,d=0
      
      if(q.episode&&a.episode){
        c+=(q.episode==a.episode?1:0)
      }
      if(q.episode&&b.episode){
        d+=(q.episode==b.episode?1:0)
      }
      return d-c
    })
    console.log(callback.p,callback.i,callback.p*10+callback.i);
    sub=sub[parseInt(callback.p*10)+callback.i]
    
    let files=await download(sub.path)
    for(var i of files){
      await fs.writeFileSync(root+"/subs/"+msg.from.id+".sub",i.file)
      try{
        let {encoding}=await encode(root+"/subs/"+msg.from.id+".sub")
        console.log(encoding);
        if(encoding!=="UTF-8"){
          let file=encoder.convert(i.file,"UTF-8",encoding)
         await fs.writeFileSync(root+"/subs/"+msg.from.id+".sub",file)
        }
      }catch(e){
        console.log(e);
      }
      await sendDocument(chat_id,root+"/subs/"+msg.from.id+".sub",{caption:`<code>Subtitle provided by subscene</code> : subscene.com\n<code>Subtitle downloaded by</code> : @subtitles_downloader_bot\n\n<b>${callback.l} Subtitile</b>\n`,parse_mode:"html",reply_markup:Button([[["Write a feedback","https://t.me/tlgrmcbot?start=subtitles_downloader_bot-review","url"]]])},{filename:i.filename})
      first=false
    }
    await fs.unlinkSync(root+"/subs/"+msg.from.id+".sub")
    return sendMessage(adminId,`user : <code>${msg.from.first_name||""} ${msg.from.last_name||""}</code>\nid : <code>${msg.from.id}</code>\napi : <code>Subscene</code>\nkey : ${msg.message.reply_to_message.text||""}\nusername : ${msg.from.username||""}\nselected : ${sub.title||""}\nlanguage : ${callback.l}`)
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})

/*bot.on("callback_query",msg=>{
  try {
    let callback=JSON.parse(msg.data);
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})  */