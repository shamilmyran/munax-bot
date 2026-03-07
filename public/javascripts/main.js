var toast =async (msg, type)=> {
  $(".main-toast-back").remove()
  var time = 0.07*msg.length*1000
  let created=Date.now()
  if (time < 800)time = 800
  var text,
  border;
  if (type === "standard") {
    text = "standard-text"
    border = "standard-border"
  } else if (type === "success") {
    text = "success-text"
    border = "success-border"
  } else if (type === "error") {
    text = "error-text"
    border = "error-border"
  } else {
    text = "standard-text"
    border = "standard-border"
  }
  msg=msg.replace(/\n/g,"<br/>")
  var html = `
  <div class="main-toast-back${created}">
  <div class="toast-back ${border}">
  <label class="${text} toast-label">${msg}</label>
  </div>
  </div>
  `
  $("body").append(html)
  $(".main-toast-back"+created).css({position:"fixed",top:"50%",left:"50%",width:"90%",padding:"50px",transform:"translate(-50%,-50%)",display:"flex","justify-content":"center"})
  await sleep(time)
  $(".main-toast-back"+created).fadeOut(800)
  await sleep(800)
  return
},
sleep=(time)=>{
  return new Promise((resolve)=>{
    setTimeout(()=>{
      resolve(time)
    },time||1000)
  })
},
loading=(e,type)=>{
  var h=`<div class="loadingPart" >
  <i class="fa fa-cog fa-spin" style="font-size:40px"></i>
</div>`
  if(type){
    $("body").css("pointer-events","auto")
    $(".loadingPart").remove()
  }else{
    if(e==="body"){
      h+=`
      <script type="text/javascript">
        $(".loadingPart").css({top:"0",left:0,bottom:0,right:0})
      </script>
      `
    }
    $("b").css("pointer-events","none")
    $(e).append(h)
  }
},
isUpper=(str)=>{
  if(str===str.toUpperCase())return true
  return false
}
let windowX,windowY,windowC=false,
windowCalc=(x,y)=>{
  if(x&&y&&x<15&&y>100&&!windowC&&!$("#dropDownSection").is(":visible")&&!$(".loadingPart").is(":visible")){
    loading('body')
    $.ajax({
      url:'/html',
      type:"post",
      dataType:'text',
      data:{
        path:'/html/dropDown'
      },
      success:(html)=>{
        $('body').append(html)
      }
    })
  }else windowC=false
}
let lastHighSwip=0
/*window.addEventListener("touchstart",(e)=>{
  alert(e.touches.length)
  windowX=e.touches[0].clientX
  return
},false)*/
$(window).on("touchstart",(e)=>{
  if(windowX)return windowC=true
  windowX=e.touches[0].clientX
  return
})
window.addEventListener("touchend",(e)=>{
  windowY=e.changedTouches[0].pageX
  windowCalc(windowX,windowY)
  windowX=null,windowY=null,lastHighSwip=0
  return
},true)
window.addEventListener("touchmove",(e)=>{
  if(windowX<15){
  if(lastHighSwip>e.touches[0].clientX){
    windowC=true
  }else lastHighSwip=e.touches[0].clientX
  return
  }else return
},{passive: false})

window.addEventListener("touchcancel",(e)=>{
  windowX=null,windowY=null,lastHighSwip=0
  return
})

if (window.safari) {
  history.pushState(null, null, location.href);
  window.onpopstate = function(event) {
      history.go(1);
  };
}
loading("body")
$(window).ready(()=>{
  loading("body",true)
  if(!window.localStorage.getItem("session")){
    window.localStorage.setItem("session","true")
    $.ajax({
     url:"/html",
     type:"post",
     dataType:"text",
     data:{
        path:"/html/dropDownInfo"
      },
      success:(html)=>{
        $("body").append(html)
      }
    })
  }
})