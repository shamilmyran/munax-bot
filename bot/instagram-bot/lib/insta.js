// requiring npm modules
const Ig=require("instagram-private-api").IgApiClient
const got=require("got")

//console.log(USERNAME,PASSWORD,adminId);

// requiring local packages 
let {USERNAME,PASSWORD,adminId,bot}=require("./config")
const db=require("../../../helper/db")


// setteping configurations
let ig=new Ig()
let api_calls=0,
api_time=Date.now(),
clname=(process.env.NODE_ENV==="production"?"instagram":"instagram")


async function relogin(user,pass){
  let creds=(await db.get("bots",{bot:clname},true))
  let ind=creds.account
  console.log(creds.creds[ind]);
  try{
    ig=new Ig()
    ig.state.generateDevice("my phone")
    creds=creds.creds
    let auth=await ig.account.login(user,pass)
    let cookieJar = await ig.state.serializeCookieJar()
    let device = (({ deviceString, deviceId, uuid, adid, build }) => ({ deviceString, deviceId, uuid, adid, build }))(ig.state)
    device.cookies=JSON.stringify(cookieJar)
    device.username=user
    device.password=pass
    console.log("successfully relogined in Instagram");
    creds[ind]=device
    await db.update("bots",{bot:clname},{creds})
    return true
  }catch(e){
    console.log(e,user,pass);
    bot.sendMessage(adminId,e.toString())
   // await db.update("bots",{bot:clname},{account:(ind?0:1)})
    return false
  }
}

const rand_acc=(rm)=>{
  let acc=[0,1,2,3].filter(x=>x!==rm)
  console.log(acc,rm);
  return 0
  return acc[Math.floor(Math.random()*3)]
}
const rand_proxy=()=>((Math.floor(Math.random()*2))?process.env.PROXY_URL:false)

async function login(){
  try {
    console.log("login started");
    let data=await db.get("bots",{bot:clname},true)
    let account=rand_acc(data.account)
    console.log("account is ",account);
    await db.update("bots",{bot:clname},{account:account})
    let creds=data.creds
    await ig.state.deserializeCookieJar(creds[account].cookies)
    let savedDevice=creds[account]
    ig.state.deviceString = savedDevice.deviceString
    ig.state.deviceId = savedDevice.deviceId
    ig.state.uuid = savedDevice.uuid
    ig.state.adid = savedDevice.adid
    ig.state.build = savedDevice.build
    await ig.user.getIdByUsername("afsal__shazz_").catch(async e=>{
      bot.sendMessage(adminId,e.toString())
      console.log("login unsuccess , trying to relogin",e);
      await relogin(creds[account].username,creds[account].password)
      return null
    })
    console.log("logined succees");
  } catch (e) {
    bot.sendMessage(adminId,e.toString())
  }
}

/*async function login(){
  try{
    //getting login credentials from database
    let creds=(await db.get("bots",{bot:clname},true))
    let db_sts=creds
    let account=(creds?creds.account:0)
    //console.log(creds.creds[account]);
    creds=((creds&&creds.creds)?creds.creds:{})
    
    // setting username and password for 
    if(process.env.NODE_ENV==="production"||creds[account])[USERNAME,PASSWORD]=[creds[account].username,creds[account].password]
    
    ig.state.generateDevice(USERNAME)
    let somthin=false
    if(creds&&creds[account]&&somthin){
      console.log("stored cookies selected");
      await ig.state.deserializeCookieJar(creds[account].cookies)
      let savedDevice=creds[account]
      ig.state.deviceString = savedDevice.deviceString
      ig.state.deviceId = savedDevice.deviceId
      ig.state.uuid = savedDevice.uuid
      ig.state.adid = savedDevice.adid
      ig.state.build = savedDevice.build
      try{
        await ig.user.getIdByUsername(USERNAME)
        await db.update("bots",{bot:clname},{account:(account?0:1)})
      }catch(e){
        console.log(e);
        await relogin(USERNAME,PASSWORD)
      }
    }else if(somthin){
      try{
      let auth=await ig.account.login(USERNAME,PASSWORD)
      }catch(e){
        bot.sendMessage(adminId,e.toString())
        await db.update("bot",{bot:'insta'},{account:(account?0:1)})
        return login()
      }
      let cookieJar = await ig.state.serializeCookieJar()
      let device = (({ deviceString, deviceId, uuid, adid, build }) => ({ deviceString, deviceId, uuid, adid, build }))(ig.state)
      device.cookies=JSON.stringify(cookieJar)
      device.username=USERNAME
      device.password=PASSWORD
      console.log("successfully logined in Instagram");
      if(!db_sts){
        device.cookies=JSON.stringify(cookieJar)
        device.username=USERNAME
        device.password=PASSWORD
        var db_vals={
          account:(!account?1:0),
          creds:[device],
          bot:clname
        }
        await db.set("bots",db_vals)
        return
      }
      creds.push(device)
      await db.update("bots",{bot:clname},{
        account:(!account?1:0),
        creds
      })
    }else{
      try{
      let auth=await ig.account.login("tgway__","afsalcp1")
      }catch(e){
        bot.sendMessage(adminId,e.toString())
        await db.update("bot",{bot:'insta'},{account:(account?0:1)})
        return login()
      }
      let cookieJar = await ig.state.serializeCookieJar()
      let device = (({ deviceString, deviceId, uuid, adid, build }) => ({ deviceString, deviceId, uuid, adid, build }))(ig.state)
      device.cookies=JSON.stringify(cookieJar)
      device.username=USERNAME
      device.password=PASSWORD
      console.log("successfully logined in Instagram");
      creds.push(device)
      await db.update("bots",{bot:clname},{creds})
    }
  
  }catch(e){
    console.log(e);
    await bot.sendMessage(adminId,e.toString())
    return null
  }
}*/

const started=Date.now()
let diploy=false

module.exports.login=login
module.exports.ig=()=>ig
module.exports.relogin=relogin
module.exports.api=async(n)=>{
  try{
  api_calls+=n
  console.log("api call number",api_calls);
  let tdiff=Date.now()- api_time
  let st_diff=Date.now()- started
  if(api_calls>150||tdiff>45*60*1000){
    await login()
    bot.sendMessage(adminId,"api calls exceeded, account changed successfully")
    api_time=Date.now()
    api_calls=0
    return
  }
  if(st_diff>3.5*60*60*1000&&!diploy){
    diploy=true
    bot.sendMessage(adminId,"deploye resetted")
    await got.get("https://api.render.com/deploy/srv-ccdhcgirrk0f5cdfvvmg?key=K866hK4-UV8")
  }
  return
  }catch(e){
    bot.sendMessage(adminId, "api call error "+e.toString())
  }
}
module.exports.checkpoint=async()=>{
  try{
  console.log(ig.state.checkpoint)
  await ig.challenge.auto(true).catch(e=>console.log(e))
  console.log(ig.state.checkpoint);
  let acc=await db.get("bots",{bot:clname},true)
  relogin(acc.creds[acc.account].username,acc.creds[acc.account].password)
  bot.sendMessage(adminId,"check point resetted")
  }
  catch(e){
    bot.sendMessage(adminId,e.toString())
  }
}

bot.sendMessage(adminId,"diploy success")