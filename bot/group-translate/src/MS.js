const {bot,botuser}=require("./config"),
{sendMessage,editMessage,answerCallback,editMarkup,sendDocument,deleteMsg}=require("./messenger"),
got=require("got"),
settings=require("./settings"),
root=process.cwd()+"/bot/group-translate",
fs=require("fs")

async function search(query=null,page=1){
  try {
    if(!query)throw "No Query Detected"
    query=settings.toSearchQuery(query)
    let url=`${process.env.HEROKU_URL}/api/subtitle/MS/search?q=${encodeURIComponent(query)}&p=${page}`,
    res=await got.get(url).json()
    if(!res.sts&&res.err==="nosubfound")return "nosubfound"
    if(!res.sts)throw res.err
    return res.subs
  } catch (e) {
    throw e
  }
}
async function download(url){
  try {
    if(!url)throw "Url not specified"
    url=`${process.env.HEROKU_URL}/api/subtitle/MS/download?u=${encodeURIComponent(url)}`
    let res=await got.get(url).json()
    if(!res.sts)throw res.err
    return res.data
  } catch (e) {
    throw e
  }
}

bot.on("callback_query",async(msg)=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(callback.t!=="web"||callback.d!=="MS")return
    if(!msg.message.reply_to_message)throw "സേർച്ച് ചെയ്യേണ്ട മെസ്സേജ് കണ്ടെത്താനായില്ല\nമെസ്സേജ് ഡിലീറ്റ് ആയപ്പോയോ എന്ന് ചെക്ക് ചെയ്യുക,ഡിലീറ്റ് ആയെങ്കിൽ വീണ്ടും മെസ്സേജ് സെന്റ് ചെയ്യുക"
    if(msg.message.reply_to_message.from.id!==msg.from.id)throw "ഇത് നിങ്ങൾക്ക് വേണ്ടിയുള്ളതല്ല\n നിങ്ങൾക്ക് പുതിയ ഒരു സേർച്ച് റിക്കസ്റ്റ് നടത്താം"
    await editMessage("സബ്ടൈറ്റിലുകൾ കണ്ടെത്താൻ ശ്രമിക്കുന്നു...\n<code>ദയവായി കാത്തിരിക്കുക</code>",{message_id:msg.message.message_id,chat_id:chat});
    let res=await search(msg.message.reply_to_message.text,1)
    if(res==="nosubfound")return editMessage("നിങ്ങളുടെ റിക്കസ്റ്റിനു വേണ്ടിയുള്ള ഒരു സബ്ടൈറ്റിലും കണ്ടെത്തിയില്ല\n\n താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്തുകൊണ്ട് മറ്റൊരു വെബ്സൈറ്റിൽ സബ്ടൈറ്റിൽ തിരയുക",{chat_id:chat,message_id:msg.message.message_id,reply_markup:{inline_keyboard:[[{text:"🔍 In OPEN SUBS",callback_data:JSON.stringify({t:"web",d:"OS"})}],[{text:"🔍 In SUBSCENE",callback_data:JSON.stringify({t:"web",d:"SS"})}]]}})
    let inline=settings.inline_MS(res)
    return editMessage(`Finded Results For : ${msg.message.reply_to_message.text}`,{chat_id:chat,message_id:msg.message.message_id,reply_markup:inline})
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    console.log(e);
    return answerCallback(msg.id,"Unexpected Error \nPlease Try Again")
  }
})

