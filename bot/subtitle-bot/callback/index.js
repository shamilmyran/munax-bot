
const {bot,root}=require("../src/config"),
{sendDocument, answerCallback:answer}= require("../src/message")

const got=require("got"),
fs=require("fs"),
encode=require("detect-file-encoding-and-language"),
encoder=require("encoding")

bot.on("callback_query",async msg=>{
  try {
    let callback=JSON.parse(msg.data);
    if(callback.t!=="fix_enc")return
    
    let chat=msg.from.id
    
    let url=await bot.getFileLink(msg.message.document.file_id)
    let file= await got.get(url,{responseType:"buffer"})
    await fs.writeFileSync(root+"/subs/"+chat+".sub",file.body)
    let {language,encoding}=await encode(root+"/subs/"+chat+".sub")
   
    //console.log(decode(file.body.toString()));
    file.body=encoder.convert(file.body,"ISO-8859-1")
    await fs.writeFileSync(root+"/subs/"+chat+".sub",file.body)
    await sendDocument(chat,root+"/subs/"+chat+".sub",{caption:msg.message.caption.replace(/If you face .+$/,"")},{filename:msg.message.document.file_name})
    //await fs.unlinkSync(root+"/subs/"+chat+".sub")
  } catch (e) {
    console.log(e);
    if(typeof e!==String)e="Unexpected Error Ocuured"
    return answer(msg.id,e)
  }
})



