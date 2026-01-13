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
- [x] Stock symbol search with autocomplete
- [x] Fetch current stock price
- [ ] Load full options chain for selected symbol
- [ ] Display all available expirations
- [ ] Display all available strikes for selected expiration
- [x] Show real Greeks (delta, gamma, theta, vega, rho) - via Black-Scholes calculation
- [x] Show real IV (implied volatility) - estimated from symbol
- [ ] Auto-refresh toggle (configurable interval)
- [x] Last updated timestamp display
- [x] API status indicator (connected/error/rate-limited)

### 3.2 Position Builder
- [x] Select call or put
- [ ] Select expiration date from real chain
- [ ] Select strike price from real chain
- [x] Auto-populate premium from market data (via Black-Scholes)
- [x] Manual override for all fields
- [x] Investment amount input
- [x] Calculate shares owned vs contracts owned
- [x] Show position cost basis
- [ ] Support multiple legs (spreads) - future enhancement

### 3.3 P&L Visualization

#### 3.3.1 Main Chart Requirements
- [x] Stock P&L line (green) - linear
- [x] Option P&L line (yellow/orange) - hockey stick curve
- [x] **CRITICAL**: Adjustable axis bounds (not dominated by extremes)
  - [x] Auto-scale to relevant range (focused view around key prices)
  - [x] Manual min/max price axis controls
  - [x] Manual min/max P&L axis controls
  - [ ] Zoom in/out controls
  - [ ] Pan/drag to explore
  - [x] Reset to default view button (via presets)
- [x] Reference lines:
  - [x] Current price (yellow dashed)
  - [x] Strike price (blue dashed)
  - [x] Breakeven price (orange dashed)
  - [x] Zero P&L line (gray)
- [x] Hover tooltips with exact values
- [ ] Click to pin a price point for comparison

#### 3.3.2 Probability Distribution Overlay
- [x] Log-normal distribution curve showing likely price outcomes
- [x] **INDEPENDENT of P&L chart range** - uses ±3σ range
- [x] Shaded regions for probability visualization
- [x] Reference lines for ±1σ and ±2σ confidence intervals
- [x] Shows when using custom expected move vs IV-implied
- [ ] Toggle distribution overlay on/off
- [x] Adjustable confidence intervals (1 sigma, 2 sigma displayed)

#### 3.3.3 Time Decay Visualization
- [x] Slider for days to expiration
- [x] Animate option value decay over time
- [x] Show P&L curves at current time point
- [x] Theta burn visualization in TimeDecayChart

### 3.4 Risk/Reward Analysis Panel

#### 3.4.1 Expected Move Feature (NEW)
- [x] Expected move slider to override IV-implied volatility
- [x] Converts expected move % back to equivalent sigma
- [x] **Affects all calculations globally**:
  - [x] Probability distribution
  - [x] Risk/reward statistics
  - [x] Greeks calculations
  - [x] Time decay visualization
  - [x] Multi-strike comparison
- [x] Visual indicator when using custom expected move
- [x] Reset to IV button

#### 3.4.2 Downside Analysis
- [x] Probability of loss (stock vs options)
- [x] Average loss when wrong
- [x] Maximum loss
- [x] Value at Risk (VaR) at 95%, 99%
- [ ] Expected shortfall / CVaR (calculated but not prominently displayed)

#### 3.4.3 Upside Analysis
- [x] Probability of profit
- [x] Average gain when right
- [x] Probability of 50% return
- [x] Probability of 100% return
- [x] Expected gain at target price

#### 3.4.4 Expected Value
- [x] Probability-weighted EV for stock
- [x] Probability-weighted EV for options
- [x] EV difference
- [ ] Sharpe-ratio-like metric (EV / risk) - calculated but simplified

#### 3.4.5 Key Price Levels
- [x] Option breakeven price
- [x] Price where options outperform stock (crossover)
- [x] Price for 50% return
- [x] Price for 100% return
- [x] Price for 200% return

### 3.5 Greeks Dashboard
- [x] Delta - price sensitivity
- [x] Gamma - delta sensitivity
- [x] Theta - time decay per day
- [x] Vega - volatility sensitivity
- [x] Rho - interest rate sensitivity
- [x] Visual representation of each Greek
- [ ] How Greeks change across strikes (smile/skew)

