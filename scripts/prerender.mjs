/*
 * Give every route its own static HTML file, carrying that page's title,
 * description and link-preview tags.
 *
 * App.tsx already sets those tags, but it sets them from JavaScript after
 * React mounts. WhatsApp, Instagram and every other link-preview crawler
 * fetches the HTML and never runs the script, so a shared /menu link showed
 * the home page's copy — on a site whose own index.html notes that most of
 * its traffic arrives from Instagram and WhatsApp.
 *
 * Netlify serves a real file before it consults the catch-all rewrite in
 * netlify.toml, so dist/menu.html answers /menu and the rewrite keeps
 * handling everything else (/menu/coffee, a typo, a deep link we never
 * built). Each file loads the same bundle, and routeFor() reads the same
 * pathname, so the app boots identically whichever file served it.
 *
 * Fails the build rather than shipping wrong or stale metadata: every tag
 * this rewrites must be present in dist/index.html, and every path must
 * still exist in src/lib/routes.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const ORIGIN = "https://bymantel.com";

/* The home page is index.html itself, already correct from the Vite build.
 * The staff dashboard is noindex and Disallow'd in robots.txt, so a preview
 * file for it would be pointless at best. */
const SKIP = new Set(["home", "admin"]);

const seo = JSON.parse(readFileSync("src/content/seo.json", "utf8"));
const routesSource = readFileSync("src/lib/routes.ts", "utf8");

function escapeAttr(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Read the path map out of routes.ts so this script cannot drift from the
 * router. A parse that finds nothing is a broken assumption, not an empty
 * site, so it stops the build. */
function readRoutes() {
  const block = routesSource.match(/export const ROUTES[^{]*\{([^}]*)\}/);
  if (!block) throw new Error("prerender: could not find ROUTES in src/lib/routes.ts");

  const routes = {};
  for (const [, page, path] of block[1].matchAll(/(\w+)\s*:\s*"([^"]+)"/g)) {
    routes[page] = path;
  }
  if (Object.keys(routes).length === 0) {
    throw new Error("prerender: ROUTES parsed as empty in src/lib/routes.ts");
  }
  return routes;
}

/* Replace one tag's content, failing loudly when the tag is missing: a
 * silent no-op here ships a page claiming to be the home page. */
function replaceOnce(html, pattern, replacement, label) {
  const next = html.replace(pattern, replacement);
  if (next === html) {
    throw new Error(`prerender: no ${label} tag to rewrite in ${DIST}/index.html`);
  }
  return next;
}

function pageHtml(shell, { title, description }, url) {
  const t = escapeAttr(title);
  const d = escapeAttr(description);
  const u = escapeAttr(url);

  let html = shell;
  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`, "<title>");
  html = replaceOnce(
    html,
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${d}" />`,
    'name="description"',
  );
  html = replaceOnce(
    html,
    /<link\s+rel="canonical"[^>]*\/>/,
    `<link rel="canonical" href="${u}" />`,
    'rel="canonical"',
  );

  for (const [attr, key, value] of [
    ["property", "og:title", t],
    ["property", "og:description", d],
    ["property", "og:url", u],
    ["name", "twitter:title", t],
    ["name", "twitter:description", d],
  ]) {
    html = replaceOnce(
      html,
      new RegExp(`<meta\\s+${attr}="${key}"[\\s\\S]*?/>`),
      `<meta ${attr}="${key}" content="${value}" />`,
      `${attr}="${key}"`,
    );
  }
  return html;
}

const shell = readFileSync(join(DIST, "index.html"), "utf8");
const routes = readRoutes();
const written = [];

for (const [page, copy] of Object.entries(seo)) {
  if (SKIP.has(page)) continue;

  const path = routes[page];
  if (!path) throw new Error(`prerender: "${page}" is in seo.json but not in ROUTES`);

  const file = `${path.replace(/^\//, "")}.html`;
  writeFileSync(join(DIST, file), pageHtml(shell, copy, `${ORIGIN}${path}`), "utf8");
  written.push(file);
}

console.log(`prerendered ${written.length} pages: ${written.join(", ")}`);
