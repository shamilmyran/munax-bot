var fs = require("fs");
var path = process.cwd()
module.exports = async ()=> {
  var reqList = JSON.parse(await fs.readFileSync(path+"/bot/translate-bot/requesters.txt"))
  console.log(reqList)
  while (reqList.length) {
    var select = reqList.splice(0, 1)[0]
  }
}