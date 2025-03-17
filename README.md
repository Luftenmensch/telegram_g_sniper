# Telegram Gifts Sniper 🎁

A sophisticated bot for monitoring and purchasing Telegram Star Gifts automatically. This tool can monitor gift availability, apply custom filters, and execute purchases based on your configured criteria.

## 🌟 Features

- **Multi-Account Support**: Manage multiple Telegram accounts simultaneously
- **Smart Filtering**: Advanced filtering system with price, supply, and market cap limits
- **Real-time Monitoring**: Continuous monitoring of Telegram Star Gifts
- **Gift Analysis**: Comprehensive analysis tools with Excel export functionality
- **Session Management**: Secure session storage for persistent authentication
- **Automated Purchasing**: Automatic gift purchasing when criteria are met
- **Logging System**: Detailed logging of all activities and transactions

## 📋 Prerequisites

- [Bun](https://bun.sh) runtime (v1.1.45 or higher)
- Node.js (v18 or higher)
- Telegram API credentials (api_id and api_hash)
- Active Telegram accounts with sufficient Stars balance

## 🚀 Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd telegram_g_sniper
```

2. Install dependencies:

```bash
bun install
```

3. Configure the application (see Configuration section below)

## ⚙️ Configuration

### 1. Basic Setup

Copy and modify the `config.ts` file with your settings:

```typescript
export const Config: IConfig = {
  TELEGRAM_BOT_TOKEN: "your_bot_token_here",
  CHAT_IDS: [your_chat_id], // Get from @getmyid_bot
  DEFAULT_MONITORING_INTERVAL: 1000, // 1 second
  BUY_GIFTS_INTERVAL: 10000, // 10 seconds
  SESSIONS_DIR: "sessions",
  GIFTS_LOG_DIR: "gifts_logs",
  ACCOUNTS: [
    {
      api_id: your_api_id,
      api_hash: "your_api_hash",
      phone_number: "+1234567890",
      name: "Account1",
      user_id: "target_user_id",
      access_hash: "target_access_hash",
    },
  ],
  FILTERS: [
    {
      min_price_stars: 10,
      max_price_stars: 1000,
      max_supply: 1000000,
      max_cap: 1000000,
      limited: false,
      buy_count: 1,
    },
  ],
};
```

### 2. Get Telegram API Credentials

1. Visit [my.telegram.org](https://my.telegram.org)
2. Log in with your phone number
3. Go to "API Development Tools"
4. Create a new application
5. Copy your `api_id` and `api_hash`

### 3. Filter Configuration

Configure filters to specify which gifts to target:

- `min_price_stars`: Minimum price in stars (required)
- `max_price_stars`: Maximum price in stars (optional)
- `max_supply`: Maximum total supply (optional)
- `max_cap`: Maximum market cap (price × supply) (optional)
- `limited`: Target only limited edition gifts (optional)
- `buy_count`: Number of gifts to purchase per match (optional)

## 🏃‍♂️ Usage

### Start the Main Bot

```bash
bun run index.ts
```

### Analyze Gifts

Generate Excel reports with gift analysis:

```bash
bun run scripts/analyze_gifts.ts
```

### Development/Testing

```bash
bun run test.ts
```

## 📁 Project Structure

```
telegram_g_sniper/
├── index.ts              # Main application entry point
├── config.ts             # Configuration file
├── accountManager.ts     # Multi-account management
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── sessions/             # Telegram session storage
├── gifts_logs/           # Transaction and activity logs
├── scripts/
│   ├── analyze_gifts.ts  # Gift analysis and Excel export
│   └── convert_stickers.ts # Sticker conversion utilities
├── star_gifts.json       # Current gifts data cache
└── good_star_gifts.json  # Filtered good gifts cache
```

## 🔧 Scripts

| Script                             | Description                         |
| ---------------------------------- | ----------------------------------- |
| `bun run index.ts`                 | Start the main gift sniper          |
| `bun run scripts/analyze_gifts.ts` | Generate gift analysis Excel report |
| `bun start`                        | Alternative start command           |
| `bun run analyze`                  | Run gift analysis (alias)           |

## 📊 Features Breakdown

### Gift Monitoring

- Continuous polling of Telegram Star Gifts
- Real-time availability tracking
- Price and supply monitoring

### Smart Filtering

- Multiple filter support
- Market cap calculations
- Limited edition detection
- Custom price ranges

### Account Management

- Multi-account rotation
- Session persistence
- Authentication handling
- Error recovery

### Analysis Tools

- Excel export with images
- Market cap calculations
- Supply and demand analysis
- Profitability metrics

## 🔒 Security Notes

- Store your API credentials securely
- Keep session files private
- Use separate accounts for testing
- Monitor your Star balance regularly

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Failed**

   - Verify API credentials in config.ts
   - Check phone number format
   - Ensure account has 2FA disabled or properly configured

2. **No Gifts Found**

   - Adjust filter parameters
   - Check gift availability times
   - Verify account has sufficient balance

3. **Session Errors**
   - Delete session files and re-authenticate
   - Check account restrictions
   - Verify API limits

### Debug Mode

Enable detailed logging by modifying the monitoring intervals in config.ts.

## 📝 Logging

All activities are logged to:

- Console output for real-time monitoring
- `gifts_logs/` directory for persistent storage
- JSON files for gift data caching

## ⚠️ Disclaimer

This tool is for educational purposes. Users are responsible for:

- Complying with Telegram's Terms of Service
- Managing their own API usage and limits
- Ensuring proper account security
- Understanding financial risks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is created using Bun and is subject to applicable licenses.

---

**Note**: This project was created using `bun init` in bun v1.1.45. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
