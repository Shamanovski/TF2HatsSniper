'use strict';
import fs from "fs";
import GuardManager from "steam-totp";
import SteamCommunity from "steamcommunity";
import request from "request";
import { URL } from "url";


const skins = fs.readFileSync("LoggedSkins.txt", "utf-8").split("\n");
const oldCache = JSON.parse(fs.readFileSync("old.cache", "utf-8"))

const writeStream = fs.createWriteStream("new.cache", "utf-8", {flags: "w"});
const accounts = fs.readFileSync("accounts.txt", "utf-8").split("\n")
const community = new SteamCommunity();
let cache = {},
    response,
    assetid,
    effect,
    link,
    listinginfo,
    price,
    effectAndColor;

function getAccount() {
    let account = accounts.pop()
    if (account == undefined) {
        console.log("Все аккаунты временно заблокированы. Подождите кое-какое время и запустите процесс снова")
        return null
    }
    account = account.split(":")
    const login = account[0],
        password = account[1],
        sharedSecret = account[2];
    const userOptions = {
        "accountName": login,
        "password": password,
        "twoFactorCode": GuardManager.getAuthCode(sharedSecret)
    }
    return userOptions
}

async function main(login, password, twoFActorCode) {
    return await new Promise ((resolve, reject) => {
        community.login({accountName: login, password: password, twoFactorCode: twoFActorCode}, (err, sessionID, cookies, steamGuard) => {
        request("POST", "https://steamcommunity.com/actions/SetLanguage/", { "language": "english", "sessionid": sessionID, timeout: 10 * 1000 })
        for (var i = 0; i < skins.length; i++) {
            let skin = "Unuaual" +  skins[i];
            try {
                link = `https://steamcommunity.com/market/listings/440/${skin}/render?start=0&count=100&currency=1&format=json`
                response = request( "GET", link, { "sessionid": sessionID, timeout: 10 * 1000 })
                response = JSON.parse(response.body);
                listinginfo = response["listinginfo"];
                for (let listing in listinginfo) {
                    if (oldCache.hasOwnProperty(assetid)) continue;
                    assetid = listinginfo[listing]["asset"]["id"];
                    let descriptions = response["assets"]["440"]["2"][assetid]["descriptions"]
                    let index;
                    for (let k = 0 ; k < descriptions.length; k++) {
                        if (descriptions[k]["value"].includes("Unusual")) {
                            index = k
                            break
                        }
                    }
                    effect = descriptions[index]
                    effectAndColor = (effect["value"] + " " + effect["color"])
                    link = `https://steamcommunity.com/market/listings/440/${skin}?filter=${effect["value"]}`;
                    price = listinginfo[listing]["price"] + listinginfo[listing]["fee"];
                    console.log(`${skin}: ${price / 100}$ ${effectAndColor}\n${new URL(link).toString()}\n\n`);
                    cache[assetid] = { "skin": skin, "price": listinginfo[listing]["price"] + listinginfo[listing]["fee"], "effect": effect };
                    resolve("success")
                }
            }
            catch  (ex) {
                console.log(ex);
                break;
            }
        }
        writeStream.write(JSON.stringify(cache), "utf-8");
        writeStream.close()
        console.log(`Было проверено ${i} единиц`)

        })
    })
}

let options;
do {
    options = getAccount();
    main(options.accountName, options.password, options.twoFactorCode)
} while (options.login != undefined)