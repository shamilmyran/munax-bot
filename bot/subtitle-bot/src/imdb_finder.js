
const request=require("request")

module.exports=(key,page,cb)=>{
  var isId=key.split("").splice(0,2).join("")
  key=encodeURIComponent(key)
  let base_url="http://www.omdbapi.com/?apikey=b9de5884",
  url;
  if(isId==="tt"){
    url=`${base_url}&i=${key}`
  }else url=`${base_url}&s=${key}&page=${page}`
  request(url,(err,res,body)=>{
    if(err||JSON.parse(body).Response!="True")cb("err")
    else{
      let list=JSON.parse(body).Search||JSON.parse(body);
      if(isId=="tt") list=[list]
      cb(null,list)
    }
  })
}