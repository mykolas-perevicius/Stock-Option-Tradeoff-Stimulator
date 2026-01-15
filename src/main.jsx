import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import OptionsPage from './pages/OptionsPage.jsx'
import VolatilityPage from './pages/VolatilityPage.jsx'
import ValuationPage from './pages/ValuationPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { VolatilityPredictionProvider } from './contexts/VolatilityPredictionContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <VolatilityPredictionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route
              path="/options"
              element={
                <ProtectedRoute>
                  <OptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/volatility"
              element={
                <ProtectedRoute>
                  <VolatilityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/valuation"
              element={
                <ProtectedRoute>
                  <ValuationPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </VolatilityPredictionProvider>
    </AuthProvider>
  </React.StrictMode>,
)
