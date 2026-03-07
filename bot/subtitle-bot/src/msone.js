const base_url="https://malayalamsubtitles.org",
got=require("got-scraping").gotScraping,
cheerio=require("cheerio"),
fs=require("fs")

async function search(query="",end_page=1){
  try{
    let page=(end_page*2)-1
    end_page=page+1
    
    const results={data:[]}
    while(page<=end_page){
      console.log("looping",page);
     
      let url=(base_url+"/page/"+page+"/?s="+query.replace(/ /g,"+"))
      res=(await got.get(url,{retry:{limit:5}})).body
      
      const $=cheerio.load(res)
      
      if(/Not found/.test($("h1.entry-title").text()))throw "Page you are requested not found"
      
      let totelPage=1
      $("div[role=navigation] ul li a").map((i,e)=>{
        let txt=$(e).text().trim().match(/Go to page (\d+)/i)
        if(txt)totelPage=Number(txt[1])
      })
      //totelPage=Math.ceil(totelPage/2)
      
      $("article a.entry-image-link + h2>a").map((i,e)=>{
        if(/https:\/\/.+?\/download\//.test($(e).attr("href"))) return
        results.pages=Math.ceil(totelPage/2)
        results.page=Math.ceil(page/2)
        results.data.push({title:$(e).text(),url:$(e).attr("href")})
      })
      if(page==totelPage)break
      page++
    }
    return results
  }catch(e){
    throw e
  }
}

async function download(url){
  try {
    if(!url) throw "Url not Specified"
    
    
    let res=(await got.get(url,{retry:{limit:5}})).body.toString()
   // fs.writeFileSync("masone.html",res)
    const $=cheerio.load(res)
    
    let result={}
    
    result.title=$("header>h1.entry-title").text()
    result.release=Number($("div.entry-content>div>div>p:nth-of-type(1)").text().replace(/[^0-9]/g,""))
    result.poster=$("div.entry-content figure>img").attr("data-src")||$("div.entry-content figure>img").attr("src")||""
    let poster=""
    $("div.entry-content figcaption>a").map((i,e)=>{
      poster+=`<a href="${$(e).attr("href")||""}">${$(e).text()}</a><pre> .</pre>`
    })
    result.data=`<b><a href="${result.poster}">പോസ്റ്റർ</a> : </b>`+poster+"\n"
    $("div.entry-content tbody>tr").map((i,e)=>{
      result.data+=`<b>${$(e).children("td:first-child").text()}</b> : ${$(e).find("td:last-child a").length?`<a href="${$(e).find("td:last-child a").attr("href")}">${$(e).children("td:last-child").text()}</a>`:$(e).children("td:last-child").text()}\n`
    })
    console.log(poster);
    result.data+="<b>⭐ : </b>"+$("div.imdb h3>i").parent().text()
    result.description=""
    $("div.entry-content>div:first-child>div:first-child>p").map((i,e)=>{
      if(!i)return
      
      result.description+=$(e).text()+"\n\n"
    })
    
    result.download=$("a.wpdm-download-link").attr("data-downloadurl")||$("a.wpdm-download-link").attr("href")
    
    return result
  } catch (e) {
    console.log(e);
    throw e
  }
}

/*async function download(url=null){
  try {
    if(!url)throw "No Url Specified"
    let res=(await got.get(url,{retry:{limit:5}})).body.toString("utf8")
    let $=cheerio.load(res)
    res={}
    $(".wpdm-download-link").map((i,e)=>{
      res.download=e.attribs["data-downloadurl"]||e.attribs.href
    })
    $('[class*="wp-image-"]').filter("img").map((i,e)=>{
      if(e.attribs.width=="725"||e.attribs.height=="1024")res.poster=e.attribs["data-src"]
    })
    let description=""
    $(".wp-block-group__inner-container>p").map((i,e)=>{
      //console.log(e);
      e.children.filter(x=>(x.type==="text"||x.name==="a"||x.name==="strong")).map((j)=>{
        if(j.name==="a"){
          var dt=j.children.filter(x=>x.type==="text")
          if(!dt.length)j.data=``
          else j.data=`<a href="${j.attribs.href}">${dt[0].data}</a>`
        }
        if(j.name==="strong"){
          var dt=j.children.filter(x=>x.type==="text")
          if(!dt.length)j.data=''
          else j.data=`<strong>${dt[0].data}</strong>`
        }
        description+=(" "+j.data+" ")
      })
    })
    res.description=description
    $(".entry-title").filter("h1").map((i,e)=>{
      if(!e.children.length||e.children[0].type!=="text")return
      res.title=e.children[0].data
    })
    return res
  } catch (e) {
    console.log(e);
    throw e
  }
}*/

module.exports={search,download}