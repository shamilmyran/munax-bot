// requiring local packages
const { bot, adminId } = require("../config");
const { sendMessage: send, editMessage: edit, deleteMsg, sendDocument, Button, answerCallback: answer, sendPhoto } = require("./src/messenger");
const db = require("../../helper/db");
const settings = require("./src/settings");
const languages = require("./src/languages");
const batchTrans = require("./src/batch_translate").routes;

// requiring npm packages
const router = require("express").Router();
const got = require("got");
const fs = require("fs");
const { encode: htmlEnc } = require("html-entities");

// setting constants
const sup_ext = ["ass", "srt", "ttml", "dfxp", "vtt", "scc", "ssa", "xml", "txt"];
const ext_size = { ass: 0.25, srt: 0.4, ttml: 0.4, ssa: 0.35, dfxp: 0.4, scc: 0.4, xml: 0.4, txt: 0.4 };
const root = process.cwd() + "/bot/translate-bot";

router.use("/batch", batchTrans);

// Base URL helper
const baseUrl = () => process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL || "http://localhost:3000";

// ========== START COMMAND ==========
bot.onText(/^\/start$/, async msg => {
  try {
    let rpl = `
    <b>Hi ${msg.from.first_name || " "} ${msg.from.last_name || ""} 👋👋</b>\n\n<i>I am a 🤖 for translating subtitles</i>\n\n<u>I can translate subtitles📄 to 10+ languages. Use /languages to see all.</u>\n\n<code>I can also translate multiple files📁 at once 🎉</code>
    `;
    let chat = msg.chat.id;

    send(chat, rpl);

    let usercheck = await db.get("user_datas", { user: msg.from.id }, true);
    if (usercheck && usercheck.bots.includes("translate")) return;
    console.log(usercheck);

    send(adminId, `🎉 New user joined munax translator bot\n👤 ID: ${msg.from.id}\n📝 Name: ${msg.from.first_name || ""} ${msg.from.last_name || ""}\n🆔 Username: ${msg.from.username || "no username"}`);
    if (!usercheck) {
      await db.set("user_datas", { user: msg.from.id, bots: ["translate"] });
      return;
    }
    usercheck.bots.push("translate");
    await db.update("user_datas", { user: msg.from.id }, { bots: usercheck.bots });
  } catch {}
});

// ========== DOCUMENT HANDLER ==========
bot.on("document", msg => {
  addDocQue.push(msg);
  if (!addDocLoop) addDoc();
});

