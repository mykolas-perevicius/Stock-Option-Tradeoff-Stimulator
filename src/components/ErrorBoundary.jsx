import React from 'react';

/**
 * React error boundary. Catches render-time exceptions in any descendant
 * component and shows a recovery message instead of unmounting the whole app.
 *
 * Must be a class component — getDerivedStateFromError and componentDidCatch
 * are not exposed as hooks.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to console for devtools / Vercel runtime logs. Don't ship to a
    // third-party error service — we don't want to leak user state without
    // explicit consent.
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { fallback, scope = 'this section' } = this.props;
    if (typeof fallback === 'function') {
      return fallback({ error: this.state.error, reset: this.handleReset });
    }

    const message = this.state.error?.message || String(this.state.error);

    return (
      <div className="min-h-[200px] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-red-900/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-3" aria-hidden="true">⚠️</div>
          <h2 className="text-lg font-semibold text-red-400 mb-2">
            Something went wrong in {scope}
          </h2>
          <p className="text-sm text-gray-400 mb-4 break-words">
            {message.slice(0, 200)}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition"
            >
              Try again
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
