var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

exphbs=require("express-handlebars")

const session=require("express-session"),
bodyParser=require("body-parser"),
fs=require("fs"),
os=require("os"),
fileUpload=require("express-fileupload"),
helmet=require("helmet"),
rateLimit=require("express-rate-limit"),
rateLimitStore=require("rate-limit-mongo"),
telegramIP=["149.154.160.0","91.108.4.0"]

if(process.env.NODE_ENV!=="production"){
(async()=>{
  var ip=os.networkInterfaces()
  await fs.writeFileSync('.env',`HEROKU_URL="http://127.0.0.1:3000"
  PROXY_URL="http://localhost:3001"`)
  require("dotenv").config()
})()
}

const hbs=exphbs.create({
  defaultLayout:"layout",
  partialsDir:"views",
  extname:"hbs",
  helpers:require("./helper/hbs_helper")
})

var app = express();

(async()=>{

let {connect:database,get:db}=require("./database")
database=await database()
if(database)console.log("database connected successfully");
else console.log("database didn't connected");
var usersRouter = require('./routes/users');
var adminRouter = require("./routes/admin")

// Removed instagram-bot, youtube-subtitle, zip-bot, pdf-bot

var translateRouter = require("./bot/translate-bot/bot")
var translateApi=require("./bot/translate-bot/api")
var groupTranslateRouter=require("./bot/group-translate/bot")
var subtitleRouter = require("./bot/subtitle-bot/bot")
var subtitleApi=require("./bot/subtitle-bot/api")

//view engine setup
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.set("trust proxy",3)
app.use(logger('dev'));
app.use(express.urlencoded({
  extended: true,
  limit:"2mb"
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'session', cookie: { maxAge:1296000000}}))//maxAge Is 15 Days
app.use(bodyParser.json({limit:"2mb"}))
//app.use(express.json({}));
app.use(fileUpload({useTempFiles:true,tempFileDir: process.cwd()+"/public/images/temp"}))
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", process.env.HEROKU_URL,"https://telegram.org","https://cdnjs.cloudflare.com","'unsafe-inline'","https://translate.google.com","https://fonts.gstatic.com","https://www.gstatic.com","https://*.googleapis.com","'unsafe-eval'"],
      connectSrc:["'self'","https://*.gstatic.com","https://*.googleapis.com","https://dl.opensubtitles.org"],
      imgSrc:["'self'","https://image.tmdb.org"]
    }
  }
}))
app.use(rateLimit({
  store:new rateLimitStore({collection:db().collection("rate-limit")}),
  windowMs:60*1000,
  max:20,
  skipFildRequest:false,
  skip:(req)=>{
    return /(149\.154\.(16[0-9]|17[0-5])\.([2-9]$|[1-9][0-9]$|1[0-9][0-9]$|2[0-4][0-9]$|25[0-4]$))|(91\.108\.[4-7]\.([2-9]$|[1-9][0-9]$|1[0-9][0-9]$|2[0-4][0-9]$|25[0-4]$))/.test(req.ip)
  }
}))

app.use('/', usersRouter);
app.use("/admin", adminRouter)
app.use("/ip",(req,res)=>{
  let ip=req.ip
  res.json({ip})
})

app.use("/translate", translateRouter)
app.use("/api/translate",translateApi)
app.use("/translate/group",groupTranslateRouter)
app.use("/subtitle", subtitleRouter)
app.use("/api/subtitle",subtitleApi)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err: {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

})()
module.exports = app;
