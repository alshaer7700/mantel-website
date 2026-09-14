import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./app/App";
import { ErrorBoundary } from "./app/components/ErrorBoundary";
import "./styles/index.css";
import { installMonitoring } from "./lib/monitoring";
import { injectSpeedInsights } from "@vercel/speed-insights";

installMonitoring();
injectSpeedInsights();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
    <Analytics />
  </ErrorBoundary>,
);
