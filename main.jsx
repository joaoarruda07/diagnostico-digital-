import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div style={{ width: '100%', maxWidth: '960px', margin: '0 auto' }}>
      <App />
    </div>
  </StrictMode>
)
