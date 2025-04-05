import { TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions";
import { Config } from './config';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';

interface Account {
    phoneNumber: string;
    isActive: boolean;
    sessionPath: string;
    ownerId: number; // Telegram user ID who owns this account
}

interface AccountStorage {
    [userId: number]: Account[];
}

class AccountManager {
    private accounts: AccountStorage = {};
    private readonly accountsFile = 'accounts.json';
    
    constructor() {
        this.loadAccounts();
    }

    private async loadAccounts() {
        if (existsSync(this.accountsFile)) {
            const data = await readFile(this.accountsFile, 'utf-8');
            this.accounts = JSON.parse(data);
        }
    }

    private async saveAccounts() {
        await writeFile(this.accountsFile, JSON.stringify(this.accounts, null, 2));
    }

    private getUserAccounts(userId: number): Account[] {
        if (!this.accounts[userId]) {
            this.accounts[userId] = [];
        }
        return this.accounts[userId];
    }

    public async addAccount(userId: number, phoneNumber: string): Promise<TelegramClient> {
        const sessionPath = `sessions/${phoneNumber.replace('+', '')}`;
        const session = new StoreSession(sessionPath);
        
        const client = new TelegramClient(session, Config.API_ID, Config.API_HASH, {
            connectionRetries: 5,

        });
        
        const account: Account = {
            phoneNumber,
            isActive: false,
            sessionPath,
            ownerId: userId
        };

        const userAccounts = this.getUserAccounts(userId);
        userAccounts.push(account);
        await this.saveAccounts();
        
        return client;
    }

    public async removeAccount(userId: number, index: number) {
        const userAccounts = this.getUserAccounts(userId);
        if (index >= 0 && index < userAccounts.length) {
            userAccounts.splice(index, 1);
            await this.saveAccounts();
            return true;
        }
        return false;
    }

    public async listAccounts(userId: number): Promise<Account[]> {
        return this.getUserAccounts(userId);
    }

    public async getClient(userId: number, phoneNumber: string): Promise<TelegramClient | null> {
        const userAccounts = this.getUserAccounts(userId);
        const account = userAccounts.find(acc => acc.phoneNumber === phoneNumber);
        if (!account) return null;

        const session = new StoreSession(account.sessionPath);
        return new TelegramClient(session, Config.API_ID, Config.API_HASH, {
            connectionRetries: 5,
        });
    }

    public async setAccountStatus(userId: number, phoneNumber: string, isActive: boolean) {
        const userAccounts = this.getUserAccounts(userId);
        const account = userAccounts.find(acc => acc.phoneNumber === phoneNumber);
        if (account) {
            account.isActive = isActive;
            await this.saveAccounts();
            return true;
        }
        return false;
    }
}

export { AccountManager };
export type { Account };
 