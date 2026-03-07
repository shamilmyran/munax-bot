

const express=require("express"),
settings=require("./src/settings"),
subFinder=require("./src/subtitle_finder"),
imdbFinder=require("./src/imdb_finder"),
subscene=require("./src/subscene"),
msone=require("./src/msone")

const router=express.Router()

router.get("/search/imdb",(req,res)=>{
  if(req.query.query&&req.query.page){
    imdbFinder(req.query.query,req.query.page,(err,list)=>{
      if(err||!list){
        res.json({sts:false,err:"No Series Or Movies Found"},200)
      }else{
        res.json({sts:true,res:list,page:req.query.page},200)
      }
    })
  }else{
    res.json({sts:false,err:"Required Data Not Found[]"},200)
  }
})

router.get("/search/OS",(req,res)=>{
  try{
  let query=req.query
  if((query.imdbid||query.title)&&query.lang){
    subFinder(null,(err,subs)=>{
      try{
      if(err) res.json({sts:false,err},200)
      else{
        res.json({sts:true,subs},200)
      }
      }catch(e){
        console.log(e);
        return
      }
    },query)
  }else{
    res.json({sts:false,err:"Required data not found"},200)
  }
  }catch(e){
    console.log(e);
    return
  }
})

router.get("/search/SS",async(req,res)=>{
  try{
  var data=req.query
  if(data.query&&data.page){
    var r=await subscene.search(data.query)
    console.log(r);
    var p=parseInt(data.page),
    tp=String((r.length/10)).split(".")
    tp=tp.length===1?Number(tp[0]):parseInt(tp[0])+1
    var s=r.splice((p*10-10),10)
    s.length?res.json({sts:true,res:s,page:p,totel_page:tp}):res.json({sts:false,err:"noMorePage"})
  }else{
    res.json({sts:false,err:"Required data not found"})
  }
  }catch(err){
    res.json({sts:false,err})
  }
})

router.get("/SS/getSubtitles",async(req,res)=>{
  try{
  let {path,lang}=req.query
  if(path&&lang){
    var [subs,data]=await subscene.getSubs(path,lang.split(","),true)
    res.json({sts:true,subs:subs,data})
  }else{
    res.json({sts:false,err:"Required Data Not Found"})
  }
  }catch(err){
    res.json({sts:false,err})
  }
})

router.get("/SS/download",async(req,res)=>{
  try{
  let path=req.query.path
  var zip=req.query.zip||false
  if(path){
    var file=await subscene.download(path,zip)
    return res.json({sts:true,file})
  }else throw "Required Data Not Found"
  }catch(e){
    console.log(e);
    return res.json({sts:false,err:e})
  }
})

router.get("/MS/search",async(req,res)=>{
  try {
    if(!req.query.q||!req.query.p)throw "Required Data Not Found"
    let result=await msone.search(req.query.q,req.query.p)
    if(!result.data.length)throw "nosubfound"
    return res.json({sts:true,subs:result})
  } catch (e) {
    if(typeof e==="string")return res.json({sts:false,err:e})
    console.log(e);
    return res.json({sts:false,err:"Unexpected Error"})
  }
})

router.get("/MS/download",async(req,res)=>{
  try {
    if(!req.query.u)throw "Required Data Not Found"
    let data=await msone.download(req.query.u)
    if(!data.download.length)throw "No Data Found \nTry To Select another one"
    return res.json({sts:true,data})
  } catch (e) {
    console.log(e);
    if(typeof e==="string")return res.json({sts:false,err:e})
    return res.json({sts:false,err:"Unexpected Error\nPlease Try Again"})
  }
})

module.exports=router