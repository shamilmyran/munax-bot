
const request=require("request"),
db=require("../../../database"),
{botuser}=require("./config"),
{Button}=require("./messenger")

module.exports={
  argument:(lang)=>{
    //This function for getting exact value of a string 
    //This removing The spaces in a string
    lang=lang.split("")
    while(lang.length){
      if(lang[0]==" ") lang.splice(0,1)
      else break
    }
    lang=lang.join("")
    return lang
  },
  to_inline_keyboard_OS:(subs=[],userData,page)=>{
    try{
    let inline_sub=[]
    for(let i in subs){
      inline_sub.push([{
        text:subs[i].title,
        callback_data:JSON.stringify({
          t:"OSS",// Open Subtitile Selected
          i:i
        })
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
      callback_data:JSON.stringify({t:"OSP",page})
    },{
      text:"==>",
      callback_data:JSON.stringify({
        t:"OSN",
        page
      })
    }]
    var searchOther=[{
      text:"🔎 SUBSCENE",
      callback_data:JSON.stringify({t:"web",d:"SS"})
    },
    {
      text:"🔎 MSON",
      callback_data:JSON.stringify({t:"web",d:"MS"})
    }]
    var userDataBtn=[{
      text:`(${page}/${inline.length}) `+userData.title,
      callback_data:JSON.stringify({
        t:"OSD",
        data:[userData.imdbid||null,userData.lang||"any",page,inline.length]
      })
    }]
    inline=inline[parseInt(page)-1]
    inline.inline_keyboard.push(nextPrevBtn,searchOther,userDataBtn)
    return inline
    }catch(err){
      return {inline_keyboard:[[{text:"An error Accured\nTry Again..",callback_data:JSON.stringify({t:"buttonError"})}]]}
    }
  },
  inline_subscene_SS:(data,page,query,totelPage)=>{
    let row = []
    var eTxt = "Not Specifide"
    for (var i in data) {
      row.push([{
        text: `${data[i].title}`, callback_data: JSON.stringify({
          t: "SSSR",i,page
        })}])
        // SSSR is short form of SubScene Search Results
    }
    row.push([{
      text: "⇐",
      callback_data: JSON.stringify({
        t: "SSSRB", page
      })
    }, {
      text: "⇒",
      callback_data: JSON.stringify({
        t: "SSSRN", page
      })
    }])
    row.push([{
      text:"🔎 OPENSUBTITLES",
      callback_data:JSON.stringify({t:"web",d:"OS"})
    },
    {
      text:"🔎 MSON",
      callback_data:JSON.stringify({t:"web",d:"MS"})
    }])
    row.push([
      {
        text:`(${page}/${totelPage}) ${query}`,
        callback_data:JSON.stringify({
          t:"SSD",
          tp:totelPage
        })
      }])
    return row
  },
  inline_subtitle_SS_sub:(res,page)=>{
    var row=[]
    page=parseInt(page)
    var t=String(res.length/10).split(".");
    (t.length>1)?t=parseInt(t[0])+1:null;
    res=res.splice((page-1)*10,10)
    res.map((e,i)=>{
      var r=[{
        text:e.title,
        callback_data:JSON.stringify({
          t:"SSSTR", //SSSTR Is the short form of SubScene SubTitle Result
          i,
          page:page
        })
      }]
      row.push(r)
    })
    row.push([{text:"⇐",callback_data:JSON.stringify({t:"SSSTB",page})},{text:"⇒",callback_data:JSON.stringify({t:"SSSTN",page,totel:t})}],[{text:`(${page}/${t})`,callback_data:`{"t":"SSSTD"}`}])
    var inline={inline_keyboard:row,resize_keyboard:true}
    return inline
  },
  inline_SS_zip:(files,page=1,path)=>{
    let row=[],
    t=String((files.length/10)).split(".")
    t=(t.length===1)?Number(t[0]):Number(t[0])+1
    page=parseInt(page)
    files=files.splice((page-1)*10,10)
    files.map((e,i)=>{
      row.push([{
        text:e.filename,
        callback_data:JSON.stringify({t:"SSZS",i,p:page})
      }])
      // SSZS Is the short form of SubScene Zip Selected
    })
    row.push([
      {
        text:"⇐",
        callback_data:JSON.stringify({t:"SSZP",p:page,tp:t})
      },
      {
        text:"⇒",
        callback_data:JSON.stringify({t:"SSZN",p:page,tp:t})
      }
      ],[
      {
        text:`pages (${page}/${t})`,
        callback_data:`{"t":"SSZD"}`
      }
      ],[{
        text:"Translate all files",
        url:`https://${botuser}.t.me?start=ss-${path}`
      }])
      return {inline_keyboard:row}
  },
  inline_MS:(res)=>{
    let {data,page,pages}=res
    
    let btns=[]
    
    for(var i in data){
      btns.push([[data[i].title,{t:"MSS",i,page}]])
    }
    
    btns.push(
      [
        ["⇐",{t:"MSP",tp:pages,page}],
        ["⇒",{t:"MSN",tp:pages,page}]
      ],
      [
        ["🔎 OPENSUBTITLES",{t:"web",d:"OS"}],
        ["🔎 SUBSCENE",{t:"web",d:"SS"}]
      ],
      [
        [`${page}/${pages}`,{t:"MSD",tp:pages}]
      ]
    )
    
    return Button(btns)
  },
  /*inline_MS:(res)=>{
    let total=String(res.length/10).split(".")
    total=(total.length===1?Number(total[0]):Number(total[0])+1)
    page=parseInt(page)
    res=res.splice((page-1)*10,10)
    let inline=res.map((e,i)=>{
      return [{text:e.title,callback_data:JSON.stringify({t:"MSS",i,page})}]
    })
    inline.push([{
      text: "⇐",
      callback_data: JSON.stringify({
        t: "MSP", page,tp:total
      })
    }, {
      text: "⇒",
      callback_data: JSON.stringify({
        t: "MSN", page,tp:total
      })
    }])
    inline.push([{
      text:"🔎 OPENSUBTITLES",
      callback_data:JSON.stringify({t:"web",d:"OS"})
    },
    {
      text:"🔎 SUBSCENE",
      callback_data:JSON.stringify({t:"web",d:"SS"})
    }])
    inline.push([
      {
        text:`(${page}/${total})`,
        callback_data:JSON.stringify({
          t:"MSD",
          tp:total
        })
      }])
      return {inline_keyboard: inline,resize_keyboard:true}
  },*/
  removeUser:(id)=>{
    return new Promise((resolve)=>{
      request(process.env.HEROKU_URL+"/api/translate/removeUser?user="+id,(err,res)=>{
        resolve()
      })
    })
  },
  toSearchQuery:(q)=>{
    // This Function for replacing unwanted query words like malayalam,subtitles,english etc..
    var r=/malayalam|subtitle|subtitles|english/g
    q=q.toLowerCase().replace(r,"")
    return q
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
  }
  
}