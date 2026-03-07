

module.exports={
  categorize:q=>{
    let url=q.match(/^https:\/\//)
    if(!url)return "username"
    if(!q.match("instagram.com"))return "err_not_insta"
    let reel=q.match(/\/reel\//)
    if(reel)return "reel"
    if(q.match(/\/stories\/.+\/\d+\?/))return "stories"
    if(q.match(/instagram\.com\/[a-z_.0-9]+(\/){0,1}$|instagram\.com\/[a-z_.0-9]+(\/){0,1}(\?){1,1}(.+)$/))return "username_link"
    if(q.match(/\/tv\//))return "igtv"
    return "photo"
  },
  setError:err=>{
    if(err==="err_stories")return "The link you sended is for Instagram stories.  You cannot download Instagram stories using this bot"
    if(err==="err_not_insta")return "The link you sended is not from Instagram"
    if(err==="err_igtv")return "The link you sended is for IGTV. you cannot download IGTV video using this bot"
  },
  isImage:(cont)=>{
    if(cont.match("image"))return true
    else false
  },
  storyUrlCat:(url)=>{
    let username=url.match(/\/stories\/.+\//)[0].replace(/\/stories|\//g,"")
    let id=url.replace(/.+\/stories\/.+\/|\?.+/g,"")
    return {username,id}
  },
  toPlainText:(text)=>text.replace(/>/g,"&gt;").replace(/</g,"&lt").replace(/&/g,"&amp;").replace(/"/g,"&qout;")
}