const db=require("../../../helper/db"),
{sleep,root,adminId}=require("./config")

const jszip=require("jszip"),
fs=require("fs"),
html=require("html-entities")

let list=[],
working=false

async function startWork(){
  working=true
  const bot=await require("./config").bot()
  while(list.length){
    let sel=list.splice(0,1)[0]
    let [msg]=await bot.getMessages(bot.user,{ids:sel.msg}).catch(()=>[null])
    if(!msg)continue
    let data=await db.get("zips",{user:sel.user},true)
    try {
      await msg.edit({text:"Converting to zip was started\nPlease wait..."}).catch(e=>null)
      if(!data)throw "I can't find any details about you . Please make sure your not deleted your details using /remove command"
      
      var prog_sts=false,
      prog_st
      const progress=async(c,t,f,up=false)=>{
        try {
          prog_sts=true
          c=Number(c)/1024/1024
          t=Number(t)/1024/1024
          let p=Math.floor(c/t*100),
          e=Math.floor((t-c)/(c/((Date.now()- prog_st)/1000)))
          //console.log(c,t,f,up);
          await msg.edit({text:`<b>File ${up?"uploading":"downloading"} started</b>\n\nFilename : <code>${f.split("/").pop()}</code>\nCompleated : <code>${Math.ceil(c)} MB</code>\nFile size : <code>${Math.ceil(t)} MB</code>\nProgress : ${p}%\nEst : <code>${e} sec</code>`,parseMode:"html"}).catch(e=>null)
          await sleep(2000)
          prog_sts=false
          return
        } catch (e) {
          prog_sts=false
          return
        }
      }
      
      let zip=new jszip()
      for(var i of data.paths)zip.folder(i)
      for(var i of Object.keys(data.files)){
        try {
          let [m]=await bot.getMessages(sel.user,{ids:data.files[i]})
          prog_st=Date.now()
          let file=await bot.downloadMedia(m,{progressCallback:(c,t)=>{
            if(!prog_sts)progress(c.value,t.value,i)
          }, workers:10})
          zip.file(i,file)
          file=null
        } catch (e) {
          console.log(e);
          continue
        }
        
      }
      await msg.edit({text:"Generating zip file\nPlease wait..."}).catch(e=>null)
      zip=await zip.generateAsync({type:"nodebuffer", compression:"DEFLATE", compressionOptions:{level:data.compression}})
      await msg.edit({text:"Zip creation completed\n\nTrying to Upload the file"}).catch(e=>null)
      fs.writeFileSync(root+"/zips/"+data.filename,zip)
      zip=null
      
      let {size}=fs.statSync(root+"/zips/"+data.filename)
      
      prog_st=Date.now()
      let sendFile=await bot.sendFile(sel.user,{file:root+"/zips/"+data.filename,progressCallback:(c)=>{
        //console.log(c);
        c=c*size
        //console.log(c,size);
        if(!prog_sts)progress(c,size,"File name.zip",true)
      }, caption:`<code>${html.encode(data.filename)}</code>\n\nZip created using @zip_unzip_bot`,parseMode:"html",thumb: process.cwd()+"/public/images/zip_bot_thumb.jpg",workers:10})
      await db.delete("zips",{user:sel.user}).catch(e=>null)
      fs.unlinkSync(root+"/zips/"+data.filename)
      await bot.deleteMessages(sel.user,[sel.msg],{revoke:true}).catch(e=>null)
      await bot.sendFile(adminId,{file:sendFile,caption:`ZIP_CREARION\n\n${data.filename}\nuser : ${sel.user}`})
    } catch (e) {
      console.log(e)
      if(typeof e!=="string")e="Unexpected error occurred.\n\nSkipping"
      msg.edit({text:e}).catch(e=>null)
      await db.delete("zips",{user:sel.user})
      try{
       await fs.unlinkSync(root+"/zips/"+data.filename)
      }catch(e){}
      continue
    }
  }
  working=false
}

module.exports.add=(user,msg)=>{
  if(list.filter(x=>x.user==user).length)return 0
  list.push({user,msg})
  if(working)return list.length
  startWork()
  return 1
}