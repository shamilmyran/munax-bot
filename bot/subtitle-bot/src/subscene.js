const subscene = require("node-subscene-api"),
settings=require("./settings")

const zipFilters = [
  "complete episodes",
  "complete",
  "all episodes",
  "all",
  "full episodes",
  "full series",
  "full",
  "season full",
  "full season",
  "all subs",
  "all subtitles"
  ]
function filterByZip(subs) {
  if (subs.subs.length) {
    let sortList = []
    subs.subs.map((m)=> {
      let gq=settings.gussTheQuery(m.title)
      var t = m.title.toLowerCase().replace(/\.|_/g, " ").trim()
      let filter = 0
      zipFilters.map(f=> {
        if (t.split(f).length > 1)filter++
      })
      if(t.replace(/ /g,"").match(/01-\d+|e01-e\d+|ep01-ep\d+|episode01-episode\d+|ep01-\d+/))filter++
      if(gq.season&&!gq.episode)filter++
      m.filter = filter
      sortList.push(m)

    })
    sortList.sort((x,
      y)=> {
      return y.filter-x.filter
    })
    subs.subs=sortList
    return subs

  } else {
    return subs
  }

}

module.exports = {
  search: async(query)=> {
    try {
      var result = await subscene.search(query)
      return result
    }catch(err) {
      console.log(err);
      var err = new Error()
      err.msg = err
      return err
    }
  },
  getSubs: async(path, langs,datas=false)=> {
    try {
      var subs = await subscene.getSubtitles(path,datas)
      let data=subs.datas
      subs=Object.fromEntries(Object.entries(subs).filter(([key,val])=>val instanceof Array))
      for (let i in langs) {
        if (subs[langs[i]]) {
          subs = {
            lang: langs[i],
            subs: subs[langs[i]]}
          break;
        } else if (langs[i] === "any") {
          subs = Object.values(subs)
          subs.sort((a, b)=> {
            return b.length-a.length
          })
          subs.map(e=>console.log(e.length))
          subs = {
            lang: "any",
            subs: subs[0]}
          break;
        }
      }
      if(datas){
        return [filterByZip(subs),data]
      }
      return filterByZip(subs)
    } catch (e) {
      console.log(e);
      var err = new Error()
      err.msg = err
      return err
    }
  },
  download: async(path, zip)=> {
    try {
      var files = await subscene.download(path, {
        zip
      })
 
      return files
    }catch(e) {
      console.log(e,"error");
      var err = new Error()
      err.msg = "unexpected error"
      return err
    }
  },
  getAllSubs:async(path,datas=false)=>{
    let subs=await subscene.getSubtitles(path,datas)
    return subs
  }
}