// ========== TEXT HANDLER ==========
bot.on("text", async msg => {
  try {
    if (/^cancel$/.test(msg.text.toLowerCase().trim()) || /^\//.test(msg.text)) return;

    let id = msg.from.id;
    let data = await db.get("translate", { user: id }, true);
    if (!data) throw "😕 First send a subtitle file 📁";
    if (data.lang || data.files.length > 1) return send(id, "<pre>You don't need to send your language when you are in batch mode</pre>\n\n<b>Just click the button below to start translation</b>", { reply_markup: Button([[["Start translation", baseUrl() + "/translate/batch", "webapp"]]]) });

    deleteMsg(id, msg.message_id);

    if (!await settings.limitSts(id)) return send(id, "Your daily translation limit was exceeded\n\n<i>You can check your limit using /logs command</i>\n\n<u>You can translate this subtitle using batch download option – click the button below</u>", { reply_markup: Button([[["Start Translate", baseUrl() + "/translate/batch", "webapp"]]]) });

    if (!settings.isAvileLang(msg.text)) throw `The language name or code you sent (<u>${msg.text}</u>) is not supported\n\n<b>Use /languages to see supported languages.</b>`;

    db.delete("translate", { user: id });

    edit("<pre>Trying to add your request to the translation queue</pre>\nPlease wait...", { chat_id: id, message_id: data.edit_msg_id });

    let file_url = await bot.getFileLink(data.files[0]);

    delete data.files;
    data = { ...data, file_url, webhook: baseUrl() + "/translate/webhook/", lang: msg.text };

    let { err, sts } = await got.post(baseUrl() + "/api/translate/addUser", { json: data }).json();

    if (!sts) throw (err || "Something went wrong");

    edit("Your translation request was successfully added to the queue.", { chat_id: id, message_id: data.edit_msg_id });

  } catch (e) {
    if (typeof e !== "string") {
      console.log(e);
      e = "Unexpected Error Occurred";
    }
    send(msg.chat.id, e);
  }
});

// ========== LANGUAGES COMMAND ==========
bot.onText(/^\/languages$/, async msg => {
  try {
    let allLangs = Object.entries(languages);
    let addWhiteSpace = (c, t) => {
      let spaces = "";
      for (var i = c; i <= t; i++) spaces += " ";
      return spaces;
    };

    let rpl = allLangs.reduce((t, c) => {
      if (c[0] == "auto") return t;
      t += `| ${c[1]}${addWhiteSpace(c[1].length + 1, 22)}| ${c[0]}${addWhiteSpace(c[0].length + 1, 6)}|\n`;
      return t;
    }, `<pre> -------------------------------\n|       language        | code  |\n -------------------------------\n`);
    rpl += " -------------------------------</pre>";
    rpl = rpl.split("\n");

    let first = rpl.splice(0, 100).join("\n") + "</pre>";
    let sec = "<pre>" + rpl.join("\n");
    await send(msg.chat.id, first);
    send(msg.chat.id, sec);
  } catch { return; }
});

// ========== CANCEL COMMAND ==========
bot.onText(/^(\/cancel|cancel|Cancel)$/, async msg => {
  try {
    let id = msg.from.id;
    deleteMsg(id, msg.message_id);

    let { data, sts, err } = settings.getData(id);
    let dbdata = await db.get("translate", { user: id }, true);
    if (!sts && !dbdata) throw "We can't find your previous request on our server";

    data = data || dbdata;

    let rpl = `<pre>Are you sure you want to cancel this request?</pre>\n\n<b>Filename:</b> <u>${htmlEnc(data.filename)}</u>`;
    let btn = Button([[["Yes, cancel the request", { t: "cancel", d: "y" }]], [["No, keep the request", { t: "cancel", d: "n" }]]]);

    send(id, rpl, { reply_markup: btn });

  } catch (e) {
    if (typeof e !== "string") {
      console.log(e);
      e = "Unexpected error occurred while canceling your request";
    }
    send(msg.from.id, e);
  }
});

// ========== DONATE COMMAND ==========
bot.onText(/\/donate/, (msg) => {
  let id = msg.chat.id;
  send(id, `Hi <b>${htmlEnc(msg.from.first_name || "")} ${htmlEnc(msg.from.last_name || "")}</b>\n<pre>Thanks for deciding to donate</pre>\n\n<u>Donation is not mandatory, donate only if you like the bot</u>\n\nPAYPAL: <pre>afsalcp66</pre>\nUPI ID: <pre>cpafsal66@okaxis</pre>`, {
    reply_markup: { inline_keyboard: [[{ text: "Donate Now (PayPal)", url: "https://www.paypal.com/paypalme/afsalcp66" }]] }
  });
});

// ========== LOGS COMMAND ==========
bot.onText(/\/logs/, (msg) => {
  let id = msg.chat.id;
  let url = `${baseUrl()}/logs/?id=${msg.from.id}`;
  let txt = `Hi <b>${msg.from.first_name}</b>\n\nYou can view your translation logs by clicking the link below:\n<a href="${url}"><b>View translation logs</b></a>`;
  send(id, txt, { parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "View Logs", url }]] } });
});

// ========== ID COMMAND ==========
bot.onText(/\/id/, (msg) => {
  send(msg.chat.id, `User Id: \`${msg.from.id}\``, { parse_mode: "markdown" });
});

// ========== CALLBACK QUERY HANDLER ==========
bot.on("callback_query", async msg => {
  try {
    let id = msg.from.id;
    let callback = JSON.parse(msg.data);

    if (callback.t !== "cancel") return;

    let { data, sts } = settings.getData(id);
    let dbdata = await db.get("translate", { user: id }, true);
    if (!sts && !dbdata) throw "We can't find any of your requests on our server at this moment";

    data = data || dbdata;

    if (callback.d === "n") {
      answer(msg.id, "Okay, we won't remove your request this time 😊");
    } else {
      answer(msg.id, "Okay, we're trying to remove your request...");
      settings.removeUser(id);
      db.db.get().collection("translate").deleteMany({ user: id }).catch(console.log);
      db.update("usage", { user: id }, { batch: null });
      deleteMsg(id, data.edit_msg_id);
    }

    setTimeout(() => {
      deleteMsg(id, msg.message.message_id);
    }, 2000);

  } catch (e) {
    if (typeof e !== "string") {
      console.log(e);
      e = "Something went wrong, please try again";
    }
    answer(msg.id, e);
  }
});

// ========== ADMIN COMMANDS ==========
bot.onText(/\/send/, (msg, match) => {
  let id = msg.chat.id;
  if (adminId == id) {
    var text = match.input.replace("/send ", '').split("|");
    var userId = text[0];
    var adminMsg = text[1];
    send(userId, adminMsg);
  }
});

bot.onText(/\/get_member/, async (msg) => {
  try {
    if (adminId == msg.from.id) {
      var memberId = (msg.text.split(" ")[1]) || adminId;
      let user = JSON.stringify(await bot.getChat(memberId));
      send(adminId, htmlEnc(user));
    }
  } catch (e) {
    console.log(e);
  }
});

