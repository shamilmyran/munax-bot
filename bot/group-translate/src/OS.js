const { bot, groupId, tmdb_key } = require("../../config");
const { sendMessage, editMessage, answerCallback, editMarkup, deleteMsg } = require("./messenger");
const got = require("got");
const settings = require("./settings");
const db = require("../../../helper/db");
const root = process.cwd() + "/bot/group-translate";
const zlib = require("zlib");
const fs = require("fs");

async function search(key,lang){
  try {
    if(lang)throw "lang_sp"
    key=settings.toSearchQuery(key)
    let url=(process.env.HEROKU_URL+"/api/subtitle/search/OS?title="+key);
    let res=await got.get(url+"&lang=en");
    res=JSON.parse(res.body);
    if(res.sts)return [res.subs,"en"]
    res=JSON.parse((await got.get(url+"&lang=ar")).body)
    if(res.sts)return [res.subs,"ar"]
    res=JSON.parse((await got.get(url+"&lang=fr")).body);
    if(res.sts)return [res.subs,"fr"]
    res=JSON.parse((await got.get(url+"&lang=ru")).body);
    if(res.sts)return [res.subs,"ru"]
    res=JSON.parse((await got.get(url+"&lang=ko")).body);
    if(res.sts)return [res.subs,"ko"]
    res=JSON.parse((await got.get(url+"&lang=all")).body)
    if(res.sts)return [res.subs,"all"]
    return "no_sub_found"
  } catch (e) {
    if(typeof e!=="string"||e!=="lang_sp"){
      console.log(e);
      throw e
    }
    key=settings.toSearchQuery(key)
    let url=`${process.env.HEROKU_URL}/api/subtitle/search/OS?title=${key}&lang=${lang}`
    var res=await got.get(url).json()
    if(res.sts)return res.subs
    throw "Unexpected Error"
  }
}

bot.on("callback_query",async msg=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(callback.t!=="web"||!callback.d||callback.d!=="OS")return
    if(msg.message.chat.type==="private")throw "This Bot Only Work In Malayalam Subtitle Group"
    if(msg.message.chat.id!=groupId)return
    if(!msg.message.reply_to_message)return answerCallback(msg.id,"സേർച്ച് ചെയ്യേണ്ട മെസ്സേജ് കണ്ടെത്താനായില്ല\nമെസ്സേജ് ഡിലീറ്റ് ആയപ്പോയോ എന്ന് ചെക്ക് ചെയ്യുക,ഡിലീറ്റ് ആയെങ്കിൽ വീണ്ടും മെസ്സേജ് സെന്റ് ചെയ്യുക")
    if(msg.message.reply_to_message.from.id!==msg.from.id)return answerCallback(msg.id,"ഇത് നിങ്ങൾക്ക് വേണ്ടിയുള്ളതല്ല\n നിങ്ങൾക്ക് പുതിയ ഒരു സേർച്ച് റിക്കസ്റ്റ് നടത്താം")
    await editMessage("സബ്ടൈറ്റിലുകൾ കണ്ടെത്താൻ ശ്രമിക്കുന്നു...\n<code>ദയവായി കാത്തിരിക്കുക</code>",{message_id:msg.message.message_id,chat_id:chat});
    let r=await search(msg.message.reply_to_message.text)
    if(!r)return answerCallback(msg.id,"Unexpected Error Occurred \nPlease Try Again")
    if(r==="no_sub_found")return editMessage("നിങ്ങളുടെ റിക്കസ്റ്റിനു വേണ്ടിയുള്ള ഒരു സബ്ടൈറ്റിലും കണ്ടെത്തിയില്ല\n\n താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്തുകൊണ്ട് മറ്റൊരു വെബ്സൈറ്റിൽ സബ്ടൈറ്റിൽ തിരയുക",{chat_id:chat,message_id:msg.message.message_id,reply_markup:{inline_keyboard:[[{text:"🔍 In SUBSCENE",callback_data:JSON.stringify({t:"web",d:"SS"})}],[{text:"🔍 In MSONE",callback_data:JSON.stringify({t:"web",d:"MS"})}]]}})
    let [res,lang]=r
    var inline=settings.to_inline_keyboard_OS(res,{title:msg.message.reply_to_message.text,lang},1)
    return editMessage(`${msg.message.reply_to_message.text} എന്ന തിരയലിനു വേണ്ടിയുള്ള സബ്ടൈറ്റിലുകൾ`,{chat_id:chat,message_id:msg.message.message_id,reply_markup:inline})
  } catch (e) {
    console.log(e);
    if(e instanceof Error)return
    if(Array.isArray(e))sendMessage(...e)
    if(typeof e==="string")sendMessage(msg.chat.id,e)
    return
  }
})

