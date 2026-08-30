
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './src/index.css';
import App from './App';

function setRealViewportHeight() {
  document.documentElement.style.setProperty('--app-vh', `${window.innerHeight * 0.01}px`);
}
setRealViewportHeight();
window.addEventListener('resize', setRealViewportHeight);
window.addEventListener('orientationchange', () => {
  setTimeout(setRealViewportHeight, 100);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setRealViewportHeight);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
