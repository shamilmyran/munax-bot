const express = require("express")
const router = express.Router()
const fs = require("fs"),
util=require("util"),
request=util.promisify(require("request"));
let bitlyClient = require("bitly").BitlyClient,
querystring=require("querystring")
const bitly = new bitlyClient("ae0cda66640cd89148dd99c9e90018ddcbe04808"),
db=require("../helper/db"),
ExpressBrute = require('express-brute'),
MongoStore = require('express-brute-mongo-update');

let web=process.env.HEROKU_URL.split("//")[1].split(".")[0]
web=(web==="tgway"?true:false)

var clear = require("../clear")

let login = false

let storeMongo=new MongoStore(ready=>{
  return ready(db.db.get().collection("mongo-brute"))
})

const bruteforce=new ExpressBrute(storeMongo,{
  freeRetries:3,
  minWait:10000,
  maxWait:60*60*1000,
  failCallback:(req,res,next,data)=>{
    console.log(data);
  }
})

const loginCheck = (req, res, next)=> {
  try{
  if ((req.session.admin&&req.session.admin.login)||(req.query.own&&req.query.own==="owntgwayurl@")) {
    next()
  } else {
    var q=querystring.stringify({
      redir:req._parsedOriginalUrl.path,
      q:req._parsedOriginalUrl.query
    })
    res.redirect(`/admin/?${q}`)
  }
  }catch(e){
    res.end()
  }
}

router.get("/", (req, res)=> {
  if(req.session.admin&&req.session.admin.login){
    res.redirect("/admin/login")
  }else{
    res.render("admin/login", {
    title: "Telegram movie locator",
    org:web,
    redir:(req.query.redir&&(req.query.redir!="/admin"||req.query.redir!="/admin/"))?req.query.redir:""
  })
}
})
router.post("/login/update",bruteforce.prevent, (req, res)=> {
  var data = req.body
  if (data.username === "afsalcp" && data.password === "afsalcp@786") {
    req.session.admin={login:true}
    console.log(req.session.admin);
    res.json({
      sts: true
    })
  } else
  {
  req.session.admin={login:false}
  res.json({
      sts: false
    })
  }
})
router.get("/login", loginCheck, (req, res)=> {
  if(req.query.redir){
    res.redirect(req.query.redir)
  }else{
  res.render("admin/main", {
    title: "Telegram movie file locator admin",
    org:web
  })
  }
})
router.get("/createNewLink", loginCheck, (req, res)=> {
  res.render("admin/createNewLink/main", {
    title: "Telegram link creating page",
    org:web
  })
})
router.post("/viewCount/update", async(req, res)=> {
  var count = await fs.readFileSync("viewCount.txt").toString()
  count = JSON.parse(count);
  var already = count.findIndex(x=>x.link == req.body.url)
  if (already===-1) {
    count.push({
      link: req.body.url,
      count: 1
    })
  } else {
    count[already].count += 1
  }
  await fs.writeFileSync("viewCount.txt", JSON.stringify(count))
  res.end("true")
})
router.get("/viewCount", loginCheck, async(req, res)=> {
  var data = await fs.readFileSync("viewCount.txt").toString()
  data = JSON.parse(data);
  res.render("admin/viewCount/main", {
    title: "View Count Page",
    data,
    org:web
  })
})
router.get("/clear", loginCheck, (req, res)=> {
  clear()
  res.end("success")
})
router.get("/bitly", async(req, res)=> {
  var url = req.query.url
  bitly.shorten(url).then(r=> {
    res.json({
      err: false, link: r.link
    })
  }).catch(err=> {
    res.json({
      err: true
    })
  })
})

router.get("/planChanger",loginCheck,async(req,res)=>{
  let plans=await db.getPlans()
  res.render("admin/planChanger/index",{plans})
})

