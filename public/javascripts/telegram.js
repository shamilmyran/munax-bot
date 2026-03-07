//Setting Some Constants
window.Telegram.WebApp.ready()

let TG=window.Telegram.WebApp,
THEME=TG.themeParams,
USER=(TG.initDataUnsafe&&TG.initDataUnsafe.user)||{id:1504314507}
CURRENT_ELM=true

if(!TG.isExpanded){
  TG.expand()
}
let WIDTH, HEIGHT=TG.viewportHeight-100


const tg_load=(hide=false)=>{
  if(hide){
    $("#tgLoadPart").remove()
    return
  }
  let html=`<section id="tgLoadPart">
      <div >
        <svg>
          <circle cx="50" cy="50" r="35"></circle>
        </svg>
      </div>
    </section>`
  $("body").append(html)
}
// set telegram themes
const reloadTheme=(theme)=>{
  THEME=window.Telegram.WebApp.themeParams
  $(":root").css({
    "--tg_btn_color":THEME.button_color||"#4a6ecb",
    "--tg_btn_shade":(THEME.button_color&&THEME.button_color+"55")||"#4a6ecb55",
    "--tg_btn_txt":THEME.button_text_color||"white"
  })
  if(theme==="dark"){
    $(":root").css({
      "--load_back":"#242326",
      "--tg_load":"#5a5a5b",
      "--tg_bg":THEME.bg_color||"#181819",
      "--tg_bg_shade":(THEME.bg_color||"#181819")+"99",
      "--tg_shade":"#bcbebf36",
      "--tg_text":THEME.text_color||"white",
      "--tg_bg_img":"url('/images/telegram/dark_back.png')",
      "--tg_shade_neg":"#00000032",
      "--tg_grey":"#b5b7bce1"
    })
    //alert(THEME.bg_color)
  }else{
    $(":root").css({
      "--load_back":"white",
      "--tg_load":"#2DA6F9",
      "--tg_bg":(THEME.bg_color||"#C9DBF2"),
      "--tg_bg_shade":(THEME.bg_color||"#ffffff")+"dd",
      "--tg_shade":"#00000032",
      "--tg_text":THEME.text_color||"black",
      "--tg_bg_img":"url('/images/telegram/light_back.png')",
      "--tg_shade_neg":"#bcbebf36",
      "--tg_grey":"#36383bda"
    })
  }
}

const sleep=(time)=>{
  return new Promise((res)=>{
    setTimeout(function() {res()}, time);
  })
}

reloadTheme("dark"||TG.colorScheme)

window.Telegram.WebApp.onEvent("themeChanged",()=>{
  reloadTheme(window.Telegram.WebApp.colorScheme)
})

//setTimeout(function() {reloadTheme("light")}, 4000);

$(window).ready(()=>{
  window.Telegram.WebApp.expand()
  WIDTH=$(window).width()
  WIDTH=HEIGHT*0.706955530216647
  let mtop=50
  if(WIDTH>$(window).width()){
    WIDTH=$(window).width()
    HEIGHT=WIDTH*1.414516129032258
    mtop=($(window).height() - HEIGHT)/2
  }
  $(":root").css({"--tg_width":WIDTH+"px","--tg_height":HEIGHT+"px","--tg_editor_top":mtop+"px"})
})
window.Telegram.WebApp.onEvent("viewportChanged",e=>{
  WIDTH=$(window).width()
  WIDTH=HEIGHT*0.706955530216647
  let mtop=50
  if(WIDTH>$(window).width()){
    WIDTH=$(window).width()
    HEIGHT=WIDTH*1.414516129032258
    mtop=($(window).height() - HEIGHT)/2
  }
  $(":root").css({"--tg_width":WIDTH+"px","--tg_height":HEIGHT+"px","--tg_editor_top":mtop+"px"})
})


const tg_alert=async (text,hap=false)=>{
  let time=0.08*text.length*1000
  time= ((time>800&& time)||800)+800
  let uniqId="alert"+Date.now()
  let html=`
    <section class="tgAlertSec skiptranslate" id="${uniqId}">
      <div class="col-2" style="display:flex; justify-content:center">
        <i class="fa-sharp fa-solid fa-circle-info" style="font-size:22px"></i>
      </div>
      <div class="col-10" style="padding:2px">
        <span style="height:100%" >${text}</span>
      </div>
    </section>
  `
  $("body").append(html)
  if(hap){
    TG.HapticFeedback.impactOccurred(hap)
  }
  await sleep(time)
  $("#"+uniqId).css({"animation":"tgAlertHide .3s 1 linear"})
  await sleep(300)
  $("#"+uniqId).remove()
}

const get_page_part=(data)=>{
  return new Promise(res=>{
    $.ajax({
      url:"/html",
      type:"post",
      dataType:"text",
      data,
      timeout:"30000",
      success:html=>{
        return res(html)
      },
      error:e=>{
        tg_alert("Something went wrong\nPlease try again")
        return res()
      }
    })
  })
}

