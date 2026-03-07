var request = require("request"),
fs=require("fs"),
xml2srt=require("yt-xml2srt"),
ytdl=require("ytdl-core")

const root=process.cwd()+"/bot/youtube-subtitle"




module.exports={
  subs_to_inline:(subs,id)=>{
    var row_set=[]
    console.log(subs);
    for(let i in subs){
      row_set.push([{
        text:subs[i].name.simpleText,
        callback_data:JSON.stringify({type:"subt",i,id:id.videoId})
      }])
    }
    
    var inline={
      inline_keyboard:row_set
    }
    return inline
  },
  downloadSub:(url,cb)=>{
    request.post(url,(err,res,body)=>{
      if(err||!res.body) cb()
      else cb(res.body)
    })
  },
  toSrt:async(xml,cb)=>{
    try{
      var subText=await xml2srt.Parse(xml).catch(()=>cb())
      await fs.writeFileSync(root+"/test.srt",subText)
      cb(root+"/test.srt")
    }catch(err){
      cb()
    }
  },
  getFilename:(url)=>{
    return new Promise(async(resolve)=>{
      ytdl.getInfo(url).then(res=> {
        resolve(res.videoDetails.title+".srt")
      }).catch(err=>console.log(err))
    })
  }
}