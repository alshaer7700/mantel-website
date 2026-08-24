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
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background font-mono font-normal text-center px-6">
          <p className="font-serif text-[clamp(1.5rem,5vw,2.4rem)] tracking-[-0.018em] leading-[1.05] text-[color:var(--ink)] m-0">
            Something went wrong.
          </p>
          <p className="font-mono font-normal text-sm text-muted-foreground">
            Please refresh the page — if it keeps happening, reach us on Instagram.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="font-mono text-[11px] tracking-[0.2em] uppercase px-[var(--s-3)] py-[13px] text-[color:var(--ink)] border border-[color:var(--ink)] hover:bg-[color:var(--ink)] hover:text-[color:var(--bg)] transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
