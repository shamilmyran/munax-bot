const express = require("express");
const settings = require("./src/settings");
const fs = require("fs");
const translator = require("./src/translate");
const got = require("got");
const { bot } = require("../config"); // ✅ FIXED: now uses unified config

const router = express.Router();
const root = process.cwd() + "/bot/translate-bot";
const adminId = 1591775154; // your admin ID

let helperSts = true,
    mainData = [];

const sleep = (time = Number) => {
  return new Promise(resolve => setTimeout(() => resolve(), time));
};

async function translateHelper() {
  try {
    if (!mainData.length) return helperSts = true;
    if (!translator.status()) {
      await sleep(500);
      translateHelper();
      return;
    }
    translator.change(false);
    helperSts = false;
    let sel = mainData.splice(0, 1)[0],
        { data, sts, err } = await settings.getData(sel);
    if (!sts || !data.webhook) {
      translator.change(true);
      translateHelper();
      return;
    }
    data.type = "msg";
    data.msg = "Translation process started\nPlease Wait a Few Seconds";
    await got.post(data.webhook, { json: data });

    let file = (await got.get(data.file_url, { responseType: "buffer" })).body;
    if (!file) {
      data.type = "err";
      data.msg = "Unexpected Error Occurred while file downloading";
      await got.post(data.webhook, { json: data });
      translator.change(true);
      translateHelper();
      return;
    }

    let subtitle = settings.subtitle_convert(file.toString("utf8"));
    if (!subtitle.sts) {
      data.type = "err";
      data.msg = "This File Cannot Be Converted\nTry To Translate Another File";
      await got.post(data.webhook, { json: data });
      translator.change(true);
      translateHelper();
      return;
    }

    subtitle = subtitle.subtitle;
    data.type = "msg";
    data.msg = "File downloaded successfully \nTrying to translate the file";
    await got.post(data.webhook, { json: data });

    await fs.writeFileSync(root + "/subtitles/" + data.user + ".srt", subtitle);

    const timeouter = (func) => {
      let timeout = new Promise((resolve) => {
        setTimeout(() => {
          resolve([null, null, null, true]);
        }, 100000);
      });
      return Promise.race([func, timeout]);
    };

    let [tErr, id, qlty, timeout] = await timeouter(translator.translate(data.user, data.lang));
    if (timeout) {
      data.type = "err";
      data.msg = "Translation Timeout \nSorry For This Error \nPlease Try Again Later";
      await got.post(data.webhook, { json: data });
      translator.change(true);
      translateHelper();
      return;
    }
    if (tErr) {
      data.type = "err";
      data.msg = "Unexpected Error Occurred While Translating\n Please Try Again";
      await got.post(data.webhook, { json: data });
      translator.change(true);
      translateHelper();
      return;
    }

    data.type = "file";
    data.qlty = qlty;
    data.file = `${process.env.HEROKU_URL}/api/translate/getFile?id=${id}`;
    await got.post(data.webhook, { json: data });
    translator.change(true);
    translateHelper();
    return;
  } catch (e) {
    console.log(e);
    translator.change(true);
    translateHelper();
    return;
  }
}

router.get("/checkUser", (req, res) => {
  if (req.query.user) {
    settings.getData(req.query.user, ({ sts, data, err }) => {
      if (sts) {
        res.status(200).json({ sts: true, data });
      } else res.status(200).json({ sts, err });
    });
  } else res.status(200).json({ sts: false, err: "Unexpected error While Translating" });
});

router.post("/addUser", (req, res) => {
  let userData = req.body;
  if (userData.user && userData.file_url && userData.lang && userData.webhook) {
    console.log(userData);
    settings.getData(userData.user, async ({ sts, data }) => {
      if (sts) res.json({ sts: false, err: "You Have Already Submitted A Subtitle Please Cancel The Request using /cancel command" });
      else {
        var reqList = JSON.parse(await fs.readFileSync(root + "/requesters.txt"));
        reqList.push(userData);
        await fs.writeFileSync(root + "/requesters.txt", JSON.stringify(reqList));
        if (!userData.notStart) {
          mainData.push(userData.user);
          res.json({ sts: true, data: userData, que: mainData.length });
          helperSts ? translateHelper() : null;
        } else res.json({ sts: true, data: userData, que: (mainData.indexOf(userData.user)) + 1 });
      }
    });
  } else {
    res.json({ sts: false, err: "Required Data Not Found" });
  }
});

