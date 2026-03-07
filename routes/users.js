var express = require('express');
var router = express.Router();
const fs=require("fs"),
url=require("url"),
hbs=require("handlebars"),
razorpay=require("razorpay"),
raz_key="rzp_live_Z9eCiW07AEo0or",
raz_secret="nAd12A341D2SHorWTR4YVxFU",
//raz_key=null,raz_secret=null,
rzpay=new razorpay({
  key_id:raz_key||"rzp_test_Y5ObxFJ6kRMNUD",
  key_secret:raz_secret||"biaetYHpWzyu3ELBCaivYnyN"
}),
db=require("../helper/db"),
request=require("request"),
handleHelp=require("../helper/hbs_helper")
console.log(process.env.HEROKU_URL);
let org=process.env.HEROKU_URL.split("//")[1].split(".")[0]
org=(org==="tgway"?true:false)
async function rq(data){
  return new Promise((resolve,reject)=>{
    request(data,(err,res,body)=>{
      resolve({err,res,body})
    })
  })
}

hbs.registerHelper(handleHelp)

/* GET home page. */
router.get('/', function(req, res, next) {
  try{
  var u=url.parse(Object.keys(req.query)[0]||"")
  if(u.protocol&&(u.host||u.hostname)){
    res.render('m_s/index', {
      title: 'Link genarating Page',
      org
    });
  }else{
    res.render("main",{title:"Tg Way Home",headerChange:true,footerChange:true,org})
  }
  }catch(e){
    console.log(e);
    res.end("An Error Occurred ,Try Again Later")
  }
});
router.get("/pageChanger", (req, res) => {
  res.render("m_s/main", {
    title: "Redirecting home",
    data: req.query.data,
    footerChange:true,
    org
  })
})
router.get("/fileStream", (req, res)=> {
  var link = req.query.link
  var splited = link.split("/")
  splited = splited.splice(splited.length-3, splited-1)
  console.log(splited)
})

router.get("/plans",async(req,res)=>{
  try{
    let plans=await db.getPlans()
    var vip=await db.get("vip",{user:req.query.id})
    console.log(vip);
    res.render("plans/index",{plans,id:req.query.id||null,title:"Plan Purchasing Page",vip:vip[0],footerChange:true,org})
  }catch(e){
    console.log(e);
    res.send("Unexpected Error Occurred , Please Try Again")
  }
})
router.post("/html",async(req,res)=>{
  if(req.body.path){
    var path=`${process.cwd()}/public${req.body.path}.html`
    if(fs.existsSync(path)){
      
      var html=await fs.readFileSync(path).toString('utf8')
      var result
      if(!req.body.no_compile){
        var temp=hbs.compile(html)
        result=temp(req.body).toString('utf8')
      }
      res.send(result||html)
    }else{
      console.log('path not exist');
      res.end("The File Is Not Found")
    }
  }else{
    console.log('data not foumd');
    res.end("required data not found")
  }
})

router.get("/getPlan",async(req,res)=>{
  var plans=await db.getPlans()
  if(req.query.plan){
    var i=plans.findIndex(x=>x.plan==req.query.plan)
    if(i!==-1){
      res.json({sts:true,plan:plans[i]})
    }else res.json({sts:false,msg:"No Plan Found"})
  }else{
    res.json({sts:true,plans})
  }
})

router.get("/createOrder",(req,res)=>{
  let {currency,amount,id,plan}=req.query
  if(currency&&amount&&id&&plan){
    rzpay.orders.create({
      amount,
      currency,
      notes:{
        id,
        plan
      }
    }).then(r=>{
      req.session.order=r
      req.session.order.userId=id
      res.json({sts:true,order:r})
    }).catch(e=>{
      console.log(e);
      res.json({sts:false,msg:"Unexpected error occurred ,Please Try Again"})
    })
  }else res.json({sts:false,msg:"required data not found\nPlease Refresh The Page"})
})

router.get("/checkPayment",(req,res)=>{
  if(req.query.payment_id){
    rzpay.payments.fetch(req.query.payment_id).then(sts=>{
      console.log(sts);
      res.json({sts: true,data:sts})
    }).catch(e=>{
      console.log(e);
      res.json({sts: false,msg:"Unexpected Error Occurred while Getting info on server\n\n"+e.error.description})
    })
  }else{
    res.json({sts:false,msg:"required dara not found"})
  }
})

