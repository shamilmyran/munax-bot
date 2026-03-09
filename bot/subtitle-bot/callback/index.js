const { bot } = require("../../config");
const { sendDocument, answerCallback } = require("../src/message");
const got = require("got");
const fs = require("fs");
const encode = require("detect-file-encoding-and-language");
const encoder = require("encoding");

bot.on("callback_query", async msg => {
  try {
    let callback = JSON.parse(msg.data);
    if (callback.t !== "fix_enc") return;

    let chat = msg.from.id;
    let url = await bot.getFileLink(msg.message.document.file_id);
    let file = await got.get(url, { responseType: "buffer" });
    let filePath = process.cwd() + "/bot/subtitle-bot/subs/" + chat + ".sub";
    await fs.writeFileSync(filePath, file.body);
    let { encoding } = await encode(filePath).catch(() => ({ encoding: "UTF-8" }));
    if (encoding !== "UTF-8") {
      file.body = encoder.convert(file.body, "UTF-8", encoding);
      await fs.writeFileSync(filePath, file.body);
    }
    await sendDocument(chat, filePath, { caption: msg.message.caption.replace(/If you face .+$/, "") }, { filename: msg.message.document.file_name });
    await fs.unlinkSync(filePath);
  } catch (e) {
    console.log(e);
    answerCallback(msg.id, "Unexpected error");
  }
});
