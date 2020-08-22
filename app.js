'use strict';
import request from "sync-request";
import fs from "fs";
import GuardManager from "steam-totp";
import SteamCommunity from "steamcommunity";
import { URL } from "url";


const skins = fs.readFileSync("LoggedSkins.txt", "utf-8").split("\n");
const oldCache = JSON.parse(fs.readFileSync("data.json", "utf-8"))
const writeStream = fs.createWriteStream("data.json", "utf-8", "{}");
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
let cache = {},
    response,
    assetid,
    effect,
    link,
    listinginfo,
    price;

community.login(userOptions, (err, sessionID, cookies, steamGuard) => {
    request("POST", "https://steamcommunity.com/actions/SetLanguage/", { "language": "english", "sessionid": sessionID, timeout: 10 * 1000 })
    for (let i = 0; i < skins.length; i++) {
        let skin = skins[i];
        try {
            skin = "Unusual " + skin
            link = `https://steamcommunity.com/market/listings/440/${skin}/render?start=0&count=100&currency=1&format=json`
            response = request( "GET", link, { "sessionid": sessionID, timeout: 10 * 1000 })
            response = JSON.parse(response.body);
            listinginfo = response["listinginfo"];
            for (let listing in listinginfo) {
                if (oldCache.hasOwnProperty(assetid)) continue;
                assetid = listinginfo[listing]["asset"]["id"];
                let descriptions = response["assets"]["440"]["2"][assetid]["descriptions"]
                let index;
                for (let k=0; k < descriptions.length; k++) {
                    if (descriptions[k]["value"].includes("Unusual")) {
                        index = k
                        break
                    }
                }
                effect = descriptions[index]
                effect = (effect["value"] + " " + effect["color"])
                link = `https://steamcommunity.com/market/listings/440/${skin}?filter=${effect["value"]}`;
                price = listinginfo[listing]["price"] + listinginfo[listing]["fee"];
                console.log(`${skin}: ${price / 100}$ ${effect}\n${new URL(link).toString()}\n\n`);
                cache[assetid] = { "skin": skin, "price": listinginfo[listing]["price"] + listinginfo[listing]["fee"], "effect": effect };
                writeStream.write(JSON.stringify(cache), "utf-8");
            }
        }
        finally {
            writeStream.write(JSON.stringify(cache), "utf-8");
            writeStream.close()
            console.log(`Было проверено ${i} единиц`)
        }
    }
})