router.post("/addPlan",async(req,res)=>{
  try{
  let r={}
  var plans=await db.getPlans()
  let data={
    plan:req.body.plan,
    price:{inr:req.body["price[INR]"],doller:req.body["price[DOLLER]"]},
    valid:req.body.valid,
    gain:req.body["gain[]"],
    limit:req.body.limit,
    type:req.body.type
  }
  if(plans.findIndex(x=>x.plan==data.plan)===-1){
    await db.addPlan(data)
    r.msg="New Plan Added Successfully"
  }
  else {
    await db.changePlan({plan:data.plan},data)
    r.msg=`The ${data.plan} Has Been Modified`
  }
  r.sts=true
  res.json(r)
  }catch(e){
    console.log(e);
    res.json({sts:false})
  }
})
router.get("/planChanger/detials",loginCheck,async(req,res)=>{
  console.log(req.query);
  if(req.query.plan){
  var plans=await db.getPlans()
  console.log(plans);
  var sel=plans.findIndex(x=>x.plan===req.query.plan)
  res.render("admin/planChanger/details",{plan:plans[sel],org:web})
  }else{
    res.redirect("/admin/planChanger")
  }
})

router.get('/addAds',loginCheck,(req,res)=>{
  res.render('admin/addAds/main',{title:'Ads Adding Page',org:web})
})

router.post('/addAds',loginCheck,async(req,res)=>{
  var data=req.body
  if(data.adName&&data.adsUrl&&data.adsScript){
    var {sts,err}=await db.addAd(data)
    if(sts)res.json({sts:true})
    else res.json({sts:false,err:'Unexpected  Error Occurred  Please Try Again'})
  }else{
    res.json({sts:false,err:'required data not found'})
  }
})
router.get("/getAds",loginCheck,async(req,res)=>{
  var {sts,ads}=await db.getAds()
  if(!sts)return res.end("unexpected error occurred while getting ads detials on database")
  res.render("admin/addAds/ads",{title:"Available Ads Page",ads,org:web})
})

router.get("/vip",loginCheck,async(req,res)=>{
  try{

    res.render("admin/vip/main",{title:"Vip User Adding Page",org:web})
  }catch(e){
    console.log(e);
    return
  }
})

router.get("/getUser",loginCheck,async(req,res)=>{
  try{
    if(req.query.id){
      var url=`${process.env.HEROKU_URL}/api/translate/bot`
      console.log(url);
      var {body}=await request({url,json:{f:"getChat",p1:Number(req.query.id)}, method:"post"})
      if(!body.sts) throw "Unexpected error "
      res.json({sts:true,data:body.m})
    }else throw "required data not found"
  }catch(e){
    console.log(e);
    if(typeof e!=="string")e="Unexpected Error"
    return res.json({sts:false,err:e})
  }
})

router.post("/vip/add",loginCheck,async(req,res)=>{
  try{
    let data=req.body
    // checking that required data is sended correctly
    if(!data.userId||!data.planName||!data.planType) throw "required data not found"
    data={
      id:data.userId,planName:data.planName,planType:data.planType
    }
    var vipData=await db.addVipAdmin(data)
    if(vipData instanceof Error)throw vipData.message
    res.redirect("/admin/vip")
  }catch(e){
    console.log(e);
    if(typeof e!=="string")e="Unexpected Error Occurred"
    res.json({sts:false,err:e})
  }
})

router.get("/vip/getData",async(req,res)=>{
  try{
    if(!req.query.id)throw "required data not found"
    var user=await db.get("vip",{user:String(req.query.id)},true),
    {body}=await request({url:`${process.env.HEROKU_URL}/admin/getUser?id=${req.query.id}&own=owntgwayurl@`, method:"get"});
    if(!user)throw "This User Is Not In Vip List"
    body=JSON.parse(body)
    if(!body.sts)throw res.err
    res.json({sts:true,data:user,user:body.data})
  }catch(e){
    if(e instanceof Error||typeof e==="object"||typeof e==="object"||typeof e==="string")e=e.toString()
    else e="Unexpected error Occurred"
    res.json({sts:false,err:e})
  }
})

router.post("/vip/remove",loginCheck,async(req,res)=>{
  try{
    if(!req.body.id&&!req.body.plans)throw "required data not found"
    var data=await db.removeVipAdmin(req.body)
    if(data)throw data.message
    res.redirect("/admin/vip")
  }catch(e){
    if(e instanceof Error||typeof e==="object"||typeof e==="object"||typeof e==="string")e=e.toString()
    else e="Unexpected error Occurred"
    res.json({sts:false,err:e})
  }
})

module.exports = router