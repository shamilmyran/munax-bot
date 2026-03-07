
let MOUSE_CLICK=false,
PREV_X=false,PREV_Y=false,
LT=false,CT=false,RT=false,CL=false,CR=false,LB,CB,RB,
POINT=false

$("#editorSection").on("touchmove mousemove",e=>{
  // checking that is this movement need to be captured
  
  // check that is there any elements are selected for moving 
  if(!CURRENT_ELM||LT||CT||RT||CL||CR||LB||CB||RB)return 
  
  // doing appropriate things for touches and mouse and get x,y cordinate
  let cx,cy
  if(e.touches){
    if(e.touches.length>1)return //double touch not accept
    cx=e.touches[0].clientX
    cy=e.touches[0].clientY
  }else{
    if(!MOUSE_CLICK)return
    cx=e.clientX
    cy=e.clientY
  }
  
  // checking it is first click or not
  if(!PREV_X||!PREV_Y){
    PREV_X=cx
    PREV_Y=cy
    return
  }
  
  POINT=false
  
  let xdiff=cx-PREV_X,
  ydiff=cy-PREV_Y
  
  PREV_Y=cy
  PREV_X=cx
  
  if(CURRENT_ELM.x+xdiff+CURRENT_ELM.w>WIDTH){
    xdiff=WIDTH-(CURRENT_ELM.x+CURRENT_ELM.w)
  }
  if(CURRENT_ELM.y+ydiff+CURRENT_ELM.h>HEIGHT){
    ydiff=HEIGHT-(CURRENT_ELM.y+CURRENT_ELM.h)
  }
  
  CURRENT_ELM.x+=xdiff
  CURRENT_ELM.y+=ydiff
  
  if(CURRENT_ELM.x<0)CURRENT_ELM.x=0
  if(CURRENT_ELM.y<0)CURRENT_ELM.y=0
  
  $("#"+CURRENT_ELM.id).css({"left":CURRENT_ELM.x,"top":CURRENT_ELM.y})
  
}).on("mousedown",()=>{
  MOUSE_CLICK=true
}).on("mouseup touchend",()=>{
  MOUSE_CLICK=false
  PREV_X=false
  PREV_Y=false
})


// element alignment adjesment, define which one was clicked
$(document).on("touchstart mousedown","#LT",(e)=>{
  LT=true
  POINT=1
  PREV_X=(e.touches&&e.touches[0].clientX)||e.clientX
  PREV_Y=(e.touches&&e.touches[0].clientY)||e.clientY
}).on("touchend mouseup",()=>{
  LT=false
  CT=false
  RT=false
  CL=false
  CR=false
  LB=false
  CB=false
  RB=false
}).on("touchstart mousedown","#CT",e=>{
  CT=true
  POINT=2
  PREV_X=(e.touches&&e.touches[0].clientX)||e.clientX
  PREV_Y=(e.touches&&e.touches[0].clientY)||e.clientY
}).on("touchstart mousedown","#RT",e=>{
  RT=true
  POINT=3
  PREV_X=(e.touches&&e.touches[0].clientX)||e.clientX
  PREV_Y=(e.touches&&e.touches[0].clientY)||e.clientY
}).on("touchstart mousedown","#CL",e=>{
  CL=true
  POINT=4
  PREV_X=(e.touches&&e.touches[0].clientX)||e.clientX
  PREV_Y=(e.touches&&e.touches[0].clientY)||e.clientY
}).on("touchstart mousedown","#CR",e=>{
  CR=true
  POINT=5
  PREV_X=(e.touches&&e.touches[0].clientX)||e.clientX
  PREV_Y=(e.touches&&e.touches[0].clientY)||e.clientY
}).on("touchstart mousedown","#LB",e=>{
  LB=true
  POINT=6
  PREV_X=(e.touches&&e.touches[0].clientX)||e.clientX
  PREV_Y=(e.touches&&e.touches[0].clientY)||e.clientY
}).on("touchstart mousedown","#CB",e=>{
  CB=true
  POINT=7
  PREV_X=(e.touches&&e.touches[0].clientX)||e.clientX
  PREV_Y=(e.touches&&e.touches[0].clientY)||e.clientY
}).on("touchstart mousedown","#RB",e=>{
  RB=true
  POINT=8
  PREV_X=(e.touches&&e.touches[0].clientX)||e.clientX
  PREV_Y=(e.touches&&e.touches[0].clientY)||e.clientY
})


