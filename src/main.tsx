import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './lib/LanguageContext';
import { ThemeProvider } from './lib/ThemeContext';
import { initCapacitorBridge } from './utils/capacitorBridge';

// Initialize Capacitor native plugins when running inside native container
initCapacitorBridge();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);

