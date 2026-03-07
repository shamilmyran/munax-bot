
async function checkLang(){
  if(DEF_TR_LANG){
    localStorage.setItem("lang",DEF_TR_LANG)
    return start_process()
  }
  let lang=window.localStorage.getItem("lang")
  
  if(!lang){
    tg_load()
    REQ_LIM.addOne()
    $("body").append(await get_page_part({path:"/html/translate/sel_lang",no_compile:true}))
    tg_load(true)
  }else{
    let rs=await tg_prompt(`We detect that last time you selected your language as <b>${window.localStorage.getItem("lang_name")}</b>. <br> <u>Do you want to proceed with this language?</u>`)
    
    if(rs)return start_process()
    
    window.localStorage.setItem("lang","")
    checkLang()
  }
}

let expires=new Date()
expires.setTime(expires.getTime()-(60*60*24*1000))
document.cookie=`googtrans=; Path=/; Expires=${expires.toUTCString()}`

tg_load()
REQ_LIM.addOne()
get_page_part({path:"/html/translate/translator",no_compile:true}).then(html=>{
  $("body").append(html)
})

REQ_LIM.addOne()
const TRANSIO=io({path:"/translate/batch/socket"})


async function start_process(){
  tg_load()
  
  REQ_LIM.addOne()
  $("body").append(await get_page_part({path:"/html/translate/batch_main",no_compile:true}))
  await TRANSIO.emit("join",{user:USER.id})
}

const getSameFiles=(files)=>{
  let plainFiles=files.reduce((t,{title,season, episode,year})=>{
    t.push(`${title} ${season?"s"+Number(season):""} ${episode?"e"+Number(episode):""} ${year?year:""}`)
    return t
  },[])
  
  let rp=false
  files=plainFiles.map((x,i)=>{
    if(plainFiles.indexOf(x)!==i){
      rp=true
      return {...files[i],repeat:plainFiles.indexOf(x),plain_q:x}
    }
    return {...files[i],plain_q:x}
  })
  return [files,rp]
}

let TRANS_REQ=[]

TRANSIO.on("tr_req",async data=>{
  tg_load(true)
  
  let [sameFiles,repeated]=getSameFiles(data.map(x=>x.query_guss))
  
  if(repeated){
    for(var fli in sameFiles){
      let fl=sameFiles[fli]
      if(fl.repeat===undefined||fl.removeble!==undefined)continue
      
      let rs=await tg_prompt(`We found that you are trying to translate files that are similar to each other with their filename.<br><b>Similar files : </b><br>•   ${sameFiles.reduce((t,c,i)=>{if(c.plain_q===fl.plain_q){t.push(data[i].filename.replace(/\.|_|-/g," "));return t};return t},[]).join("<br>•   ")}<br><b>Can i delete the copy files from the translation list</b>`,"Yes","No")
      if(rs){
        sameFiles=sameFiles.map((x,i)=>{
          if(x.plain_q===fl.plain_q&&i!=fli){
            x.removeble=true
          }
          return x
        })
      }else {
        sameFiles=sameFiles.map((x,i)=>{
          if(x.plain_q===fl.plain_q&&i!=fli){
            x.removeble=false
          }
          return x
        })
      }
    }
    data=sameFiles.reduce((t,c,i)=>{
      if(!c.removeble){
        t.push(data[i])
      }
      return t
    },[])
    sameFiles=sameFiles.filter(x=>!x.removeble)
  }
  
  TRANS_REQ=data
  
  let html=""
  for(var req of data){
    html+=`
    <div class="col-12 col-5" fileid="${req.id}">
      <div class="tr_prog">
        <div></div>
      </div>
      <div>
        <div>
          <svg style="width:50px;height:50px;background:var(--tg_btn_color);border-radius:50%">
            <circle cx="25" cy="25" r="20">Progress</circle>
          </svg>
          <i class="fa-solid fa-xmark" style="color:var(--tg_btn_txt);position:absolute;font-size:24px"></i>
        </div>
        <div>
          <span>${req.query_guss.title}</span>
          <div>
            <span><b>S</b> ${req.query_guss.season||"<i class=\"fa-solid fa-circle-xmark\"></i>"}</span>
            <span><b>E</b> ${req.query_guss.episode||"<i class=\"fa-solid fa-circle-xmark\"></i>"}</span>
            <span><b>YEAR</b> ${req.query_guss.year||"<i class=\"fa-solid fa-circle-xmark\"></i>"}</span>
          </div>
          <div>
            <span class="tr_sts">Downloading...</span>
            <span class="tr_prog_text">0%</span>
          </div>
        </div>
      </div>
    </div>
    `
  }
  
  $("#batchTransSec").html(html)
  
  for(var fl of data)start_tr_process(fl.id)
})



