const {TelegramClient,Api}=require("telegram"),
{StringSession}=require("telegram/sessions")

let bot,token,start=false,session

const apiKey=3384709,
apiHash="6118c6e7c2a461f13f9998cec375fd59"

if(process.env.NODE_ENV==="production"){
  token="5999785128:AAEQDCj6oUShSxNJJArM8zdkCp7XZL3DXbk"
  session="1BQANOTEuMTA4LjU2LjE0MgG7rYR8rKUTAgkRdN4iEKAQBv1KyFCvqxcz1mBjmMlwio9+ioj1XgWbxBCN8OEiJeZ73dxg8RaLh5fpzrrMdA45/R9Aj2+pCAUlUDS4SkeEBsYnvj8pBP9PaiAJ4lItxzHQQuzgeDOfLhQKjcO8D2bY+oFSI6ypE4acLUBuahw3sTBRrpwxG7RQtP9MyyrVa++PCKo9loU1P7J13S+XgxXhe5E7b2Z3DnDY/qFC7YvE6hCldV0dO5xWtycg9KEFVKxH2KLbkGjt6X6bsubC9SZK3LOV6AUrMJvW5iWX+/x1zPpC6sz1Ui6ZfE4h+uRRqMEbbTtAwLWMwTb1d1xUvjxhCw=="
}
else{
  /*token="5999785128:AAEQDCj6oUShSxNJJArM8zdkCp7XZL3DXbk"
  session="1BQANOTEuMTA4LjU2LjE0MgG7rYR8rKUTAgkRdN4iEKAQBv1KyFCvqxcz1mBjmMlwio9+ioj1XgWbxBCN8OEiJeZ73dxg8RaLh5fpzrrMdA45/R9Aj2+pCAUlUDS4SkeEBsYnvj8pBP9PaiAJ4lItxzHQQuzgeDOfLhQKjcO8D2bY+oFSI6ypE4acLUBuahw3sTBRrpwxG7RQtP9MyyrVa++PCKo9loU1P7J13S+XgxXhe5E7b2Z3DnDY/qFC7YvE6hCldV0dO5xWtycg9KEFVKxH2KLbkGjt6X6bsubC9SZK3LOV6AUrMJvW5iWX+/x1zPpC6sz1Ui6ZfE4h+uRRqMEbbTtAwLWMwTb1d1xUvjxhCw=="*/
  session="1BQANOTEuMTA4LjU2LjEzNwG7Iu3PuYs0cM/uctk9CrqL02kbWzeqvR6Nq/F7MT51D7QAHMCTTiGbxEfhWghnAD8GfVjb9juPLhrbk82SwDBkRlU03S/lIEoN7jjTFjRhGSb6QQGyfLL3aQXq5vOqJqN32mh8dUYdyDNlpfWkAZ7Z2ilFyxMyE8x80yg4OH3qysnzYi8aDZrpZh/3g7Wxdvsng9b/fZBwT/4RG3fTxqbw25FZuRCUItgwwGhuu5+YdCrYo2bir9/PZ1DjYczFgJQeXOPuYC5trp2U1iYGg+EXg+OQJDMyumRe2bWFoLXEazAq9PA7u35RSfP8EhKrr5heOlL30OQkmXGo0gwizO4HSw=="
  token="1501660172:AAGIQGRZ_b_Ei3TvLgm9F7T6_zNi5TrLxY4"
}
module.exports.sleep=async(time)=>{
  return new Promise(r=>{
    setTimeout(r, time);
  })
}

module.exports.bot=async()=>{
  if(bot)return bot
  if(start){
    console.log("at start");
    while(true){
      await module.exports.sleep(500)
      if(bot)break
    }
    return bot
  }
  console.log("connecting");
  start=true
  let client=new TelegramClient(new StringSession(session),apiKey,apiHash,{connectionRetries:5})
  await client.start({botAuthToken:token}).catch(e=>null)
  console.log("connected");
  console.log(client.session.save())
  bot=client
  return bot
}
module.exports.Api=Api
module.exports.root=process.cwd()+"/bot/zip-bot"
module.exports.adminId=1504314507