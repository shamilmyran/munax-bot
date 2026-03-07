const db=require("./database")
const fs=require("fs")

db.connect().then(async()=>{
  /*if(c)console.log("connected");
  else console.log("not connected");*/
  console.log("connected");
  
  let user=await db.get().collection("user_datas").find({bots:{$in:["subtitle"]}}).toArray()
  console.log(user,user.length);
  let text=user.reduce((t,c)=>{
    t+=(String(c.user)+"\n")
    return t
  },"")
  fs.writeFileSync("./userdata.txt",text)
  //console.log("ended",user. length);
    //await db.get().collection("user_datas").updateMany({bots:2},{$set:{bots:["translate","subtite"]}})
    console.log("end");
})
