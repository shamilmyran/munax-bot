const request = require("request");
const db = require("../../../database");
const { Button } = require("./messenger");

// Your bot's username (set via environment or hardcoded)
const BOT_USERNAME = process.env.BOT_USERNAME || "munax_sub_bot";

// Base URL helper
const baseUrl = () => process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL || "http://localhost:3000";

module.exports = {
  argument: (lang) => {
    // Trim spaces from the language string
    lang = lang.split("");
    while (lang.length) {
      if (lang[0] == " ") lang.splice(0, 1);
      else break;
    }
    return lang.join("");
  },

  to_inline_keyboard_OS: (subs = [], userData, page) => {
    try {
      let inline_sub = [];
      for (let i in subs) {
        inline_sub.push([{
          text: subs[i].title,
          callback_data: JSON.stringify({ t: "OSS", i: i })
        }]);
      }

      let inline = [];
      while (inline_sub.length) {
        inline.push({ inline_keyboard: inline_sub.splice(0, 10) });
      }

      let nextPrevBtn = [
        { text: "⇐", callback_data: JSON.stringify({ t: "OSP", page }) },
        { text: "⇒", callback_data: JSON.stringify({ t: "OSN", page }) }
      ];

      let searchOther = [
        { text: "🔎 SUBSCENE", callback_data: JSON.stringify({ t: "web", d: "SS" }) },
        { text: "🔎 MSON", callback_data: JSON.stringify({ t: "web", d: "MS" }) }
      ];

      let userDataBtn = [{
        text: `(${page}/${inline.length}) ${userData.title}`,
        callback_data: JSON.stringify({
          t: "OSD",
          data: [userData.imdbid || null, userData.lang || "any", page, inline.length]
        })
      }];

      inline = inline[parseInt(page) - 1];
      inline.inline_keyboard.push(nextPrevBtn, searchOther, userDataBtn);
      return inline;
    } catch (err) {
      return { inline_keyboard: [[{ text: "An error occurred. Try again.", callback_data: JSON.stringify({ t: "buttonError" }) }]] };
    }
  },

  inline_subscene_SS: (data, page, query, totalPage) => {
    let row = [];
    for (let i in data) {
      row.push([{
        text: data[i].title,
        callback_data: JSON.stringify({ t: "SSSR", i, page })
      }]);
    }
    row.push([
      { text: "⇐", callback_data: JSON.stringify({ t: "SSSRB", page }) },
      { text: "⇒", callback_data: JSON.stringify({ t: "SSSRN", page }) }
    ]);
    row.push([
      { text: "🔎 OPENSUBTITLES", callback_data: JSON.stringify({ t: "web", d: "OS" }) },
      { text: "🔎 MSON", callback_data: JSON.stringify({ t: "web", d: "MS" }) }
    ]);
    row.push([{
      text: `(${page}/${totalPage}) ${query}`,
      callback_data: JSON.stringify({ t: "SSD", tp: totalPage })
    }]);
    return row;
  },

  inline_subtitle_SS_sub: (res, page) => {
    let row = [];
    page = parseInt(page);
    let t = String(res.length / 10).split(".");
    t = (t.length > 1) ? parseInt(t[0]) + 1 : parseInt(t[0]);
    res = res.splice((page - 1) * 10, 10);
    res.map((e, i) => {
      row.push([{
        text: e.title,
        callback_data: JSON.stringify({ t: "SSSTR", i, page })
      }]);
    });
    row.push([
      { text: "⇐", callback_data: JSON.stringify({ t: "SSSTB", page }) },
      { text: "⇒", callback_data: JSON.stringify({ t: "SSSTN", page, totel: t }) }
    ]);
    row.push([{ text: `(${page}/${t})`, callback_data: `{"t":"SSSTD"}` }]);
    return { inline_keyboard: row, resize_keyboard: true };
  },

  inline_SS_zip: (files, page = 1, path) => {
    let row = [];
    let t = String((files.length / 10)).split(".");
    t = (t.length === 1) ? Number(t[0]) : Number(t[0]) + 1;
    page = parseInt(page);
    files = files.splice((page - 1) * 10, 10);
    files.map((e, i) => {
      row.push([{
        text: e.filename,
        callback_data: JSON.stringify({ t: "SSZS", i, p: page })
      }]);
    });
    row.push([
      { text: "⇐", callback_data: JSON.stringify({ t: "SSZP", p: page, tp: t }) },
      { text: "⇒", callback_data: JSON.stringify({ t: "SSZN", p: page, tp: t }) }
    ]);
    row.push([{ text: `pages (${page}/${t})`, callback_data: `{"t":"SSZD"}` }]);
    row.push([{
      text: "Translate all files",
      url: `https://${BOT_USERNAME}.t.me?start=ss-${path}`
    }]);
    return { inline_keyboard: row };
  },

  inline_MS: (res) => {
    let { data, page, pages } = res;
    let btns = [];
    for (let i in data) {
      btns.push([[data[i].title, { t: "MSS", i, page }]]);
    }
    btns.push(
      [["⇐", { t: "MSP", tp: pages, page }], ["⇒", { t: "MSN", tp: pages, page }]],
      [["🔎 OPENSUBTITLES", { t: "web", d: "OS" }], ["🔎 SUBSCENE", { t: "web", d: "SS" }]],
      [[`${page}/${pages}`, { t: "MSD", tp: pages }]]
    );
    return Button(btns);
  },

  removeUser: (id) => {
    return new Promise((resolve) => {
      request(baseUrl() + "/api/translate/removeUser?user=" + id, (err, res) => {
        resolve();
      });
    });
  },

  toSearchQuery: (q) => {
    // Remove common unwanted words
    let r = /malayalam|subtitle|subtitles|english/g;
    q = q.toLowerCase().replace(r, "");
    return q;
  },

  getAds: async () => {
    try {
      let ads = await db.get().collection('ads').find().toArray();
      let wantAds = {};
      // For simplicity, return all ads regardless of URL.
      // You can adjust this logic based on your domain if needed.
      ads.forEach(ad => {
        wantAds[ad.adName] = ad.adsScript;
      });
      return wantAds;
    } catch (e) {
      console.log(e);
      return {};
    }
  }
};
