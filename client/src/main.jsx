import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { UnitsProvider } from './context/UnitsContext';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UnitsProvider>
        <App />
      </UnitsProvider>
    </BrowserRouter>
  </StrictMode>
);