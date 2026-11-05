import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { MoneyProvider } from './hooks/useMoney';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MoneyProvider>
      <App />
    </MoneyProvider>
  </StrictMode>,
);
