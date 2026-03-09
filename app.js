var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var exphbs = require("express-handlebars");

const session = require("express-session");
const bodyParser = require("body-parser");
const fs = require("fs");
const os = require("os");
const fileUpload = require("express-fileupload");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const rateLimitStore = require("rate-limit-mongo");

// ========== UNIFIED BOT SETUP ==========
const { bot } = require("./bot/config"); // Single bot instance

// Load all bot modules – they attach their handlers to the same bot
require("./bot/subtitle-bot/bot");
require("./bot/translate-bot/bot");
require("./bot/group-translate/bot");
// ========================================

if (process.env.NODE_ENV !== "production") {
  (async () => {
    var ip = os.networkInterfaces();
    await fs.writeFileSync('.env', `HEROKU_URL="http://127.0.0.1:3000"\nPROXY_URL="http://localhost:3001"`);
    require("dotenv").config();
  })();
}

const hbs = exphbs.create({
  defaultLayout: "layout",
  partialsDir: "views",
  extname: "hbs",
  helpers: require("./helper/hbs_helper")
});

var app = express();

(async () => {
  let { connect: database, get: db } = require("./database");
  database = await database();
  if (database) console.log("✅ Database connected successfully");
  else console.log("❌ Database didn't connect");

  var usersRouter = require('./routes/users');
  var adminRouter = require("./routes/admin");

  // Bot routers (for web app features like batch translation, file downloads)
  var translateRouter = require("./bot/translate-bot/bot");
  var groupTranslateRouter = require("./bot/group-translate/bot");
  var subtitleRouter = require("./bot/subtitle-bot/bot");

  // Bot API routers (for internal API calls)
  var translateApi = require("./bot/translate-bot/api");
  var subtitleApi = require("./bot/subtitle-bot/api");

  // View engine setup
  app.engine('hbs', hbs.engine);
  app.set('view engine', 'hbs');
  app.set('views', path.join(__dirname, 'views'));

  app.set("trust proxy", 3);
  app.use(logger('dev'));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // Session with proper production options
  app.use(session({
    secret: 'session',
    cookie: { maxAge: 1296000000 }, // 15 days
    resave: false,
    saveUninitialized: false
  }));

  app.use(bodyParser.json({ limit: "2mb" }));
  app.use(fileUpload({ useTempFiles: true, tempFileDir: process.cwd() + "/public/images/temp" }));
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", process.env.HEROKU_URL, "https://telegram.org", "https://cdnjs.cloudflare.com", "'unsafe-inline'", "https://translate.google.com", "https://fonts.gstatic.com", "https://www.gstatic.com", "https://*.googleapis.com", "'unsafe-eval'"],
        connectSrc: ["'self'", "https://*.gstatic.com", "https://*.googleapis.com", "https://dl.opensubtitles.org"],
        imgSrc: ["'self'", "https://image.tmdb.org"]
      }
    }
  }));
  app.use(rateLimit({
    store: new rateLimitStore({ collection: db().collection("rate-limit") }),
    windowMs: 60 * 1000,
    max: 20,
    skipFildRequest: false,
    skip: (req) => {
      return /(149\.154\.(16[0-9]|17[0-5])\.([2-9]$|[1-9][0-9]$|1[0-9][0-9]$|2[0-4][0-9]$|25[0-4]$))|(91\.108\.[4-7]\.([2-9]$|[1-9][0-9]$|1[0-9][0-9]$|2[0-4][0-9]$|25[0-4]$))/.test(req.ip)
    }
  }));

  app.use('/', usersRouter);
  app.use("/admin", adminRouter);
  
  // Mount the bot routers (so web pages and file downloads work)
  app.use("/translate", translateRouter);
  app.use("/translate/group", groupTranslateRouter);
  app.use("/subtitle", subtitleRouter);

  // Mount the API routers
  app.use("/api/translate", translateApi);
  app.use("/api/subtitle", subtitleApi);

  // ✅ SINGLE WEBHOOK ENDPOINT for the unified bot
  app.post("/bot/webhook", (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // Catch‑all for old bot webhook URLs (prevent 404 flood)
  app.post('/translate/*', (req, res) => res.sendStatus(200));
  app.post('/subtitle/*', (req, res) => res.sendStatus(200));

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    next(createError(404));
  });

  // error handler
  app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
  });
})();

module.exports = app;
