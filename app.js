'use strict';
import request from "sync-request";
import fs from "fs";
import GuardManager from "steam-totp";
import SteamCommunity from "steamcommunity";
const skins = fs.readFileSync("logs/LoggedSkins.txt", "utf-8").split("\n");
const account = fs.readFileSync("account.txt", "utf-8").split(":")
const login = account[0],
    password = account[1],
    sharedSecret = account[2];
let community = new SteamCommunity();
const userOptions = {
    "accountName": login,
    "password": password,
    "twoFactorCode": GuardManager.getAuthCode(sharedSecret)
}
let nameids = JSON.parse(fs.readFileSync("nameids.json", "utf-8"));
let response;
let nameid;
community.login(userOptions, (err, sessionID, cookies, steamGuard) => {
    request("POST", "https://steamcommunity.com/actions/SetLanguage/", { "language": "english", "sessionid": sessionID })
    skins.forEach(async (skin, index, array) => {
        if (skin in nameids) return;
        await parseNaemdId(skin, index)
    })
})

async function parseNaemdId(skin, index) {
    if (!skin.includes("Unusual")) skin = "Unusual " + skin
    response = request("GET", `https://steamcommunity.com/market/listings/440/${skin}`, null)
    try {
        nameid = /Market_LoadOrderSpread\( ((\d)+) \)/g.exec(response.body)[1]
        nameids[skin] = nameid
        console.log(nameid)
        throw new Error()
    }

    finally {
        const writer = fs.createWriteStream("nameids.json")
        writer.write(JSON.stringify(nameids))
        process.exit()
    }
 }