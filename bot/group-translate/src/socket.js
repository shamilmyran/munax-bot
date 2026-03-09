const io = new require("socket.io")({ path: "/group/socket.io" });
const got = require("got");
const router = require("express").Router();
const {
  sendMessage,
  editMessage,
  deleteMsg,
  sendDocument,
  Button
} = require("./messenger");
const fs = require("fs");
const root = process.cwd() + "/bot/group-translate";
const emit = require("../../translate-bot/src/batch_translate").emit;
const settings = require("../../translate-bot/src/settings");
const advertise = require("../../translate-bot/src/advertise");
const { encode: htmlEnt } = require("html-entities");
const { bot, groupId } = require("../../config");

// Base URL helper
const baseUrl = () => process.env.RENDER_EXTERNAL_URL || process.env.HEROKU_URL || "http://localhost:3000";

function checkRoom(ident) {
  return io.sockets.adapter.rooms.has(Number(ident));
}

io.on("connection", async socket => {
  try {
    console.log(socket.handshake.headers.referer.split("?uId=")[1]);
    socket.on("disconnect", () => {
      console.log("disconnected");
    });
    socket.on("join", async uId => {
      await socket.join(Number(uId));
      console.log("in joining there", uId, checkRoom(uId));
      return io.sockets.in(Number(uId)).emit("msg", "Your request was successfully sent to the server.");
    });
    socket.on("addUser", async d => {
      try {
        console.table({ tis: "is true welcome", d });
        if (!checkRoom(d.uId)) return;
        if (!d.uId) throw "User ID is not specified. Please check the URL and try again.";
        let base_url = baseUrl() + "/api/translate";
        let { sts, data, err } = await got.get(base_url + "/checkValid?uId=" + d.uId).json();
        if (!sts) throw err;
        if (data.stop) {
          await got.post(base_url + "/updateUser?user=" + data.user, { json: { stop: false } });
        }
        let { sts: sts2, err: err2 } = await got.get(base_url + "/addUserById?id=" + data.user).json();
        if (!sts2 || err2) throw {};
        if (data.type) {
          return await io.sockets.in(data.type, data.msg || data.file);
        }
        return;
      } catch (e) {
        if (typeof e === "string") return io.sockets.in(Number(d.uId)).emit("err", e);
        console.log(e);
        io.sockets.in(Number(d.uId)).emit("err", "Unexpected error occurred.");
      }
    });
    socket.on("removeUser", async ({ uId }) => {
      try {
        if (!uId) return;
        let base_url = baseUrl() + "/api/translate";
        let { data, sts } = await got.get(base_url + "/checkValid?uId=" + uId).json();
        if (!data && !sts) return;
        await got.get(base_url + "/removeUser?user=" + data.user);
        return;
      } catch (e) {
        return console.log(e);
      }
    });
    socket.on("stop", async uId => {
      try {
        let { sts, data, err } = await got.get(baseUrl() + "/api/translate/checkValid?uId=" + uId).json();
        console.log("socket stopped", sts, data, err);
        if (!sts) return;
        await got.post(baseUrl() + "/api/translate/updateUser?user=" + data.user, { json: { stop: true } });
        await editMessage(`We detected that you left the page, so the translation process has been stopped.`, {
          chat_id: data.group,
          message_id: data.edit_msg_id
        });
        await got.get(baseUrl() + "/api/translate/removeUser?user=" + data.user);
        return;
      } catch (e) {
        return console.log(e);
      }
    });
    router.get("/hi", (req, res) => res.json({ hi: "it works" }));
  } catch (e) {
    console.log(e);
    return;
  }
});

