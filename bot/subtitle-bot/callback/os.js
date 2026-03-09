/* Requiring local packages */
const { bot, adminId } = require("../../config");
const { answerCallback: answer, editMessage: edit, Button, editMarkup, sendDocument, sendMessage } = require("../src/message");
const settings = require("../src/settings");
const { getGenreNameArray } = require("../src/tmdb_genre");

/* Requiring npm packages */
const langs = require("langs");
const got = require("got");
const zlib = require("zlib");
const fs = require("fs");
const { encode: htmlEnc } = require("html-entities");
const encode = require("detect-file-encoding-and-language");
const encoder = require("encoding");
const router = require("express").Router();

let proxy_count = 0,
  totel_file_count = 0,
  proxy = false,
  limit_end = false;

const use_proxy = async (url) => {
  if (!url) {
    proxy_count++;
    totel_file_count++;
    if (proxy_count > 20) {
      proxy_count = 0;
      proxy = !proxy;
    }
    if (totel_file_count > 350) refresh_server(true);
    return;
  }
  return got.post(process.env.PROXY_URL + "/proxy", {
    json: {
      opt: [url, { responseType: "buffer" }],
      pass: "a@f@s@a@l@"
    },
    responseType: "buffer"
  });
};

const tmdb_key = "121310dc95670906b7feaad3bfa5a510";
const tmdb_base = "https://api.themoviedb.org/3";

/* handling opensub search request */
bot.on("callback_query", (msg) => {
  try {
    let callback = JSON.parse(msg.data);

    if (callback.t !== "ss" || callback.w !== "os") return;
    if (!msg.message.reply_to_message) throw "The message you sent is missing\nPlease make sure that you haven't deleted that message";

    let chat = msg.message.chat.id;
    let query = msg.message.reply_to_message.text;
    let message_id = msg.message.message_id;

    let avlLangs = langs.all();
    let savllang = {};
    avlLangs.filter(x => {
      var flet = x.name.toLowerCase().slice(0, 1);
      return (savllang[flet] ? savllang[flet].push(x) : savllang[flet] = [x]);
    });
    let btn = [];
    for (let i of savllang.a) {
      btn.push([[i.name + " [" + i.local + "]", { t: "slos", l: i["2"] }]]);
    }

    let letters = "abcdefghijklmnopqrstuvwxyz";
    let btn_row = [],
      j = 1;
    btn.push([["A", { t: "nsllos" }]]);
    for (let i of letters) {
      if (i === "a") continue;
      if (j % 7) {
        btn_row.push([i.toUpperCase(), { t: "cllos", l: i }]);
        j++;
      } else {
        btn_row.push([i.toUpperCase(), { t: "cllos", l: i }]);
        btn.push(btn_row);
        btn_row = [];
        j++;
        continue;
      }
    }
    btn.push(btn_row);

    return edit("Please select a language\n\n<code>Click on the button with the first letter of your language in the button below and switch to the page containing your language</code>", { chat_id: chat, message_id, reply_markup: Button(btn) });
  } catch (e) {
    if (typeof e === "string") return answer(msg.id, e);
    console.log(e);
    return answer(msg.id, "Unexpected error occurred. Please try again later.");
  }
});

/* switching languages page callback handler */
bot.on("callback_query", (msg) => {
  try {
    let callback = JSON.parse(msg.data);

    if (callback.t !== "cllos") return;
    if (!msg.message.reply_to_message) throw "The message you sent is missing\nPlease make sure that you haven't deleted that message";

    let avlLangs = langs.all();
    let savllang = {};
    avlLangs.filter(x => {
      var flet = x.name.toLowerCase().slice(0, 1);
      return (savllang[flet] ? savllang[flet].push(x) : savllang[flet] = [x]);
    });
    let btn = [];
    for (let i of savllang[callback.l]) {
      btn.push([[i.name + " [" + i.local + "]", { t: "slos", l: i["2"] }]]);
    }

    let letters = "abcdefghijklmnopqrstuvwxyz";
    let btn_row = [],
      j = 1;
    btn.push([[callback.l.toUpperCase(), { t: "nsllos" }]]);
    for (let i of letters) {
      if (i == callback.l) continue;
      if (j % 7) {
        btn_row.push([i.toUpperCase(), { t: "cllos", l: i }]);
        j++;
      } else {
        btn_row.push([i.toUpperCase(), { t: "cllos", l: i }]);
        btn.push(btn_row);
        btn_row = [];
        j++;
        continue;
      }
    }
    btn.push(btn_row);

    return editMarkup(Button(btn), { chat_id: msg.message.chat.id, message_id: msg.message.message_id });
  } catch (e) {
    if (typeof e === "string") return answer(msg.id, e);
    console.log(e);
    return answer(msg.id, "Unexpected error occurred. Please try again.");
  }
});

