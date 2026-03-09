const {MongoClient}=require("mongodb")

let db,dbname="TGWAY"
let connected=false

var url=process.env.MONGODB_URL || "mongodb+srv://munaxx1000_db_user:j6OdootNqbrmtvOV@cluster0.qevlvpg.mongodb.net/TGWAY?retryWrites=true&w=majority"

let client=new MongoClient(url,{ useNewUrlParser: true, useUnifiedTopology: true })

module.exports.connect=async()=>{
  try {
    await client.connect()
    return client.db(dbname)
  } catch (e) {
    console.log(e);
    return false
  }
}

const sleep=async(t)=>{
  return new Promise((res)=>{
    setTimeout(function() {
      res()
    },t);
  })
}

module.exports.get=()=>{
    return client.db(dbname)
}