// first setting for rounded buttons
// setting top left round button
$("#editorSection").on("mousemove touchmove",e=>{
  // checking is this movement for alignments or not
  if(!CURRENT_ELM||!LT)return

  let cx,cy
  if(e.touches){
    if(e.touches.length>1)return //double touch not accept
    cx=e.touches[0].clientX
    cy=e.touches[0].clientY
  }else{
    cx=e.clientX
    cy=e.clientY
  }
  
  let xdiff=cx-PREV_X,
  ydiff=cy-PREV_Y
  
  PREV_Y=cy
  PREV_X=cx
  
  CURRENT_ELM.w-=xdiff
  CURRENT_ELM.h-=ydiff
  CURRENT_ELM.x+=xdiff
  CURRENT_ELM.y+=ydiff
  
  // if it is lessthen 0 it will set to 0
  if(CURRENT_ELM.y<0){
    CURRENT_ELM.y=0
    CURRENT_ELM.h+=ydiff
  }
  if(CURRENT_ELM.x<0){
    CURRENT_ELM.x=0
    CURRENT_ELM.w+=xdiff
  }
  
  $("#"+CURRENT_ELM.id).css({width:CURRENT_ELM.w, height:CURRENT_ELM.h,left:CURRENT_ELM.x,top:CURRENT_ELM.y})
})
// setting left bottom round button
$("#editorSection").on("mousemove touchmove",e=>{
  // checking is this movement for alignments or not
  if(!CURRENT_ELM||!LB)return
   
  let cx,cy
  if(e.touches){
    if(e.touches.length>1)return //double touch not accept
    cx=e.touches[0].clientX
    cy=e.touches[0].clientY
  }else{
    cx=e.clientX
    cy=e.clientY
  }
  
  let xdiff=cx-PREV_X,
  ydiff=cy-PREV_Y
  
  PREV_Y=cy
  PREV_X=cx
  
  CURRENT_ELM.w-=xdiff
  CURRENT_ELM.h+=ydiff
  CURRENT_ELM.x+=xdiff
  
  // if it is lessthen 0 it will set to 0
  if(CURRENT_ELM.y+CURRENT_ELM.h>HEIGHT){
    CURRENT_ELM.h=HEIGHT - CURRENT_ELM.y
  }
  if(CURRENT_ELM.x<0){
    CURRENT_ELM.x=0
    CURRENT_ELM.w+=xdiff
  }
  
  $("#"+CURRENT_ELM.id).css({width:CURRENT_ELM.w, height:CURRENT_ELM.h,left:CURRENT_ELM.x})
})
// setting function for top right button
$("#editorSection").on("mousemove touchmove",e=>{
  // checking is this movement for alignments or not
  if(!CURRENT_ELM||!RT)return

  let cx,cy
  if(e.touches){
    if(e.touches.length>1)return //double touch not accept
    cx=e.touches[0].clientX
    cy=e.touches[0].clientY
  }else{
    cx=e.clientX
    cy=e.clientY
  }
  
  let xdiff=cx-PREV_X,
  ydiff=cy-PREV_Y
  
  PREV_Y=cy
  PREV_X=cx
  
  CURRENT_ELM.w+=xdiff
  CURRENT_ELM.h-=ydiff
  CURRENT_ELM.y+=ydiff
  
  // if it is lessthen 0 it will set to 0
  if(CURRENT_ELM.y<0){
    CURRENT_ELM.y=0
    CURRENT_ELM.h+=ydiff
  }
  if(CURRENT_ELM.x+CURRENT_ELM.w>WIDTH){
    CURRENT_ELM.w=WIDTH - CURRENT_ELM.x
  }
  
  $("#"+CURRENT_ELM.id).css({width:CURRENT_ELM.w, height:CURRENT_ELM.h,top:CURRENT_ELM.y})
})
// setting function for bottom right button
$("#editorSection").on("mousemove touchmove",e=>{
  // checking is this movement for alignments or not
  if(!CURRENT_ELM||!RB)return

  let cx,cy
  if(e.touches){
    if(e.touches.length>1)return //double touch not accept
    cx=e.touches[0].clientX
    cy=e.touches[0].clientY
  }else{
    cx=e.clientX
    cy=e.clientY
  }
  
  let xdiff=cx-PREV_X,
  ydiff=cy-PREV_Y
  
  PREV_Y=cy
  PREV_X=cx
  
  CURRENT_ELM.w+=xdiff
  CURRENT_ELM.h+=ydiff
  
  // if it is lessthen 0 it will set to 0
  if(CURRENT_ELM.y+CURRENT_ELM.h>HEIGHT){
    CURRENT_ELM.h=HEIGHT - CURRENT_ELM.y
  }
  if(CURRENT_ELM.x+CURRENT_ELM.w>WIDTH){
    CURRENT_ELM.w=WIDTH - CURRENT_ELM.x
  }
  
  $("#"+CURRENT_ELM.id).css({width:CURRENT_ELM.w, height:CURRENT_ELM.h})
})


