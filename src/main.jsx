import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { VolatilityPredictionProvider } from './contexts/VolatilityPredictionContext.jsx'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'

// Route-level code splitting. The three premium pages each pull in their own
// charts, tables, and analysis components — together about half the main
// bundle. Lazy-loading them means a visitor who only opens "/" doesn't
// download Volatility/Options/Valuation code until they click into one.
const OptionsPage = lazy(() => import('./pages/OptionsPage.jsx'))
const VolatilityPage = lazy(() => import('./pages/VolatilityPage.jsx'))
const ValuationPage = lazy(() => import('./pages/ValuationPage.jsx'))

function PageLoading() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto mb-3"></div>
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <VolatilityPredictionProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/options" element={<OptionsPage />} />
              <Route path="/volatility" element={<VolatilityPage />} />
              <Route path="/valuation" element={<ValuationPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Analytics />
        <SpeedInsights />
      </VolatilityPredictionProvider>
    </AuthProvider>
  </React.StrictMode>,
)
