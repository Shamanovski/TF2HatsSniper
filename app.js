'use strict';
import fs from "fs";
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

const proxiesFromFile  = fs.readFileSync("proxies.txt", "utf-8").split("\n")

let cache = {},
    proxies = [].concat(proxiesFromFile),
    proxy,
    response,
    assetid,
    effect,
    link,
    listinginfo,
    price,
    effectAndColor;

async function getProxy() {
    proxy = proxies.pop();
    if (proxy == undefined) {
        console.log("Все прокси в лимите. Жду 7 минут для разблокировки...");
        await new Promise((res) => setTimeout(res, 720 * 1000));
        proxies.concat(proxiesFromFile);
        return await getProxy();
    }
    console.log("Использую прокси %s", proxy)
    return proxy
}

async function mainProcess() {
    try {
        proxy = await getProxy();
        for (var i = 0; i < skins.length; i++) {
            let skin = skins[i];
            let skinForURI = "Unusual%20" + skins[i].replace(" ", "%20");
            try {
                link = `https://steamcommunity.com/market/listings/440/${skinForURI}/render?start=0&count=100&currency=1&format=json`;
                response = await requestPromise({
                    url: link,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
                    },
                    timeout: 30 * 1000,
                    proxy: proxy,
                    transform: (body) => JSON.parse(body)
                });
                
                listinginfo = response["listinginfo"];
                if (listinginfo.length == 0)
                {
                    console.log(`Для ${skin} нет лотов`)
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
                    link = `https://steamcommunity.com/market/listings/440/${skinForURI}?filter=${effect["value"]}`;
                    price = listinginfo[listing]["price"] + listinginfo[listing]["fee"];
                    console.log(`${effect["color"]}`)(`${skin}: ${price / 100}$ ${effectAndColor}\n${new URL(link).toString()}\n\n`);
                    cache[assetid] = { "skin": skin, "price": listinginfo[listing]["price"] + listinginfo[listing]["fee"], "effect": effect };
                }
                
                await new Promise((res) => setTimeout(res, 5 * 1000));
                fs.createWriteStream("cache.json", "utf-8", {flags: "w"}).write(JSON.stringify(cache))
                
            }
            catch  (ex) {
                    console.log("Прокси залимичен. Меняю прокси...")
                    proxy = await getProxy()
                    i -= 1
                }
        }
    }

    finally {
        fs.createWriteStream("cache.json", "utf-8", {flags: "w"}).write(JSON.stringify(cache)) 
    }
}

await mainProcess();