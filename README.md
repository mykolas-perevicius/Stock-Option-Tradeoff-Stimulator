# Stock vs Options Academic Simulator

A full-featured, academic-grade simulator for comparing stock ownership versus options positions. Visualize the linear vs nonlinear P&L tradeoffs with realistic market data, probability distributions, and comprehensive analysis tools.

## Core Concept

**The Fundamental Tradeoff:**
- **Stock**: Linear P&L, immediate profit/loss on any price movement, unlimited downside
- **Options**: Nonlinear P&L (hockey stick), must clear breakeven, defined risk, leveraged upside

## Features

- Real-time options data via Tradier API (with offline/manual fallback)
- Black-Scholes pricing with full Greeks (delta, gamma, theta, vega, rho)
- Interactive P&L visualization with adjustable axis controls
- Probability distribution overlays (log-normal)
- Risk/reward analysis with expected value calculations
- Time decay visualization
- Export to PNG, CSV, PDF
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
- **Data**: Tradier API (primary), Yahoo Finance (fallback), manual input

## API Setup (Optional)

For real market data, obtain a free API key from [Tradier](https://developer.tradier.com/):

1. Sign up for a Tradier developer account
2. Copy your API token
3. Enter it in the app settings

The simulator works fully offline with manual parameter input.

## Documentation

- [REQUIREMENTS.md](./REQUIREMENTS.md) - Full specification document
- [CLAUDE.md](./CLAUDE.md) - Development guidance

## License

Apache 2.0 - See [LICENSE](./LICENSE)
