import React from 'react';

export class ErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Renderer failed:', error); }
  render() {
    if (this.state.failed) return (
      <div role="alert" className="p-8 text-ink-text">
        <p>The window could not display its content. Background capture runs separately.</p>
        <button className="mt-4" onClick={() => window.location.reload()}>Reload window</button>
      </div>
    );
    return this.props.children;
  }
}
