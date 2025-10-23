import './index.css';
import installFetchLogger from './utils/installFetchLogger';

// install global fetch + error logger to help with debugging network issues
try { installFetchLogger() } catch (e) { console.error('installFetchLogger failed', e) }
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("root element not found");

ReactDOM.createRoot(rootElement).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </GoogleOAuthProvider>
);
/*
  NoteFlow Frontend — App Bootstrap
  Purpose: Mounts the React app, wires global styles, and provides Google OAuth context.
  Key points:
   - Imports global `index.css` (design tokens + base styles).
   - Installs fetch logger for dev visibility (non-fatal if it fails).
   - Wraps the app with GoogleOAuthProvider (env: VITE_GOOGLE_CLIENT_ID).
*/