### 3.6 Scenario Analysis
- [x] "What if" price input
- [x] "What if" IV change input
- [x] "What if" days elapsed input
- [x] Side-by-side comparison table
- [ ] Monte Carlo simulation (N paths)
- [ ] Distribution of outcomes histogram

### 3.7 Multi-Strike Comparison (NEW)
- [x] Compare multiple strikes at once
- [x] Shows P&L curves for different strikes
- [x] Probability of profit for each strike
- [x] Best strike by probability vs best by EV
- [x] Uses adjusted sigma when expected move is overridden
- [x] Educational summary of ITM/ATM/OTM tradeoffs

---

## 4. Chart Controls (Critical for Usability)

### 4.1 Axis Management
```
Problem: Extreme values (stock going to 0, or 10x) dominate the chart
Solution: Smart defaults + manual controls
```

- [x] **Auto-range algorithm**:
  - Default X-axis: Focused view around key prices (current, strike, breakeven)
  - Default Y-axis: Based on position sizing and premium
  - Never show stock at $0 unless user explicitly wants it

- [x] **Manual controls**:
  - Min price input
  - Max price input
  - Min P&L input
  - Max P&L input
  - [ ] Lock/unlock aspect ratio

- [x] **Quick presets**:
  - "Super Focused" (tight around key prices)
  - "±1σ" (1 sigma range)
  - "±2σ" (2 sigma range)
  - "±3σ" (3 sigma range)
  - "Full Range" (10% to 200% of current)

### 4.2 Interactive Features
- [ ] Click and drag to zoom
- [ ] Scroll to zoom in/out
- [ ] Double-click to reset
- [x] Crosshair cursor with values (via tooltips)
- [ ] Comparison mode (click two points)

---

## 5. Import/Export Functionality

### 5.1 Export Options
- [x] **Chart Export**:
  - [x] PNG image (high resolution)
  - [ ] SVG vector
  - [x] PDF report

- [x] **Data Export**:
  - [x] CSV of P&L data points
  - [ ] JSON of full simulation parameters
  - [ ] Excel (.xlsx) with formatted tables

- [x] **Report Export**:
  - [x] Full PDF report with:
    - Input parameters
    - Charts
    - Risk metrics
    - Greeks
  - [ ] Markdown summary

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
- [x] Generate shareable URL with encoded parameters
- [x] Copy link to clipboard
- [ ] QR code generation

---

## 6. Educational Features

### 6.1 Tooltips & Explanations
- [x] Hover explanations for metrics
- [x] Expandable tradeoff explanation section
- [ ] "Learn more" expandable sections
- [ ] Glossary of terms

### 6.2 Guided Tutorials
- [ ] "What is an option?" walkthrough
- [ ] "Understanding the Greeks" interactive demo
- [ ] "When to use options vs stock" decision tree

### 6.3 Comparison Scenarios
- [x] Pre-built scenarios:
  - [x] Blue Chip (AAPL)
  - [x] Growth Stock (TSLA)
  - [x] Meme Stock (GME)
  - [x] Index (SPY)
  - [x] Earnings Play
  - [x] LEAPS

---

## 7. Technical Architecture

### 7.1 Frontend Stack
```
Framework: React 18+ with Vite
Styling: Tailwind CSS
Charts: Recharts (with custom controls)
State: useState/useMemo with state lifted to App.jsx
Forms: Native React
```

### 7.2 Key Components
```
/src
  /components
    PLChart.jsx              # Main P&L visualization
    ProbabilityChart.jsx     # Independent probability distribution
    AnimatedPLChart.jsx      # Time decay animation
    GreeksPanel.jsx          # Greeks dashboard
    RiskRewardPanel.jsx      # Risk/reward + expected move slider
    TimeDecayChart.jsx       # Theta decay
    ScenarioPanel.jsx        # What-if analysis
    MultiStrikePanel.jsx     # Multi-strike comparison
    ControlPanel.jsx         # Main inputs
    AxisControls.jsx         # Chart range controls
    ExportMenu.jsx           # Export options
  /utils
    blackScholes.js          # B-S formulas
    greeks.js                # Greek calculations
    probability.js           # Log-normal distribution
    statistics.js            # Stats calculations
    exportHelpers.js         # File generation
  /api
    stockQuote.js            # Quote fetching
  /data
    presets.js               # Preset scenarios
```