bot.on("callback_query",async msg=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(callback.t!=="MSN"&&callback.t!=="MSP")return
    if(!msg.message.reply_to_message)throw "സേർച്ച് ചെയ്യേണ്ട മെസ്സേജ് കണ്ടെത്താനായില്ല\nമെസ്സേജ് ഡിലീറ്റ് ആയപ്പോയോ എന്ന് ചെക്ക് ചെയ്യുക,ഡിലീറ്റ് ആയെങ്കിൽ വീണ്ടും മെസ്സേജ് സെന്റ് ചെയ്യുക"
    if(msg.message.reply_to_message.from.id!==msg.from.id)throw "ഇത് നിങ്ങൾക്ക് വേണ്ടിയുള്ളതല്ല\n നിങ്ങൾക്ക് പുതിയ ഒരു സേർച്ച് റിക്കസ്റ്റ് നടത്താം"
    if((callback.t==="MSP"&&callback.page<=1)||(callback.t==="MSN"&&callback.page>=callback.tp))throw "No More Pages"
    let page=callback.t==="MSN"?Number(callback.page)+1:Number(callback.page)-1
    let res=await search(msg.message.reply_to_message.text,page)
    /*if(res==="nosubfound")return editMessage("നിങ്ങളുടെ റിക്കസ്റ്റിനു വേണ്ടിയുള്ള ഒരു സബ്ടൈറ്റിലും കണ്ടെത്തിയില്ല\n\n താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്തുകൊണ്ട് മറ്റൊരു വെബ്സൈറ്റിൽ സബ്ടൈറ്റിൽ തിരയുക",{chat_id:chat,message_id:msg.message.message_id,reply_markup:{inline_keyboard:[[{text:"🔍 In OPEN SUBS",callback_data:JSON.stringify({t:"web",d:"OS"})}],[{text:"🔍 In SUBSCENE",callback_data:JSON.stringify({t:"web",d:"SS"})}]]}})*/
    if(res=="nosubfound"){
      res={page:callback.page+1,pages:callback.tp,data:[]}
    }
    let inline=settings.inline_MS(res)
    return editMarkup(inline,{chat_id:chat,message_id:msg.message.message_id})
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    console.log(e);
    return answerCallback(msg.id,"Unexpected Error \nPlease Try Again")
  }
})

bot.on("callback_query",async msg=>{
  try {
    let chat=msg.message.chat.id,
    callback=JSON.parse(msg.data);
    if(callback.t!=="MSS")return
    if(!msg.message.reply_to_message)throw "സേർച്ച് ചെയ്യേണ്ട മെസ്സേജ് കണ്ടെത്താനായില്ല\nമെസ്സേജ് ഡിലീറ്റ് ആയപ്പോയോ എന്ന് ചെക്ക് ചെയ്യുക,ഡിലീറ്റ് ആയെങ്കിൽ വീണ്ടും മെസ്സേജ് സെന്റ് ചെയ്യുക"
    let res=await search(msg.message.reply_to_message.text,callback.page)
    res=res.data[callback.i]
    res=await download(res.url)
    console.log(res);
    if(!res)throw Error()
    let file=await got.get(res.download,{responseType:"buffer"})
    let filename=decodeURIComponent(file.headers["content-disposition"].split("filename=\"")[1].split("\"")[0])||"Unknown File Name"
    sendMessage(chat,`<b>${res.title||""}</b>\n\n${res.data}\n\n<pre>${res.description.slice(0,3500)}</pre>\n\n<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>`,{disable_web_page_preview:false,reply_markup:{inline_keyboard:[[{text:"മെസ്സേജ് ഡിലീറ്റ്\n ചെയ്യുക",callback_data:`{"t":"MSDD","id":${msg.from.id}}`}]]}})
    await fs.writeFileSync(root+"/subs/"+msg.from.id,file.body)
    await sendDocument(chat,root+"/subs/"+msg.from.id,{caption:"Subtitle downloaded from https://malayalamsubtitles.org\n\nSubtitle downloaded by @"+botuser},{filename})
    await fs.unlinkSync(root+"/subs/"+msg.from.id)
    return
  } catch (e) {
    if(typeof e==="string")return answerCallback(msg.id,e)
    console.log(e)
    return answerCallback(msg.id,"Unexpected Error \nPlease Try Again");
  }
})


bot.on("callback_query",(msg)=>{
   try {
     let callback=JSON.parse(msg.data);
     if(callback.t!=="MSDD")return
     if(msg.from.id!==Number(callback.id))throw "നിങ്ങൾക്ക് ഇത് ചെയ്യാൻ കഴിയില്ല\n നിങ്ങൾക്ക് നിങ്ങളുടെ ഡിവൈസിൽ നിന്ന് മാത്രമായി മെസ്സേജ് ഡിലീറ്റ് ചെയ്യാൻ കഴിയും"
     return deleteMsg(msg.message.chat.id,msg.message.message_id)
   } catch (e) {
     if(typeof e==="string")return answerCallback(msg.id,e)
     console.log(e);
     return answerCallback(msg.id,"Unexpected Error\nPlease Try Again")
   }
})