router.post("/", async (req, res) => {
  try {
    let user = req.body;
    if (!user) return res.end();
    let base_url = baseUrl() + "/api/translate";
    res.end();
    let { data, err } = await got.get(base_url + "/checkUser?user=" + user.user).json();
    console.log("in webhook top", user);

    if (!data) return io.sockets.in(user.id).emit("err", err);

    if (user.type === "file") {
      if (data.stop) return;
      if (!checkRoom(user.id)) {
        await editMessage(`We detected that you left the page, so the translation process has been stopped.`, {
          chat_id: data.group,
          message_id: data.edit_msg_id
        });
        await got.get(base_url + "/removeUser?user=" + user.user);
        return;
      }

      let file = (await got.get(user.file)).body.toString("utf8");
      if (!file) {
        await got.get(base_url + "/removeUser?user=" + user.user);
        return await io.sockets.in(user.id).emit("err", "Unexpected error when downloading translated file.");
      }

      await got.post(base_url + "/updateUser?user=" + user.user, { json: { type: "file", file: user.file } });

      await fs.writeFileSync(root + "/subs/" + user.user + ".srt", file);

      let sendedFile = await sendDocument(data.group, root + "/subs/" + data.user + ".srt", {
        disable_notification: true,
        caption: `Subtitle translated by @munax_sub_bot\n\n<code>After using, please rate your experience.</code>`,
        parse_mode: "html",
        reply_markup: {
          inline_keyboard: [[{ text: "Share Your Opinion", url: "https://t.me/tlgrmcbot?start=munax_sub_bot-review" }]]
        }
      }, {
        filename: data.filename.split(".").reduce((t, v, i, a) => i != a.length - 1 ? t += (v + ".") : t + "@munax_sub_bot.srt", "")
      });

      await fs.unlinkSync(root + "/subs/" + data.user + ".srt");
      if (!sendedFile || typeof sendedFile.sts !== "undefined") {
        await got.get(base_url + "/removeUser?user=" + user.user);
        return await io.sockets.in(user.id).emit("err", "Unexpected error while uploading translated file.");
      }

      await deleteMsg(data.group, data.edit_msg_id);
      await got.get(base_url + "/removeUser?user=" + data.user);

      return io.sockets.in(user.id).emit("file", { msg_id: sendedFile.message_id, user: user.group });
    } else {
      if (!checkRoom(user.id)) return;
      await io.sockets.in(Number(user.id)).emit(user.type, user.msg);
      return;
    }
  } catch (e) {
    console.log(e);
    return;
  }
});

router.get("/batch", (req, res) => {
  try {
    res.render("translate/batch", { headerChange: true, telegram: true, tr_lang: "ml" });
  } catch { }
});

router.get("/batch/download", async (req, res) => {
  try {
    let { id, user } = req.query;
    let file = fs.readFileSync(root + "/subs/" + id + ".srt").toString();
    fs.unlinkSync(root + "/subs/" + id + ".srt");

    if (!file) throw "File not found";

    file = settings.subtitle_convert(file);
    if (!file.sts) return emit(user, "sub_error", id);

    file = file.subtitle;
    let fullOne = settings.fullOne(file);
    let lineByLine = settings.lineByLine(fullOne);
    let order = settings.ordering(lineByLine);
    order = settings.find_unended_lines(order, true);
    let qlty = order.qlty;
    order = order.order;

    fs.writeFileSync(root + "/" + id + ".txt", JSON.stringify(order));
    order = (await advertise(root + "/" + id + ".txt")) || order;

    let fullText = order.reduce((t, c) => {
      if (c.text) t += c.text + "\n";
      return t;
    }, '');

    let resData = { sts: true, id, data: htmlEnt(fullText.replace(/<(\/{0,1})(br|i).*?>/g, "")), qlty };
    res.json(resData);
  } catch (e) {
    if (typeof e !== "string") {
      console.log(e);
      e = "Something went wrong";
    }
    res.json({ sts: false, err: e });
    emit(req.query.user, "alert", e);
  }
});

router.post("/batch/upload", async (req, res) => {
  try {
    let { text, order: oid, filename, user, id, lang, qlty } = req.body;
    user = Number(user);
    res.end();

    let order = JSON.parse(fs.readFileSync(root + "/" + oid + ".txt"));
    fs.unlinkSync(root + "/" + oid + ".txt");

    let textarr = text.split("\n");
    text = "";
    for (let i of order) {
      if (!i.text) {
        text += "\n";
        continue;
      }
      text += textarr.splice(0, 1)[0] + "\n";
    }

    await new Promise(r => {
      settings.decode(text.split("\n"), order, async sub => {
        sub = await settings.decodeAds(sub);
        fs.writeFileSync(root + "/subs/" + oid + ".srt", sub);
        r();
      });
    });

    filename = filename.split(".");
    filename.pop();
    filename = filename.join(".") + "@munax_sub_bot.srt";

    let doc = await sendDocument(user, root + "/subs/" + oid + ".srt", {
      caption: `<pre>${filename}</pre>\n\nQuality rating: ${qlty}/10 (${qlty >= 7 ? "GOOD SUB" : "BAD SUB"})\n\nSubtitle translated by @munax_sub_bot\n\n<b><i>Share your opinion about the translated subtitle</i></b>\n\n<b>BATCH TRANSLATION</b>`,
      reply_markup: Button([[["Share your opinion", "https://t.me/tlgrmcbot?start=munax_sub_bot-review", "url"]]]),
      parse_mode: "html"
    }, { filename });

    console.log(doc);
    bot.forwardMessage(groupId, user, doc.message_id);
    fs.unlinkSync(root + "/subs/" + oid + ".srt");
    return emit(user, "sub_success", id);
  } catch (e) {
    console.log(e);
    if (typeof e !== "string") e = "Something went wrong while uploading " + req.body.filename;
    emit(req.body.user, "alert", e);
  }
});

module.exports.io = io;
module.exports.Router = router;