router.get("/removeUser", (req, res) => {
  if (req.query.user) {
    settings.getData(req.query.user, ({ sts }) => {
      if (sts) {
        settings.removeUser(req.query.user);
        res.end("success");
      } else res.end("no data found");
    });
  } else res.end("Error");
});

router.get("/getFile", async (req, res) => {
  let id = req.query.id;
  if (id) {
    if (fs.existsSync(root + "/subtitles/" + id + ".srt")) {
      var file = await fs.readFileSync(root + "/subtitles/" + id + ".srt").toString("utf8");
      res.send(file).status(200).end();
      await fs.unlinkSync(root + "/subtitles/" + id + ".srt");
    } else res.status(404).end();
  } else res.status(404).end();
});

router.get("/getUser", (req, res) => {
  if (req.query.user) {
    bot.getChat(req.query.user).then(user => {
      res.json({ sts: true, data: user });
    }).catch(err => {
      err = err.response;
      if (err.body && err.body.error_code === 400) {
        res.json({ sts: false, msg: "Invalid User \n The given user ID is not valid or this user has not used our bot\nPlease Check The Url And Try Again" });
      } else res.json({ sts: false, msg: "Unexpected error Occurred\nPlease Try Again" });
    });
  } else res.json({ sts: false, msg: "Required data not found" });
});

router.post("/bot", (req, res) => {
  var p = [];
  var { p1, p2, p3 } = req.body;
  p1 ? p.push(p1) : null;
  p2 ? p.push(p2) : null;
  p3 ? p.push(p3) : null;
  bot[req.body.f](...p).then(m => {
    console.log(m);
    res.json({ sts: true, m });
  }).catch(e => {
    console.log(e);
    res.json({ sts: false, e });
  });
});

router.get("/addUserById", async (req, res) => {
  try {
    if (req.query.id) {
      var i = mainData.indexOf(req.query.id);
      console.log(i);
      if (i !== -1) return res.json({ sts: true });
      mainData.push(req.query.id);
      let { data, err, sts } = await settings.getData(Number(req.query.id));
      if (!sts) return res.json({ sts: false, err });
      data.type = "msg";
      data.msg = "Your Request Was successfully Added In To ThThe Translate Q";
      await got.post(data.webhook, { json: data });
      helperSts ? translateHelper() : null;
      return res.json({ sts: true });
    } else return res.json({ sts: false, err: "Required Data Not Found" });
  } catch (e) {
    console.log(e);
    return res.json({ sts: false, err: "Unexpected error occurred" });
  }
});

router.get("/checkValid", async (req, res) => {
  try {
    if (!req.query.uId) throw "Required Data Not Found";
    var reqList = JSON.parse(await fs.readFileSync(root + "/requesters.txt"));
    var data = reqList.filter(x => x.id == Number(req.query.uId));
    if (!data.length) throw "You have not Submitted a Subtitile file\n<br>OR</br>\nThis link is expired";
    return res.json({ sts: true, data: data[0] });
  } catch (e) {
    if (typeof e === "string") return res.json({ sts: false, err: e });
    console.log(e);
    return res.json({ sts: false, err: "Unexpected Error Occurred" });
  }
});

router.post("/updateUser", async (req, res) => {
  try {
    if (!req.query.user) throw "User Id Is not Specifide";
    var key = Object.keys(req.body),
        value = Object.values(req.body),
        i;
    if (!key.length) throw "Key Not Found";
    let userlist = JSON.parse((await fs.readFileSync(root + "/requesters.txt")).toString("utf8")).map((e, i) => {
      if (e.user == req.query.user) {
        for (i in key) {
          e[key[i]] = value[i];
        }
        return e;
      } else return e;
    });
    await fs.writeFileSync(root + "/requesters.txt", JSON.stringify(userlist));
    return res.end();
  } catch (e) {
    console.log(e);
    return res.end();
  }
});

module.exports = router;
