const {TelegramClient,Api}=require("telegram"),
{StringSession}=require("telegram/sessions")

let token,bot,start=false,session

const apiKey=3384709,
apiHash="6118c6e7c2a461f13f9998cec375fd59"

if(process.env.NODE_ENV!=="production"){
  
    session="1BQANOTEuMTA4LjU2LjEzNwG7Iu3PuYs0cM/uctk9CrqL02kbWzeqvR6Nq/F7MT51D7QAHMCTTiGbxEfhWghnAD8GfVjb9juPLhrbk82SwDBkRlU03S/lIEoN7jjTFjRhGSb6QQGyfLL3aQXq5vOqJqN32mh8dUYdyDNlpfWkAZ7Z2ilFyxMyE8x80yg4OH3qysnzYi8aDZrpZh/3g7Wxdvsng9b/fZBwT/4RG3fTxqbw25FZuRCUItgwwGhuu5+YdCrYo2bir9/PZ1DjYczFgJQeXOPuYC5trp2U1iYGg+EXg+OQJDMyumRe2bWFoLXEazAq9PA7u35RSfP8EhKrr5heOlL30OQkmXGo0gwizO4HSw=="
  token="1501660172:AAGIQGRZ_b_Ei3TvLgm9F7T6_zNi5TrLxY4"
  /*
  token="5367698671:AAETky8B52O2sC278lZWgCnz0foEH9YkIyg"
  session="1BQANOTEuMTA4LjU2LjE4MQG7VJ0XIi8wgY/URiq11lrrCegjUiLmJBc0mpXo+CHL76CWwbth4kPa7burY1+3HcpohbgDBsqPYMrJGRbtWxObWgX733WfNJ3LCbGa8GXANI2Dm+UPwRNPcqIvCw6exbTIoiNrh4XaduzbVRuiX8Caj2PeZkzIJr21PcPhyhByDQ3JncyBIos2MLkDETHwF0A6ZjejJS880Vy8J53hgcZEBiW15wBb3v1NaCgx3iAMKLMA4nHSvZ4PAxZG5SmU1QUNmHbh1QLxpRDxjH+9n9/BakIrUm1DwU1geenwfqioe3K8MgLeudh5Eg+lvBCuutJxpNPzsUf9k87s3KPTbxjxcw=="
  */
}else {
  token="5950358372:AAHNnlwF_cGDLitbk-ic6d2Ic-pMoVYdN2A"
  
  session="1BQANOTEuMTA4LjU2LjEzNQG7oOjX83diartsRllHBNJYoHvmpkreQz4vGHUWqNtTEedbJXL9CmeJPz/KR4U9csJr890dS6tpuY3CVpBaG1e4MLGJjRZnRv8NS+CoLRTmd/yOtuO/VbPf2wTLssC7deUdP/VpVwAnjVtNbPxZTR8O4CcJHdmp+JTkXwcnt45p4PS+2puEYtOrHeD2X6BeYjhtSRdt4zCRdcT5zT7u0kzr6sMG11k3bhwe/8ASQ1VyHR2Fznvaj8g0QFewVvsXs//QMGoiT5yE+Z0ztnjSE7bsqDZWcqIFNCu+hAyyYBy1FFeqNmDmpV057IRZq5jGnQIsG/geC6aHK8JUH+srLPA4Gg=="
}

module.exports.sleep=async(time)=>{
  return new Promise(r=>{
    setTimeout(r, time);
  })
}

let client=new TelegramClient(new StringSession(session),apiKey,apiHash,{connectionRetries:5})

client.start({botAuthToken:token}).then(()=>console.log(client.session.save()))

module.exports.bot=client


module.exports.root=process.cwd()+"/bot/pdf-bot"
module.exports.adminId=1504314507
module.exports.token=token
module.exports.group= new Api.PeerChannel({channelId:1985269179n})