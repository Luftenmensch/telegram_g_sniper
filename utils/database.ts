export interface GiftRecord {
  id: string;
  name: string;
  price: number;
  supply: number;
  first_seen: string;
  last_updated: string;
  purchase_attempts: number;
  successful_purchases: number;
  best_price?: number;
  worst_price?: number;
  availability_count: number;
}

export interface PurchaseRecord {
  id: string;
  gift_id: string;
  account_name: string;
  price: number;
  timestamp: string;
  success: boolean;
  error_message?: string;
  transaction_time: number;
}

export interface StatisticsRecord {
  date: string;
  total_gifts_monitored: number;
  total_purchase_attempts: number;
  successful_purchases: number;
  total_spent: number;
  average_response_time: number;
  errors_count: number;
}

export class Database {
  private static instance: Database;
  private giftRecords: Map<string, GiftRecord> = new Map();
  private purchaseRecords: PurchaseRecord[] = [];
  private statisticsRecords: StatisticsRecord[] = [];
  private dataPath: string;

  private constructor() {
    this.dataPath = "./gifts_logs/database.json";
    this.loadData();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async upsertGift(
    giftData: Partial<GiftRecord> & { id: string }
  ): Promise<void> {
    const existing = this.giftRecords.get(giftData.id);
    const now = new Date().toISOString();

    if (existing) {
      // Update existing record
      const updated: GiftRecord = {
        ...existing,
        ...giftData,
        last_updated: now,
        availability_count: existing.availability_count + 1,
        best_price: giftData.price
          ? Math.min(existing.best_price || Infinity, giftData.price)
          : existing.best_price,
        worst_price: giftData.price
          ? Math.max(existing.worst_price || 0, giftData.price)
          : existing.worst_price,
      };
      this.giftRecords.set(giftData.id, updated);
    } else {
      // Create new record
      const newRecord: GiftRecord = {
        ...giftData,
        name: giftData.name || "Unknown",
        price: giftData.price || 0,
        supply: giftData.supply || 0,
        first_seen: now,
        last_updated: now,
        purchase_attempts: 0,
        successful_purchases: 0,
        best_price: giftData.price,
        worst_price: giftData.price,
        availability_count: 1,
      };
      this.giftRecords.set(giftData.id, newRecord);
    }

    await this.saveData();
  }

  public async recordPurchaseAttempt(
    purchaseData: Omit<PurchaseRecord, "id">
  ): Promise<void> {
    const record: PurchaseRecord = {
      id: this.generateId(),
      ...purchaseData,
    };

    this.purchaseRecords.push(record);

    // Update gift record
    const gift = this.giftRecords.get(purchaseData.gift_id);
    if (gift) {
      gift.purchase_attempts++;
      if (purchaseData.success) {
        gift.successful_purchases++;
      }
      this.giftRecords.set(purchaseData.gift_id, gift);
    }

    await this.saveData();
  }

  public async updateDailyStatistics(): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const existingIndex = this.statisticsRecords.findIndex(
      (s) => s.date === today
    );

    const todayPurchases = this.purchaseRecords.filter((p) =>
      p.timestamp.startsWith(today)
    );

    const stats: StatisticsRecord = {
      date: today,
      total_gifts_monitored: this.giftRecords.size,
      total_purchase_attempts: todayPurchases.length,
      successful_purchases: todayPurchases.filter((p) => p.success).length,
      total_spent: todayPurchases
        .filter((p) => p.success)
        .reduce((sum, p) => sum + p.price, 0),
      average_response_time:
        todayPurchases.reduce((sum, p) => sum + p.transaction_time, 0) /
        Math.max(todayPurchases.length, 1),
      errors_count: todayPurchases.filter((p) => !p.success).length,
    };

    if (existingIndex >= 0) {
      this.statisticsRecords[existingIndex] = stats;
    } else {
      this.statisticsRecords.push(stats);
    }

    // Keep only last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    this.statisticsRecords = this.statisticsRecords.filter(
      (s) => new Date(s.date) >= cutoffDate
    );

    await this.saveData();
  }

  public getGiftById(id: string): GiftRecord | undefined {
    return this.giftRecords.get(id);
  }

  public getAllGifts(): GiftRecord[] {
    return Array.from(this.giftRecords.values());
  }

  public getTopGiftsByProfitability(limit: number = 10): GiftRecord[] {
    return this.getAllGifts()
      .filter(
        (g) => g.successful_purchases > 0 && g.best_price && g.worst_price
      )
      .sort((a, b) => {
        const profitA = (a.worst_price! - a.best_price!) / a.best_price!;
        const profitB = (b.worst_price! - b.best_price!) / b.best_price!;
        return profitB - profitA;
      })
      .slice(0, limit);
  }

  public getPurchaseHistory(
    giftId?: string,
    accountName?: string
  ): PurchaseRecord[] {
    let records = [...this.purchaseRecords];

    if (giftId) {
      records = records.filter((r) => r.gift_id === giftId);
    }

    if (accountName) {
      records = records.filter((r) => r.account_name === accountName);
    }

    return records.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getRecentStatistics(days: number = 7): StatisticsRecord[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.statisticsRecords
      .filter((s) => new Date(s.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private async saveData(): Promise<void> {
    try {
      const data = {
        gifts: Object.fromEntries(this.giftRecords),
        purchases: this.purchaseRecords,
        statistics: this.statisticsRecords,
        last_updated: new Date().toISOString(),
      };

      // In a real implementation, this would write to file
      console.log(
        `[Database] Data saved: ${this.giftRecords.size} gifts, ${this.purchaseRecords.length} purchases`
      );
    } catch (error) {
      console.error("Failed to save database:", error);
    }
  }

  private loadData(): void {
    try {
      // In a real implementation, this would read from file
      console.log("[Database] Initialized empty database");
    } catch (error) {
      console.log("[Database] No existing data found, starting fresh");
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public async exportData(): Promise<{
    gifts: GiftRecord[];
    purchases: PurchaseRecord[];
    statistics: StatisticsRecord[];
  }> {
    return {
      gifts: this.getAllGifts(),
      purchases: this.purchaseRecords,
      statistics: this.statisticsRecords,
    };
  }

  public async importData(data: {
    gifts?: GiftRecord[];
    purchases?: PurchaseRecord[];
    statistics?: StatisticsRecord[];
  }): Promise<void> {
    if (data.gifts) {
      this.giftRecords.clear();
      data.gifts.forEach((gift) => this.giftRecords.set(gift.id, gift));
    }

    if (data.purchases) {
      this.purchaseRecords = [...data.purchases];
    }

    if (data.statistics) {
      this.statisticsRecords = [...data.statistics];
    }

    await this.saveData();
  }

  public async cleanup(): Promise<void> {
    // Remove old purchase records (older than 30 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    this.purchaseRecords = this.purchaseRecords.filter(
      (p) => new Date(p.timestamp) >= cutoffDate
    );

    await this.saveData();
  }
}