bot.onText(/^\/count$/, async (msg) => {
  if (msg.chat.id != adminId) return;
  let count = await db.count("user_datas", { bots: { $in: ["translate"] } });
  send(adminId, "👥 Total munax translator users: " + count);
});

bot.onText(/^\/notify/, async msg => {
  try {
    if (msg.chat.id != adminId) return;
    let text = msg.text.replace("/notify", "");

    // extracting buttons
    let btn = text.match(/btn::\[\[\[.+\]\]\]/);
    if (btn) {
      btn = btn[0].replace("btn::", "");
      btn = Button(JSON.parse(btn));
      text = text.replace(/btn::\[\[\[.+/, "");
    }
    let img = text.match(/img::.+/);
    if (img) {
      img = img[0].replace("img::", "");
      text = text.replace("img::" + img, "");
    }
    let users;
    let test = text.match(/test::.+/);

    if (test) users = [{ user: adminId }];
    else users = await db.get("user_datas", { bots: { $in: ["translate"] } });

    var i = 0;
    let m = await send(adminId, "📨 Broadcast started...");
    let time = Date.now() / 1000;
    let len = users.length;
    for (let { user } of users) {
      if (!(i % 25)) {
        var nt = Date.now() / 1000;
        edit(`📊 Progress: ${users.length} total, ${i} sent, ETA: ${Math.round((((nt - time) / i * len)) - (nt - time))}s`, { chat_id: adminId, message_id: m.message_id });
      }
      if (img) {
        sendPhoto(user, img, { reply_markup: btn, caption: text, parse_mode: "html" });
      } else send(user, text, { reply_markup: btn });
      i++;
      await sleep(50);
    }
    var nt = Date.now() / 1000;
    edit(`✅ Broadcast completed! Sent: ${i} messages`, { chat_id: adminId, message_id: m.message_id });
    send(adminId, "📬 Broadcast finished.");

  } catch (e) {
    console.log(e);
  }
});

bot.on("photo", async msg => {
  if (adminId == msg.chat.id) {
    let url = await bot.getFileLink(msg.photo.pop().file_id);
    send(adminId, url + "\n\n" + msg.photo.pop().file_id);
  }
});

// ========== ROUTES ==========
router.post("/webhook", async (req, res) => {
  try {
    let data = req.body;
    let base_url = baseUrl() + "/api/translate";

    if (data.type === "msg" || data.type === "err") {
      await edit(data.msg || data.err || "Unknown Text", { chat_id: data.group || data.user, message_id: data.edit_msg_id });
      if (data.type === "msg") return res.end();
      await got.get(base_url + "/removeUser?user=" + data.user);
      return res.end();
    }

    if (data.type !== "file") return res.end();

    let file = (await got.get(data.file)).body.toString("utf8");
    if (!file) {
      await edit("Unexpected error while downloading file. Please try again.", { chat_id: data.group || data.user, message_id: data.edit_msg_id });
      await got.get(base_url + "/removeUser?user=" + data.user);
      return res.end();
    }

    await fs.writeFileSync(root + "/subtitles/" + data.user + ".srt", file);
    let sendedFile = await sendDocument(data.group || data.user, root + "/subtitles/" + data.user + ".srt", {
      disable_notification: true,
      caption: `Subtitle Translated by @munax_sub_bot\n\nQuality rating: ${data.qlty}/10 (${data.qlty >= 7 ? "GOOD SUB" : "BAD SUB"})\n\n<code>After using, please share your experience.</code>`,
      parse_mode: "html",
      reply_markup: { inline_keyboard: [[{ text: "Share Your Opinion", url: "https://t.me/tlgrmcbot?start=munax_sub_bot-review" }]] }
    }, {
      filename: data.filename.split(".").reduce((t, v, i, a) => i != a.length - 1 ? t += (v + ".") : t + "@munax_sub_bot.srt", "")
    });

    await fs.unlinkSync(root + "/subtitles/" + data.user + ".srt");
    if (!sendedFile || typeof sendedFile.sts !== "undefined") {
      await edit("Unexpected error while uploading translated file. Please try again.", { chat_id: data.group || data.user, message_id: data.edit_msg_id });
      await got.get(base_url + "/removeUser?user=" + data.user);
      return res.end();
    }

    await db.updateUsage(data.user);
    await deleteMsg(data.group || data.user, data.edit_msg_id);
    await got.get(base_url + "/removeUser?user=" + data.user);
    send(adminId, `📁 File: <code>${data.filename.replace(/>|</g, "")}</code>\n🌐 Lang: <code>${data.lang}</code>\n👤 User: <code>${data.user}</code>`, { parse_mode: "html" });
    return res.end();
  } catch (e) {
    console.log(e);
    res.end();
  }
});

// ❌ Removed token-specific POST route – updates are handled by global webhook.

router.get("/reqs", async (req, res) => {
  try {
    var reqs = JSON.parse(await fs.readFileSync(`${root}/requesters.txt`).toString());
    res.json(reqs);
  } catch (err) {
    res.json({ err });
  }
});

// ========== MULTI‑FILE HANDLING ==========
const multyAddQue = [];
let multyLoop = false;

async function addMultyLooper() {
  multyLoop = true;
  while (multyAddQue.length) {
    await addMultyDoc(multyAddQue.splice(0, 1)[0]);
  }
  multyLoop = false;
}

async function addMultyDoc(req) {
  try {
    let id = req.from.id;
    let usage = await db.get("usage", { user: id }, true);
    let thisUsage = req.document.file_size * (ext_size[req.document.file_name.split(".").pop().toLowerCase()] || 0.4);

    if (!usage || !usage.batch) {
      if (!usage) usage = {};
      let now = new Date();
      let lastHourTime = (new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0)).getTime();
      let batch = { hour: lastHourTime, used: 0 };
      usage.batch = batch;
    }

    if (usage.batch.used + thisUsage > 850000 && (Date.now() - usage.batch.hour) < 60 * 60 * 1000) {
      throw `Your translation limit for this hour was exceeded.\n\n<u>You can translate up to 850,000 letters per hour.</u> <pre>You have already used ${usage.batch.used}</pre>\n\nTry again next hour.`;
    }

    if (Date.now() - usage.batch.hour > 60 * 60 * 1000) {
      let now = new Date();
      usage.batch.hour = (new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0)).getTime();
      usage.batch.used = thisUsage;
    } else {
      usage.batch.used += thisUsage;
    }
    await db.update("usage", { user: id }, { batch: usage.batch });

    await db.db.get().collection("translate").updateOne(
      { user: id },
      { $push: { files: req.document.file_id, filenames: req.document.file_name } }
    );

    let data = await db.get("translate", { user: id }, true);
    if (!data) throw Error();

    deleteMsg(id, data.edit_msg_id);

    let rpl = `${data.files.length == 2 ? "✅ Your translation mode changed to batch download.\n\n" : ""}Currently added files for batch:\n\n${data.filenames.reduce((t, c, i) => t += `<b>${i + 1})</b><pre> ${c}</pre>\n`, '')}\n\nYou have used <b><u>${Math.round(usage.batch.used / 850000 * 100)}%</u></b> of your hourly limit.\n\n<b><i>Click below to start batch translation.</i></b>`;
    let btn = Button([[["Start batch translation", baseUrl() + "/translate/batch", "webapp"]]]);
    let msg = await send(id, rpl, { reply_markup: btn });

    await db.update("translate", { user: id }, { edit_msg_id: msg.message_id });

  } catch (e) {
    if (typeof e !== "string") {
      console.log(e);
      e = "Something went wrong while adding this file to the batch.";
    }
    send(req.from.id, e);
  }
}

