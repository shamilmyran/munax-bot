const { bot, groupId } = require("../config"); // 👈 Changed from "./config" to "../config"
const { sendMessage, editMessage, answerCallback, editMarkup, deleteMsg } = require("./messenger");
const got = require("got");
const settings = require("./settings");
const fs = require("fs");
const db = require("../../../helper/db");
const root = process.cwd() + "/bot/group-translate";


async function search(key,page){
  try {
    if(!key||!page)throw ""
    key=settings.toSearchQuery(key)
    var res=await got.get(process.env.HEROKU_URL+`/api/subtitle/search/SS?query=${key}&page=${page||1}`).json()
    if(!res.sts&&res.err==="noMorePage")return "noMorePage"
    if(!res.sts)throw ""
    return res
  } catch (e) {
    throw "Unexpected Error\nTry again"
  }
}

async function getSubs(path){
  try {
    if(!path)throw ""
    var url=`${process.env.HEROKU_URL}/api/subtitle/SS/getSubtitles?path=${path}&lang=english,any`
    let res=await got.get(url).json()
    if(!res.sts)throw ""
    return {subs:res.subs,data:res.data}
  } catch (e) {
    throw "Unexpected Error"
  }
}

async function download(path){
  try {
    if(!path)throw ""
    let url=`${process.env.HEROKU_URL}/api/subtitle/SS/download?path=${path}`
    let res=await got.get(url).json()
    if(!res.sts)throw ""
    return res.file
  } catch (e) {
    throw "Unexpected Error Occurred"
  }
}

bot.on("callback_query",async msg=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(callback.t!=="web"||!callback.d||callback.d!=="SS")return
    if(msg.message.chat.type==="private")throw "This Bot Only Work In Malayalam Subtitle Group"
    if(msg.message.chat.id!=groupId)return
    if(!msg.message.reply_to_message)throw "സേർച്ച് ചെയ്യേണ്ട മെസ്സേജ് കണ്ടെത്താനായില്ല\nമെസ്സേജ് ഡിലീറ്റ് ആയപ്പോയോ എന്ന് ചെക്ക് ചെയ്യുക,ഡിലീറ്റ് ആയെങ്കിൽ വീണ്ടും മെസ്സേജ് സെന്റ് ചെയ്യുക"
    if(msg.message.reply_to_message.from.id!==msg.from.id)throw "ഇത് നിങ്ങൾക്ക് വേണ്ടിയുള്ളതല്ല\n നിങ്ങൾക്ക് പുതിയ ഒരു സേർച്ച് റിക്കസ്റ്റ് നടത്താം"
    await editMessage("സബ്ടൈറ്റിലുകൾ കണ്ടെത്താൻ ശ്രമിക്കുന്നു...\n<code>ദയവായി കാത്തിരിക്കുക</code>",{message_id:msg.message.message_id,chat_id:chat});
    var res=await search(msg.message.reply_to_message.text,1)
    if(res==="noMorePage")return editMessage("നിങ്ങളുടെ റിക്കസ്റ്റിനു വേണ്ടിയുള്ള ഒരു സബ്ടൈറ്റിലും കണ്ടെത്തിയില്ല\n\n താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്തുകൊണ്ട് മറ്റൊരു വെബ്സൈറ്റിൽ സബ്ടൈറ്റിൽ തിരയുക",{chat_id:chat,message_id:msg.message.message_id,reply_markup:{inline_keyboard:[[{text:"🔍 In OPEN SUBTITILES",callback_data:JSON.stringify({t:"web",d:"OS"})}],[{text:"🔍 In MSONE",callback_data:JSON.stringify({t:"web",d:"MS"})}]]}})
    res=settings.inline_subscene_SS(res.res,res.page,msg.message.reply_to_message.text,res.totel_page)
    return editMessage("Finded Results For : "+msg.message.reply_to_message.text,{chat_id:chat,message_id:msg.message.message_id,reply_markup:{inline_keyboard:res}})
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    return answerCallback(msg.id,"Unexpected Error\nPlease Try Again")
  }
})

