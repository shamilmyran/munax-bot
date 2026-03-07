
var ytdl=require("ytdl-core")
var request=require("request")


module.exports=(link,cb)=>{
    ytdl.getInfo(link).then((vidDit=>{
      if(vidDit.player_response&&vidDit.player_response.captions&&vidDit.player_response.captions.playerCaptionsTracklistRenderer){
        cb(null,vidDit.player_response.captions.playerCaptionsTracklistRenderer.captionTracks,vidDit.videoDetails)
      }else{
        cb("*No Subtitle Finded For *\`"+link+"\`")
      }
    })).catch((err)=>{
      cb("A Error Accured When Getting Info On Server\n\n*Please Check The Link And Try Again*")
    })
}