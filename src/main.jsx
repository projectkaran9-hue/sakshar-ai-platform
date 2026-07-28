import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register Service Worker with automatic update support
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('[PWA] New version available! Reloading...')
    updateSW(true)
  },
  onOfflineReady() {
    console.log('[PWA] App ready for offline use!')
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