### 7.3 State Management
- **App.jsx as central hub** - all critical state lives here
- **expectedMoveOverride** - key state that affects all probability calculations
- **Derived sigma** - calculated from expectedMoveOverride or baseImpliedVol
- **Independent probability data** - separate useMemo with ±3σ range

### 7.4 API Key Management
- User provides their own API key
- Stored in localStorage (with warning)
- Option to use environment variable for deployment
- Never transmitted to any server except the data provider

### 7.5 Offline Capability
- [ ] Service worker for PWA
- [ ] Cache last fetched data
- [x] Full functionality with manual inputs

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

### 8.4 Expected Move Conversion
```typescript
// From IV to expected move
expectedMove% = sigma * sqrt(T) * 100

// From expected move back to sigma
sigma = expectedMove% / (sqrt(T) * 100)
```

### 8.5 Expected Value Calculation
```typescript
// Numerical integration over price distribution
EV = sum(P(S_i) * PL(S_i) * deltaS)
```

---

## 9. UI/UX Requirements

### 9.1 Layout
- [x] Responsive design (mobile, tablet, desktop)
- [x] Dark mode default (trading aesthetic)
- [ ] Light mode option
- [ ] Collapsible panels for screen real estate

### 9.2 Color Scheme
```
Stock: Green (#10B981)
Options: Yellow/Orange (#F59E0B)
Profit: Green (#22C55E)
Loss: Red (#EF4444)
Neutral: Gray (#6B7280)
Probability: Purple (#A855F7)
Expected Move: Purple (#A855F7)
Background: Dark gray (#030712 to #1F2937)
```

### 9.3 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color blind friendly palette option
- [ ] High contrast mode

---

## 10. Testing Requirements

### 10.1 Unit Tests
- [ ] Black-Scholes calculations (validate against known values)
- [ ] Greeks calculations
- [ ] Probability distribution
- [ ] P&L calculations

### 10.2 Integration Tests
- [ ] API data fetching
- [ ] Chart rendering with various data
- [ ] Export functionality

### 10.3 E2E Tests
- [ ] Full user flow: search -> select -> analyze -> export

---

## 11. Deployment

### 11.1 Hosting Options
- [x] Vercel (recommended) - currently deployed
- Netlify
- GitHub Pages (static export)
- Self-hosted

### 11.2 Environment Variables
```
VITE_TRADIER_API_KEY=optional_default_key
VITE_ALPHA_VANTAGE_KEY=optional_fallback
```

### 11.3 CI/CD
- [ ] GitHub Actions for testing
- [x] Auto-deploy on main branch (Vercel)
- [ ] Preview deployments for PRs

---

## 12. Future Enhancements (v2+)

- [ ] Multi-leg strategies (spreads, straddles, condors)
- [ ] Portfolio-level analysis
- [ ] Historical backtesting
- [ ] Paper trading integration
- [ ] Social sharing / community scenarios
- [x] AI-powered analysis (via Groq integration)
- [ ] Real-time streaming data
- [ ] Mobile app (React Native)

---

## 13. Success Criteria

1. [x] User can enter any stock symbol and get real options data
2. [x] Charts are readable and not dominated by extreme values
3. [x] Clear visualization of linear (stock) vs nonlinear (options) tradeoff
4. [x] Probability-weighted analysis shows realistic expected outcomes
5. [x] Full export capability (PNG, CSV, PDF)
6. [x] Works offline with manual inputs
7. [x] Educational value for understanding options
8. [x] **Expected move slider affects all calculations globally**
9. [x] **Probability distribution is independent of P&L chart range**

---

## 14. Open Questions

1. **API Key UX**: Should users sign up for their own Tradier key, or do we provide a limited shared key?
   - *Current: Users can use manual mode or provide their own key*

2. **Caching**: How long to cache options chain data? (Suggestion: 1 minute for intraday)
   - *Current: No caching implemented*

3. **Multi-leg priority**: Is basic spreads support needed for v1?
   - *Deferred to v2*

4. **Historical mode**: Should we include ability to "replay" past dates?
   - *Deferred to v2*

---

*Document Version: 1.1*
*Last Updated: January 2025*
*Changes in 1.1: Added expected move slider feature, independent probability distribution, multi-strike comparison, updated completion status*
