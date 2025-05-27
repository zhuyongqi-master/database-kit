import * as React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style/globe.css';
import './lib/i18n'; // Import i18n initialization

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>,
);

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message);
});
