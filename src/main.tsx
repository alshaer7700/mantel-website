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

/*
 * ── PREVIEW SWITCH, NOT A FEATURE ───────────────────────────────────────────
 *
 * Two design directions are being compared before one is chosen: the shipped
 * one, and the harder-edged take in styles/directions.css. `?dir=b` puts the
 * second on the page so the same build can be screenshotted both ways instead
 * of being built twice from different branches.
 *
 * DELETE THIS, styles/directions.css AND ITS IMPORT once a direction is
 * picked. It is scaffolding for a decision, and nothing in the app reads the
 * attribute except that stylesheet.
 */
if (new URLSearchParams(window.location.search).get("dir") === "b") {
  document.documentElement.dataset.dir = "b";
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