bot.on("callback_query",async msg=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data)
    if(callback.t!=="OSS")return
    if(!callback.i)throw "Unexpected Error \nPlease Request A New One";
    if(!msg.message.reply_to_message)throw "സേർച്ച് ചെയ്യേണ്ട മെസ്സേജ് കണ്ടെത്താനായില്ല\nമെസ്സേജ് ഡിലീറ്റ് ആയപ്പോയോ എന്ന് ചെക്ക് ചെയ്യുക,ഡിലീറ്റ് ആയെങ്കിൽ വീണ്ടും മെസ്സേജ് സെന്റ് ചെയ്യുക"
    let rpl_mrk=structuredClone(msg.message.reply_markup)
    let btn_data=JSON.parse(msg.message.reply_markup.inline_keyboard.pop()[0].callback_data).data;
    let base_url=process.env.HEROKU_URL+"/api/translate";
    var url=base_url+"/checkUser?user="+msg.from.id
    let res=await got.get(url).json()
    if(res.sts) throw "പഴയ ഒരു റിക്വസ്റ്റ് സെർവറിൽ ഉണ്ട്\n/cancel കമ്മാന്റ് സെന്റ് ചെയ്ത് പഴയ റിക്വസ്റ്റ് ഇല്ലാതാക്കുക"
    res=await search(msg.message.reply_to_message.text,btn_data[1])
    res=res[callback.i]
    res.imdbid=(String(res.imdbid).length<7?("0000000"+String(res.imdbid)).split("").reverse().slice(0,7).reverse().join(""):res.imdbid)
    console.log(res.imdbid,res.imdbid.length);
    let mdata=await got.get(`https://api.themoviedb.org/3/find/tt${res.imdbid}?api_key=${tmdb_key}&external_source=imdb_id`).json()
    mdata=(mdata.movie_results.length&&mdata.movie_results)||(mdata.tv_results.length&&mdata.tv_results)||(mdata.tv_season_results.length&&mdata.tv_season_results)||(mdata.tv_episode_results.length&&mdata.tv_episode_results)||[{title:"Not found",poster_path:"/1j2j2j2us8whwwssw2.jpg"}]
    editMessage(`<b>Title</b> : <pre>${mdata[0].name||mdata[0].title}</pre>\n<b>Year : </b><pre>${res.year||""}</pre>\n<b>Poster</b> : <a href="https://image.tmdb.org/t/p/original${mdata[0].poster_path||mdata[0].backdrop_path}">URL</a>`,{chat_id:chat,message_id:msg.message.message_id,reply_markup:rpl_mrk})
    let file=(await got.get(res.url,{responseType:"buffer"})).body
    file=await zlib.unzipSync(file).toString("utf8")
    await fs.writeFileSync(`${root}/subs/${msg.from.id}.srt`,file)
    let vip=await db.get("vip",{user:`${msg.from.id}`},true),
    m
    if(!vip){
      let uId=Date.now()
      url=`${process.env.HEROKU_URL}/translate/group/start?uId=${uId}`
      
      m=await sendMessage(chat,`പരിഭാഷ തുടങ്ങാൻ വേണ്ടി കാത്തു നിൽക്കുന്നു\n ദയവായി കാത്തു നിൽക്കുക\n<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>`,{reply_to_message_id:msg.message_id})
      url=base_url+"/addUser"
      res=await got.post(url,{json:{
        filename:res.title,
        file_url:process.env.HEROKU_URL+"/translate/group/getFile?id="+msg.from.id,
        lang:"ml",
        user:msg.from.id,
        group:chat,
        msg_id:msg.message.reply_to_message.message_id,
        edit_msg_id:m.message_id,
        webhook:process.env.HEROKU_URL+"/translate/group/webhook/vip",
        id:uId
      }}).json()
    }else{
      m=await sendMessage(chat,"പരിഭാഷ ചെയ്യാൻ വേണ്ടി കാത്തുനിൽക്കുന്നു...")
      url=base_url+"/addUser"
      res=await got.post(url,{json:{
        filename:res.title,
        file_url:process.env.HEROKU_URL+"/translate/group/getFile?id="+msg.from.id,
        lang:"ml",
        user:msg.from.id,
        group:chat,
        msg_id:msg.message.reply_to_message.message_id,
        edit_msg_id:m.message_id,
        webhook:process.env.HEROKU_URL+"/translate/group/webhook/vip"
      }}).json()
    }
    if(res.sts)return
    await deleteMsg(chat,m.message_id)
    throw res.err
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    console.log(e);
    return answerCallback(msg.id,"Unexpected Error Please Try Again");
  }
})


// For Next Previous Page Of Search Results
bot.on("callback_query",async(msg)=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data)
    if(callback.t!=="OSN"&&callback.t!=="OSP")return
    if(!msg.message.reply_to_message)throw "സേർച്ച് ചെയ്യേണ്ട മെസ്സേജ് കണ്ടെത്താനായില്ല\nമെസ്സേജ് ഡിലീറ്റ് ആയപ്പോയോ എന്ന് ചെക്ക് ചെയ്യുക,ഡിലീറ്റ് ആയെങ്കിൽ വീണ്ടും മെസ്സേജ് സെന്റ് ചെയ്യുക"
    let btn_data=JSON.parse(msg.message.reply_markup.inline_keyboard.pop()[0].callback_data).data;
    var isPageAvil=((callback.t==="OSN"&&btn_data[2]>=btn_data[3])||(callback.t==="OSP"&&callback.page<=1))
    if(isPageAvil)throw "കൂടുതൽ പേജുകൾ കണ്ടെത്തിയില്ല"
    let page=(callback.t==="OSN"?Number(callback.page)+1:Number(callback.page)-1)
    if(page<1)throw "Unexpected Error"
    var res=await search(msg.message.reply_to_message.text,btn_data[1])
    var inline=settings.to_inline_keyboard_OS(res,{title:msg.message.reply_to_message.text,lang:btn_data[1]},page)
    return editMarkup(inline,{chat_id:chat,message_id:msg.message.message_id})
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    console.log(e);
    return answerCallback(msg.id,"Unexpected Error Occurred")
  }
})


module.exports
