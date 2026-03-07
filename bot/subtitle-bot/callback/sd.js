/* importing some local library*/

const {bot,adminId,root}=require("../src/config"),
{answerCallback:answer,sendMessage:send,sendDocument,editMessage: edit,Button,editMarkup}=require("../src/message"),
settings=require("../src/settings"),
subdl=require("../src/subdl")

// importing npm packages
const {execSync}=require("child_process"),
fs=require("fs"),
got=require("got"),
{encode:htmlEnc}=require("html-entities"),
encode=require("detect-file-encoding-and-language"),
encoder=require("encoding")


const zipFilters = [
  "complete episodes",
  "complete",
  "all episodes",
  "all",
  "full episodes",
  "full series",
  "full",
  "season full",
  "full season",
  "all subs",
  "all subtitles"
  ]
function filterByZip(subs) {
  if (subs.length) {
    let sortList = []
    subs.map((m)=> {
      let gq=settings.gussTheQuery(m.title)
      var t = m.title.toLowerCase().replace(/\.|_/g, " ").trim()
      let filter = 0
      zipFilters.map(f=> {
        if (t.split(f).length > 1)filter++
      })
      if(t.replace(/ /g,"").match(/01-\d+|e01-e\d+|ep01-ep\d+|episode01-episode\d+|ep01-\d+/))filter++
      if(gq.season&&!gq.episode)filter++
      m.filter = filter
      sortList.push(m)

    })
    sortList.sort((x,
      y)=> {
      return y.filter-x.filter
    })
    subs=sortList
    return subs

  } else {
    return subs
  }

}


function sortSearch(res,q){
  q=settings.gussTheQuery(q)
  
  res.sort((x,y)=>{
    let a=0,b=0
    
    let l=settings.gussTheQuery(x.title),
    m=settings.gussTheQuery(y.title)
    
    // title match
    a+=(l.title==q.title?1:0)
    b+=(m.title==q.title?1:0)
    
    // year match
    a+=(l.year==q.year?1:0)
    b+=(m.year==q.year?1:0)
    
    // series match
    a+=((x.type=="tv"&&(q.season||q.episode))?1:0)
    b+=((y.type=="tv"&&(q.season||q.episode))?1:0)
    
    // movie match
    /*a+=((x.type=="movie"&&!q.season&&!q.episode)?1:0)
    b+=((y.type=="movie"&&!q.season&&!q.episode)?1:0)*/
    
    return b-a
  })
  
  return res
}


// search subtitles in subdl
bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="ss"||callback.w!=="sd")return
    if(!msg.message.reply_to_message)throw "The message you sent is missing\nPlease make sure that ,your not deleted that message"
    
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
    query=msg.message.reply_to_message.text,
    query_guss=settings.gussTheQuery(query)
    query=`${query_guss.title}`
    
    let subs=await subdl.search(query)
    if(!subs)return edit("No subtitles found for your request \nPlease check the spelling OR search in OPEN SUBTITILE or SUBSCENE",{chat_id,message_id,reply_markup:Button([[["Open Subtitle",{t:"ss",w:"os"}]],[["Subscene",{t:"ss",w:"ss"}]]])})
    
    subs=sortSearch(subs,msg.message.reply_to_message.text)
    
    edit("Please select a movie or series from the list\n\n<b>[M] indicates that it is a movie</b>\n<b>[S] indicates that it is a series,drama,etc..</b>.",{chat_id,message_id,reply_markup:Button(settings.markupSDSearch(subs,1))})
    
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})  

// change search result page subdl
bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="csrsd")return
    if(!msg.message.reply_to_message)throw "The message you sent is missing\nPlease make sure that ,your not deleted that message"
    if((callback.ct=="p"&&callback.p<=1)||(callback.ct=="n"&&callback.tp<=callback.p))throw "No more page"
    
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
    query=msg.message.reply_to_message.text,
    query_data=settings.gussTheQuery(query)
    
    let subs=sortSearch(await subdl.search(query_data.title),query)
    
    editMarkup(Button(settings.markupSDSearch(subs,callback.p+(callback.ct=="n"?1:-1))),{chat_id,message_id})
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})  

