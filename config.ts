interface IFilter {
    min_price_stars: number;
    max_price_stars?: number;
    max_supply?: number;
    max_cap?: number;
    limited?: boolean;
    buy_count?: number;
}

interface IAccountData {
    //Имя аккаунта, может быть любым, нужно только для собственного удобства
    name: string;
    api_id: number;
    api_hash: string;
    phone_number: string;
    user_id: string; // ID пользователя, которому отправляем подарок
    access_hash: string; // Access hash этого пользователя
    filters?: IFilter[];
}

interface IConfig {
    TELEGRAM_BOT_TOKEN: string; 
    CHAT_IDS: number[]; //ID чатов, в которые будут отправляться сообщения, можно узнать с помощью @getmyid_bot
    DEFAULT_MONITORING_INTERVAL: number;
    BUY_GIFTS_INTERVAL: number; //Интервал между попытками покупки подарков
    SESSIONS_DIR: string;
    GIFTS_LOG_DIR: string;
    ACCOUNTS: IAccountData[];
    FILTERS: IFilter[];
}

export const Config: IConfig = {
    TELEGRAM_BOT_TOKEN: "6666666666:AAH-1234567890",
    CHAT_IDS: [1234567890, 1234567891],
    DEFAULT_MONITORING_INTERVAL: 1000, // 1 second
    BUY_GIFTS_INTERVAL: 10000, // 1 second
    SESSIONS_DIR: 'sessions',
    GIFTS_LOG_DIR: 'gifts_logs',
    ACCOUNTS:[
        // {
        //     api_id: 27000564,
        //     api_hash: "1cecdf666cfd29e1633b5f1627bf81de",
        //     phone_number: "+79936028640",
        //     name: "1",
        //     user_id: "+7 778 199 72 69",
        //     access_hash: "access_hash_test"
        // },
    
       // {API_ID:1, API_HASH:"1234567890", PHONE_NUMBER:"+1234567890", name: "Test"},
    ],
    FILTERS: [
        {
            //Только этот параметр обязателен, остальные опциональны
            min_price_stars:10,
            max_price_stars: 15,
            // max_supply: 1000000,
            // max_cap: 1000000,
            buy_count: 1,
            limited: false,
        },
        //Фильтров может быть сколько угодно, подарок будет покупаться если проходит хотя бы один фильтр
        // {
        //     min_price_stars: 1000,
        //     max_price_stars: 10000,
        //     max_supply: 1000000,
        //     max_cap: 1000000,
        //     limited: true,
        // }
    ]
}; 
export type { IFilter };