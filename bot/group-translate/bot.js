const router = require("express").Router();

// 👇 Use unified config
const { bot, adminId } = require("../config");
const groupId = process.env.GROUP_ID; // Now from environment variable

const { sendMessage, editMessage, sendDocument, deleteMsg, Button } = require("./src/messenger");
const request = require("request");
const fs = require("fs");
const settings = require("./src/settings");
const got = require("got");
const db = require("../../helper/db");
const SS = require("./src/SS");

require("./src/OS");
require("./src/SS");
require("./src/MS");
const socket = require("./src/socket");

let root = process.cwd() + "/bot/group-translate";

router.use("/webhook", socket.Router);

// ========== START COMMAND ==========
bot.onText(/^\/start$/, (msg) => {
  try {
    let chat = msg.chat.id;
    let user = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.replace(/>|</g, "");
    let reply;

    console.log(msg);
    if (msg.chat.type === "private") {
      reply = `Hi <code>${user}</code> 👋\nWelcome to **munax** – your all-in-one subtitle bot!\n\n🔍 Find subtitles\n🔄 Translate them\n👥 Works in groups!\n\nTry sending a movie name or subtitle file.`;
    } else {
      if (msg.chat.id != groupId) throw "This bot only works in the authorized group.";
      reply = `ഹായ് <code>${user}</code>\n\n<b>ഞാൻ സബ്ടൈറ്റിലുകൾ കണ്ടെത്താനും പരിഭാഷ ചെയ്യാനും വേണ്ടിയുള്ള ബോട്ട് ആണ്</b>\n\n<u>നിങ്ങൾക്ക് പരിഭാഷ ചെയ്യേണ്ട സിനിമയുടെയോ/സീരീസിന്റെയോ പേര് എനിക്ക് അയച്ച് തരുക</u>\n\nഅല്ലെങ്കിൽ പരിഭാഷ ചെയ്യേണ്ട ഫയൽ എനിക്ക് അയച്ച് തരിക`;
    }
    sendMessage(chat, reply, { reply_to_message_id: msg.message_id });
  } catch (e) {
    console.log(e);
  }
});