// select a movie or series from list
async function selectLang(msg){
try {
  let callback=JSON.parse(msg.data);
  if(callback.t!=="ssrsd")return
  if(!msg.message.reply_to_message)throw "The message you sent is missing\nPlease make sure that ,your not deleted that message"
  
  let chat_id=msg.message.chat.id,
  message_id=msg.message.message_id,
  query=msg.message.reply_to_message.text,
  query_guss=settings.gussTheQuery(query),
  path=msg.message.text.match(/### : (.+)$/i)
  
  let sub
  if(!path){
  let subs=sortSearch(await subdl.search(query_guss.title),query)
  sub=subs[(callback.page*10)+callback.i]
  }else{
    sub={path:path[1],type:"movie"}
  }
  
  let btns
  let data
  if(sub.type==="tv"){
    let season=await subdl.getSubs(sub.path,"tv")
    data=season
    season.results=season.results.map((x,i)=>{
      x.ind=i
      return x
    })
    
    if(query_guss.season){
      season.results.sort((a,b)=>{
        let match=RegExp(`Season\\s*${Number(query_guss.season)}`)
        if(match.test(a.title))return -1
        return 1
      })
    }
    btns=settings.markupSDSeason(season.results)
  }else{
    data=await subdl.getSubs(sub.path)
    
    btns=[]
    for(var i in data.results)btns.push([[data.results[i].language+` (${data.results[i].count})`,{t:"slsd",i}]])
    btns.push([["🔍 SUBSCENE",{t:"ss",w:"ss"}],["🔍 OPENSUBTITLES",{t:"ss",w:"os"}]])
  }
  
  edit(`<b>Title</b> : ${data.title||"Unknown"}\n<b>Year</b> : ${data.year||"0000"}\n<b>Poster</b> : <a href="${data.poster||process.env.HEROKU_URL+"/public/images/telegram/tgway_logo.jpg"}">URL</a>\n<b>###</b> : ${sub.path}`,{chat_id,message_id,reply_markup:Button(btns)})
  
} catch (e) {
   console.log(e);
   if(typeof e==="string")return answer(msg.id,e)
   return answer(msg.id,"unexpected error occured please try again")
  }
}
bot.on("callback_query",selectLang)

// select season
bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="ssnsd")return
    
    let path=msg.message.text.match(/###\s*:\s*(.+)$/i)[1]

    let sub=await subdl.getSubs(path,"tv")
    sub=sub.results[callback.sn]
    
    let text=msg.message.text.replace(/### : (.+)$/,"### : "+sub.path)
   
    msg.data=JSON.stringify({t:"ssrsd"})
    msg.message.text=text
    
    console.log(msg);
    selectLang(msg)
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})  

bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="slsd")return
    if(!msg.message.reply_to_message)throw "The message you sent is missing\nPlease make sure that ,your not deleted that message"
    
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
      query=msg.message.reply_to_message.text,
    query_guss=settings.gussTheQuery(query),
    path=msg.message.text.match(/### : (.+)$/i)[1]
    
    let data=await subdl.getSubs(path)
    if(!data)return
    
    let [{subs}]=data.results.filter((x,i)=>callback.i==i)
    subs=filterByZip(subs)
    if(query_guss.episode){
      subs.sort((a,b)=>{
        a=settings.gussTheQuery(a)
        b=settings.gussTheQuery(b)
        
        return (a.episode===gussTheQuery.episode?-1:1)
      })
    }
    
    let btns=Button(settings.markupSdSub(subs,1,callback.i))
    
    editMarkup(btns,{chat_id,message_id})
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})  

bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="csssd")return
    if(!msg.message.reply_to_message)throw "The message you sent is missing\nPlease make sure that ,your not deleted that message"
    if((callback.c==="p"&&callback.page===1)||(callback.c==="n"&&callback.page===callback.tp))throw "No more pages"
    
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
      query=msg.message.reply_to_message.text,
    query_guss=settings.gussTheQuery(query),
    path=msg.message.text.match(/### : (.+)$/i)[1]
    
    let data=await subdl.getSubs(path)
    if(!data)return
    
    let [{subs}]=data.results.filter((x,i)=>callback.l==i)
    subs=filterByZip(subs)
    if(query_guss.episode){
      subs.sort((a,b)=>{
        a=settings.gussTheQuery(a)
        b=settings.gussTheQuery(b)
        
        return (a.episode===gussTheQuery.episode?-1:1)
      })
    }
    
    let btns=Button(settings.markupSdSub(subs,callback.page+(callback.c==="p"?-1:1),callback.l))
    
    editMarkup(btns,{chat_id,message_id})
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})  

bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    
    if(callback.t!=="sssd")return
    if(!msg.message.reply_to_message)throw "The message you sent is missing\nPlease make sure that ,your not deleted that message"
    
    let chat_id=msg.message.chat.id,
    message_id=msg.message.message_id,
      query=msg.message.reply_to_message.text,
    query_guss=settings.gussTheQuery(query),
    path=msg.message.text.match(/### : (.+)$/i)[1]
    
    let data=await subdl.getSubs(path)
    if(!data)return
    
    let [{subs,language}]=data.results.filter((x,i)=>callback.l==i)
    subs=filterByZip(subs)
    if(query_guss.episode){
      subs.sort((a,b)=>{
        a=settings.gussTheQuery(a)
        b=settings.gussTheQuery(b)
        
        return (a.episode===gussTheQuery.episode?-1:1)
      })
    }
    
    let sub=subs[(callback.p*10)+callback.i]
    console.log(sub);
    let file=await got.get(sub.url,{responseType:"buffer"})
    fs.writeFileSync(root+"/subs/"+msg.from.id+".zip",file.body)
    
    execSync("rm -rf dir"+msg.from.id,{cwd:root+"/subs"})
    execSync("mkdir dir"+msg.from.id,{cwd:root+"/subs"})
    execSync(`unzip ${msg.from.id}.zip -d dir${msg.from.id}`,{cwd:root+"/subs"})
    fs.unlinkSync(root+"/subs/"+msg.from.id+".zip")
    
    let files=fs.readdirSync(root+"/subs/dir"+msg.from.id),
    fllen=files.length
    await new Promise((r)=>{
      files.map(async (x,i)=>{
      try{
      let {encoding:enc}=await encode(root+"/subs/dir"+msg.from.id+"/"+x)
      
      if(enc==="UTF-8"&&i+1===fllen)return r()
      if(enc==="UTF-8")return
      console.log(enc);
      let file=encoder.convert(fs.readFileSync(root+"/subs/dir"+msg.from.id+"/"+x),"UTF-8",enc)
      fs.writeFileSync(`${root}/subs/dir${msg.from.id}/${x}`,file)
      if(i+1===fllen)return r()
      }catch{}
    })
    })
    let funcs=files.map(x=>sendDocument(chat_id,root+"/subs/dir"+msg.from.id+"/"+x,{caption:`<pre>${htmlEnc(x)}</pre>\n\nSubtitles provided by : subdl.com\n\nSubtitle downloaded by : @subtitles_downloader_bot\n\nlanguage : ${language}`,parse_mode:"html",reply_markup:Button([[["write a review","https://t.me/tlgrmcbot?start=subtitles_downloader_bot-review","url"]]])}))
    answer(msg.id,"wait we are working on it...",false)
    await Promise.all(funcs)
    send(adminId,`user : <code>${msg.from.first_name||""} ${msg.from.last_name||""}</code>\nid : <code>${msg.from.id}</code>\napi : <code>Subdl</code>\nkey : ${msg.message.reply_to_message.text||""}\nusername : ${msg.from.username||""}\nselected : ${sub.title||""}\nlanguage : ${language}`)
    execSync("rm -rf dir"+msg.from.id,{cwd:root+"/subs"})
    
    console.log("end");
    
    
  } catch (e) {
    execSync("rm -rf dir"+msg.from.id,{cwd:root+"/subs"})
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e,"hey thre");
    return answer(msg.id,"unexpected error occured please try again")
  }
})  

/*
bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
  } catch (e) {
    if(typeof e==="string")return answer(msg.id,e)
    console.log(e);
    return answer(msg.id,"unexpected error occured please try again")
  }
})  
*/