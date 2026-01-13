# Stock vs Options Academic Simulator
## Comprehensive Requirements Document

---

## 1. Project Overview

### 1.1 Purpose
A full-featured, academic-grade simulator for comparing stock ownership versus options positions. Enables users to visualize the linear vs nonlinear P&L tradeoffs with realistic market data, probability distributions, and comprehensive analysis tools.

### 1.2 Target Users
- Finance students and educators
- Retail investors learning options
- Quantitative researchers
- Anyone wanting to understand stock vs options tradeoffs

### 1.3 Core Concept
Visualize the fundamental tradeoff:
- **Stock**: Linear P&L, immediate profit/loss on any price movement, unlimited downside
- **Options**: Nonlinear P&L (hockey stick), must clear breakeven, defined risk, leveraged upside

---

## 2. Data Sources

### 2.1 Primary: Tradier API (Recommended)
- **Why**: Free tier with real options chain data including Greeks (delta, gamma, theta, vega) and IV from ORATS
- **Endpoints needed**:
  - `GET /v1/markets/quotes` - Stock quotes
  - `GET /v1/markets/options/chains` - Full options chain with Greeks
  - `GET /v1/markets/options/expirations` - Available expiration dates
  - `GET /v1/markets/options/strikes` - Available strikes
  - `GET /v1/markets/history` - Historical price data
- **Rate limits**: Generous free tier
- **Auth**: Bearer token (user provides their own API key)

### 2.2 Fallback: Yahoo Finance (via yfinance patterns)
- Unofficial but widely used
- Good for historical data and basic options chains
- Less reliable for real-time Greeks

### 2.3 Fallback: Alpha Vantage
- 500 requests/day free tier
- Good for stock data, limited options support

### 2.4 Manual/Offline Mode
- User can input all parameters manually
- Black-Scholes calculated Greeks when API unavailable
- Useful for hypothetical scenarios

---

## 3. Core Features

### 3.1 Real-Time Data Integration
- [ ] Stock symbol search with autocomplete
- [ ] Fetch current stock price
- [ ] Load full options chain for selected symbol
- [ ] Display all available expirations
- [ ] Display all available strikes for selected expiration
- [ ] Show real Greeks (delta, gamma, theta, vega, rho)
- [ ] Show real IV (implied volatility)
- [ ] Auto-refresh toggle (configurable interval)
- [ ] Last updated timestamp display
- [ ] API status indicator (connected/error/rate-limited)

### 3.2 Position Builder
- [ ] Select call or put
- [ ] Select expiration date from real chain
- [ ] Select strike price from real chain
- [ ] Auto-populate premium from market data
- [ ] Manual override for all fields
- [ ] Investment amount input
- [ ] Calculate shares owned vs contracts owned
- [ ] Show position cost basis
- [ ] Support multiple legs (spreads) - future enhancement

### 3.3 P&L Visualization

#### 3.3.1 Main Chart Requirements
- [ ] Stock P&L line (green) - linear
- [ ] Option P&L line (yellow/orange) - hockey stick curve
- [ ] **CRITICAL**: Adjustable axis bounds (not dominated by extremes)
  - [ ] Auto-scale to relevant range (e.g., +/- 2 standard deviations)
  - [ ] Manual min/max price axis controls
  - [ ] Manual min/max P&L axis controls
  - [ ] Zoom in/out controls
  - [ ] Pan/drag to explore
  - [ ] Reset to default view button
- [ ] Reference lines:
  - [ ] Current price (yellow dashed)
  - [ ] Strike price (blue dashed)
  - [ ] Breakeven price (orange dashed)
  - [ ] Zero P&L line (gray)
- [ ] Hover tooltips with exact values
- [ ] Click to pin a price point for comparison

#### 3.3.2 Probability Distribution Overlay
- [ ] Log-normal distribution curve showing likely price outcomes
- [ ] Shaded regions for:
  - [ ] Stock profit zone
  - [ ] Stock loss zone
  - [ ] Option profit zone
  - [ ] Option loss zone (below breakeven)
- [ ] Toggle distribution overlay on/off
- [ ] Adjustable confidence intervals (1 sigma, 2 sigma, 3 sigma)

#### 3.3.3 Time Decay Visualization
- [ ] Slider for days to expiration
- [ ] Animate option value decay over time
- [ ] Show P&L curves at multiple time points (T, T-7, T-14, etc.)
- [ ] Theta burn visualization

### 3.4 Risk/Reward Analysis Panel

#### 3.4.1 Downside Analysis
- [ ] Probability of loss (stock vs options)
- [ ] Average loss when wrong
- [ ] Maximum loss
- [ ] Value at Risk (VaR) at 95%, 99%
- [ ] Expected shortfall / CVaR

#### 3.4.2 Upside Analysis
- [ ] Probability of profit
- [ ] Average gain when right
- [ ] Probability of doubling investment
- [ ] Expected gain at target price

