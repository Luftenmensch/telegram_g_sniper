import { TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions";
import * as readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const main = async () => {


const client = new TelegramClient(
    //папка где будет хранится сессия
    new StoreSession("test"),
    //https://my.telegram.org/auth?to=apps тут регать аппку
    //api_id
     123456,
     //api_hash
      "123456",
       {
    //количество попыток подключения
    connectionRetries: 10,
});

client.start({
        phoneNumber: async () =>
            new Promise((resolve) =>
              rl.question(`Please enter your password: `, resolve)
            ),
        password: async () =>
          new Promise((resolve) =>
            rl.question(`Please enter your password: `, resolve)
          ),
        phoneCode: async () =>
          new Promise((resolve) =>
            rl.question(`Please enter the code you received: `, resolve)
          ),
        onError: (err) => console.log(err),

});

//все, теперь можно работать с клиентом
//оплату не скинул, т.к на веб апп она не сработает, 
//в случае с подарками, надо получить форму и потом вызвать мтеод с этой формой. 
//все скорее всего тут +- также. методы смотреть в ссылке, которую раньше кинул
}

main();