// setting square button function
// setting top center button
$("#editorSection").on("mousemove touchmove",e=>{
  // checking this movement is for alignments or not
  if(!CURRENT_ELM||!CT)return
  
  let cy
  if(e.touches){
    if(e.touches.length>1)return //double touch not accept
    cy=e.touches[0].clientY
  }else{
    cy=e.clientY
  }
  
  let ydiff=cy-PREV_Y
  
  PREV_Y=cy
  
  CURRENT_ELM.h-=ydiff
  CURRENT_ELM.y+=ydiff
  
  if(CURRENT_ELM.y<0){
    CURRENT_ELM.y=0
    CURRENT_ELM.h+=ydiff
  }
  
  $("#"+CURRENT_ELM.id).css({height:CURRENT_ELM.h,top:CURRENT_ELM.y})
})
// setting center left button
$("#editorSection").on("mousemove touchmove",e=>{
  // checking this movement is for alignments or not
  if(!CURRENT_ELM||!CL)return
  let cx
  if(e.touches){
    if(e.touches.length>1)return //double touch not accept
    cx=e.touches[0].clientX
  }else{
    cx=e.clientX
  }
  let xdiff=cx-PREV_X
  
  PREV_X=cx

  CURRENT_ELM.w-=xdiff
  CURRENT_ELM.x+=xdiff
  
  if(CURRENT_ELM.x<0){
    CURRENT_ELM.x=0
    CURRENT_ELM.w+=xdiff
  }
  
  $("#"+CURRENT_ELM.id).css({width:CURRENT_ELM.w,left:CURRENT_ELM.x})
})
// setting center right button
$("#editorSection").on("mousemove touchmove",e=>{
  // checking this movement is for alignments or not
  if(!CURRENT_ELM||!CR)return
  let cx
  if(e.touches){
    if(e.touches.length>1)return //double touch not accept
    cx=e.touches[0].clientX
  }else{
    cx=e.clientX
  }
  let xdiff=cx-PREV_X
  
  PREV_X=cx
  
  CURRENT_ELM.w+=xdiff
  
  if(CURRENT_ELM.x+CURRENT_ELM.w>WIDTH){
    CURRENT_ELM.w=WIDTH - CURRENT_ELM.x
  }
  
  $("#"+CURRENT_ELM.id).css({width:CURRENT_ELM.w,})
})
// setting center bottom button
$("#editorSection").on("mousemove touchmove",e=>{
  // checking this movement is for alignments or not
  if(!CURRENT_ELM||!CB)return
  let cy
  if(e.touches){
    if(e.touches.length>1)return //double touch not accept
    cy=e.touches[0].clientY
  }else{
    cy=e.clientY
  }
  let ydiff=cy - PREV_Y
  
  PREV_Y=cy
  
  CURRENT_ELM.h+=ydiff
  
  if(CURRENT_ELM.y+CURRENT_ELM.h>HEIGHT){
    CURRENT_ELM.h=HEIGHT - CURRENT_ELM.y
  }
  
  $("#"+CURRENT_ELM.id).css({height:CURRENT_ELM.h})
})

const show_controls=()=>{
  let html=`<div class="control_container">
    <div>
      <div class="btn_active_tg align_btns_round btn_hover" style="bottom:0" id="LT"></div>
      <div class="btn_active_tg align_btns_sqr align_btns_sqr_hor btn_hover" style="transform:translate(-50%);top:0" id="CT"></div>
      <div class="btn_active_tg align_btns_round btn_hover" style="bottom:0; right:0" id="RT"></div>
    </div>
    <div>
      <div style="height:100%;width:8px;" class="align_btns_sqr btn_active_tg btn_hover" id="CL"></div>
      <div style="height:100%;width:8px;position:absolute;right:0" class="align_btns_sqr btn_active_tg btn_hover" id="CR"></div>
    </div>
    <div>
      <div class="btn_active_tg align_btns_round btn_hover" id="LB"></div>
      <div class="btn_active_tg align_btns_sqr align_btns_sqr_hor btn_hover" style="transform:translate(-50%)" id="CB"></div>
      <div class="btn_active_tg align_btns_round btn_hover" style="right:0" id="RB"></div>
    </div>
  </div>`
  $("#"+CURRENT_ELM.id).append(html)
}