bot.on("callback_query",async(msg)=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(!callback||(callback.t!=="SSSRN"&&callback.t!=="SSSRB"))return
    console.log(callback,msg);
    if(!msg.message.reply_to_message)throw "സേർച്ച് ചെയ്യേണ്ട മെസ്സേജ് കണ്ടെത്താനായില്ല\nമെസ്സേജ് ഡിലീറ്റ് ആയപ്പോയോ എന്ന് ചെക്ക് ചെയ്യുക,ഡിലീറ്റ് ആയെങ്കിൽ വീണ്ടും മെസ്സേജ് സെന്റ് ചെയ്യുക"
    if(msg.message.reply_to_message.from.id!==msg.from.id)throw "ഇത് നിങ്ങൾക്ക് വേണ്ടിയുള്ളതല്ല\n നിങ്ങൾക്ക് പുതിയ ഒരു സേർച്ച് റിക്കസ്റ്റ് നടത്താം"
    let btn_data=JSON.parse(msg.message.reply_markup.inline_keyboard.pop()[0].callback_data);
    if((callback.page<=1&&callback.t==="SSSRB")||(callback.page>=btn_data.tp&&callback.t==="SSSRN"))throw "No More Pages"
    let p=(callback.t==="SSSRN"?Number(callback.page)+1:Number(callback.page)-1)
    var res=await search(msg.message.reply_to_message.text,p)
    if(res==="noMorePage")throw "Unexpected Error"
    res=settings.inline_subscene_SS(res.res,res.page,msg.message.reply_to_message.text,res.totel_page)
    return editMessage("Finded Results For : "+msg.message.reply_to_message.text,{chat_id:chat,message_id:msg.message.message_id,reply_markup:{inline_keyboard:res}})
  } catch (e) {
    if(typeof e ==="string")return answerCallback(msg.id,e)
    return answerCallback(msg.id,"Unexpected Error Occurred Please Try Again")
  }
})

bot.on("callback_query",async msg=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(callback.t!=="SSSR")return
    if(!msg.message.reply_to_message)throw "സേർച്ച് ചെയ്യേണ്ട മെസ്സേജ് കണ്ടെത്താനായില്ല\nമെസ്സേജ് ഡിലീറ്റ് ആയപ്പോയോ എന്ന് ചെക്ക് ചെയ്യുക,ഡിലീറ്റ് ആയെങ്കിൽ വീണ്ടും മെസ്സേജ് സെന്റ് ചെയ്യുക"
    if(msg.message.reply_to_message.from.id!==msg.from.id)throw "ഇത് നിങ്ങൾക്ക് വേണ്ടിയുള്ളതല്ല\n നിങ്ങൾക്ക് പുതിയ ഒരു സേർച്ച് റിക്കസ്റ്റ് നടത്താം"
    let res=await search(msg.message.reply_to_message.text,callback.page)
    if(res==="noMorePage")throw 1
    let path=res.res[callback.i].path
    res=await getSubs(path)
    let data=res.data
    res=res.subs
    res=settings.inline_subtitle_SS_sub(res.subs,"1")
    return editMessage(`<b>Title : </b> <pre>${data.title}</pre>\n<b>Year : </b><pre>${data.year}</pre>\n<b>Poster : </b><a href="${data.poster}">URL</a>\n\n<span class="tg-spoiler">*#@$::${path}</span>`,{message_id:msg.message.message_id,chat_id:chat,reply_markup:res})
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    console.log(e);
    return answerCallback(msg.id,"Unexpected Error")
  }
})

bot.on("callback_query",async (msg)=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(callback.t!=="SSSTB"&&callback.t!=="SSSTN")return
    if(!msg.message.reply_to_message)throw "സേർച്ച് ചെയ്യേണ്ട മെസ്സേജ് കണ്ടെത്താനായില്ല\nമെസ്സേജ് ഡിലീറ്റ് ആയപ്പോയോ എന്ന് ചെക്ക് ചെയ്യുക,ഡിലീറ്റ് ആയെങ്കിൽ വീണ്ടും മെസ്സേജ് സെന്റ് ചെയ്യുക"
    if(msg.message.reply_to_message.from.id!==msg.from.id)throw "ഇത് നിങ്ങൾക്ക് വേണ്ടിയുള്ളതല്ല\n നിങ്ങൾക്ക് പുതിയ ഒരു സേർച്ച് റിക്കസ്റ്റ് നടത്താം"
    if((callback.t==="SSSTB"&&callback.page<=1)||(callback.t==="SSSTN"&&callback.page>=callback.totel)) throw "No More Pages"
    let page=(callback.t==="SSSTN"?Number(callback.page)+1:Number(callback.page)-1)
    let path=msg.message.text.split("*#@$::")[1]
    console.log(path);
    let res=await getSubs(path)
    res=settings.inline_subtitle_SS_sub(res.subs,page)
    return editMarkup(res,{chat_id:chat,message_id:msg.message.message_id})
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    console.log(e);
    return answerCallback(msg.id,"Unexpected Error\nPlease Try Again")
  }
})