router.get("/paymentStatus",(req,res)=>{
  if(req.query.payment_id){
    res.render("plans/paymentStatus",{title:"Payment Error Page",payment_id:req.query.payment_id,org})
  }else{
    res.render("plans/paymentStatus",{title:"Payment Status Page  ",org
    })
  }
})

router.get("/saveAsPdf",(req,res)=>{
  if(req.query.payment_id){
    rzpay.payments.fetch(req.query.payment_id).then(async payment=>{
      console.log(payment);
      var text=
      `
      payment_id  : ${payment.id}
      order_id    : ${payment.order_id}
      amount      : ${payment.amount/100}
      currency    : ${payment.currency}
      user_id     : ${payment.notes.id}
      plan        : ${payment.notes.plan}
      `
      res.setHeader('Content-disposition', 'attachment; filename=payment_details.txt');
      res.setHeader('Content-type', "text/plain");
      res.end(text)
    }).then(err=>{
      console.log(err);
    })
  }else res.end()
})

router.get("/addNewVip",async(req,res)=>{
  try{
    if(req.query.payment_id){
      var data=await rzpay.payments.fetch(req.query.payment_id)
      var r=await db.addNewVip(data)
      if(r instanceof Error) throw r
      res.redirect("/logs?id="+r.user)
    }else throw "Required Data Not Found"
  }catch(e){
    (typeof e =="object"||typeof e =="array")?e=JSON.stringify(e): null
    res.end(e)
  }
})

router.get("/logs",async(req,res)=>{
  try{
  let id=req.query.id
  if(id){
    var vip=await db.get("vip",{user:String(id)},true),
    usage=await db.get("usage",{user:Number(id)},true)
    if(vip&&vip.addon)var plan=await db.get("plans",{plan:vip.addon_plan},true)
    let logs=[]
    console.log(vip,usage,plan,"this is from top of logs");
    if(!vip||!vip.normal){
      var used
      usage?used=usage.used:used=0
      var log={
        plan:"Free Plan",
        totel:20,
        used,
        valid:"Infinity ♾️",
        usage_p:(used/20)*100
      }
      
      logs.push(log)
    }
    if(vip){
      if(vip.normal){
        var used=(usage)?usage.used:0
        console.log(vip);
        var log={
          plan:vip.normal_plan,
          totel:vip.normal_limit,
          used,
          valid:parseInt(((vip.normal_valid-(Date.now()-Number(vip.normal_date)))/86400000)),
          usage_p:(used/vip.normal_limit)*100
        }
        logs.push(log)
      }
      if(vip.addon){
        var used=plan.limit-vip.addon_limit
        var log={
          plan:vip.addon_plan,
          totel:plan.limit,
          used,
          valid:parseInt(((vip.addon_valid-(Date.now()-Number(vip.addon_date)))/86400000)),
          usage_p:used/plan.limit*100,
          addon:true
        }
        logs.push(log)
      }
    }
    console.log(logs);
    res.render("plans/logs",{logs,title:"User Translation Logs Page",org})
  }else throw "Required Data Not Found Please Check The Url"
  }catch(e){
    console.log(e,"this from error");
    if(typeof e==="object"&&typeof e==="array")e=JSON.parse(e);
    res.end(e)
  }
})

router.get("/reset_translation",async(req,res)=>{
  if(req.query.p!=="afsalcp@")return res.status(200).end("error")
  var sts=await db.reset_translation()
  res.status(200).end(String(sts))
})

router.post("/contactUs",async(req,res)=>{
  var data=req.body
  if(data.username&&data.email&&data.msg&&data.type){
    var msg=`Hi Afsal \n\nYou Have New Message ${(data.type.includes("About")?"":"About ")}<b>${data.type}</b> \n\n<u>Message Details</u>\nFrom : ${data.username}\nEmail : <code>${data.email}</code>\nTime : ${String(Date())}\n\n<b><code>${data.msg}</code></b>`
    var opt={
      f:"sendMessage",
      p1:"1504314507",
      p2:msg,
      p3:{parse_mode:"html"}
    }
    var d={
      url:process.env.HEROKU_URL+"/api/translate/bot",
      method:"post",
      json: opt
    }
    var r=await rq(d)
    console.log(r.err,d.url);
    if(r.err)return res.status(200).json({sts:false})
    console.log(data.res);
    return res.status(200).json({sts:true})
  }else{
    res.status(200).json({sts:false})
  }
})

router.get("/policy",(req,res)=>{
  res.render("policy/main",{title:"TGWAY Policies And Terms Of Use",type:req.query.t,policy:true,org})
})


module.exports = router;