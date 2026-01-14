# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stock vs Options Academic Simulator** - A full-featured simulator for comparing stock ownership versus options positions with Black-Scholes pricing and probability analysis.

**Status**: Active development - React/Vite application with Tailwind CSS

**Live Site**: https://stocksandoptions.org

**License**: Apache 2.0

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server with hot reload (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build

# Backend (optional - for yfinance provider)
cd backend
pip install -r requirements.txt
python main.py       # Runs on http://localhost:8000
```

## Environment Variables

Create a `.env` file in the project root:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_YFINANCE_BACKEND_URL=https://stock-options-backend-62j0.onrender.com  # Production backend
```

## Project Structure

```
/src
  /components
    PLChart.jsx              # Main P&L visualization (stock vs options)
    ProbabilityChart.jsx     # Independent probability distribution (±3σ range)
    AnimatedPLChart.jsx      # Time decay animation with day slider
    GreeksPanel.jsx          # Greeks dashboard (delta, gamma, theta, vega, rho)
    RiskRewardPanel.jsx      # Risk/reward stats + expected move slider
    TimeDecayChart.jsx       # Theta decay visualization
    ScenarioPanel.jsx        # What-if analysis
    MultiStrikePanel.jsx     # Multi-strike comparison
    ControlPanel.jsx         # Main input controls
    AxisControls.jsx         # Chart range presets and manual controls
    ExportMenu.jsx           # Export options (PNG, CSV, PDF, URL)
    AIInterpretation.jsx     # AI-powered analysis (optional)
    TradeoffExplanation.jsx  # Educational explanations
    VolatilityControls.jsx   # IV and Expected Move sliders (top of page)
    APIProviderSelector.jsx  # Multi-provider API dropdown
    /Auth
      AuthModal.jsx          # Login/signup modal
      UserMenu.jsx           # User menu in header
  /utils
    blackScholes.js          # B-S pricing formulas
    greeks.js                # Greek calculations
    probability.js           # Log-normal distribution, VaR, expected value
    statistics.js            # Stats calculations, formatting helpers
    exportHelpers.js         # PNG, CSV, PDF, URL generation
  /api
    stockQuote.js            # Quote fetching with provider factory
    groqApi.js               # AI integration (optional)
    /providers               # Multi-provider API system
      index.js               # Provider registry and factory
      yahoo.js               # Yahoo Finance (free, no key)
      yfinance.js            # yfinance via backend (free)
      finnhub.js             # Finnhub API (key required)
      twelveData.js          # Twelve Data API (key required)
      alphaVantage.js        # Alpha Vantage API (key required)
      fmp.js                 # Financial Modeling Prep (key required)
  /contexts
    AuthContext.jsx          # Supabase auth context
  /lib
    supabase.js              # Supabase client
  /data
    presets.js               # Preset scenarios
  App.jsx                    # Main application component (state hub)
  main.jsx                   # Entry point
  index.css                  # Tailwind directives

/backend                     # Python yfinance backend
  main.py                    # FastAPI server
  requirements.txt           # Python dependencies

/supabase                    # Supabase configuration
  /migrations                # Database migrations
  config.toml                # Supabase config
```

## Key Technical Decisions

- **Charts**: Recharts for main visualizations (supports responsive containers, reference lines)
- **Styling**: Tailwind CSS with dark mode default
- **State**: React useState/useMemo with state lifted to App.jsx
- **Auth**: Supabase Auth with Row Level Security (RLS)
- **Database**: Supabase PostgreSQL for user API keys and preferences
- **API Providers**: Multi-provider system with factory pattern
  - Free: Yahoo Finance, yfinance (via backend)
  - Key required: Finnhub, Twelve Data, Alpha Vantage, FMP
- **Backend**: FastAPI Python server for yfinance (optional)
- **Deployment**: Vercel (frontend), Render.com (backend)
  - Frontend: https://stocksandoptions.org
  - Backend: https://stock-options-backend-62j0.onrender.com

## API Provider System

The app supports multiple stock quote providers via a factory pattern:

```javascript
// src/api/providers/index.js
const providers = {
  yahoo: { name: 'Yahoo Finance', requiresKey: false },
  yfinance: { name: 'yfinance (Backend)', requiresKey: false },
  finnhub: { name: 'Finnhub', requiresKey: true },
  twelvedata: { name: 'Twelve Data', requiresKey: true },
  alphavantage: { name: 'Alpha Vantage', requiresKey: true },
  fmp: { name: 'FMP', requiresKey: true },
};

// Usage
const quote = await fetchQuote('AAPL', { provider: 'yahoo', apiKeys });
```

## Supabase Database Schema

```sql
-- User API keys (encrypted storage)
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  UNIQUE(user_id, provider)
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  preferred_provider TEXT DEFAULT 'yahoo',
  theme TEXT DEFAULT 'dark'
);
```

## State Management Architecture

### App.jsx as State Hub
All critical state lives in App.jsx and flows down to child components:

```javascript
// Core parameters
currentPrice, strikePrice, daysToExpiry, impliedVol, riskFreeRate, investmentAmount, isCall

// Expected move override (key feature)
expectedMoveOverride  // null = use IV-implied, number = custom expected move %

// Derived values
sigma = expectedMoveOverride !== null
  ? expectedMoveOverride / (sqrt(T) * 100)  // Convert back to volatility
  : baseImpliedVol                           // Use raw IV
```

### Data Flow for Expected Move
```
User adjusts expected move slider (RiskRewardPanel)
    → onExpectedMoveChange(value) callback to App.jsx
    → App.jsx recalculates sigma from expected move
    → All components receive adjusted sigma via props
    → Charts, stats, probabilities all update
```

### Independent Probability Distribution
The probability chart has its own data generation, independent of P&L chart range:

```javascript
// In App.jsx
const probabilityData = useMemo(() => {
  // Uses ±3σ range, NOT the P&L chart's minPrice/maxPrice
  const sigmaMove = currentPrice * sigma * Math.sqrt(T);
  const probMinPrice = currentPrice - 3 * sigmaMove;
  const probMaxPrice = currentPrice + 3 * sigmaMove;
  // Generate probability points...
}, [currentPrice, T, r, sigma]);
```

## Mathematical Models

### Black-Scholes Call Price
```
C = S * N(d1) - K * e^(-rT) * N(d2)
d1 = (ln(S/K) + (r + σ²/2)T) / (σ√T)
d2 = d1 - σ√T
```

### Greeks
- Delta (call) = N(d1)
- Gamma = N'(d1) / (S * σ * √T)
- Theta = -(S * N'(d1) * σ) / (2√T) - r * K * e^(-rT) * N(d2)
- Vega = S * √T * N'(d1)

### Probability Distribution
Log-normal PDF for future stock price based on geometric Brownian motion:
```
P(S_T) = N'(z) / (S_T * σ√T)
where z = (ln(S_T) - μ) / (σ√T)
and μ = ln(S_0) + (r - σ²/2)T
```

### Expected Move Conversion
```
expectedMove% = σ * √T * 100
σ = expectedMove% / (√T * 100)
```

## Color Scheme

```
Stock P&L:       #10B981 (green)
Option P&L:      #F59E0B (yellow/orange)
Profit:          #22C55E (green)
Loss:            #EF4444 (red)
Neutral:         #6B7280 (gray)
Probability:     #A855F7 (purple)
Expected Move:   #A855F7 (purple) - matches probability
Background:      #030712 to #1F2937 (dark grays)
```

## Code Style

- Functional React components with hooks
- TypeScript for new files (gradual migration from JSX)
- ESLint + Prettier (to be configured)
- Descriptive variable names for financial calculations

## Component Props Reference

### Key Components

**RiskRewardPanel** - Expected move slider and risk/reward stats
```jsx
<RiskRewardPanel
  stats={stats}
  expectedMoveOverride={expectedMoveOverride}  // null or number
  onExpectedMoveChange={setExpectedMoveOverride}  // callback
  impliedMovePercent={impliedMovePercent}  // IV-implied move for reference
  // ... other props
/>
```

**ProbabilityChart** - Independent probability distribution
```jsx
<ProbabilityChart
  data={probabilityData.data}  // Separate from chartData
  minPrice={probabilityData.minPrice}  // ±3σ range
  maxPrice={probabilityData.maxPrice}
  expectedMoveOverride={expectedMoveOverride}
  impliedMovePercent={impliedMovePercent}
  // ... other props
/>
```

**MultiStrikePanel** - Multi-strike comparison
```jsx
<MultiStrikePanel
  sigma={sigma}  // Receives adjusted sigma (not impliedVol)
  expectedMoveOverride={expectedMoveOverride}
  // ... other props
/>
```

## Testing Checklist

When modifying state or calculations:
1. Adjust expected move slider → all charts should update
2. Change P&L chart range → probability distribution should NOT change
3. Check that Greeks panel reflects adjusted sigma
4. Verify multi-strike comparison uses adjusted probabilities
5. Ensure time decay animation uses adjusted sigma