const addDocQue = [];
let addDocLoop = false;

async function addDoc() {
  addDocLoop = true;
  while (addDocQue.length) {
    let msg = addDocQue.splice(0, 1)[0];
    try {
      let id = msg.from.id;
      let chat = msg.chat.id;
      let document = msg.document;

      let file_ext = document.file_name.split(".").at(-1);
      if (!sup_ext.includes(file_ext)) throw `File format <b>${file_ext}</b> is not supported.\nSupported formats: <u>${sup_ext.join(", ")}</u>`;
      if (document.file_size > 2 * 1024 * 1024) throw "File size exceeds 2 MB – we only support up to 2 MB per file.";

      let data = await db.get("translate", { user: id }, true);
      if (!data) {
        let rpl = `Please send your language name or ISO code.\n\n<u>Use /languages to see available languages.</u>\n\n<b>You can translate multiple files at once (beta) – just send more files before sending the language.</b>`;
        let m = await send(chat, rpl);
        if (m instanceof Error || !m || !m.message_id) continue;
        await db.set("translate", {
          user: id,
          files: [document.file_id],
          edit_msg_id: m.message_id,
          filename: document.file_name,
          msg_id: msg.message_id,
          filenames: [document.file_name]
        });
        continue;
      }
      multyAddQue.push(msg);
      if (!multyLoop) addMultyLooper();
    } catch (e) {
      if (typeof e !== "string") {
        console.log(e);
        e = "Unexpected error occurred. Please try again.";
      }
      send(msg.chat.id, e);
    }
  }
  addDocLoop = false;
}

module.exports = router;
