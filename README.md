# Stock vs Options Academic Simulator

[![Live Demo](https://img.shields.io/badge/demo-stocksandoptions.org-blue)](https://stocksandoptions.org)
[![License](https://img.shields.io/badge/license-Apache%202.0-green)](./LICENSE)

A full-featured, academic-grade simulator for comparing stock ownership versus options positions. Visualize the linear vs nonlinear P&L tradeoffs with realistic market data, probability distributions, and comprehensive analysis tools.

**[Try it live at stocksandoptions.org](https://stocksandoptions.org)**

![Stock vs Options Simulator Preview](public/og-image.png)

## Core Concept

**The Fundamental Tradeoff:**
- **Stock**: Linear P&L, immediate profit/loss on any price movement, unlimited downside
- **Options**: Nonlinear P&L (hockey stick), must clear breakeven, defined risk, leveraged upside

## Features

### Data & Pricing
- **Live stock quotes and IV** - Real-time data via yfinance backend
- **Live implied volatility** - Fetched from options chains (not hardcoded!)
- Black-Scholes pricing with full Greeks (delta, gamma, theta, vega, rho)
- Preset scenarios for common market conditions
- User accounts to save API keys (Supabase auth)

### Visualization
- Interactive P&L visualization with adjustable axis controls
- **Independent probability distribution** - shows full ±3σ range regardless of P&L zoom level
- Time decay animation with day slider
- Multi-strike comparison charts

### Analysis
- Risk/reward analysis with expected value calculations
- **Expected Move Slider** - adjust your volatility assumption and see all calculations update in real-time
- VaR (Value at Risk) at 95% and 99% confidence levels
- Probability of profit calculations for both stock and options

### Expected Move Feature
The expected move slider lets you override the market's implied volatility with your own expectation:
- If you expect larger moves than IV implies, slide right to see how that affects option values
- If you expect smaller moves, slide left
- All charts, statistics, and probabilities update instantly:
  - P&L charts
  - Probability distribution
  - Greeks panel
  - Time decay visualization
  - Multi-strike comparison

### Export
- Export to PNG, CSV, PDF
- Shareable URL with encoded parameters
- Dark mode UI optimized for trading

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open http://localhost:5173 in your browser.

## Target Users

- Finance students and educators
- Retail investors learning options
- Quantitative researchers
- Anyone wanting to understand stock vs options tradeoffs

## Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Auth & Database**: Supabase (PostgreSQL + Auth)
- **Data Providers**: Yahoo Finance, yfinance, Finnhub, Twelve Data, Alpha Vantage, FMP
- **Backend**: FastAPI (Python) for yfinance
- **Deployment**: Vercel (frontend)

## API Providers

The app supports multiple stock quote providers:

| Provider | API Key Required | Notes |
|----------|-----------------|-------|
| **yfinance** | No | **Default** - Live data + IV from options chain |
| Yahoo Finance | No | Offline only (CORS blocked) - uses cached data |
| Finnhub | Yes | [Get free key](https://finnhub.io/) |
| Twelve Data | Yes | [Get free key](https://twelvedata.com/) |
| Alpha Vantage | Yes | [Get free key](https://alphavantage.co/) |
| FMP | Yes | [Get free key](https://financialmodelingprep.com/) |

The simulator works fully offline with manual parameter input.

## Backend Deployment (for yfinance provider)

The yfinance provider requires a Python backend. Deploy it to **Render.com** (free tier):

1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Blueprint"
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and deploy the backend
5. The production backend is at: `https://stock-options-backend-62j0.onrender.com`
6. Update `VITE_YFINANCE_BACKEND_URL` in your Vercel environment variables (already configured for stocksandoptions.org)

**Or deploy manually:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Documentation

- [REQUIREMENTS.md](./REQUIREMENTS.md) - Full specification document
- [CLAUDE.md](./CLAUDE.md) - Development guidance

## Architecture Highlights

### State Management
The app uses React hooks (useState, useMemo) with state lifted to App.jsx:
- **Expected move override** propagates to all components via adjusted sigma
- **Probability distribution** has its own independent data generation (±3σ range)
- **P&L chart range** is separate from probability visualization

### Key Data Flows
```
User adjusts expected move slider
    → Converts to equivalent sigma
    → All components receive adjusted sigma
    → Charts, stats, and probabilities recalculate
```

## License

Apache 2.0 - See [LICENSE](./LICENSE)