/* search subtitle by selected language */
bot.on("callback_query", async msg => {
  try {
    let callback = JSON.parse(msg.data);

    if (callback.t !== "slos") return;
    if (!msg.message.reply_to_message) throw "The message you sent is missing\nPlease make sure that you haven't deleted that message";

    let chat_id = msg.message.chat.id;
    let message_id = msg.message.message_id;
    let query = msg.message.reply_to_message.text;
    let query_data = settings.gussTheQuery(query);
    query = `${query_data.title || ""} ${query_data.year ? query_data.year : ""} ${query_data.season ? "S" + (query_data.season.length >= 2 ? query_data.season : "0" + query_data.season) : ""}${query_data.episode ? " E" + (query_data.episode.length >= 2 ? query_data.episode : "0" + query_data.episode) : ""}`.trim();

    let { err, sub } = await os({ title: query, lang: callback.l });
    if (err) {
      let rpl, btn = Button([
        (callback.l != "all" ? [["Change language", { t: "ss", w: "os" }]] : []),
        (callback.l != "all" ? [["Search in all languages", { t: "slos", l: "all" }]] : []),
        [["Search in SUBSCENE", { t: "ss", w: "ss" }]]
      ]);
      if (err === "no_sub_found") rpl = `No subtitles found for your request\n\n<code>Try to search in SUBSCENE by clicking the below button</code>`;
      else if (err === "api_error") rpl = `Opensubtitles is down now\n\nPlease try again later OR search in SUBSCENE`;
      else {
        console.log(err);
        throw new Error();
      }
      return edit(rpl, { chat_id: chat_id, message_id: message_id, reply_markup: btn });
    }

    sub.sort((a, b) => {
      var c = 0, d = 0;
      var { title: t1 } = settings.gussTheQuery(a.title);
      var { title: t2 } = settings.gussTheQuery(b.title);
      c += (query_data.title == t1 ? 1 : 0);
      d += (query_data.title == t2 ? 1 : 0);
      if (query_data.season) {
        c += (query_data.season == a.season ? 1 : 0);
        d += (query_data.season == b.season ? 1 : 0);
      }
      if (query_data.episode) {
        c += (query_data.episode == a.episode ? 1 : 0);
        d += (query_data.episode == b.episode ? 1 : 0);
      }
      if (query_data.year) {
        c += (query_data.year == a.year ? 1 : 0);
        d += (query_data.year == b.year ? 1 : 0);
      }
      return d - c;
    });

    let btn = settings.toMarkupBtnOs(sub, 1, callback.l);

    await edit("Please select a subtitle", { chat_id, message_id, reply_markup: Button(btn) });
    if (callback.l === "all") {
      sendMessage(chat_id, "<code>You can translate subtitles to your language using our bot</code>\n\n<a href=\"https://t.me/munax_sub_bot\"><b><u>munax Subtitle Bot</u></b></a>");
    }
    return;
  } catch (e) {
    if (typeof e === "string") return answer(msg.id, e);
    console.log(e);
    return answer(msg.id, "Unexpected error occurred. Please try again.");
  }
});

/* change subtitle page */
bot.on("callback_query", async msg => {
  try {
    let callback = JSON.parse(msg.data);

    if (callback.t !== "csos") return;
    if (!msg.message.reply_to_message) throw "The message you sent is missing\nPlease make sure that you haven't deleted that message";
    if ((callback.ct === "p" && callback.p == 0) || (callback.ct === "n" && callback.p > callback.tp)) throw "No more pages";

    let chat_id = msg.message.chat.id;
    let message_id = msg.message.message_id;
    let query = msg.message.reply_to_message.text;
    let query_data = settings.gussTheQuery(query);
    query = `${query_data.title || ""} ${query_data.year || ""} ${query_data.season ? "S" + (query_data.season.length >= 2 ? query_data.season : "0" + query_data.season) : ""}${query_data.episode ? " E" + (query_data.episode.length >= 2 ? query_data.episode : "0" + query_data.episode) : ""}`.trim();

    let { err, sub } = await os({ title: query, lang: callback.l });
    if (err) throw "Unexpected error occurred\nreason : " + err;

    sub.sort((a, b) => {
      var c = 0, d = 0;
      var { title: t1 } = settings.gussTheQuery(a.title);
      var { title: t2 } = settings.gussTheQuery(b.title);
      c += (query_data.title == t1 ? 1 : 0);
      d += (query_data.title == t2 ? 1 : 0);
      if (query_data.season) {
        c += (query_data.season == a.season ? 1 : 0);
        d += (query_data.season == b.season ? 1 : 0);
      }
      if (query_data.episode) {
        c += (query_data.episode == a.episode ? 1 : 0);
        d += (query_data.episode == b.episode ? 1 : 0);
      }
      if (query_data.year) {
        c += (query_data.year == a.year ? 1 : 0);
        d += (query_data.year == b.year ? 1 : 0);
      }
      return d - c;
    });

    let btn = settings.toMarkupBtnOs(sub, callback.p, callback.l);

    return editMarkup(Button(btn), { chat_id, message_id });
  } catch (e) {
    if (typeof e === "string") return answer(msg.id, e);
    console.log(e);
    return answer(msg.id, "Unexpected error occurred. Please try again.");
  }
});

