const translate = require("../../../translate/index")
const settings = require("./settings"),
advertise=require("./advertise")
var fs = require("fs");
var root = process.cwd()+"/bot/translate-bot"
let gape = true,
proxy={}

function translater(text, lang, cb) {
  var translated = ""
  if(proxy.sts){
    if((Date.now()-proxy.time)>=3600000){
      translate.proxy()
      proxy={}
    }
  }
  function looper() {
    var tText=text[0]
    translate(text.splice(0, 1)[0], {
      to: lang
    }).then(res=> {
      //console.log(res.text.toString("utf8"));
      translated += res.text.toString("utf8")+"\n"
      if (text.length) looper()
      else {
        cb(null, translated)
      }
    }).catch(err=> {
      console.log(err,"__catch_block_translate")
      translate.proxy()
      proxy={sts:true,time:Date.now()}
      translate(tText,{to:lang}).then(res=>{
        translated+=res.text.toString("utf8")+"\n"
        if(text.length)looper()
        else cb(null,translated)
      }).catch(e=>{
        translate.proxy()
        proxy={}
        cb(e)
      })
    })
  }
  looper()
}


module.exports.translate = (id, lang,cb)=> {
  return new Promise(async resolve=>{
  console.log("in transition",lang,id);
  gape=false
  var subtitle = await fs.readFileSync(root+"/subtitles/"+id+".srt").toString("utf8")
  var fullOne = settings.fullOne(subtitle)
  let lineByLine = await settings.lineByLine(fullOne)
  var order = await settings.ordering(lineByLine)
  var {order,qlty}=settings.find_unended_lines(order,true)
  await fs.writeFileSync(root+"/"+id+".txt",JSON.stringify(order))
  order=await advertise(root+"/"+id+".txt")||order
  let splitedText = []
  let tempOrder = order
  var fullText = ""
  for (var i = 0; i < tempOrder.length; i++) {
    fullText += tempOrder[i].text+"\n"
  }
  fullText = fullText.split("")
  console.log(fullText.length,"sub length");
  while (tempOrder.length) {
    var limitText = fullText.splice(0,10000)
    limitText = limitText.join("")
    var maxLine = limitText.split("\n").length-1
    splitedText.push(tempOrder.splice(0, maxLine))
  }
  var text = []
  for (var i in splitedText) {
    let select = splitedText[i]
    let tempText = ""
    for (var j in select) {
      tempText += select[j].text.replace(/<br>/g, "").replace(/<\/br>/g, "").replace(/<i>/g, "").replace(/<\/i>/g, "")+"\n"
    }
    text.push(tempText)
  }
  console.log({parts:text.length,total:text.join('').length},'__text_detials__')
  translater(text,lang,async(err,translated)=>{
    try{
    if(err){
      gape=true
      return resolve(["langError",id])
    }else{
      let transArr=translated.split("\n")
      var order=JSON.parse(await fs.readFileSync(root+"/"+id+".txt"));
      await fs.unlinkSync(root+"/"+id+".txt")
      settings.decode(transArr,order,async(sub)=>{
        sub=await settings.decodeAds(sub)
        await fs.writeFileSync(root+"/subtitles/"+id+".srt",sub)
        gape=true
        return resolve([null,id,qlty])
      })
    }
    }catch(err){
      gape=true
      return resolve(["internalError"])
    }
  })
   /* var mainData = JSON.parse(await fs.readFileSync(root+"/mainData.txt"));
    console.log(mainData);
    //console.log("__gaper_inn__",mainData)
      var select = mainData.splice(0, 1)[0]
      await fs.writeFileSync(root+"/mainData.txt",JSON.stringify(mainData))
      var selectedId = select.id
      //console.log(selectedId, select)
      translater(select.text, lang, async(err, translated)=> {
        if (err) {
          
          cb("langError",selectedId)
      
        } else {
          var transArr = translated.split("\n")
          var order = JSON.parse(await fs.readFileSync(root+"/"+selectedId+".txt"));
          await fs.unlinkSync(root+"/"+selectedId+".txt");
          settings.decode(transArr, order, async (res)=> {
            res=await settings.decodeAds(res)
            await fs.writeFileSync(root+"/subtitles/"+selectedId+".srt", res)
            cb(null, selectedId)
        
          })
        }
      })
    
  */
  })
}
module.exports.status=()=>{
  if(gape)return true
  else return false
}

module.exports.change=(sts)=>{
  gape=sts
}
