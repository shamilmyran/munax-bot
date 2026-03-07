const fs = require("fs"),
langs= require("langs")

const root = process.cwd()+"/bot/subtitle-bot"

const db=require("../../../helper/db"),
{bot,adminId}=require("./config")


const readFile=async(path,json)=>{
  try{
  var file=await fs.readFileSync(path).toString()
  return json?JSON.parse(file):file;
  }catch(err){
    return json?[]:""
  }
},
writeFile=async(path,data,json)=>{
  try{
    await fs.writeFileSync(path,json?JSON.stringify(data):data)
    return
  }catch(err){
    return
  }
}

const settings={
  to_inline_keyboard: (data, page, cb)=> {
    let row = []
    var eTxt = "Not Specifide"
    for (var i in data) {
      row.push([{
        text: `[${data[i].Type}] `+data[i].Title, callback_data: JSON.stringify({
          type: "sel",
          data: [data[i].Year || eTxt, data[i].imdbID || eTxt, i]
        })}])
    }
    row.push([{
      text: "<==",
      callback_data: JSON.stringify({
        type: "back", page
      })
    }, {
      text: "==>",
      callback_data: JSON.stringify({
        type: "next", page
      })
    }], [{
      text: "PAGE : "+page,
      callback_data: JSON.stringify({
        type: "page_no"
      })
    }])
    cb(row)
  },
  addUser: (query)=> {
    return new Promise(async(resolve, reject)=>{
      var userList =await readFile(root+"/requesters.txt",true)
      var index = userList.findIndex(x=>x.id == query.id)
      if (index!==-1)reject(userList[index])
      else {
        userList.push(query)
        await writeFile(root+"/requesters.txt",userList,true)
        resolve()
      }
    })
  },
  getUser:(id)=>{
    return new Promise(async(resolve,reject)=>{
      var userList= await readFile(root+"/requesters.txt",true),
      index=userList.findIndex(x=>x.id==id)
      if(index===-1)resolve(null)
      else{
        resolve(userList[index])
      }
    })
  },
  removeUser:(id)=>{
    return new Promise(async(resolve,reject)=>{
      var userList=await readFile(root+"/requesters.txt",true),
      index=userList.findIndex(x=>x.id==id)
      if(index===-1)reject()
      else {
        userList.splice(index,index+1)
        writeFile(root+"/requesters.txt",userList,true)
        resolve()
      }
    })
  },
  updateUser:async(id,key,value)=>{
    var userList=await readFile(root+"/requesters.txt",true)
    var index=userList.findIndex(x=>x.id==id)
    if(index===-1)return
    else{
      userList[index][key]=value
      writeFile(root+"/requesters.txt",userList,true)
      return
    }
  },
  isAvailbleLang:(langName)=>{
    var allLangs=langs.all()
    langName=langName.toLowerCase()
    var lang;
    for(var i in allLangs){
      if(allLangs[i].name.toLowerCase()==langName||allLangs[i].local.toLowerCase()==langName||allLangs[i]["1"].toLowerCase()==langName||allLangs[i]["2"].toLowerCase()==langName||allLangs[i]["3"].toLowerCase()==langName){
        lang=allLangs[i]
        break
    }
  }
  if(lang) return lang
  return null
  },
  to_inline_keyboard_subs:(subs,userData,page)=>{
    
    let inline_sub=[]
    for(let i in subs){
      inline_sub.push([{
        text:subs[i].title,
        url:subs[i].url
      }])
    }
    
    var inline=[]
    while(inline_sub.length){
      inline.push({
        inline_keyboard:inline_sub.splice(0,10)
      })
    }
    var nextPrevBtn=[{
      text:"<==",
      callback_data:JSON.stringify({type:"prev_page_sub",page})
    },{
      text:"==>",
      callback_data:JSON.stringify({
        type:"next_page_sub",
        page
      })
    }]
    var userDataBtn=[{
      text:userData.title,
      callback_data:JSON.stringify({
        type:"sub_page_data",
        data:[userData.imdbid||null,userData.lang||"any",page,inline.length]
      })
    }]
    inline=inline[parseInt(page)-1]
    inline.inline_keyboard.push(nextPrevBtn,userDataBtn)
    return inline
  },
  gussTheQuery:(q)=>{
    //console.log(q);
    q=q.toLowerCase().replace(/\(/g," (").replace(/\)/g,") ").replace(/\[/g," [").replace(/\]/g,"] ").trim().replace(/\.|_/g," ")
    //console.log(q);
    let s=q.match(/\s(s|season)(\s*)(\d{1,3})([^0-9]| |e|$)/i)
    let e=q.match(new RegExp(`(${s?s[1].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+s[2].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+s[3].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}\\s)(e|episode|ep)(\\s*)(\\d{1,3})([^0-9]| |$)`,"i"))
    let y=q.match(new RegExp(`(\\s+|\\(|\\[)(\\d{4,4})\\s*(${s?s[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}${e?e[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}$|\\)|\\])`,"i"))
    let quality=q.match(/(\s|\()(144p|240p|360p|480p|720p|1080p|1440p|2160p|4320p|2k|4k|8k)(\s|$|\))/i)
    let nonsearch=q.match(/(\s|\(|\[)(dvd|hdrip|bluray|hq|hevcrip|mp4|mkv|flv|mp3|srt$|brrip|hevc|aac|h264|webrip|hlv|ass$|vtt$|xvid|web-dl|ddp5|h265|dvdrip)(\s|\)|\])/i)
    let query=q.match(new RegExp(`^(.+?)(\\s*)(?:${s?s[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}${e?e[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}${y?y[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}${quality?quality[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}${nonsearch?nonsearch[0].replace("(","\\(").replace(")","\\)").replace(/\[/,"\\[").replace(/]/,"\\]")+"|":""}$)`,"i"))
    //console.log(nonsearch);
    query={title:query[1],year:(y?y[2].replace(/\(|\)/g,""):null),episode:(e?e[4]: null),season:(s?s[3]:null),quality:(quality? quality[2]:null),nonsearch:(nonsearch?nonsearch.slice(2,nonsearch.length).join(""):null)}
    //console.log(query);
    return query
  },
  toMarkupBtnOs:(sub,page,lang)=>{
    let btn=[]
    page=Number(page)-1
    let tp=String(sub.length/10).split(".")
    tp=(tp.length===2?Number(tp[0])+1:Number(tp[0]))
    sub=sub.splice(page*10,10)
    for(var i in sub){
      btn.push([[sub[i].title,{t:"ssos",i:Number(i),p:page+1,l:lang}]])
    }
    btn.push([["<==",{t:"csos",ct:"p",p:page,tp,l:lang}],["==>",{t:"csos",ct:"n",p:page+2,tp,l:lang}]],[[`(${page+1}/${tp})`,{t:"tpos"}]],[["Search in Subscene",{t:"ss",w:"ss"}]])
    return btn
  },
  toMarkupBtnSSsearch:(sub,page)=>{
    let btn=[]
    page=Number(page)-1
    let tp=String(sub.length/10).split(".")
    tp=(tp.length===2?Number(tp[0])+1:Number(tp[0]))
    sub=sub.splice(page*10,10)
    for(var i in sub){
      btn.push([[sub[i].title.replace(/[^a-zA-Z0-9"';:!+\-$&#*()\[\]., _={}@$]/g,''),{p:page,i:Number(i),t:"srss"}]])
    }
    btn.push([["<==",{t:"csrss",ct:"p",tp,p:page}],["==>",{t:"csrss",ct:"n",tp,p:page+2}]],[[`(${page+1}/${tp})`,{t:"tpss"}]],[["Search In Open Subtitle",{t:"ss",w:"os"}]])
    return btn
  },
  toMarkupBtnSSSubs:(sub,page,lang)=>{
    let btn=[]
    page=Number(page)-1
    let tp=String(sub.length/10).split(".")
    tp=(tp.length===2?Number(tp[0])+1:Number(tp[0]))
    sub=sub.splice(page*10,10)
    for(var i in sub){
      btn.push([[sub[i].title.replace(/[^a-zA-Z0-9"';:!+\-$&#*()\[\]., _={}@$]/g,''),{p:page,i:Number(i),t:"ssss",l:lang}]])
    }
    let avl_l=true
    if(!module.exports.isAvailbleLang(lang))avl_l=false
    btn.push([["<==",{t:"csss",ct:"p",tp,p:page,l:lang}],["==>",{t:"csss",ct:"n",tp,p:page+2,l:lang}]],[[`(${page+1}/${tp})`,{t:"tpss"}]],[(avl_l?["Search in opensubtitles",{t:"slos",l:module.exports.isAvailbleLang(lang)["2"]}]:["Search in opensubtitles",{t:"ss",w:"os"}])])
    return btn
  },
  addGroup:async chat=>{
    console.log(chat);
    let data=await db.get("user_datas",{user:chat.id},true)
    if(data)return
    let group=await bot.getChat(chat.id)
    await db.set("user_datas",{user:chat.id,bots:["subtitle"]})
    bot.sendMessage(adminId,"new group joined\n\n"+JSON.stringify(group)).catch(e=>null)
  },
  markupSDSearch:(subs,page)=>{
    let tp=Math.ceil(subs.length/10)
    subs=subs.splice((page-1)*10,10)
    
    let btns=[]
    
    for(var i in subs)btns.push([[(subs[i].type=="movie"?"[M] ":"[S] ")+subs[i].title,{t:"ssrsd",page:page-1,i:Number(i)}]])
    
    btns.push([["<--",{t:"csrsd",p:page,tp,ct:"p"}],["-->",{t:"csrsd",p:page,tp,ct:"n"}]],[[`Page (${page}/${tp})`,{t:"srdsd"}]],[["🔍 SUBSCEN",{t:"ss",w:"ss"}],["🔍 OPENSUBTITLES",{t:"ss",w:"os"}]])
    
    return btns
  },
  markupSDSeason:(res)=>{
    let btns=[]
    for(var i in res){
      btns.push([[res[i].title,{t:"ssnsd",sn:res[i].ind}]])
    }
    btns.push([["🔍 SUBSCENE",{t:"ss",w:"ss"}],["🔍 OPENSUBTITLES",{t:"ss",w:"os"}]])
    
    return btns
  },
  markupSdSub:(subs,page,l)=>{
    let tp=Math.ceil(subs.length/10)
    subs=subs.splice((page-1)*10,10)
    let btns=subs.map((x,i)=>[[x.title,{t:"sssd",i,p:page-1,l}]])
    
    btns.push([["<--",{t:"csssd",c:"p",page,l,tp}],["-->",{t:"csssd",c:"n",page,l,tp}]],[[`Pages (${page}/${tp})`,{t:"sssdd"}]],[["🔍 SUBSCENE",{t:"ss",w:"ss"}],["🔍 OPENSUBTITLES",{t:"ss",w:"os"}]])
    
    return btns
  }
}

module.exports=settings