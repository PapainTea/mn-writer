import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { bootstrapStorage } from './lib/storage'

void bootstrapStorage().finally(async () => {
  const { default: App } = await import('./App')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
