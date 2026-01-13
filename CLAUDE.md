# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stock vs Options Academic Simulator** - A full-featured simulator for comparing stock ownership versus options positions with Black-Scholes pricing and probability analysis.

**Status**: Active development - React/Vite application with Tailwind CSS

**License**: Apache 2.0

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server with hot reload (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

## Project Structure

```
/src
  /components
    /charts          # PLChart, ProbabilityChart, GreeksChart, TimeDecayChart
    /controls        # AxisControls, PositionBuilder, SymbolSearch
    /panels          # RiskRewardPanel, GreeksPanel, ScenarioPanel
    /export          # ExportMenu, PDFReport
  /hooks
    useOptionsData.ts    # API integration
    useBlackScholes.ts   # Pricing calculations
    useProbability.ts    # Distribution math
  /utils
    blackScholes.ts      # B-S formulas
    greeks.ts            # Greek calculations
    probability.ts       # Log-normal distribution
    exportHelpers.ts     # File generation
  /api
    tradier.ts           # Tradier API client
    yahoo.ts             # Yahoo fallback
  /types
    options.ts           # TypeScript interfaces
  App.jsx                # Main application component
  main.jsx               # Entry point
  index.css              # Tailwind directives
```

## Key Technical Decisions

- **Charts**: Recharts for main visualizations (supports responsive containers, reference lines)
- **Styling**: Tailwind CSS with dark mode default
- **State**: React useState/useMemo for now; consider Zustand if state grows complex
- **API**: Tradier API primary (free tier with Greeks), manual fallback for offline use

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
Log-normal PDF for future stock price based on geometric Brownian motion.

## Color Scheme

```
Stock P&L:    #10B981 (green)
Option P&L:   #F59E0B (yellow/orange)
Profit:       #22C55E (green)
Loss:         #EF4444 (red)
Neutral:      #6B7280 (gray)
Probability:  #A855F7 (purple)
Background:   #030712 to #1F2937 (dark grays)
```

## Code Style

- Functional React components with hooks
- TypeScript for new files (gradual migration from JSX)
- ESLint + Prettier (to be configured)
- Descriptive variable names for financial calculations
