var fs = require("fs");
//var subConverter=require("../../subtitle-convert/index").convert
var subConverter=require("subtitle-converter").convert
var languages = require("./languages")
var root = process.cwd()+"/bot/translate-bot",
updationGape=true,
updationReqs=[],
db=require("../../../database")

var decodeHelper = (text)=> {
  text = text.replace(/\.\.\./g, "¢").replace(/\?!/g, "∆").replace(/\.,/g, "£°").split("")
  var num = []
  for (var i in text) {
    if (text[i] == "," || text[i] == "." || text[i] == "!" || text[i] == " " || text[i] == "?" || text[i] == "¢" || text[i] == "∆" || text[i]+text[i+1] == "£°") {
      num.push(parseInt(i)+1)
    }
  }
  var Temptext = text.join("")
  num.sort((a, b)=> {
    if (a <= Temptext.length/2) a = (Temptext.length/2)-a
    else a = a-(Temptext.length/2)
    if (b <= Temptext.length/2)b = (Temptext.length/2)-b
    else b = b-(Temptext.length/2)
    return a-b
  })
  //console.log(num[0],text.length/2,num)
  text.splice(num[0],
    0,
    "\r\n")
  text = text.join("").replace(/¢/g,
    "...").replace(/∆/g,
    "?!").replace(/£°/g,
    ".,")
  return text
}
/*var double_dailog = (text)=> {
  text = " "+text
  var firstLett = text.split("-")[0].replace(/ /g,
    "")
  if(text.split("-").length<2)return text
  if (!firstLett) {
    text = text.split("-")
    text.splice(0, 1)
    text = "- "+text.join("\r\n- ")
    return text
  } else {
    text = "-"+text.replace(/-/g, "\r\n- ")
    return text
  }
}*/

const double_dailog=(text)=>{
  if(!(/^(\s|<.+?>|{.+?}){0,}-/.test(text)))text="- "+text
  
  text=text.split("-")
  text=text.reduce((t,c)=>{
    if(!c)return t+"-"
    return t+"- "+c+"\r\n"
  },'')
  return text
}

const split_unended_line=(text,perc,consid=false)=>{
  var j=text.split(",").length-1
  var pt=perc
  text=text.split("")
  let sps=[]
  for(var i in text){
    if(text[i]===","){
      sps.push(i)
      continue
    }
    if((!j||consid)&&text[i]===" "){
      sps.push(i)
    }
      
  }
  perc=Math.ceil(perc*text.length/100)
  sps.sort((a, b)=> {
    if (a <= perc) a = (perc)-a
    else a = a-(perc)
    if (b <= perc)b = (perc)-b
    else b = b-(perc)
    return a-b
  })
  if(Math.abs(Number(sps[0])-perc)>30){
    text=split_unended_line(text.join(""),pt,true)
    return text
  }
  
  return (text.splice(0,Number(sps[0])+1).join(""))
}


