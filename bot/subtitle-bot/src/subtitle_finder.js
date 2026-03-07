const opensub = require("opensubtitles-client"),
settings = require("./settings")



let List = [],
looperSts = true

function  opensubtitles(query) {
  return new Promise(async(resolve)=>{
    try{
    console.log(query);
    var lang;
    if(query.lang=="all")lang="all"
    else lang=settings.isAvailbleLang(query.lang)["2"]
    let token=await opensub.api.login()
    opensub.api.search(token,lang,{
      query:query.title||query.imdbid
    }).then(res=>{
      if(Object.keys(res).length){
        //console.log(res.slice(0,10));
        var sub=[]
        for(let i in res){
          sub.push({
            title:res[i].SubFileName,
            url:res[i].SubDownloadLink,
            year:Number(res[i].MovieYear),
            lang:res[i].LanguageName,
            season:Number(res[i].SeriesSeason),
            episode:Number(res[i].SeriesEpisode),
            imdbid:Number(res[i].SeriesIMDBParent)||Number(res[i].IDMovieImdb)||null,
            index:i
          })
        }
        //sub=sub.sort((a,b)=>a.title.localeCompare(b.title))
        opensub.api.logout(token)
        resolve({sub:sub,err:false})
      }else{
        resolve({sub:null,err:"no_sub_found"})
      }
    
    }).catch(err=>{console.log(err);resolve({sub:null,err:"api_error"})})
    }catch(e){
      console.log(e);
      resolve({sub:null,err:"Unexpected Error ,Please Try Again"})
    }
  })
  }

module.exports = async(id, cb,query)=> {
  List.push({id:id,query:query})
  if(looperSts)looper()
  async function looper(){
    if(List.length){
      looperSts = false
      let userData,
      sel=List.splice(0,1)[0];
      if(sel.query)userData=sel.query
      else userData=await settings.getUser(sel.id)
      if(userData){
        let {err,sub}=await opensubtitles(userData)
        if(err)cb(err)
        else cb(null,sub)
        looper()
      }else looper()
    }else{
      looperSts=true
    }
  }
  
}
module.exports.os=opensubtitles