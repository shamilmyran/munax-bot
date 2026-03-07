
let SUBS

;(async()=>{
  tg_load()
  tg_alert("Gathering informations")
  let {data,subs,sts}=await $.ajax({url:"/subtitle/os/getData",data:{lang:LANG,query:QUERY,ind:INDEX},type:"get",dataType:"json"})
  
  SUBS=subs
  
  tg_load(true)
  if(!sts)return stop_webapp()
  if(!subs.length)return stop_webapp("We can't find subtitles for this "+data.media_type+" show")
  tg_part_load("Loading subtitle files","#subDlSec")
  tg_part_load("Getting informations","#subDataSec")
  tg_part_load("Loading overview","#subOverViewSec")
  
  $("#subDlSec").html(await get_page_part({path:"/html/subtitle/download",subs}))
  
  REQ_LIM.addOne()
  REQ_LIM.addOne()
  REQ_LIM.addOne()
  
  $("#subDataSec").html(await get_page_part({path:"/html/subtitle/sub_data",backdrop:data.backdrop_path,poster:data.poster_path,title:data.title||data.name,release:data.first_air_date||data.release_date,genre:data.genre_names.join(", "),rating:Math.round(data.vote_average *10),type:data.media_type,lang:(data.lang&&data.lang.name)||data.original_language}))
  
  $("#subOverViewSec").html(await get_page_part({path:"/html/subtitle/overview",overview:data.overview||"No overview found"}))
})()


async function stop_webapp(reason="Something went wrong <br><b>We can't process your request now. so we are closing this window</b>"){
  await tg_prompt(reason,null,"Okey")
  TG.close()
}
