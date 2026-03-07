const fs=require("fs"),
randomText=()=>{
  var texts=[
    `This subtitle was translated by @subtitle_translate_bot , Use this telegram bot to translate your subtitles`,
    `Use our telegram bot @subtitle_translate_bot to translate subtitles into your native language`,
    `Use our telegram bot @subtitle_translate_bot to translate your subtitles in just 10 seconds`,
    
    `The best subtitle translator. Use our Telegram bot to translate the subtitle . botname : @subtitle_translate_bot`
    ]
    
    var selText=Math.floor(Math.random()*texts.length)
    return "[{( "+texts[selText]+" )}]"||"[{( "+texts[3]+" )}]"
}
const getChance=(encode)=>{
  chance=[]
  for(var i in encode){
    i=parseInt(i)
    if(encode[i].code&&encode[i+1]){
      var time=encode[i].code.split("-->")[1],
      strTime=time.split(/,|:/)
    
      strTime=(parseInt(strTime[0])*3600)+(parseInt(strTime[1])*60)+(parseInt(strTime[2]))+(parseFloat("0."+strTime[3]))
      time=encode[i+1].code.split("-->")[0]
      var endTime=time.split(/,|:/)
      endTime=(parseInt(endTime[0])*3600)+(parseInt(endTime[1])*60)+(parseInt(endTime[2]))+(parseFloat("0."+endTime[3]))
      var diff= endTime- strTime
      
      if(!isNaN(strTime)&&!isNaN(endTime)&&!isNaN(diff)&&diff>15){
        chance.push({index:i,diff,time:strTime})
      }
    }
  }
  return chance
},
selectChances=(chance)=>{
  if (chance.length > 5) {
      var slected = []
      slected.push(chance[0])
      slected.push(chance[parseInt((chance.length/2)/2)])
      slected.push(chance[parseInt(chance.length/2)])
      slected.push(chance[parseInt((chance.length/2)+(chance.length/2)/2)])
      slected.push(chance[chance.length-1])
      return slected
    } else return chance
},
advertise=async(filepath,chance,cb)=>{
  var encode=JSON.parse(await fs.readFileSync(filepath).toString());
  for (var i in chance) {
      var totalTime=chance[i].time,
      startTime,
      endTime,
      timediff;
      if (chance[i].diff < 20) {
        timediff = 2
      } else {
        timediff = (chance[i].diff-15)/2
      }
      startTime = totalTime+timediff
      hour = parseInt((startTime/60)/60)
      startTime = startTime - (hour*3600)
      minute = parseInt(startTime/60)
      startTime = startTime - (minute*60)
      sec = parseInt(startTime)
      startTime = startTime - sec
      milli =(String(startTime).split(".")[1])||"000"
      startTime = String(hour)+":"+String(minute)+":"+String(sec)+":"+String(milli)
      endTime = (totalTime+(chance[i].diff- timediff))
      hour = parseInt((endTime/60)/60)
      endTime = endTime - (hour*3600)
      minute = parseInt(endTime/60)
      endTime = endTime - (minute*60)
      sec = parseInt(endTime)
      endTime = endTime - sec
      milli =(String(endTime).split(".")[1])||"000"
      endTime = String(hour)+":"+String(minute)+":"+String(sec)+":"+String(milli)
      startTime=startTime.split(":")
      endTime=endTime.split(":")
      for(var j in startTime){
        startTime[j]="0"+startTime[j]
        endTime[j]="0"+endTime[j]
      }
      hour=startTime[0].split("").splice(startTime[0].length-2,startTime[0].length).join("")
      minute=startTime[1].split("").splice(startTime[1].length-2,startTime[1].length).join("")
      sec=startTime[2].split("").splice(startTime[2].length-2,startTime[2].length).join("")
      milli=startTime[3].split("").splice(1,3).join("")
      startTime=hour+":"+minute+":"+sec+","+((milli.length<3)?"000":milli)
      
      hour=endTime[0].split("").splice(endTime[0].length-2,endTime[0].length).join("")
      minute=endTime[1].split("").splice(endTime[1].length-2,endTime[1].length).join("")
      sec=endTime[2].split("").splice(endTime[2].length-2,endTime[2].length).join("")
      milli=endTime[3].split("").splice(1,3).join("")
      endTime=hour+":"+minute+":"+sec+","+((milli.length<3)?"000":milli)
      
    
      var ad = {No:chance[i].index+1,code:startTime+" --> "+endTime,text:randomText()}
      encode.splice((chance[i].index+(parseInt(i)+1)), 0, ad)
    }
    await fs.writeFileSync(filepath,JSON.stringify(encode))
    return
},
correctNum=async(filepath)=>{
  let encode=JSON.parse(await fs.readFileSync(filepath).toString())
    for(var i in encode){
      encode[i].No=parseInt(i)+1
    }
    await fs.writeFileSync(filepath,JSON.stringify(encode))
    return
}

module.exports=async(filepath)=>{
  try{
  let encode=JSON.parse(await fs.readFileSync(filepath).toString("utf8"));
  let chances=getChance(encode)
  let selectedChances=selectChances(chances)
  //console.log(chances,selectedChances)
  await advertise(filepath,selectedChances)
  await correctNum(filepath)
  encode=JSON.parse(await fs.readFileSync(filepath).toString("utf8"));
  return encode
  }catch(err){
    console.log(err,"__error_catch_block__")
    return null
  }
}