#### 3.4.3 Expected Value
- [ ] Probability-weighted EV for stock
- [ ] Probability-weighted EV for options
- [ ] EV difference
- [ ] Sharpe-ratio-like metric (EV / risk)

#### 3.4.4 Key Price Levels
- [ ] Option breakeven price
- [ ] Price where options outperform stock (crossover)
- [ ] Price for 50% return
- [ ] Price for 100% return
- [ ] Price for 200% return

### 3.5 Greeks Dashboard
- [ ] Delta - price sensitivity
- [ ] Gamma - delta sensitivity
- [ ] Theta - time decay per day
- [ ] Vega - volatility sensitivity
- [ ] Rho - interest rate sensitivity
- [ ] Visual representation of each Greek
- [ ] How Greeks change across strikes (smile/skew)

### 3.6 Scenario Analysis
- [ ] "What if" price input
- [ ] "What if" IV change input
- [ ] "What if" days elapsed input
- [ ] Side-by-side comparison table
- [ ] Monte Carlo simulation (N paths)
- [ ] Distribution of outcomes histogram

---

## 4. Chart Controls (Critical for Usability)

### 4.1 Axis Management
```
Problem: Extreme values (stock going to 0, or 10x) dominate the chart
Solution: Smart defaults + manual controls
```

- [ ] **Auto-range algorithm**:
  - Default X-axis: Current price +/- 2 sigma (based on IV and time)
  - Default Y-axis: -100% to +200% of investment (adjusts to data)
  - Never show stock at $0 unless user explicitly wants it

- [ ] **Manual controls**:
  - Min price input
  - Max price input
  - Min P&L input
  - Max P&L input
  - Lock/unlock aspect ratio

- [ ] **Quick presets**:
  - "Conservative" (+/- 1 sigma)
  - "Normal" (+/- 2 sigma)
  - "Wide" (+/- 3 sigma)
  - "Full range" (0 to 2x current)

### 4.2 Interactive Features
- [ ] Click and drag to zoom
- [ ] Scroll to zoom in/out
- [ ] Double-click to reset
- [ ] Crosshair cursor with values
- [ ] Comparison mode (click two points)

---

## 5. Import/Export Functionality

### 5.1 Export Options
- [ ] **Chart Export**:
  - PNG image (high resolution)
  - SVG vector
  - PDF report

- [ ] **Data Export**:
  - CSV of P&L data points
  - JSON of full simulation parameters
  - Excel (.xlsx) with formatted tables

- [ ] **Report Export**:
  - Full PDF report with:
    - Input parameters
    - All charts
    - Risk metrics
    - Greeks
    - Recommendations
  - Markdown summary

### 5.2 Import Options
- [ ] **Load saved simulation**:
  - JSON configuration file
  - Auto-populate all fields

- [ ] **Import options chain**:
  - CSV format for offline data
  - Paste from clipboard

- [ ] **Import historical scenarios**:
  - Load past market conditions
  - Backtest mode

### 5.3 Sharing
- [ ] Generate shareable URL with encoded parameters
- [ ] Copy link to clipboard
- [ ] QR code generation

---

## 6. Educational Features

### 6.1 Tooltips & Explanations
- [ ] Hover explanations for every metric
- [ ] "Learn more" expandable sections
- [ ] Glossary of terms

### 6.2 Guided Tutorials
- [ ] "What is an option?" walkthrough
- [ ] "Understanding the Greeks" interactive demo
- [ ] "When to use options vs stock" decision tree

### 6.3 Comparison Scenarios
- [ ] Pre-built scenarios:
  - High IV environment (meme stock)
  - Low IV environment (blue chip)
  - Earnings play
  - Long-dated LEAPS
  - Weekly expiration

---

## 7. Technical Architecture

### 7.1 Frontend Stack
```
Framework: React 18+ with Vite
Styling: Tailwind CSS
Charts: Recharts (with custom controls)
State: useState/useMemo (Zustand if needed)
Forms: Native React
```

### 7.2 Key Components
```
/src
  /components
    /charts
      PLChart.tsx           # Main P&L visualization
      ProbabilityChart.tsx  # Distribution overlay
      GreeksChart.tsx       # Greeks visualization
      TimeDecayChart.tsx    # Theta decay animation
    /controls
      AxisControls.tsx      # Min/max/zoom controls
      PositionBuilder.tsx   # Strike/expiry selector
      SymbolSearch.tsx      # Ticker autocomplete
    /panels
      RiskRewardPanel.tsx   # Statistics display
      GreeksPanel.tsx       # Greeks dashboard
      ScenarioPanel.tsx     # What-if analysis
    /export
      ExportMenu.tsx        # Export options
      PDFReport.tsx         # Report generator
  /hooks
    useOptionsData.ts       # API integration
    useBlackScholes.ts      # Pricing calculations
    useProbability.ts       # Distribution math
  /utils
    blackScholes.ts         # B-S formulas
    greeks.ts               # Greek calculations
    probability.ts          # Log-normal distribution
    exportHelpers.ts        # File generation
  /api
    tradier.ts              # Tradier API client
    yahoo.ts                # Yahoo fallback
    alphaVantage.ts         # Alpha Vantage fallback
  /types
    options.ts              # TypeScript interfaces
```

