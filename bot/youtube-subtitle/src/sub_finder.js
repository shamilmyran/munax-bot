
var ytdl=require("ytdl-core")
var request=require("request")


module.exports=async(link,cb)=>{
  try{
    let vidDit=await ytdl.getInfo(link)
    if(!vidDit.player_response||!vidDit.player_response.captions||!vidDit.player_response.captions.playerCaptionsTracklistRenderer)return [`No subtitle found for your link : <code>${link}</code>`]
    //console.log(vidDit.player_response.captions);
    return [null,vidDit.player_response.captions.playerCaptionsTracklistRenderer,vidDit.videoDetails]
  }catch(e){
    console.log(e);
    return ["A Error Accured When Getting Info On Server\n\n<b>Please Check The Link And Try Again</b>"]
  }
}