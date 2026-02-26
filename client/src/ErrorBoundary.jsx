import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '560px',
          margin: '0 auto',
          fontFamily: 'system-ui, sans-serif',
          background: '#0f0f12',
          color: '#e4e4e7',
          minHeight: '100vh',
        }}>
          <h1 style={{ color: '#ef4444', fontSize: '1.25rem' }}>页面出错了</h1>
          <pre style={{
            background: '#18181c',
            padding: '1rem',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '0.85rem',
            color: '#a1a1aa',
          }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <p style={{ fontSize: '0.875rem', color: '#a1a1aa', marginTop: '1rem' }}>
            请刷新页面重试，或打开开发者工具 (F12) 查看 Console 报错。
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
