/* npm packages */
const got=require("got-scraping").gotScraping,
cheerio=require("cheerio"),
fs=require("fs")


/* constant variables */
const baseUrl="https://subdl.com"


async function search(q=String){
  try {
    if(!q) return null
    let html=await got.get(baseUrl+"/search?query="+encodeURIComponent(q))
    //fs.writeFileSync("./subdls.html",html.body)
    let $=cheerio.load(html.body)
    
    let count=$("body>div>div>header").next("div").children("div>div>div").text().toLowerCase().match(/matches\s*\((\d+)\s*results\)/)
    if(!count)return null
    if(count[1]==="0")return null
    
    let result=[]
    $("body>div>div>header + div>div>div>div>div:nth-child(2)>h2").map((i,e)=>{
      result.push({
        title:$(e).text(),
        path:$(e).parent().prev("div").children("a").attr("href"),
        type:$(e).next("a").children("span:first-child").text()
      })
    })
    
    return result
  } catch (e) {
    console.log(e);
    return null
  }
}

async function getSubs(p=String,t="movie"){
  try {
    if(!p)return null
    
    let {body:html}=await got.get(baseUrl+p)
    
    //fs.writeFileSync("./subdl.html",html)
    const $=cheerio.load(html)
    
    let poster=$("body>div:first-child>div:first-child>header + div>div:first-child>div:first-child>div:first-child>img").attr("src")
    
    let title=$("body>div:first-child>div:first-child>header + div>div:first-child>div:nth-child(2)>h1").text().trim()
    let year=title.match(/\((\d{4})\)$/)
    if(year){
      year=Number(year[1])
      title=title.replace(`(${year})`,"").trim()
    }
    
    let result=[]
    if(t==="movie"){
      $("body>div:first-child>div:first-child>header + div>div:first-child>div:nth-child(2)>div:nth-of-type(2)>div:first-child>div").map((i,e)=>{
        
        let subs=[]
        $(e).find("div>div>a").map((i,e)=>{
          if(i==0||i==1)return
          subs.push({
            title:$(e).text(),
            url:$(e).attr("href")
          })
        })
        result.push({
          language:$(e).children("div:first-child").find("a:nth-child(2)>h2").text(),
          subs,
          count:subs.length
        })
      })
      
      result=result.filter(x=>!!x.language)
    }else{
      $("body>div:first-child>div:first-child>header + div>div:first-child>div:nth-child(2)>div:nth-of-type(2)>div>a").map((i,e)=>{
        result.push({
          path:$(e).attr("href"),
          poster:$(e).children("div:first-child").attr("poster"),
          title:$(e).find("div:nth-child(2)>h1").text()
        })
      })
    }
    
    return {
      title,
      year,
      results:result,
      poster
    }
   
  } catch (e) {
    console.log(e);
    return null
  }
}


module.exports={search, getSubs}