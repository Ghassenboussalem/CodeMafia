import React from 'react';

/**
 * Issue 11: React Error Boundary
 * Catches JS errors in any child component tree and shows a fallback
 * instead of crashing the entire React tree to a white screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (fallback) return fallback;

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', padding: 32,
          background: '#0d0d0f', color: '#e0e0e0',
          fontFamily: "'VT323', monospace",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 14, color: '#e94fa0', marginBottom: 12,
          }}>
            RUNTIME ERROR
          </div>
          <div style={{ fontSize: 16, color: '#888', marginBottom: 24, maxWidth: 420, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred in this panel.'}
          </div>
          <button
            onClick={this.handleReset}
            style={{
              background: '#1a1a2e', color: '#5af', border: '2px solid #5af',
              fontFamily: "'Press Start 2P', monospace", fontSize: 10,
              padding: '8px 16px', cursor: 'pointer', letterSpacing: 1,
            }}
          >
            RETRY
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