module.exports = {
  genarateLink: (time,
    cb)=> {
    var url = `${process.env.HEROKU_URL || "https://tgway2.herokuapp.com"}/translate/home/?id=${encodeURIComponent(time)}`
    if(!cb) return url
    return cb(url)
  },
  checkValid: async (id,
    cb)=> {
    var reqList = JSON.parse(await fs.readFileSync(root+"/requesters.txt"))
    var index = reqList.findIndex(x=>x.id == id)
    if (index===-1) {
      var data={
        sts: false,
        err: "You Have Not Submitted A Subtitle File\nOr\nThe Link Is Expired"
      }
      if(cb){
      cb(data)
      }else return data
      }else {
        await fs.writeFileSync(root+"/requesters.txt",JSON.stringify(reqList))
        var data={sts: true, data: reqList[index]}
        if(cb) cb(data)
        else return data
      }
    
  },
  fullOne: (text)=> {
    var splited = text.split(/\r\n\r\n|\n\r\n\r|\r\r|\n\n/)
    for (var i in splited) {
      if (!splited[i]) {
        splited.splice(i, splited.length-1)
        break
      }
    }
    return splited
  },
  lineByLine: (fullOne)=> {
    var lines = []
    for (var i in fullOne) {
      var line = fullOne[i].split(/\r\n|\n\r|\r|\n/)
      lines.push(line)
    }
    return lines
  },
  ordering: (lineByLine)=> {
    let ordered = []
    for (var i in lineByLine) {
      var a = lineByLine[i],
      no=a.splice(0,1)[0],
      code=a.splice(0,1)[0]
      
      let dbl_dlg={}
      a.forEach((e,i)=>{
        
        if(/^(\s|<.+?>|{.+?}){0,}-/.test(e)&&a.length>1)dbl_dlg.dbl_dlg=true
      })
      let text=a.join(" ").replace(/<(\w+){0,4}>/g,"").trim()
      if(text.replace(/ /g,"")==""){
        text="@subtitle_translate_bot"
      }
      var order = {
        No: no,
        code,
        text,
        ...dbl_dlg
      }
      ordered.push(order)
    }
    return ordered
  },
  decode: (transArr, order, cb)=> {
    var text = ""
    while (order.length) {
      var select = transArr.splice(0, 1).join("")
      // console.log(select)
      if(order[0].part){
        let sel_temp=select
        select=split_unended_line(select,order[0].part)
        transArr[0]=sel_temp.replace(select,"")
      }
      if (select.length > 40) {
        if (order[0].dbl_dlg) {
          var locText = double_dailog(select)
          var splitedLocText = locText.split("\r\n")
          locText = ""
          //  console.log(splitedLocText)
          for (var i in splitedLocText) {
            if (splitedLocText[i].length > 40) {
              locText += decodeHelper(splitedLocText[i])+"\r\n"
            } else {
              locText += splitedLocText[i]+"\r\n"
            }
          }
          var obj = order.splice(0, 1)[0]
          text += `${obj.No}\r\n${obj.code}\r\n${locText}\r\n`
        } else {
          var locText = decodeHelper(select)
          var obj = order.splice(0, 1)[0]
          text += `${obj.No}\r\n${obj.code}\r\n${locText}\r\n\r\n`
        }
      } else {
        if (order[0].dbl_dlg) {
          select = double_dailog(select)
          var obj = order.splice(0, 1)[0]
          text += `${obj.No}\r\n${obj.code}\r\n${select}\r\n\r\n`
        } else {
          var obj = order.splice(0, 1)[0]
          //    console.log(obj,order,transArr)

          text += `${obj.No}\r\n${obj.code}\r\n${select}\r\n\r\n`
        }
      }
    }
    //console.log(te
    cb(text)
  },
  removeUser: async(id)=> {
    var reqList = JSON.parse(await fs.readFileSync(root+"/requesters.txt"));
    var index = reqList.findIndex(x=>x.user == id)
    reqList.splice(index, index+1)
    await fs.writeFileSync(root+"/requesters.txt", JSON.stringify(reqList))
  },
  showLangs: (cb)=> {
    var langNames = Object.values(languages).join("`\n`")
    langNames+="`"
    return cb(langNames)
  },
  getData: (user, cb)=> {
    var reqList = JSON.parse(fs.readFileSync(root+"/requesters.txt"))
    var index = reqList.findIndex(x=>x.user == user)
    if (index===-1) {
        var data={
        sts: false,
        err: "You have not submitted a subtitle\nOr\nThe link is expired"
      }
      if(cb) return cb(data)
      return data
      
    } else {
      var data={
        sts: true, data: reqList[index]
      }
      if(cb)return cb(data)
      return data

    }
  },
  clear: async()=> {
    try {
      var requesters = await fs.readFileSync(root+"/requesters.txt")
      requesters = JSON.parse(requesters);
      var lis = requesters||[]
      var arr = []
      for (var i in lis) {
        if (Date.now() - requesters[i].id > 86400000) {
          var sel = requesters.splice(i, i+1)[0]
          arr.push(sel.user)
        }
      }
      await fs.writeFileSync(`${root}/requesters.txt`, JSON.stringify(requesters))
      async function deleter() {
        try {
          if (arr.length) {
            var sel = arr.splice(0, 1)[0]
            await fs.unlinkSync(`${root}/subtitles/${sel }.srt`)
            deleter()
          }
        }catch(err) {
          console.log(err)
        }
      }
      deleter()
    }catch(err) {
      console.log(err)
    }
  },
  decodeAds: (text)=> {
    adStart = text.split("[{(")
    var adsEnd = []
    for (var i in adStart) {
      adsEnd.push(adStart[i].split(")}]"))
    }
    var ads = []
    for (var i in adsEnd) {
      if (adsEnd[i].length > 1) {
        ads.push(adsEnd[i][0])
      }
    }
    let color = [["#f51f5c",
      "#f65f79"],
      ["#f51fa2",
        "#f571c3"],
      ["#a32ef6",
        "#c654f4"],
      ["#0b5af5",
        "#606be3"],
      ["#24bbef",
        "#49eced"],
      ["#30ef93",
        "#5cfade"],
      ["#1eef70",
        "#93fd83"],
      ["#fcd730",
        "#f3f99b"],
      ["#f0570e",
        "#f76651"]]
    font = ["Roboto",
      "Verdana",
      "Tiresias",
      "Antique Olive",
      "Tahoma",
      "Times",
      "Courier"],
    adsSplit = []
    for (var i in ads) {
      ad = ads[i].split(" ")
      while (ad.length) {
        adsSplit.push(ad.splice(0,1).join(""))
      }
      var selColor = color[Math.floor(Math.random()*color.length)]
      var selFont = font[Math.floor(Math.random()*font.length)],
      stylish = "",
      a = 0
      while (adsSplit.length) {
        stylish += `<font face="${selFont}" color="${selColor[a]}">${adsSplit[0]}</font> `
        adsSplit.splice(0,1);
    
        (a == 0)?a = 1: a = 0
      }
      text = text.replace("[{("+ads[i]+")}]", stylish);
    }
    return text;
  },
  updateUser:async(id,{key,value})=>{
    if(key&&id){
      var userData=JSON.parse(await fs.readFileSync(`${root}/requesters.txt`));
      var i=userData.findIndex(x=>Number(x.user)===Number(id))
      if(i===-1)return
      userData[i][key]=value
      await fs.writeFileSync(`${root}/requesters.txt`,JSON.stringify(userData))
      return
    }else return;
    
  },
  subtitle_convert:(sub)=>{
    try{
      var {subtitle,status} = subConverter(sub,".srt",{timecodeOverlapLimiter:1000})
      if(!subtitle) throw "convert error"
      return {sts:true,subtitle}
    }catch(err){
      console.log(err)
      return {sts:false}
    }
  },
  isAvileLang:(lang)=>{
    var iso=Object.keys(languages)
    var langs=Object.values(languages)
    for(let i in iso){
      if(iso[i].toLowerCase()==lang.toLowerCase()||langs[i].toLowerCase()==lang.toLowerCase()){
        return {iso:iso[i],name:langs[i]}
      }
    }
    return null
  },
  limitSts:async(id)=>{
    var userData=await db.get().collection("usage").findOne({user:id})
    if(!userData){
      var data={
        user:id,
        used:0
      }
      await db.get().collection("usage").insertOne(data)
      return true
    }
    else{
      console.log(userData);
      if(userData.used<20)return true
      
      var isVip=await db.get().collection("vip").findOne({user:String(id)})
      if(!isVip)return false
      if(isVip.normal&&isVip.addon){
        if(userData.used<isVip.normal_limit)return true
        else if(isVip.addon_limit>0)return true
        else return false
      }else if(isVip.normal){
        if(userData.used<isVip.normal_limit)return true
        return false
      }else if(isVip.addon_limit>0)return true
      return false
    }
  },
  getAds:async()=>{
    try{
      let ads=await db.get().collection('ads').find().toArray()
      let wantAds={}
      ads.map((e,i)=>{
        if(process.env.NODE_ENV=='production'){
          if(process.env.HEROKU_URL=='https://tgway2.herokuapp.com'&&e.adsUrl==2){
            wantAds[e.adName]=e.adsScript
          }else if(process.env.HEROKU_URL=='https://tgway.herokuapp.com'&&e.adsUrl==1){
            wantAds[e.adName]=e.adsScript
          }
        }else{
          if(e.adsUrl==2){
            wantAds[e.adName]=e.adsScript
          }
        }
      })
      return wantAds
    }catch(e){
      console.log(e);
      return {}
    }
  },
  find_unended_lines:(order,qlt=false)=>{
    order=order.map(x=>{
      x.text=x.text.replace(/<.+?>/g,"")
      return x
    })
    let text=order.reduce((t,c)=>t+c.text+"\n","")
    let matches=(text.match(/[\!\@\#\$\%\^\&\*\)\(\+\=\.\<\>\{\}\[\]\:\;\'\"\|\~\`\_\-,0-9?]\n/g)||[]).length
    let prog=Math.ceil(matches/order.length*100)
    
    console.log(matches,order.length,prog);
    let match
    
    if(prog>70){
      match=/(,|[^\!\@\#\$\%\^\&\*\)\(\+\=\.\<\>\{\}\[\]\:\;\'\"\|\~\`\_\-0-9?])$/
    }else{
      match=/,$/
      
      order=order.map(x=>{
        x.text.match(/[^\!\@\#\$\%\^\&\*\)\(\+\=\.\<\>\{\}\[\]\:\;\'\"\|\~\`\_\-,0-9?]$/) && (x.text+=".")
        return x
      })
    }
    
    for(let i in order){
      i=Number(i)
      let tx=[]
      if(!order[i].text.match(match)) continue
      if(order.length-1==i)break
      
      tx.push(order[i].text)
      
      let j=1
      while(j<6){
        if(!order[i+j]){
          j--
          break
        }
        tx.push(order[i+j].text)
        if(!order[i+j].text.match(match))break
        j++
      }
      if(j===6)j--
      tx.map((e,k)=>{
        var tl=tx.slice(k,tx.length).join("").length
        var p=Math.ceil(e.length/tl*100)
        order[i+k].part=p
        order[i+k].text=""
      })
      order[i].text=tx.join(" ")
      try{
      delete order[i+j].part
      }catch(e){
        console.log(e,order[i],order[i+j]);
      }
    }
    console.log(order.length);
    if(!qlt)return order
    return {order,qlty:Math.round(prog/10)}
  },
  gussTheQuery:(q)=>{
    //console.log(q);
    q=q.toLowerCase().replace(/\(/g," (").replace(/\)/g,") ").replace(/\[/g," [").replace(/\]/g,"] ").trim().replace(/\.|_/g," ")
    //console.log(q);
    let autour=q.match(/^@(a-z0-9)+ /i)
    let s=q.match(/\s(s|season)(\s*)(\d{1,3})([^0-9]| |e|$)/i)
    let e=q.match(new RegExp(`(${s?s[1].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+s[2].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+s[3].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}\\s)(e|episode|ep)(\\s*)(\\d{1,3})([^0-9]| |$)`,"i"))
    let y=q.match(new RegExp(`(\\s+|\\(|\\[)(\\d{4,4})\\s*(${s?s[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}${e?e[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}$|\\)|\\])`,"i"))
    let quality=q.match(/(\s|\()(144p|240p|360p|480p|720p|1080p|1440p|2160p|4320p|2k|4k|8k)(\s|$|\))/i)
    let nonsearch=q.match(/(\s|\(|\[)(dvd|hdrip|bluray|hq|hevcrip|mp4|mkv|flv|mp3|brrip|hevc|aac|h264|webrip|hlv|xvid|web-dl|ddp5|h265|dvdrip)(\s|\)|\])/i)
    let query=q.match(new RegExp(`^(.+?)(\\s*)(?:${autour?autour[0]+"|":""}${s?s[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}${e?e[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}${y?y[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}${quality?quality[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}${nonsearch?nonsearch[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}$)`,"i"))
    //console.log(nonsearch);
    query={title:query[1],year:(y?y[2].replace(/\(|\)/g,""):null),episode:(e?e[4]: null),season:(s?s[3]:null),quality:(quality? quality[2]:null),nonsearch:(nonsearch?nonsearch.slice(2,nonsearch.length).join(""):null),autour}
    //console.log(query);
    return query
  }
}