async function batch_download({ lang, sub, sel, query }) {
  try {
    let sls = sel.season,
      sle = sel.episode;

    sel.imdbid = (String(sel.imdbid).length < 7 ? ("0000000" + String(sel.imdbid)).split("").reverse().slice(0, 7).reverse().join("") : sel.imdbid);

    let { id, poster_path } = (await got.get(`https://api.themoviedb.org/3/find/tt${sel.imdbid}?api_key=121310dc95670906b7feaad3bfa5a510&external_source=imdb_id`).json()).tv_results[0];
    if (!id) return [[sel]];
    let season = (await got.get(`https://api.themoviedb.org/3/tv/${id}?api_key=121310dc95670906b7feaad3bfa5a510`).json()).seasons.filter(x => x.season_number == sel.season)[0];
    sub = sub.filter(x => x.imdbid == sel.imdbid);
    let batch = [];
    for (var i = sel.episode; i <= season.episode_count; i++) {
      var nx_ep = sub.filter(x => (x.season == sel.season && x.episode == i));
      if (!nx_ep.length) {
        let new_sub = await os({ title: `${query.title} S${sel.season}E${i}`, lang: sel.lang });
        if (!new_sub.subs) continue;
        new_sub = new_sub.filter(x => (x.season == sel.season && x.episode == sel.episode));
        if (new_sub.length) batch.push(new_sub);
        continue;
      }
      batch.push(nx_ep);
    }
    var ind = -1;
    if (batch.length) ind = batch[0].indexOf(x => x.index == sel.index);
    ind = (ind == -1 ? 0 : ind);
    if (batch.length) batch = batch.map(x => (x[ind] || x[0]));
    let poster = null;
    if (poster_path || season.poster_path) {
      poster = `https://image.tmdb.org/t/p/w500${season.poster_path || poster_path}`;
    }
    season.poster_path = poster;
    return [batch, season];
  } catch (e) {
    console.log(e);
    return [[sel], null];
  }
}

function subsort(sub, query_data) {
  sub.sort((a, b) => {
    var c = 0, d = 0;
    var { title: t1 } = settings.gussTheQuery(a.title);
    var { title: t2 } = settings.gussTheQuery(b.title);
    c += (query_data.title == t1 ? 1 : 0);
    d += (query_data.title == t2 ? 1 : 0);
    if (query_data.season) {
      c += (query_data.season == a.season ? 1 : 0);
      d += (query_data.season == b.season ? 1 : 0);
    }
    if (query_data.episode) {
      c += (query_data.episode == a.episode ? 1 : 0);
      d += (query_data.episode == b.episode ? 1 : 0);
    }
    if (query_data.year) {
      c += (query_data.year == a.year ? 1 : 0);
      d += (query_data.year == b.year ? 1 : 0);
    }
    return d - c;
  });
  return sub;
}

