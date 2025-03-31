//@ts-nocheck
import { Api, Client, StorageLocalStorage } from "@mtkruto/node";
import { writeFile, readFile } from "fs/promises";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline";

import { Config, type IFilter } from "./config";
import { existsSync } from "fs";

// const apiId = 20168466;
// const apiHash = "17a8da1d4ccfe6fcf73cc92b07702675";
// const storeSession = new StoreSession("folder_name");

const readline = createInterface({ input, output });
const prompt = (q) => new Promise((r) => readline.question(q + " ", r));
// Parse the JSON file and create a Set of gift IDs
//ensure that the file exists
if(!existsSync("star_gifts.json")) {
 await writeFile("star_gifts.json", "{\"gifts\":[]}");
}

// const starGiftsData = JSON.parse(await readFile("star_gifts.json", "utf-8"));
// const starGiftsCache: Set<string> = new Set<string>(starGiftsData.gifts.map((gift: Api.StarGift) => String(gift.id)));

const isGoodToBuy =  (gift: Api.StarGift, filters: IFilter[]) => {
  // if (starGiftsCache.has(String(gift.id))) return false;
    if (filters.length === 0) return false;
  
    //Если нет остатков, то пропускаем
    if(gift.availabilityRemains === 0) return false;

    const onlyLimited = filters.every(filter => filter.limited);
    if (onlyLimited && !gift.limited) return false;

    for(const filter of filters) {
      if (filter.min_price_stars && Number(gift.stars) < filter.min_price_stars) {
        return false;
      }
      if (filter.max_price_stars &&  Number(gift.stars) > filter.max_price_stars) {
        return false;
      }
      if (filter.max_supply &&  Number(gift.availabilityTotal) > filter.max_supply) {
        return false;
      }

      const cap = Number(gift.availabilityTotal) * Number(gift.stars);

      if (filter.max_cap && cap > filter.max_cap) {
        return false;
      }
      if (filter.limited && !gift.limited) {
        return false;
      }

      console.log(`[${new Date().toISOString()}] Good star gift found: ${gift.id}`);
      return true;
    }
  return false;
} 

async function processStarGifts(clients: Client[]) {
  try {
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const starGifts = await randomClient.getGifts();
    // console.log(starGifts)
    // console.log(`[${new Date().toISOString()}] Checking star gifts...`);
    writeFile("star_gifts.json", JSON.stringify(starGifts, null, 2)).then(() => {
      // console.log(`[${new Date().toISOString()}] Star gifts saved to file`);
    });

    for(const account of Config.ACCOUNTS) {
      const filters = account.filters ?? Config.FILTERS;
      // const res = starGifts.gifts.filter((gift: Api.StarGift) => isGoodToBuy(gift, filters));
      // if(res.length > 0) {
      //   console.log(`[${new Date().toISOString()}] Found ${res.length} good star gifts for ${account.name}`);
      //   const firstGift = res[0];
        
        // Get user info first
        // const user = await randomClient.getDialogs();
        // console.log(user[1].entity)
        // return
        // const accessHash = await randomClient.invoke(new Api.users.GetUsers({
        //   id: [230873295],
        // }))

   
        await randomClient.sendGift("luftenmensch", "5170233102089322756");
        console.log("Sent")
      // }
    }

    // console.log(`[${new Date().toISOString()}] Found ${res.length} good star gifts`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking star gifts:`, error);
  }
}

const main = async () => {
  let intervalId
  try {
    const clients: Client[] = []
    
  for(let i = 0; i < Config.ACCOUNTS.length; i++) {
    const accountName = Config.ACCOUNTS[i].name;
    const storeSession = new StorageLocalStorage(`${Config.SESSIONS_DIR}/${accountName}`);
    const apiId = Config.ACCOUNTS[i].api_id;
    const apiHash = Config.ACCOUNTS[i].api_hash;
    const phoneNumber = Config.ACCOUNTS[i].phone_number;
    const client = new Client({
      apiId,
      apiHash,
      storage: storeSession,
    });
    await client.start({
      phone: () => phoneNumber,
      code: () => prompt("Enter the code you received:"),
      password: () => prompt("Enter your account's password:"),
    }).then(() => {
      console.log("Started.");
    });
    console.log("You should now be connected.");

    clients.push(client);
    const authString = await client.exportAuthString();
console.log("The auth string is", authString);
  }

  if(clients.length === 0) {
    console.error("No clients ready to work! Please add at least one account to the config.ts file");
    return;
  }

  console.log(`Got ${clients.length} clients ready to work!`);

  const randomClient = clients[Math.floor(Math.random() * clients.length)];
  // await randomClient.sendMessage("me","Hello111!" );

  // const randomClient = clients[Math.floor(Math.random() * clients.length)];
  // let counter = 0
  // intervalId = setInterval(async () => {
  //     const goodStarGifts = await processStarGifts(clients)
  //     counter++
  //     if(counter ===1) {
  //       clearInterval(intervalId)
  //     }
  // },1000)


}catch(e) {
  console.error(e);

  console.log("Restarting...");
  clearInterval(intervalId);
  main();
}
}

main();
