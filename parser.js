import fs from "fs";
import { parse } from "node-html-parser"

const stream = fs.createWriteStream("LoggedSkins.txt");
const html = fs.readFileSync("skins.html", "utf-8")
const root = parse(html.toString());
const selected = root.querySelectorAll(".tag.top-left")
let skinName;
for (let i = 0; i < selected.length; i++) {
    skinName = selected[i].rawText;
    stream.write(skinName + "\n")
}
console.log("done")
stream.close();
