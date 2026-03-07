const {bot,token}=require("./config"),
got=require("got")

module.exports={
  send:async(chatOrMsg,opt)=>{
    try {
      if(typeof chatOrMsg==="number" || chatOrMsg.className!=="Message"){
        return (await bot.sendMessage(chatOrMsg,opt))
      }
      return (await chatOrMsg.respond(opt))
    } catch (e) {
      console.log(e);
      return 
    }
  },
  edit:async (chatOrMsg,opt)=>{
    try {
      if(typeof chatOrMsg==="number"||chatOrMsg.className!=="Message")return (await bot.editMessage(chatOrMsg,opt))
      return (await chatOrMsg.edit(opt))
    } catch (e) {
      console.log(e);
      return
    }
  },
  reply:async (msg,opt)=>{
    try{
      return (await msg.reply(opt))
    }catch(e){
      console.log(e);
      return
    }
  },
  webapp:async (chat,{text,btn,reply_to_message_id})=>{
    try{
      let url=`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat}&text=${text}&reply_markup=${JSON.stringify({inline_keyboard:[[btn]]})}`
      console.log(url);
      console.log(await got.get(url).json())
    }catch(e){
      console.log(e);
      return
    }
  }
}