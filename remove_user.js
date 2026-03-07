const db=require("./database"),
fs=require("fs")

db.connect().then(async()=>{
  console.log("connected");
  let user=fs.readFileSync("remove_user.txt").toString().split("\n").map(x=>Number(x))
  //console.log(await db.get().collection("user_datas").find({"bots.0":{$exists:false}}).toArray());
  await db.get().collection("user_datas").updateMany({user:{$in:user}},{$pull:{"bots":{$in:["subtitle","instagram","translate"]}}})
  await db.get().collection("user_datas").deleteMany({"bots.0":{$exists:false}})
  console.log("compleated");
})
