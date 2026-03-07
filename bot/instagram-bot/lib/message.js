const {bot,adminId}=require("./config")

module.exports={
  sendMessage:async(chat,msg,more={})=>{
    try {
      if(!more.parse_mode)more.parse_mode="html"
      if(more.reply)more.reply_to_message_id=more.reply.message_id
      var m=await bot.sendMessage(chat,msg,more);
      if(!m)throw ""
      return m
    } catch (e) {
      console.log(e.response.body||e);
      if(e instanceof Error)return
      return e
    }
  },
  editMessage:async(msg,data={})=>{
    try{
      if(data==={}) throw "required data not found"
      if(!data.parse_mode)data.parse_mode="html"
      var m=await bot.editMessageText(msg,data)
      if(!m)return ""
      return m
    }catch(e){
      console.log(e.response.body||e);
      if(e instanceof Error)return
      return e
    }
  },
  answerCallback:async(id,msg,type=true)=>{
    try{
      var m=await bot.answerCallbackQuery(id,msg,type)
      if(!m) throw "unexpected"
      return m
    }catch(e){
      console.log(e.response.body||e);
      if(e instanceof Error)return
      return e
    }
  },
  editMarkup:async(markup=null,data=null)=>{
    try{
      if(!markup||!data)throw Error()
      var m=await bot.editMessageReplyMarkup(markup,data)
      if(!m)throw Error()
      return m
    }catch(e){
      console.log(e.response.body||e);
      if(e instanceof Error)return
      return e
    }
  },
  sendDocument:async(chat,file,opt,more)=>{
    try{
      var m=await bot.sendDocument(chat,file,opt,more)
      if(!m)throw Error()
      return m
    }catch(e){
      console.log(e.response.body||e);
      if(e instanceof Error)return {sts:false}
      return {sts:false,e}
    }
  },
  deleteMsg:async(chat,msg)=>{
    try{
      let m=await bot.deleteMessage(chat,msg);
      return m
    }catch(e){
      if(e instanceof Error)return {sts:false}
      return {sts:false,err:e}
    }
  },
  Button:(data)=>{
    let btn=[]
    for(var i of data){
      var row=[]
      for(var j of i){
        var btn_data={}
        btn_data.text=j[0].slice(0,60)
        if(j[2]==="url")btn_data.url=j[1]
        else if(j[2]==="inline")btn_data.switch_inline_query=j[1]
        else btn_data.callback_data=JSON.stringify(j[1])
        row.push(btn_data)
      }
      btn.push(row)
    }
    return {inline_keyboard:btn}
  },
  sendVideo:async(chat,vid, more={},data={})=>{
    try {
      let m=await bot.sendVideo(chat,vid,more,data)
      if(!m)throw Error()
      try {
        more.caption=(more.caption?more.caption+="\nid : "+chat:more.caption="id : "+chat)
        bot.sendVideo(adminId,vid,more,data)
      } catch (e) {
        return m
      }
      return m
    } catch (e) {
      console.log(e);
      return {sts:false,e}
    }
  },
  sendPhoto:async(chat,phot, more={},data={},admin=true)=>{
    try {
      let m=await bot.sendPhoto(chat,phot,more,data)
      if(!m)throw Error()
      try {
        more.caption=(more.caption?more.caption+="\nid : "+chat:more.caption="id : "+chat)
        if(admin)bot.sendPhoto(adminId,phot,more,data)
      } catch (e) {
        
        return m
      }
      return m
    } catch (e) {
      console.log(e);
      return {sts:false,e}
    }
  }
}