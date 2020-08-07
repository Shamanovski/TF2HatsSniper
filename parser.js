'use strict';
const fs = require("fs");
const request = require("request");
const { parse } = require("node-html-parser")
const stream = fs.createWriteStream("LoggedSkins.txt");
const resp = request.get("https://backpack.tf/unusuals", (err, res, body) => {
    const root = parse(body);
    const selected = root.querySelectorAll(".tag.top-left")
    let skinName;
    for (let i = 0; i < selected.length; i++) {
        skinName = selected[i].rawText;
        stream.write(skinName + "\n")
    }
});