TRANSIO.on("stop",async msg=>{
  
  tg_load(true)
  await tg_prompt(msg+"<br><strong>Sorry we are stopping your request</strong>.",null,"Okey")
  TG.close()
})

TRANSIO.on("alert",tg_alert)

TRANSIO.on("sub_error",id=>{
  let [{filename}]=TRANS_REQ.filter(x=>x.id===id)
  TRANS_REQ=TRANS_REQ.filter(x=>x.id!==id)
  tg_prompt("File converting error occurred in "+filename+"<br><b>We are deleting this file from translation list</b>",null,"Okey")
  $(`div[fileid=${id}]`).remove()
})

let TRANSED_COUNT=0


const SUB_SUCCESS=id=>{
  TRANSED_COUNT++
  try{
  $(`div[fileid=${id}] svg`).remove()
  $(`div[fileid=${id}] .fa-xmark`).attr("class","fa-solid fa-circle-check tr_success_icon")
  $(`div[fileid=${id}] .tr_prog`).addClass("tr_prog_cmp")
  $(`div[fileid=${id}] .tr_prog>div`).remove()
  $(`div[fileid=${id}] .tr_sts`).text("Completed...")
  
  if(SUB_SENT_AUD_CANPLAY){
    SUB_SENT_AUD.currentTime=0
    SUB_SENT_AUD.play()
  }
  }catch(e){}
  
  if(TRANSED_COUNT!==TRANS_REQ.length)return
  
  TRANSIO.emit("completed",Number(USER.id))
  tg_prompt("All off your translation requests has been compleated. So we are closing this window<br><b>Please share your opinion about this new batch translation feature after using subs</b>","Okey",null).then(r=>{
    TG.close()
  })
  
}

TRANSIO.on("sub_success",SUB_SUCCESS)

async function UPLOAD_FILE(id){
  
  if(REQ_LIM.reqs>15){
    await sleep(REQ_LIM.wait()+1000)
    UPLOAD_FILE(id)
    return
  }
  REQ_LIM.addOne()
  
  if(!TRANSED_TEXT[id]){
    $("div[fileid="+id+"]").css({background:"#ed5b0f70"})
    return tg_alert("Something went wrong while trying to upload this file")
  }
  
  let [{filename}]=TRANS_REQ.filter(x=>x.id===id),
  text=""
  
  for(var i in Object.keys(TRANSED_TEXT[id])){
    text+=TRANSED_TEXT[id][i]+"\n"
  }
  
  let order=Number($(`#batchTransSec>div[fileid=${id}]`).attr("order"))
  $(`#batchTransSec>div[fileid=${id}]`).removeAttr("translate")
  let qlty=Number($(`#batchTransSec>div[fileid=${id}]`).attr("qlty"))
  $(`div[fileid=${id}] .tr_prog`).css({background:"var(--tr_prog_red)",width:"0%"})
  $(`div[fileid=${id}] .tr_sts`).text("Uploading ...")
  
  
  $.ajax({
    url:"batch/upload",
    type:"post",
    data:{
      filename,
      text,
      order,
      user:USER.id,
      id,
      lang:window.localStorage.getItem("lang_name"),
      qlty
    },
    xhr:()=>{
      let xhr=new window.XMLHttpRequest()
      
      xhr.upload.addEventListener("progress",evt=>{
        if(!evt.lengthComputable)return
        
        let perc=Math.ceil(evt.loaded/evt.total*100)
        let mPerce=perc/100*25
        let stroke=31.5-(mPerce*126/100)
     
        $(`div[fileid=${id}] .tr_prog_text`).text(perc+"%")
        $(`div[fileid=${id}] .tr_prog`).animate({"width":perc+"%"},200,"linear")
        $(`div[fileid=${id}] circle`).animate({"stroke-dashoffset":stroke},200,"linear")
      },false)
      return xhr
    },

    error:console.log
  })
}

let SUB_SENT_AUD_CANPLAY=false

const SUB_SENT_AUD=document.createElement("audio")
SUB_SENT_AUD.setAttribute("src","/audio/tg_msg_sent.mp3")

SUB_SENT_AUD.addEventListener("canplay",()=>{
  SUB_SENT_AUD_CANPLAY=true
})