// ========== BATCH TRANSLATION ==========
bot.onText(/^\/start ss-(\d+)/i, async (msg, path) => {
  try {
    path = Number(path[1]);
    path = await bot.forwardMessage(msg.chat.id, groupId, path);
    deleteMsg(msg.chat.id, path.message_id);
    path = path.text.match(/\*#@\$::(.+)/)[1];

    let statusMsg = await sendMessage(msg.chat.id, "Processing....\nPlease wait");

    let data = await db.get("translate", { user: msg.chat.id }, true);
    if (data) return editMessage("You are already in batch mode. Use /cancel to remove the old request.", { chat_id: msg.chat.id, message_id: statusMsg.message_id });

    let files = await SS.download(path);

    await db.set("translate", {
      user: msg.chat.id,
      edit_msg_id: statusMsg.message_id,
      files: [],
      filenames: []
    });

    await got.post(`${process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL}/api/translate/addUser`, {
      json: {
        user: msg.chat.id,
        file_url: process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL,
        lang: "ml",
        webhook: `${process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL}/translate/group/webhook`,
        notStart: true
      }
    });

    for (const file of files) {
      let id = Date.now();
      fs.writeFileSync(root + "/subs/" + id + ".srt", Buffer.from(file.file.data));
      await db.db.get().collection("translate").updateOne(
        { user: msg.chat.id },
        { $push: { files: id, filenames: file.filename } }
      );
    }

    editMessage("ട്രാൻസ്‌ലേഷൻ തുടങ്ങാൻ താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്യുക", {
      chat_id: msg.chat.id,
      message_id: statusMsg.message_id,
      reply_markup: Button([[["Start translation", (process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL) + "/translate/group/webhook/batch", "webapp"]]])
    });
  } catch (e) {
    console.log(e);
  }
});

// ========== CANCEL ==========
bot.onText(/\/cancel|^cancel$|^Cancel$/, (msg) => {
  let id = msg.chat.id;
  bot.deleteMessage(id, msg.message_id).catch(() => {});
  let baseUrl = `${process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL || "http://localhost:3000"}/api/translate`;

  request(baseUrl + "/checkUser?user=" + msg.from.id, (err, res) => {
    if (!err) {
      res = JSON.parse(res.body);
      if (res.sts) {
        let inline = {
          inline_keyboard: [[{ text: "YES", callback_data: JSON.stringify({ type: "cancel", user: msg.from.id }) }]]
        };
        sendMessage(id,
          `<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>\nAre you sure you want to cancel the request?\n\n<b>FILE DETAILS:</b>\n\n<u>Filename:</u> <code>${res.data.filename}</code>`,
          { parse_mode: "html", reply_markup: inline }
        );
      } else {
        sendMessage(id, `<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>\n_No previous request found._`);
      }
    } else {
      sendMessage(id, `Unexpected error while fetching user data...\n\n\`Please try again\`\n<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>`);
    }
  });
});

// ========== TEXT HANDLER (GROUP ONLY) ==========
bot.on("text", (msg) => {
  try {
    if (msg.text.replace(/ /g, "") === "cancel" || msg.text.replace(/ /g, "") === "Cancel") return;
    if (msg.text.match(/[@<>/\\{}]/)) return;
    if (msg.chat.type === "private") throw "This bot only works in the authorized group.";
    if (msg.chat.id != groupId) return;

    let markup = {
      inline_keyboard: [
        [{ text: "Open Subtitles", callback_data: JSON.stringify({ t: "web", d: "OS" }) }],
        [{ text: "Subscene", callback_data: JSON.stringify({ t: "web", d: "SS" }) }],
        [{ text: "Msone", callback_data: JSON.stringify({ t: "web", d: "MS" }) }]
      ]
    };
    throw [
      msg.chat.id,
      "ഏത് വെബ്സൈറ്റിൽ നിന്നാണ് സബ്ടൈറ്റിൽ ഡൗൺലോഡ്/സേർച്ച് ചെയ്യേണ്ടത് എന്ന് സെലക്ട് ചെയ്യുക\n\n<u><code>ആദ്യം mson ഇൽ സേർച്ച് ചെയ്തു സബ്ടൈറ്റിൽ ഒന്നും കിട്ടിയില്ലെങ്കിൽ മറ്റു വെബ്സൈറ്റുകളിൽ സേർച്ച് ചെയ്യുന്നതാണ് നല്ലത്</code></u>",
      { reply_markup: markup, reply_to_message_id: msg.message_id }
    ];
  } catch (e) {
    if (e instanceof Error) { console.log(e); return; }
    if (Array.isArray(e)) sendMessage(...e);
    if (typeof e === "string") sendMessage(msg.chat.id, e);
  }
});

// ========== ADMIN COMMANDS ==========
bot.onText(/\/get_message/, (msg) => {
  let id = msg.chat.id;
  let msgId = msg.text.split(" ")[1];
  if (id == adminId && msgId) {
    sendMessage(groupId, "This is a debug message", { reply_to_message_id: msgId }, (m) => {
      try {
        if (!m) throw "No message found or an error.";
        bot.deleteMessage(groupId, m.message_id).catch(() => {});
        sendMessage(id, JSON.stringify(m.reply_to_message).replace(/\<|\>|\//g, ""), { parse_mode: "html" });
      } catch (e) {
        sendMessage(id, "Error: " + e.toString());
      }
    });
  }
});

bot.onText(/^\/ourbots/, (msg) => {
  try {
    sendMessage(msg.chat.id, `<a href="${process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL}">Click here</a> to learn more about our bots.`);
  } catch (e) {
    console.log(e);
  }
});

// ========== DOCUMENT HANDLER ==========
bot.on("document", async (msg) => {
  try {
    let chat = msg.chat.id;
    if (msg.chat.type === "private") throw `<b>Hi ${msg.from.first_name.replace(/>|</g, "")} !!</b>\nThis bot works only in the authorized group.`;
    if (chat != groupId) return;

    let doc = msg.document;
    let fileExt = doc.file_name.split(".").pop();
    let exts = ["ass", "srt", "ttml", "dfxp", "vtt", "scc", "ssa", "xml", "txt"];

    if (fileExt.toLowerCase() === "zip") throw "നിങ്ങള് സെന്റ് ചെയ്തത് zip ഫയലാണ്. ദയവായി അത് എക്സ്ട്രാക്ട് ചെയ്ത് സബ്ടൈറ്റിൽ ഫയൽ അയക്കുക.";
    if (!exts.includes(fileExt)) throw "നിങ്ങള് സെന്റ് ചെയ്ത " + fileExt + " ഫയല് ടൈപ്പ് സപ്പോർട്ട് ചെയ്യില്ല. സപ്പോർട്ട് ചെയ്യുന്ന ഫയൽ തരങ്ങൾ: " + exts.join(" , ");
    if (doc.file_size > 2 * 1024 * 1024) throw "പരമാവധി 2 MB വരെയുള്ള ഫയലുകളെ മാത്രമേ പരിഭാഷ ചെയ്യാൻ സാധിക്കൂ.";

    let vip = await db.get("vip", { user: String(msg.from.id) }, true);
    let m, res;
    let file_url = await bot.getFileLink(doc.file_id);
    let webhook = `${process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL}/translate/group/webhook/vip`;

    if (vip) {
      m = await sendMessage(chat, "പരിഭാഷ തുടങ്ങാൻ തയ്യാറെടുക്കുന്നു...\nദയവായി കാത്തിരിക്കുക", { reply_to_message_id: msg.message_id });
      if (!m) throw "Server error. Please try again.";
      res = await got.post(`${process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL}/api/translate/addUser`, {
        json: {
          user: msg.from.id,
          group: chat,
          lang: "ml",
          webhook: webhook,
          file_url,
          msg_id: msg.message_id,
          edit_msg_id: m.message_id,
          filename: doc.file_name
        }
      }).json();
    } else {
      let uId = Date.now();
      m = await sendMessage(chat,
        `പരിഭാഷ തുടങ്ങാൻ തയ്യാറെടുക്കുന്നു...\nദയവായി കാത്തിരിക്കുക\n<a href="tg://user?id=${msg.from.id}">${msg.from.first_name}</a>`,
        { reply_to_message_id: msg.message_id }
      );
      res = await got.post(`${process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL}/api/translate/addUser`, {
        json: {
          filename: doc.file_name,
          file_url,
          lang: "ml",
          user: msg.from.id,
          group: chat,
          msg_id: msg.message_id,
          edit_msg_id: m.message_id,
          webhook,
          id: uId
        }
      }).json();
    }

    if (res.sts) return;
    await editMessage(
      "നിങ്ങളുടെ ഒരു പഴയ റിക്വസ്റ്റ് സെർവറിൽ ഉണ്ട്. താഴെയുള്ള ബട്ടൺ ഉപയോഗിച്ച് അത് ഇല്ലാതാക്കുക.\n\n<code>പഴയ റിക്വസ്റ്റിന്റെ വിവരങ്ങൾ അറിയാൻ /cancel ഉപയോഗിക്കുക</code>",
      {
        chat_id: chat,
        message_id: m.message_id,
        reply_markup: {
          inline_keyboard: [[{ text: "പഴയ റിക്വസ്റ്റ് ഇല്ലാതാക്കുക", callback_data: `{"type":"cancel","user":${msg.from.id}}` }]]
        }
      }
    );
  } catch (e) {
    if (typeof e === "string") sendMessage(msg.chat.id, e, { reply_to_message_id: msg.message_id });
    console.log(e);
  }
});

// ========== CALLBACK QUERY HANDLER ==========
bot.on("callback_query", (msg) => {
  let id = msg.message.chat.id;
  let callback = JSON.parse(msg.data);

  if (callback.type === "cancel") {
    if (callback.user == msg.from.id) {
      let baseUrl = `${process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL || "http://localhost:3000"}/api/translate`;
      db.delete("translate", { user: Number(callback.user) });
      request(baseUrl + "/checkUser?user=" + msg.from.id, (err, res) => {
        res = res && res.body ? JSON.parse(res.body) : null;
        if (err) {
          bot.answerCallbackQuery(msg.id, "Error fetching user data.", true).catch(() => {});
        } else if (res && res.sts) {
          request(baseUrl + "/removeUser?user=" + msg.from.id, (err2) => {
            if (err2) {
              bot.answerCallbackQuery(msg.id, "Error removing data.", true).catch(() => {});
            } else {
              bot.answerCallbackQuery(msg.id, "Request removed successfully.", true).catch(() => {});
              deleteMsg(id, msg.message.message_id);
              if (res.data.group) deleteMsg(res.data.group, res.data.edit_msg_id);
            }
          });
        } else {
          bot.answerCallbackQuery(msg.id, "No data found for your request.", true).catch(() => {});
          bot.deleteMessage(id, msg.message.message_id).catch(() => {});
        }
      });
    } else {
      bot.answerCallbackQuery(msg.id, "This action is not for you.", true).catch(() => {});
    }
  }
});

// ========== FILE DOWNLOAD ENDPOINT ==========
router.get("/getFile", async (req, res) => {
  try {
    let id = req.query.id;
    let file = await fs.readFileSync(`${root}/subs/${id}.srt`).toString("utf8");
    await fs.unlinkSync(`${root}/subs/${id}.srt`);
    return res.send(file).status(200);
  } catch (e) {
    await fs.unlinkSync(`${root}/subs/${id}.srt`).catch(() => {});
    return res.end("Unexpected error while getting file.");
  } finally {
    res.end();
  }
});

bot.on("polling_error", (err) => {
  console.log(err, "__pollingError__");
});

// ========== WEBHOOK (REMOVED – handled globally) ==========
// We no longer set a separate webhook per bot; the unified bot uses the global /bot/webhook.
// The following route is kept for compatibility with internal routers (socket, etc.)
router.post("/webhook", (req, res) => {
  // This is only for socket.io or other internal use; bot updates come via the global webhook.
  res.sendStatus(200);
});

// ========== START PAGE ==========
router.get("/start", async (req, res) => {
  try {
    let uId = req.query.uId;
    if (!uId) throw "Required data not found.";
    let base_url = `${process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL}/api/translate`;
    let data = await got.get(base_url + "/checkValid?uId=" + uId).json();
    if (!data) throw "Request not found. Please check the URL.";

    let ads = await settings.getAds();
    let org = (process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL).split("//")[1].split(".")[0];
    org = (org === "tgway" ? true : false); // Adjust if needed
    return res.render("translate/translator", { headerChange: true, ads, uId, group: true, org });
  } catch (e) {
    console.log(e);
    if (typeof e === "string") return res.end(e);
    else return res.end("Unexpected error. Please refresh.");
  }
});

// ========== DOWNLOAD ==========
router.get("/download", async (req, res) => {
  try {
    if (req.query.id && req.query.user) {
      let m = await bot.editMessageCaption(
        `Subtitle Translated by @munax_sub_bot\n\n<code>After using the subtitle, please rate your experience.</code>\n\n<b>Thank you :)</b>\n<code>${Date.now()}</code>`,
        {
          message_id: req.query.id,
          chat_id: req.query.user,
          parse_mode: 'html',
          reply_markup: { inline_keyboard: [[{ text: "Share Your Opinion", url: "https://t.me/tlgrmcbot?start=munax_sub_bot-review" }]] }
        }
      ).catch(e => { console.log(e); return; });
      if (!m) return res.end();

      let link = await bot.getFileLink(m.document.file_id);
      let { body } = await got.get(link, { responseType: "buffer" });
      if (!body) return res.end();

      body = body.toString("utf8");
      if (!req.query.force) body = body + "[{$filename:" + m.document.file_name;
      body = Buffer.from(body, "utf-8");
      res.set({
        'Content-Type': `${m.document.mime_type};charset=utf-8`,
        'Content-Length': m.document.file_size
      });
      if (req.query.force) res.attachment(m.document.file_name);
      return res.send(body).end();
    } else {
      return res.end();
    }
  } catch (e) {
    console.log(e);
  }
});

// ========== VIP WEBHOOK ==========
router.post("/webhook/vip", async (req, res) => {
  try {
    let data = req.body;
    let base_url = `${process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL}/api/translate`;

    if (data.type === "msg" || data.type === "err") {
      await editMessage(
        (data.msg || data.err || "Unknown Text") + `\n<a href="tg://user?id=${data.user}">user</a>`,
        { chat_id: data.group, message_id: data.edit_msg_id }
      );
      if (data.type === "msg") return res.end();
      await got.get(base_url + "/removeUser?user=" + data.user);
      return res.end();
    }

    if (data.type !== "file") return res.end();

    let file = (await got.get(data.file)).body.toString("utf8");
    if (!file) {
      await editMessage("Unexpected error while downloading file. Please try again.", { chat_id: data.group, message_id: data.edit_msg_id });
      await got.get(base_url + "/removeUser?user=" + data.user);
      return res.end();
    }

    await fs.writeFileSync(root + "/subs/" + data.user + ".srt", file);
    let sendedFile = await sendDocument(data.group, root + "/subs/" + data.user + ".srt", {
      disable_notification: true,
      caption: `Subtitle Translated by @munax_sub_bot\nRequested by <a href="tg://user?id=${data.user}">User</a>\n\n<code>After using, please rate your experience.</code>`,
      parse_mode: "html",
      reply_markup: { inline_keyboard: [[{ text: "Share Your Opinion", url: "https://t.me/tlgrmcbot?start=munax_sub_bot-review" }]] }
    }, {
      filename: data.filename.split(".").reduce((t, v, i, a) => i != a.length - 1 ? t += (v + ".") : t + "@munax_sub_bot.srt", "")
    });

    await fs.unlinkSync(root + "/subs/" + data.user + ".srt");
    if (!sendedFile || typeof sendedFile.sts !== "undefined") {
      await editMessage("Unexpected error while uploading translated file. Please try again.", { chat_id: data.group, message_id: data.edit_msg_id });
      await got.get(base_url + "/removeUser?user=" + data.user);
      return res.end();
    }

    await deleteMsg(data.group, data.edit_msg_id);
    await got.get(base_url + "/removeUser?user=" + data.user);
    return res.end();
  } catch (e) {
    console.log(e);
    res.end();
  }
});

module.exports = router;