bot.on("callback_query", async msg => {
  try {
    let callback = JSON.parse(msg.data);
    if (callback.t !== "ssos") return;
    if (!msg.message.reply_to_message) throw "The message you sent is missing\nPlease make sure that you haven't deleted that message";

    let chat_id = msg.message.chat.id;
    let message_id = msg.message.message_id;
    let query = msg.message.reply_to_message.text;
    let query_data = settings.gussTheQuery(query);
    query = `${query_data.title || ""} ${query_data.year || ""} ${query_data.season ? "S" + (query_data.season.length >= 2 ? query_data.season : "0" + query_data.season) : ""}${query_data.episode ? " E" + (query_data.episode.length >= 2 ? query_data.episode : "0" + query_data.episode) : ""}`.trim();

    let { err, sub } = await os({ title: query, lang: callback.l });
    if (err) throw "Unexpected error occurred\nPlease try again";

    sub = subsort(sub, query_data);

    let selSub = sub[((callback.p - 1) * 10) + callback.i];

    let baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL || "http://localhost:3000";
    let weburl = `${baseUrl}/subtitle/os/download/${encodeURI(callback.l)}-${((callback.p - 1) * 10) + callback.i}/${encodeURI(query)}`;

    if (limit_end && msg.message.chat.type !== "private") throw "Sorry, you can't download subtitles from opensubtitles now. Please try again later or send request in DM.";
    else if (limit_end) return sendMessage(chat_id, "We can't download subtitles from opensubtitles for now due to server limitations. You can download by clicking the button below.", { reply_markup: Button([[["Download Subtitle", weburl, "webapp"]]]) });

    let { body: file } = await got.get(selSub.url, { responseType: "buffer" }).catch(e => null);
    if (!file) {
      limit_end = true;
      throw "Something went wrong. Please click the button again.";
    }

    file = zlib.unzipSync(file);
    fs.writeFileSync(process.cwd() + "/bot/subtitle-bot/subs/" + msg.from.id + ".sub", file);

    let { encoding } = (await encode(process.cwd() + "/bot/subtitle-bot/subs/" + msg.from.id + ".sub").catch(() => null)) || { encoding: "UTF-8" };
    if (encoding !== "UTF-8") {
      file = encoder.convert(file, "UTF-8", encoding);
      fs.writeFileSync(process.cwd() + "/bot/subtitle-bot/subs/" + msg.from.id + ".sub", file);
    }

    await sendDocument(chat_id, process.cwd() + "/bot/subtitle-bot/subs/" + msg.from.id + ".sub", {
      caption: `<code>Subtitle Provided by:</code> opensubtitles.org\n\n<code>Subtitle Downloaded by:</code> @munax_sub_bot\n\nLanguage: ${selSub.lang}\n\n${(callback.l === "all" ? "You can translate this subtitle using our bot\n\n" : "")}`,
      parse_mode: "html",
      reply_markup: Button([[["Write a feedback", "https://t.me/tlgrmcbot?start=munax_sub_bot-review", "url"]]])
    }, { filename: selSub.title });
    sendMessage(adminId, `user: <code>${msg.from.first_name || ""} ${msg.from.last_name || ""}</code>\nid: <code>${msg.from.id}</code>\napi: <code>Opensubtitles</code>\nkey: ${msg.message.reply_to_message.text || ""}\nusername: ${msg.from.username || ""}\nselected: ${selSub.title || ""}\nlanguage: <code>${selSub.lang}</code>`);

    fs.unlinkSync(process.cwd() + "/bot/subtitle-bot/subs/" + msg.from.id + ".sub");

    if (!selSub.season && !selSub.episode) return;

    sendMessage(chat_id, "You can download all subtitles of this series from season " + sub.season + " by clicking the button below.", { reply_markup: Button([[["Download season subtitles", weburl, "webapp"]]]) });

  } catch (e) {
    if (typeof e === "string") return answer(msg.id, e);
    console.log(e);
    return answer(msg.id, "Unexpected error occurred. Please try again.");
  }
});

router.get("/download/:data/:query", (req, res) => {
  try {
    sendMessage(adminId, "One user used webapp");

    let { data, query } = req.params;
    let [lang, ind] = data.split("-");

    return res.render("subtitles/index", { title: "Subtitle download from opensubtitles", query, lang, ind, headerChange: true, telegram: true });
  } catch (e) {
    res.end("Something went wrong");
  }
});

