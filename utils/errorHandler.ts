export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ErrorLogEntry {
  timestamp: string;
  error: string;
  stack?: string;
  context?: any;
  accountName?: string;
  action?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public async logError(error: Error, context?: any): Promise<void> {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context: context,
    };

    try {
      console.error(`[${logEntry.timestamp}] Error logged:`, error.message);
      if (context) {
        console.error("Context:", JSON.stringify(context, null, 2));
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
  }

  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    context?: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === options.maxRetries) {
          await this.logError(lastError, {
            context,
            attempt,
            maxRetries: options.maxRetries,
          });
          throw lastError;
        }

        const delay = Math.min(
          options.baseDelay * Math.pow(options.backoffMultiplier, attempt),
          options.maxDelay
        );

        console.log(
          `[${context}] Attempt ${
            attempt + 1
          } failed, retrying in ${delay}ms...`
        );
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  public async handleTelegramError(
    error: any,
    accountName: string,
    action: string
  ): Promise<boolean> {
    const errorCode = error.code || error.error_code;
    const errorMessage = error.message || error.error_message || String(error);

    await this.logError(new Error(errorMessage), {
      accountName,
      action,
      errorCode,
      telegramError: true,
    });

    // Handle specific Telegram errors
    switch (errorCode) {
      case 420:
        // Flood wait
        const waitTime = this.extractWaitTime(errorMessage);
        console.log(`[${accountName}] Flood wait: ${waitTime}s`);
        await this.sleep(waitTime * 1000);
        return true; // Retry after wait

      case 401:
        // Unauthorized - session expired
        console.log(`[${accountName}] Session expired, need re-authentication`);
        return false; // Don't retry

      case 403:
        // Forbidden
        console.log(`[${accountName}] Forbidden access`);
        return false; // Don't retry

      case 500:
      case 502:
      case 503:
        // Server errors - retry with delay
        console.log(`[${accountName}] Server error, retrying...`);
        await this.sleep(5000);
        return true;

      default:
        console.log(`[${accountName}] Unknown error: ${errorMessage}`);
        return false;
    }
  }

  private extractWaitTime(message: string): number {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1]) : 60; // Default 60 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Default retry configurations
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

export const TELEGRAM_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 60000,
  backoffMultiplier: 1.5,
};
