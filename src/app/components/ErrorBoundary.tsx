import { Component, type ReactNode } from "react";

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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white font-mono font-normal text-center px-6">
          <p className="font-serif font-semibold text-3xl">Something went wrong.</p>
          <p className="font-mono font-normal text-sm text-muted-foreground">
            Please refresh the page — if it keeps happening, reach us on Instagram.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full border-2 border-black px-6 py-2 font-mono font-medium text-sm tracking-[0.16em] uppercase hover:bg-black/5 transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
