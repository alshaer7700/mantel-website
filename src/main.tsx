import { createRoot } from "react-dom/client";
import App from "./app/App";
import { ErrorBoundary } from "./app/components/ErrorBoundary";
import "./styles/index.css";
import { installMonitoring } from "./lib/monitoring";

/*
 * No Vercel Analytics or Speed Insights here. This site is hosted on Netlify
 * (see netlify.toml), and both packages inject a <script> pointing at
 * /_vercel/insights/script.js and /_vercel/speed-insights/script.js — paths
 * that only exist on Vercel's edge. On Netlify the catch-all SPA rewrite
 * answers them with index.html, so the browser parsed HTML as JavaScript and
 * threw "SyntaxError: Unexpected token '<'" twice on every page load while
 * collecting nothing. Re-add them only if this site moves to Vercel.
 */
installMonitoring();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
