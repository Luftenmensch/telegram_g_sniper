export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
}

export interface ConfigSecurityOptions {
  requireEncryption: boolean;
  minPasswordLength: number;
  requirePhoneNumberValidation: boolean;
  maxAccountsPerConfig: number;
  requireUniqueApiIds: boolean;
}

export class ConfigValidator {
  private static instance: ConfigValidator;
  private securityOptions: ConfigSecurityOptions;

  private constructor() {
    this.securityOptions = {
      requireEncryption: true,
      minPasswordLength: 8,
      requirePhoneNumberValidation: true,
      maxAccountsPerConfig: 10,
      requireUniqueApiIds: true,
    };
  }

  public static getInstance(): ConfigValidator {
    if (!ConfigValidator.instance) {
      ConfigValidator.instance = new ConfigValidator();
    }
    return ConfigValidator.instance;
  }

  public validateConfig(config: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityIssues: [],
    };

    try {
      // Validate structure
      this.validateStructure(config, result);

      // Validate accounts
      this.validateAccounts(config.ACCOUNTS || [], result);

      // Validate filters
      this.validateFilters(config.FILTERS || [], result);

      // Validate intervals
      this.validateIntervals(config, result);

      // Validate telegram settings
      this.validateTelegramSettings(config, result);

      // Security validations
      this.validateSecurity(config, result);

      // Set overall validity
      result.isValid = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Validation failed: ${(error as Error).message}`);
      result.isValid = false;
    }

    return result;
  }

  private validateStructure(config: any, result: ValidationResult): void {
    const requiredFields = [
      "ACCOUNTS",
      "FILTERS",
      "DEFAULT_MONITORING_INTERVAL",
      "BUY_GIFTS_INTERVAL",
      "SESSIONS_DIR",
      "GIFTS_LOG_DIR",
    ];

    for (const field of requiredFields) {
      if (!(field in config)) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Check types
    if (config.ACCOUNTS && !Array.isArray(config.ACCOUNTS)) {
      result.errors.push("ACCOUNTS must be an array");
    }

    if (config.FILTERS && !Array.isArray(config.FILTERS)) {
      result.errors.push("FILTERS must be an array");
    }

    if (config.CHAT_IDS && !Array.isArray(config.CHAT_IDS)) {
      result.errors.push("CHAT_IDS must be an array");
    }
  }

  private validateAccounts(accounts: any[], result: ValidationResult): void {
    if (accounts.length === 0) {
      result.errors.push("At least one account must be configured");
      return;
    }

    if (accounts.length > this.securityOptions.maxAccountsPerConfig) {
      result.warnings.push(
        `Large number of accounts (${accounts.length}). Consider splitting configuration.`
      );
    }

    const apiIds = new Set<number>();
    const phoneNumbers = new Set<string>();

    accounts.forEach((account, index) => {
      const prefix = `Account ${index + 1}`;

      // Required fields
      const requiredAccountFields = [
        "api_id",
        "api_hash",
        "phone_number",
        "name",
      ];
      for (const field of requiredAccountFields) {
        if (!account[field]) {
          result.errors.push(`${prefix}: Missing required field: ${field}`);
        }
      }

      // Validate api_id
      if (
        account.api_id &&
        (typeof account.api_id !== "number" || account.api_id <= 0)
      ) {
        result.errors.push(`${prefix}: api_id must be a positive number`);
      }

      // Check for unique api_ids
      if (this.securityOptions.requireUniqueApiIds && account.api_id) {
        if (apiIds.has(account.api_id)) {
          result.securityIssues.push(
            `${prefix}: Duplicate api_id detected. Each account should have unique API credentials.`
          );
        }
        apiIds.add(account.api_id);
      }

      // Validate api_hash
      if (
        account.api_hash &&
        (typeof account.api_hash !== "string" || account.api_hash.length < 32)
      ) {
        result.errors.push(
          `${prefix}: api_hash appears to be invalid (should be 32+ characters)`
        );
      }

      // Validate phone number
      if (account.phone_number) {
        const phoneRegex = /^\+[1-9]\d{10,14}$/;
        if (!phoneRegex.test(account.phone_number)) {
          if (this.securityOptions.requirePhoneNumberValidation) {
            result.errors.push(
              `${prefix}: Invalid phone number format. Must start with + and country code.`
            );
          } else {
            result.warnings.push(
              `${prefix}: Phone number format may be invalid.`
            );
          }
        }

        // Check for duplicate phone numbers
        if (phoneNumbers.has(account.phone_number)) {
          result.securityIssues.push(
            `${prefix}: Duplicate phone number detected.`
          );
        }
        phoneNumbers.add(account.phone_number);
      }

      // Validate name
      if (
        account.name &&
        (typeof account.name !== "string" || account.name.trim().length === 0)
      ) {
        result.errors.push(
          `${prefix}: Account name must be a non-empty string`
        );
      }

      // Security checks
      if (account.api_hash && account.api_hash.includes("your_api_hash")) {
        result.securityIssues.push(
          `${prefix}: API hash appears to be a placeholder. Use real credentials.`
        );
      }

      if (account.phone_number && account.phone_number.includes("123")) {
        result.securityIssues.push(
          `${prefix}: Phone number appears to be a placeholder.`
        );
      }
    });
  }

  private validateFilters(filters: any[], result: ValidationResult): void {
    if (filters.length === 0) {
      result.warnings.push(
        "No filters configured. All gifts will be considered."
      );
      return;
    }

    filters.forEach((filter, index) => {
      const prefix = `Filter ${index + 1}`;

      // min_price_stars is required
      if (
        typeof filter.min_price_stars !== "number" ||
        filter.min_price_stars < 0
      ) {
        result.errors.push(
          `${prefix}: min_price_stars must be a non-negative number`
        );
      }

      // Validate optional numeric fields
      const numericFields = [
        "max_price_stars",
        "max_supply",
        "max_cap",
        "buy_count",
      ];
      for (const field of numericFields) {
        if (filter[field] !== undefined) {
          if (typeof filter[field] !== "number" || filter[field] < 0) {
            result.errors.push(
              `${prefix}: ${field} must be a non-negative number`
            );
          }
        }
      }

      // Logical validations
      if (
        filter.max_price_stars &&
        filter.min_price_stars &&
        filter.max_price_stars < filter.min_price_stars
      ) {
        result.errors.push(
          `${prefix}: max_price_stars cannot be less than min_price_stars`
        );
      }

      if (filter.buy_count && filter.buy_count > 100) {
        result.warnings.push(
          `${prefix}: High buy_count (${filter.buy_count}). This may trigger rate limits.`
        );
      }

      // Boolean fields
      if (filter.limited !== undefined && typeof filter.limited !== "boolean") {
        result.errors.push(`${prefix}: limited must be a boolean value`);
      }
    });
  }

  private validateIntervals(config: any, result: ValidationResult): void {
    const intervals = [
      { name: "DEFAULT_MONITORING_INTERVAL", min: 100, max: 300000 },
      { name: "BUY_GIFTS_INTERVAL", min: 1000, max: 600000 },
    ];

    for (const interval of intervals) {
      const value = config[interval.name];
      if (value !== undefined) {
        if (
          typeof value !== "number" ||
          value < interval.min ||
          value > interval.max
        ) {
          result.errors.push(
            `${interval.name} must be a number between ${interval.min} and ${interval.max} milliseconds`
          );
        }

        // Performance warnings
        if (interval.name === "DEFAULT_MONITORING_INTERVAL" && value < 1000) {
          result.warnings.push(
            "Very low monitoring interval may cause high API usage and rate limiting."
          );
        }

        if (interval.name === "BUY_GIFTS_INTERVAL" && value < 5000) {
          result.warnings.push(
            "Low buy interval may trigger rate limits or anti-spam measures."
          );
        }
      }
    }
  }

  private validateTelegramSettings(
    config: any,
    result: ValidationResult
  ): void {
    // Validate bot token format
    if (config.TELEGRAM_BOT_TOKEN) {
      const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
      if (!tokenRegex.test(config.TELEGRAM_BOT_TOKEN)) {
        result.errors.push("TELEGRAM_BOT_TOKEN format is invalid");
      }

      if (config.TELEGRAM_BOT_TOKEN.includes("your_bot_token")) {
        result.securityIssues.push(
          "Bot token appears to be a placeholder. Use a real bot token."
        );
      }
    }

    // Validate chat IDs
    if (config.CHAT_IDS && Array.isArray(config.CHAT_IDS)) {
      config.CHAT_IDS.forEach((chatId: any, index: number) => {
        if (typeof chatId !== "number" && typeof chatId !== "string") {
          result.errors.push(`Chat ID ${index + 1} must be a number or string`);
        }

        if (typeof chatId === "string" && chatId.includes("your_chat_id")) {
          result.securityIssues.push(
            `Chat ID ${index + 1} appears to be a placeholder.`
          );
        }
      });
    }

    // Validate directory paths
    const directories = ["SESSIONS_DIR", "GIFTS_LOG_DIR"];
    for (const dir of directories) {
      if (config[dir] && typeof config[dir] !== "string") {
        result.errors.push(`${dir} must be a string path`);
      }

      if (
        config[dir] &&
        (config[dir].includes("../") || config[dir].startsWith("/"))
      ) {
        result.securityIssues.push(
          `${dir} path may be unsafe. Use relative paths within project directory.`
        );
      }
    }
  }

  private validateSecurity(config: any, result: ValidationResult): void {
    // Check for hardcoded sensitive data
    const configString = JSON.stringify(config);

    const sensitivePatterns = [
      {
        pattern: /api_id.*:\s*\d{7,}/,
        message: "API ID exposed in plain text",
      },
      {
        pattern: /api_hash.*:\s*"[a-f0-9]{32,}"/,
        message: "API hash exposed in plain text",
      },
      {
        pattern: /password.*:\s*"[^"]{8,}"/,
        message: "Password found in configuration",
      },
      {
        pattern: /token.*:\s*"\d+:[A-Za-z0-9_-]+"/,
        message: "Bot token exposed in plain text",
      },
    ];

    for (const { pattern, message } of sensitivePatterns) {
      if (pattern.test(configString)) {
        result.securityIssues.push(
          `Security: ${message}. Consider using environment variables.`
        );
      }
    }

    // Check for development/test indicators
    const testIndicators = ["test", "dev", "debug", "localhost"];
    for (const indicator of testIndicators) {
      if (configString.toLowerCase().includes(indicator)) {
        result.warnings.push(
          `Configuration contains '${indicator}' - ensure this is not a production setup.`
        );
      }
    }

    // Validate environment separation
    if (config.NODE_ENV === "production") {
      if (config.DEFAULT_MONITORING_INTERVAL < 1000) {
        result.securityIssues.push(
          "Production environment should not use intervals under 1 second."
        );
      }
    }
  }

  public validateEnvironment(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityIssues: [],
    };

    // Check Node.js version (if available)
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.substring(1).split(".")[0]);

      if (majorVersion < 16) {
        result.warnings.push(
          `Node.js version ${nodeVersion} is outdated. Consider upgrading to v18+.`
        );
      }
    } catch {
      // Process not available or in browser environment
    }

    // Check for required environment variables
    const requiredEnvVars = ["NODE_ENV"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        result.warnings.push(`Environment variable ${envVar} is not set.`);
      }
    }

    return result;
  }

  public sanitizeConfig(config: any): any {
    const sanitized = JSON.parse(JSON.stringify(config));

    // Remove or mask sensitive information
    if (sanitized.ACCOUNTS) {
      sanitized.ACCOUNTS.forEach((account: any) => {
        if (account.api_hash) {
          account.api_hash = "***HIDDEN***";
        }
        if (account.phone_number) {
          account.phone_number = account.phone_number.replace(
            /\d(?=\d{4})/g,
            "*"
          );
        }
      });
    }

    if (sanitized.TELEGRAM_BOT_TOKEN) {
      sanitized.TELEGRAM_BOT_TOKEN = "***HIDDEN***";
    }

    return sanitized;
  }

  public getSecurityRecommendations(): string[] {
    return [
      "Store sensitive credentials in environment variables",
      "Use different API credentials for each account",
      "Regularly rotate bot tokens and API keys",
      "Set appropriate monitoring intervals to avoid rate limiting",
      "Use unique phone numbers for each account",
      "Keep session files secure and backed up",
      "Monitor logs for suspicious activity",
      "Use strong, unique passwords for 2FA if enabled",
      "Regularly update dependencies for security patches",
      "Consider using encrypted storage for sensitive data",
    ];
  }
}