router.get("/getData", async (req, res) => {
  try {
    let { lang, ind, query } = req.query;
    query_data = settings.gussTheQuery(query);

    let { err, sub } = await os({ title: query, lang });

    if (err) throw err;

    sub = subsort(sub, query_data)[ind];
    let fakesub = sub;
    let imdbid = (String(sub.imdbid).length < 7 ? ("0000000" + String(sub.imdbid)).split("").reverse().slice(0, 7).reverse().join("") : sub.imdbid);
    let imdbData = await got.get(`${tmdb_base}/find/tt${imdbid}?api_key=${tmdb_key}&external_source=imdb_id`).json();

    let resObj = { sts: true };
    if (imdbData.movie_results.length) {
      resObj.data = imdbData.movie_results[0];
      resObj.subs = [sub];
    } else if (imdbData.tv_results.length) {
      query_data.title = imdbData.tv_results[0].name;
      try {
        let selSeason = Number(sub.season),
          selYear = Number(sub.year);

        let tvData = await got.get(`${tmdb_base}/tv/${imdbData.tv_results[0].id}?api_key=${tmdb_key}`).json();
        let [season] = tvData.seasons.filter(x => x.season_number === selSeason);

        sub = (await os({ title: `${query_data.title} S${sub.season || ""}`, lang })).sub ||
              (await os({ title: `${query_data.title} ${sub.season || ""}`, lang })).sub ||
              (await os({ title: query_data.title, lang })).sub;
        if (!sub) throw "Something went wrong";

        sub = sub.filter(x => {
          if (selSeason == x.season && Number(x.imdbid) == Number(imdbid)) return true;
          else return false;
        });

        if (!season) {
          season = {
            episode_count: sub.reduce((t, c) => (c.episode > t ? c.episode : t), 1),
            backdrop_path: imdbData.backdrop_path,
            poster_path: imdbData.tv_results[0].poster_path,
            overview: imdbData.tv_results[0].overview
          };
        }

        let allEps = [];
        for (var i = 1; i <= season.episode_count; i++) {
          let [ep] = sub.filter(x => x.episode == i);

          if (ep) {
            allEps.push(ep);
            continue;
          }

          let nexep = (await os({ title: `${query_data.title} ${selYear} S${selSeason} E${i}`, lang })).sub;
          if (!nexep) continue;

          ep = nexep.filter(x => (Number(x.imdbid) == Number(imdbid) && x.season == selSeason && x.episode == i));
          if (ep.length) continue;

          allEps.push(ep[0]);
        }
        imdbData.tv_results[0].poster_path = season.poster_path || imdbData.tv_results[0].poster_path;
        imdbData.tv_results[0].backdrop_path = season.backdrop_path || imdbData.tv_results[0].backdrop_path;
        imdbData.tv_results[0].overview = season.overview || imdbData.tv_results[0].overview;
        resObj.subs = allEps;
        resObj.data = imdbData.tv_results[0];
      } catch {
        resObj.subs = [fakesub];
        resObj.data = imdbData.tv_results[0];
      }
    }
    resObj.data.genre_names = getGenreNameArray(resObj.data.genre_ids);
    resObj.data.lang = langs.where("1", resObj.data.original_language);

    return res.json(resObj);
  } catch (e) {
    console.log(e);
    res.json({ sts: false });
  }
});

router.post("/upload", async (req, res) => {
  try {
    let id = Date.now(),
      user = Number(req.body.user);

    await req.files.file.mv(process.cwd() + "/bot/subtitle-bot/subs/" + id + ".sub");

    let file = fs.readFileSync(process.cwd() + "/bot/subtitle-bot/subs/" + id + ".sub");
    file = zlib.unzipSync(file);
    fs.writeFileSync(process.cwd() + "/bot/subtitle-bot/subs/" + id + ".sub", file);

    let { encoding } = (await encode(process.cwd() + "/bot/subtitle-bot/subs/" + id + ".sub").catch(() => null)) || { encoding: "UTF-8" };
    if (encoding !== "UTF-8") {
      file = encoder.convert(file, "UTF-8", encoding);
      fs.writeFileSync(process.cwd() + "/bot/subtitle-bot/subs/" + id + ".sub", file);
    }

    await sendDocument(user, process.cwd() + "/bot/subtitle-bot/subs/" + id + ".sub", {
      caption: `<code>Subtitle Provided by:</code> opensubtitles.org\n\n<code>Subtitle Downloaded by:</code> @munax_sub_bot`,
      reply_markup: Button([[["Write a review", "https://t.me/tlgrmcbot?start=munax_sub_bot-review", "url"]]]),
      parse_mode: "html"
    }, { filename: req.files.file.name });
    fs.unlinkSync(process.cwd() + "/bot/subtitle-bot/subs/" + id + ".sub");
    res.end();
  } catch (e) {
    console.log(e);
    return res.json({ sts: false });
  }
});

// Helper function (missing from original, added for completeness)
async function os({ title, lang }) {
  // This function needs to be implemented or imported from subtitle_finder.js
  // For now, we'll assume it's available globally or import it
  const { os: osFinder } = require("../src/subtitle_finder");
  return await osFinder({ title, lang });
}

module.exports.Router = router;
