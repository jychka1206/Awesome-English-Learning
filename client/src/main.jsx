import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import './index.css';

function showErr(msg) {
  if (typeof window.__appLoadError === 'function') window.__appLoadError(msg);
  else {
    const root = document.getElementById('root');
    if (root) root.innerHTML = '<p style="color:#ef4444">' + (msg || '加载失败') + '</p>';
  }
}

try {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    document.body.innerHTML = '<p style="padding:2rem;font-family:sans-serif;">未找到 #root 节点。</p>';
  } else {
    ReactDOM.createRoot(rootEl).render(
      <ErrorBoundary>
        <React.StrictMode>
          <App />
        </React.StrictMode>
      </ErrorBoundary>
    );
  }
} catch (e) {
  showErr((e && e.message) || String(e));
}