### 7.3 API Key Management
- User provides their own API key
- Stored in localStorage (with warning)
- Option to use environment variable for deployment
- Never transmitted to any server except the data provider

### 7.4 Offline Capability
- Service worker for PWA
- Cache last fetched data
- Full functionality with manual inputs

---

## 8. Mathematical Models

### 8.1 Black-Scholes Implementation
```typescript
// Call price
C = S * N(d1) - K * e^(-rT) * N(d2)

// Put price
P = K * e^(-rT) * N(-d2) - S * N(-d1)

// Where:
d1 = (ln(S/K) + (r + sigma^2/2)T) / (sigma * sqrt(T))
d2 = d1 - sigma * sqrt(T)
```

### 8.2 Greeks Formulas
```typescript
Delta (call) = N(d1)
Delta (put) = N(d1) - 1
Gamma = N'(d1) / (S * sigma * sqrt(T))
Theta = -(S * N'(d1) * sigma) / (2 * sqrt(T)) - r * K * e^(-rT) * N(d2)
Vega = S * sqrt(T) * N'(d1)
Rho = K * T * e^(-rT) * N(d2)
```

### 8.3 Probability Distribution
```typescript
// Log-normal PDF for future stock price
P(S_T) = (1 / (S_T * sigma * sqrt(2 * pi * T))) * exp(-(ln(S_T) - mu)^2 / (2 * sigma^2 * T))

// Where mu = ln(S_0) + (r - sigma^2/2) * T
```

### 8.4 Expected Value Calculation
```typescript
// Numerical integration over price distribution
EV = sum(P(S_i) * PL(S_i) * deltaS)
```

---

## 9. UI/UX Requirements

### 9.1 Layout
- Responsive design (mobile, tablet, desktop)
- Dark mode default (trading aesthetic)
- Light mode option
- Collapsible panels for screen real estate

### 9.2 Color Scheme
```
Stock: Green (#10B981)
Options: Yellow/Orange (#F59E0B)
Profit: Green (#22C55E)
Loss: Red (#EF4444)
Neutral: Gray (#6B7280)
Probability: Purple (#A855F7)
Background: Dark gray (#0F0F0F to #1F1F1F)
```

### 9.3 Accessibility
- Keyboard navigation
- Screen reader support
- Color blind friendly palette option
- High contrast mode

---

## 10. Testing Requirements

### 10.1 Unit Tests
- Black-Scholes calculations (validate against known values)
- Greeks calculations
- Probability distribution
- P&L calculations

### 10.2 Integration Tests
- API data fetching
- Chart rendering with various data
- Export functionality

### 10.3 E2E Tests
- Full user flow: search -> select -> analyze -> export

---

## 11. Deployment

### 11.1 Hosting Options
- Vercel (recommended)
- Netlify
- GitHub Pages (static export)
- Self-hosted

### 11.2 Environment Variables
```
VITE_TRADIER_API_KEY=optional_default_key
VITE_ALPHA_VANTAGE_KEY=optional_fallback
```

### 11.3 CI/CD
- GitHub Actions for testing
- Auto-deploy on main branch
- Preview deployments for PRs

---

## 12. Future Enhancements (v2+)

- [ ] Multi-leg strategies (spreads, straddles, condors)
- [ ] Portfolio-level analysis
- [ ] Historical backtesting
- [ ] Paper trading integration
- [ ] Social sharing / community scenarios
- [ ] AI-powered strategy suggestions
- [ ] Real-time streaming data
- [ ] Mobile app (React Native)

---

## 13. Success Criteria

1. User can enter any stock symbol and get real options data
2. Charts are readable and not dominated by extreme values
3. Clear visualization of linear (stock) vs nonlinear (options) tradeoff
4. Probability-weighted analysis shows realistic expected outcomes
5. Full export capability (PNG, CSV, PDF)
6. Works offline with manual inputs
7. Educational value for understanding options

---

## 14. Open Questions

1. **API Key UX**: Should users sign up for their own Tradier key, or do we provide a limited shared key?
2. **Caching**: How long to cache options chain data? (Suggestion: 1 minute for intraday)
3. **Multi-leg priority**: Is basic spreads support needed for v1?
4. **Historical mode**: Should we include ability to "replay" past dates?

---

*Document Version: 1.0*
*Last Updated: January 2025*
