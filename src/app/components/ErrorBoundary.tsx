import { Component, type ErrorInfo, type ReactNode } from "react";

import { reportClientError } from "@/lib/monitoring";

// Last-resort catch for render-time errors, so visitors get a branded
// "reload" message instead of a blank white page.
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError(error, { source: "react-error-boundary", componentStack: info.componentStack?.slice(0, 1200) });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background font-mono font-normal text-center px-6">
          <p className="font-grotesk font-bold uppercase tracking-[-0.02em] text-3xl">Something went wrong.</p>
          <p className="font-mono font-normal text-sm text-muted-foreground">
            Please refresh the page — if it keeps happening, reach us on Instagram.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="border border-black bg-black text-white px-6 py-3 font-grotesk font-bold text-[10px] tracking-[0.14em] uppercase hover:opacity-80 transition-opacity"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
