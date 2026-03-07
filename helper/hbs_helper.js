

module.exports={
  is:(v1,c,v2,opt)=>{
 
    switch(c){
      case "==":return (v1==v2)?opt.fn(this):opt.inverse(this);
      case "<":return (v1<v2)?opt.fn(this):opt.inverse(this);
      case "isNot":return (v1!=v2)?opt.fn(this):opt.inverse(this);
      case "not":return (!v1)?opt.fn(this):opt.inverse(this)
    }
  },
  isEach:(v1,c,v2,val,opt)=>{
    switch(c){
      case "==":return (v1==v2)?opt.fn(val):opt.inverse(val);
    }
  },
  toStr:(v1,opt)=>{
   return opt.fn(JSON.stringify(v1))
  },
  isNot:(v1,opt)=>{
    console.log(v1);
    return (!v1)?opt.fn(this):null
  },
  short_perce:(v1,opt)=>{
    var p=String(v1).split("").splice(0,4)
    p=p.join("")
    console.log(p,"asdff",opt.lookupProperty);
    return opt.fn(p)
  },
  EncUrl:(v1,opt)=>{
    return opt.fn(encodeURIComponent(v1))
  },
  availOne:(v1,v2,opt)=>{
    if(v1)return opt.fn(v1)
    if(v2)return opt.fn(v2.candidates)
    return opt.inverse()
  },
  ifOrIf:(v1,v2,opt)=>{
    if(v1)return opt.fn(v1)
    if(v2)return opt.fn(v2)
    else return opt.inverse()
  },
  plainStringSpan:(str)=>{
    str=str.replace(/\.|_|\-/g," ")
    
    str=str.split(" ").map(x=>{
      if(x.length>15){
        return x.split("").splice(15,0," ").join("")
      }
      return x
    }).join(" ")
    
    str="<span>"+str.split(" ").join("&nbsp;</span><span>")+"</span>"
    
    return str
  }
}