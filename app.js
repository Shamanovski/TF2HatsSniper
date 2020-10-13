'use strict';
import fs from "fs";
import { getAuthCode } from "steam-totp";
import SteamCommunity from "steamcommunity";
import requestPromise from "request-promise-native"
import { URL } from "url";


const skins = fs.readFileSync("LoggedSkins.txt", "utf-8").split("\n");
let oldCache;
try {
    oldCache = JSON.parse(fs.readFileSync("cache.json", "utf-8"))
}
catch (e) {
    oldCache = {}
}

const writeStream = fs.createWriteStream("cache.json", "utf-8", {flags: "w"});
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
        "twoFactorCode": getAuthCode(sharedSecret),
        "isLimited": false
    }
    return userOptions
}

async function mainProcess() {
    let account = getAccount();
    await new Promise((resolve, reject) => community.login({accountName: account.accountName, password: account.password, twoFactorCode: account.twoFactorCode}, 
        (err, sessionID, cookies, steamGuard) => {

            console.log(`Использую аккаунт ${account.accountName}`)
            account.cookies = cookies;
            account.sessionID = sessionID;
            account.isLimited = false;
            resolve()
        })
    );
    try {

        for (var i = 0; i < skins.length; i++) {
            if (account.isLimited == true) {
                account = getAccount();
                await new Promise((resolve, reject) => community.login({accountName: account.accountName, password: account.password, twoFactorCode: account.twoFactorCode}, 
                    (err, sessionID, cookies, steamGuard) => {
                        console.log(`Использую аккаунт ${account.accountName}`)
                        account.cookies = cookies;
                        account.sessionID = sessionID;
                        account.isLimited = false;
                        resolve()
                    })
                );
            }   
            let skin = "Unusual%20" + skins[i].replace(" ", "%20");
            try {
                link = `https://steamcommunity.com/market/listings/440/${skin}/render?start=0&count=100&currency=1&format=json`;
                 response = await requestPromise({
                     url: link,
                     headers: {
                        "sessionid": account.sessionID,
                        "Cookie": account.cookies.join("; ")
                    },
                    timeout: 5 * 1000,
                    transform: (body) => JSON.parse(body)
                });
                    
                    listinginfo = response["listinginfo"];
                    if (listinginfo.length == 0)
                    {
                        console.log(`Для ${skin.replace()} нет лотов`)
                        continue;
                    };
                    let index;
                    for (let listing in listinginfo) {
                        if (oldCache.hasOwnProperty(assetid)) continue;
                        assetid = listinginfo[listing]["asset"]["id"];
                        let descriptions = response["assets"]["440"]["2"][assetid]["descriptions"]
                        for (let k = 0 ; k < descriptions.length; k++) {
                            if (descriptions[k]["value"].includes("Unusual")) {
                                index = k
                                break
                            }
                        }
                        effect = descriptions[index];
                        effectAndColor = (effect["value"] + " " + effect["color"])
                        link = `https://steamcommunity.com/market/listings/440/${skin}?filter=${effect["value"]}`;
                        skin = skin.replace("%20", " ");
                        price = listinginfo[listing]["price"] + listinginfo[listing]["fee"];
                        console.log(`${skin}: ${price / 100}$ ${effectAndColor}\n${new URL(link).toString()}\n\n`);
                        cache[assetid] = { "skin": skin, "price": listinginfo[listing]["price"] + listinginfo[listing]["fee"], "effect": effect };
                    }
                }
                catch  (ex) {
                    console.log("Аккаунт залимичен. Жду...")
                    await new Promise((res) => setTimeout(res, 120 * 1000))
                    // account.isLimited = true;
                    i -= 1
                }
        }
    }

    finally {
        if (Object.keys(cache).length > 0) writeStream.write(JSON.stringify(cache), "utf-8");
    }
}

await mainProcess();