// show hint when hold click 1 sec on a icon
function refreshEvents(){
    $("i[hint]").off()
    
    let SHOW_HINT
    $("i[hint]").on("touchstart mousedown",(e)=>{
      SHOW_HINT=setTimeout(()=>{
        let hint=$(e.target).attr("hint")
        tg_alert( hint,"soft")
      },1000)
    }).on("touchend mouseup mouseleave",()=>{
      clearTimeout(SHOW_HINT)
    })
}

$(window).resize(()=>{
  HEIGHT=window.Telegram.WebApp.viewportHeight-100
  WIDTH=$(window).width()
  WIDTH=HEIGHT*0.706955530216647
  let mtop=50
  if(WIDTH>$(window).width()){
    WIDTH=$(window).width()
    HEIGHT=WIDTH*1.414516129032258
    mtop=($(window).height() - HEIGHT)/2
  }
  $(":root").css({"--tg_width":WIDTH+"px","--tg_height":HEIGHT+"px","--tg_editor_top":mtop+"px"})
})

// trying to view page in fullscreen
const fullscreen=()=>{
let elem=document.documentElement
if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
  }
}

let ELEMENTS=[]

const STORE = window.localStorage

const element_editor={
  z_ind:STORE.getItem("z_ind")||1,
  add:(elm=CURRENT_ELM.id)=>{
    if(!elm)return tg_alert("Something went wrong\nPlease try again")
    
    let html_to_js={
      tag:"div",
      attr:element_editor.attrs($("#"+elm)),
      css:element_editor.css($("#"+elm)),
      child:[
        {
        tag:"div",
        attr:element_editor.attrs($("#"+elm+">.main_element")),
        css:element_editor.css($("#"+elm+">.main_element")),
        child:element_editor.children($("#"+elm+">.main_element"))
        }
      ]
    }
   element_editor.z_ind++
  },
  children:(id)=>{
    let childs=[]
    id.children().map((i,e)=>{
      let elm={};
      elm.tag=$(e).prop("tagName").toLowerCase()
      elm.css=element_editor.css($(e))
      elm.attr=element_editor.attrs($(e))
      elm.child=element_editor.children($(e))
      childs.push(elm)
      
      return
    })
    return childs
    
  },
  attrs:(e)=>{
    var attrs={}
    $.each(e[0].attributes,(i,a)=>{attrs[a.name]=a.value})
    return attrs
  },
  css:(a)=> {
    var sheets = document.styleSheets, o = {};
    for (var i in sheets) {
      var rules = sheets[i].rules || sheets[i].cssRules;
      for (var r in rules) {
        if (a.is(rules[r].selectorText)) {
          o = $.extend(o, element_editor.css2json(rules[r].style), element_editor.css2json(a.attr('style')));
        }
      }
    }
    return o;
  },
  css2json:(css)=> {
    var s = {};
    if (!css) return s;
    if (css instanceof CSSStyleDeclaration) {
        for (var i in css) {
          if ((css[i]).toLowerCase) {
            s[(css[i]).toLowerCase()] = (css[css[i]]);
          }
        }
    } else if (typeof css == "string") {
      css = css.split("; ");
      for (var i in css) {
        var l = css[i].split(": ");
        s[l[0].toLowerCase()] = (l[1]);
      }
    }
    return s;
  }
}


const tg_prompt=async (text="are you sure want to do this",yes="Yes",no="No")=>{
  
  let id=Date.now()
  let html=`<div id="tg_prompt_${id}" class="skiptranslate tg_prompt_back">
    <div class="col-10 col-md-6">
      <div >
        <span>${text}</span>
      </div>
      <div>
        ${(no===null)?"":`<button data="no">${no}</button>`}
        ${(yes===null)?"":`<button data="yes">${yes}</button>`}
      </div>
    </div>
    </div>`
  $("body").append(html)
  $("#tg_prompt_"+id).hide().fadeIn(200)
  
  let res=await new Promise(r=>{
    $("#tg_prompt_"+id+">div>div:nth-child(2)>button").click(e=>{
      let val=$(e.currentTarget).attr("data")
      return r(val=="yes"?true:false)
    })
  })
  await sleep(200)
  $("#tg_prompt_"+id).fadeOut(200,()=>$("#tg_prompt_"+id).remove())
  
  return res
}

const tg_part_load=(text,inner,id)=>{
  if(id) return $("#tg_part_load_"+id).remove()
  
  id=Date.now()
  let html=`<div id="tg_part_load_${id}" class="tg_part_loading">
    <div></div>
    <div class="fa-solid fa-spinner" style="font-size:26px; animation:rotsvg .8s infinite linear;color:var(--tg_btn_txt)">
    </div>
    ${text?`<span style="margin-top:5px;color:var(--tg_btn_txt)">${text}</span>`:""}
  </div>`
  
  $(inner).append(html)
  
  return id
}

class ReqLimit{
  constructor(){
    this.reqs=1
    this.startTime=Date.now();
    
    setInterval(()=>{
      this.startTime=Date.now()
      this.reqs=0
    },60*1000)
  }
  
  addOne(){
    this.reqs+=1
  }
  wait(){
    return ((60*1000)-(Date.now()-this.startTime))+100
  }
}

const REQ_LIM=new ReqLimit()