// Alignment buttons action
class ALIGN_BTNS{
  constructor(){
    this.intervel=null
    this.period=100
    this.pix=1
  }
  
  // Work when align left button clicked
  align_left(){
    if(POINT){
      let alp
      if([1,4,6].includes(POINT)){
        alp={l:-1,w:1}
      }
      else if([3,5,8].includes(POINT)) alp={w:-1}
      else return tg_alert("This action not work with selected button")
      this.intervel=setInterval(()=>{
        this.align_main(alp)
        this.pix+=.200
      },this.period)
      return
    }
    
    this.intervel= setInterval(()=>{
      this.align_main({l:-1})
      this.pix+=.200
    },this.period)
    this.align_main({l:-1})
    
  }
  align_right(){
    if(POINT){
      let alp
      if([1,4,6].includes(POINT)){
        alp={l:1,w:-1}
      }
      else if([3,5,8].includes(POINT)) alp={w:1}
      else return tg_alert("This action not work with selected button")
      this.intervel=setInterval(()=>{
        this.align_main(alp)
        this.pix+=.200
      },this.period)
      return
    }
    
    this.intervel= setInterval(()=>{
      this.align_main({l:1})
      this.pix+=.200
    },this.period)
    this.align_main({l:1})
    
  }
  align_top(){
    if(POINT){
      let alp
      if([1,2,3].includes(POINT)){
        alp={t:-1,h:1}
      }
      else if([6,7,8].includes(POINT)) alp={h:-1}
      else return tg_alert("This action not work with selected button")
      this.intervel=setInterval(()=>{
        this.align_main(alp)
        this.pix+=.200
      },this.period)
      return
    }
    
    this.intervel= setInterval(()=>{
      this.align_main({t:-1})
      this.pix+=.200
    },this.period)
    this.align_main({t:-1})
    
  }
  align_bottom(){
    if(POINT){
      let alp
      if([1,2,3].includes(POINT)){
        alp={t:1,h:-1}
      }
      else if([6,7,8].includes(POINT)) alp={h:1}
      else return tg_alert("This action not work with selected button")
      this.intervel=setInterval(()=>{
        this.align_main(alp)
        this.pix+=.200
      },this.period)
      return
    }
    
    this.intervel= setInterval(()=>{
      this.align_main({t:1})
      this.pix+=.200
    },this.period)
    this.align_main({t:1})
    
  }
  
  // stop intervel
  stop(){
    clearInterval(this.intervel)
    this.pix=1
  }
  
  // main aligner funtion
  align_main({l,t,w,h}){
    if(l){
      CURRENT_ELM.x+=(l*this.pix)
      if(CURRENT_ELM.x<0)CURRENT_ELM.x=0
      if(CURRENT_ELM.x+CURRENT_ELM.w>WIDTH)CURRENT_ELM.x-=(l*this.pix)
    }
    if(w){
      CURRENT_ELM.w+=(w*this.pix)
      if(l&&!CURRENT_ELM.x)CURRENT_ELM.w-=(w*this.pix)
      if(CURRENT_ELM.x+CURRENT_ELM.w>WIDTH)CURRENT_ELM.w-=(w*this.pix)
    }
    if(t){
      CURRENT_ELM.y+=(t*this.pix)
      if(CURRENT_ELM.y<0)CURRENT_ELM.y=0
      if(CURRENT_ELM.y+CURRENT_ELM.h>HEIGHT)CURRENT_ELM.y-=(t*this.pix)
    }
    if(h){
      CURRENT_ELM.h+=(h*this.pix)
      if(t&&!CURRENT_ELM.y)CURRENT_ELM.h-=(h*this.pix)
      if(CURRENT_ELM.y+CURRENT_ELM.h>HEIGHT)CURRENT_ELM.h-=(h*this.pix)
    }
    
    $("#"+CURRENT_ELM.id).css({left:CURRENT_ELM.x,top:CURRENT_ELM.y,width:CURRENT_ELM.w,height:CURRENT_ELM.h})
  }
}

const ALIGNMENT_BTN=new ALIGN_BTNS()