# Stock vs Options Academic Simulator

A full-featured, academic-grade simulator for comparing stock ownership versus options positions. Visualize the linear vs nonlinear P&L tradeoffs with realistic market data, probability distributions, and comprehensive analysis tools.

## Core Concept

**The Fundamental Tradeoff:**
- **Stock**: Linear P&L, immediate profit/loss on any price movement, unlimited downside
- **Options**: Nonlinear P&L (hockey stick), must clear breakeven, defined risk, leveraged upside

## Features

### Data & Pricing
- Real-time options data via Tradier API (with offline/manual fallback)
- Black-Scholes pricing with full Greeks (delta, gamma, theta, vega, rho)
- Preset scenarios for common market conditions

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
