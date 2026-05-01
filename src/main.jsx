import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import OptionsPage from './pages/OptionsPage.jsx'
import VolatilityPage from './pages/VolatilityPage.jsx'
import ValuationPage from './pages/ValuationPage.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { VolatilityPredictionProvider } from './contexts/VolatilityPredictionContext.jsx'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <VolatilityPredictionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/options" element={<OptionsPage />} />
            <Route path="/volatility" element={<VolatilityPage />} />
            <Route path="/valuation" element={<ValuationPage />} />
          </Routes>
        </BrowserRouter>
        <Analytics />
        <SpeedInsights />
      </VolatilityPredictionProvider>
    </AuthProvider>
  </React.StrictMode>,
)
