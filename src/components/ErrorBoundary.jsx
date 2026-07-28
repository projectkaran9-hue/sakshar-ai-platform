import React from 'react';

/**
 * ErrorBoundary — catches any uncaught React render error and shows a
 * graceful fallback instead of a blank white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#05060c',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '1.5rem',
            padding: '2.5rem',
            maxWidth: '480px',
            width: '100%',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{
              color: '#ffffff',
              fontSize: '1.25rem',
              fontWeight: '800',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
            }}>
              Something went wrong
            </h1>
            <p style={{
              color: 'rgba(148,163,184,0.9)',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              marginBottom: '1.5rem',
            }}>
              Sakshar AI encountered an unexpected error. This is usually caused
              by missing configuration. Please try refreshing the page.
            </p>

            {this.state.error && (
              <pre style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '0.75rem',
                padding: '1rem',
                fontSize: '0.7rem',
                color: '#f87171',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '1.5rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {this.state.error.message}
              </pre>
            )}

            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '0.75rem 2rem',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