// Selected Subtitle path
bot.on("callback_query",async(msg)=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(callback.t!=="SSSTR")return
    let path=msg.message.text.split("*#@$::")[1],
    {subs:res,data}=await getSubs(path)
    res=res.subs[((callback.page-1)*10)+callback.i]
    path=res.path
    res=await download(res.path)
    let base_url=`${process.env.HEROKU_URL}/api/translate`,
    m,addUser
    if(res.length===1){
      await fs.writeFileSync(root+"/subs/"+msg.from.id+".srt",new Buffer.from(res[0].file.data).toString("utf8"))
      let vip=await db.get("vip",{user:`${msg.from.id}`},true)
    if(!vip){
      let uId=Date.now()
      url=`${process.env.HEROKU_URL}/translate/group/start?uId=${uId}`
      m=await sendMessage(chat,`പരിഭാഷ തുടങ്ങാൻ വേണ്ടി കാത്തു നിൽക്കുന്നു\n ദയവായി കാത്തു നിൽക്കുക<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>`,{reply_to_message_id:msg.message_id})
      url=base_url+"/addUser"
      addUser=await got.post(url,{json:{
        filename:res[0].filename,
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
      addUser=await got.post(url,{json:{
        filename:res[0].filename,
        file_url:process.env.HEROKU_URL+"/translate/group/getFile?id="+msg.from.id,
        lang:"ml",
        user:msg.from.id,
        group:chat,
        msg_id:msg.message.reply_to_message.message_id,
        edit_msg_id:m.message_id,
        webhook:process.env.HEROKU_URL+"/translate/group/webhook/vip"
      }}).json()
    }
    if(addUser.sts)return
    await deleteMsg(chat,m.message_id)
    throw addUser.err
    }else{
      if(msg.message.reply_to_message.from.id!==msg.from.id)throw "ഇത് നിങ്ങൾക്ക് വേണ്ടിയുള്ളതല്ല\n നിങ്ങൾക്ക് പുതിയ ഒരു സേർച്ച് റിക്കസ്റ്റ് നടത്താം"
      let inline=settings.inline_SS_zip(res,1,msg.message.message_id)
      editMessage(`<b>Title </b>: ${data.title}\n<b>Year : </b>${data.year}\n<b>Poster : </b><a href="${data.poster}">URL</a>\n<span class="tg-spoiler">*#@$::${path}</span>`,{chat_id:chat,message_id:msg.message.message_id,reply_markup:inline})
    }
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    console.log(e);
    return answerCallback(msg.id,"Unexpected Error Occured Please Try Again")
  }
})

bot.on("callback_query",async(msg)=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(!callback.t||(callback.t!=="SSZP"&&callback.t!=="SSZN"))return
    if(msg.message.reply_to_message.from.id!==msg.from.id)throw "ഇത് നിങ്ങൾക്ക് വേണ്ടിയുള്ളതല്ല\n നിങ്ങൾക്ക് പുതിയ ഒരു സേർച്ച് റിക്കസ്റ്റ് നടത്താം"
    if((callback.t==="SSZP"&&callback.p<=1)||(callback.t==="SSZN"&&callback.p>=callback.tp))throw "No More Pages"
    let page=(callback.t==="SSZP"?callback.p-1:callback.p+1),
    path=msg.message.text.split("*#@$::")[1]
    let res=await download(path)
    let inline=settings.inline_SS_zip(res,page,msg.message_id)
    return editMarkup(inline,{chat_id:chat,message_id:msg.message.message_id})
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    console.log(e);
    return answerCallback("Unexpected Error Occurred \nPlease Try Again")
  }
})

bot.on("callback_query",async(msg)=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(callback.t!=="SSZS")return
    let path=msg.message.text.split("*#@$::")[1]
    let res=await download(path)
    res=res[((callback.p-1)*10)+callback.i]
    await fs.writeFileSync(root+"/subs/"+msg.from.id+".srt",new Buffer.from(res.file.data).toString("utf8"))
    let vip=await db.get("vip",{user:`${msg.from.id}`},true),
    base_url=`${process.env.HEROKU_URL}/api/translate`,
    addUser,m
    if(!vip){
      let uId=Date.now()
      url=`${process.env.HEROKU_URL}/translate/group/start?uId=${uId}`
      
      m=await sendMessage(chat,"പരിഭാഷ ചെയ്യാൻ വേണ്ടി കാത്തുനിൽക്കുന്നു...")
      url=base_url+"/addUser"
      addUser=await got.post(url,{json:{
        filename:res.filename,
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
      addUser= await got.post(url,{json:{
        filename:res.filename,
        file_url:process.env.HEROKU_URL+"/translate/group/getFile?id="+msg.from.id,
        lang:"ml",
        user:msg.from.id,
        group:chat,
        msg_id:msg.message.reply_to_message.message_id,
        edit_msg_id:m.message_id,
        webhook:process.env.HEROKU_URL+"/translate/group/webhook/vip"
      }}).json()
    }
    if(addUser.sts)return
    await deleteMsg(chat,m.message_id)
    throw addUser.err
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    console.log(e);
    return answerCallback(msg.id,"Unexpected Error\nPlease Try Again")
  }
})


module.exports={download}
