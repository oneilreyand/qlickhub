import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './app/App';
import { store } from './store/store';
import { ThemeProvider } from './lib/theme/ThemeContext';
import { ErrorBoundary } from './components/ui/organisms/ErrorBoundary';
import { cleanLegacyAuthStorage } from './lib/storage/browserStorage';
import './index.css';

// Wipe legacy PII and auth credentials from localStorage on startup
cleanLegacyAuthStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);
