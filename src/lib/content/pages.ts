import heroImage from "@/imports/mantel-landing.webp";
import fridayImage from "@/imports/mood-friday-espresso-table.webp";
import { FAQ_ITEMS, PRIVACY_POLICY, REFUND_POLICY, TERMS_OF_SERVICE, type LegalDoc } from "@/app/content/legal";
import { EXTRACTION_SPECS, TRAY_ANNOTATIONS } from "@/app/content/ritual";

/*
 * The website's editable text, page by page.
 *
 * Each page is one row in site_content (supabase/028). Staff edit a draft in
 * the dashboard's Website pages screen and publish it; public_site() returns
 * what's published. Anything never edited — and every field a published page
 * leaves out — falls back to the defaults below, which are exactly the words
 * the site shipped with. So an empty table means the site looks as it always
 * did, and a bad or partial row can't blank a page.
 *
 * The field lists and labels for the editor live with the dashboard
 * (src/admin/sections/website/schema.ts); this file is what both sides share.
 */

export type ListItem = Record<string, string>;
export type PageValues = Record<string, string | ListItem[]>;

function legalValues(doc: LegalDoc): PageValues {
  return {
    title: doc.title,
    updated: doc.updated,
    sections: doc.sections.map((s) => ({ heading: s.heading ?? "", body: s.paragraphs.join("\n\n") })),
  };
}

export const PAGE_DEFAULTS = {
  home: {
    hero_image: heroImage,
    hero_alt: "A Mantel shirt in the warm light of the café",
    hero_link: "Menu",
    ritual_overline: "01 — A Mantel ritual",
    ritual_title: "Friday Espresso.",
    ritual_link: "View the details",
    ritual_image: fridayImage,
    ritual_alt: "A small white-clothed table set for two between black chairs, against the shop's concrete wall",
    newsletter_overline: "02 — Keep in touch",
    newsletter_title: "Receive the newsletter.",
    newsletter_text: "Stay up to date with new collections, events, and the occasional good idea.",
    newsletter_thanks: "You’re on the list. See you at the counter.",
  },
  about: {
    title: "About Us.",
    text: "For mornings that take their time, afternoons that turn into evenings, and the everyday moments worth keeping. Good things, made simply and shared often.",
    link: "Contact Mantel",
  },
  friday: {
    overline: "01 — A Mantel ritual",
    title: "Friday Espresso.",
    note_1: TRAY_ANNOTATIONS[0]?.title ?? "The espresso",
    note_2: TRAY_ANNOTATIONS[1]?.title ?? "Sparkling water",
    harvest_overline: "03 — Special harvest",
    harvest_title: "A special harvest, every Friday.",
    harvest_text:
      "Once a week the espresso runs on a different lot — a small, single-origin harvest we rotate in just for the ritual. Same tray, same cup, a new bean every time.",
    recipe_overline: "04 — The coffee",
    recipe_title: "How it is made.",
    recipe_text: "The house recipe, weighed rather than judged by eye.",
    recipe: EXTRACTION_SPECS.map((s) => ({ label: s.label, value: s.value ?? "" })),
  },
  pickup: {
    soon_overline: "Order before reach",
    soon_title: "Coming soon.",
    soon_text:
      "Ordering ahead isn't open yet. The menu is here to browse in the meantime, and the counter is open as usual.",
    title: "Order Before Reach.",
    text: "Browse, add what you want, and place your order before you leave. It'll be ready when you reach.",
  },
  faq: {
    title: "FAQ",
    items: FAQ_ITEMS.map((f) => ({ question: f.question, answer: f.answer })),
  },
  privacy: legalValues(PRIVACY_POLICY),
  terms: legalValues(TERMS_OF_SERVICE),
  refund: legalValues(REFUND_POLICY),
} satisfies Record<string, PageValues>;

export type PageKey = keyof typeof PAGE_DEFAULTS;
export const PAGE_KEYS = Object.keys(PAGE_DEFAULTS) as PageKey[];

/** site_content keys are prefixed so pages can't collide with other content later. */
export const contentKey = (page: PageKey) => `page.${page}`;

/*
 * Published values over the defaults, field by field. A field that's missing,
 * the wrong type, or (for text) blank keeps its default: a page is never shown
 * half-empty because someone cleared a box. Lists are taken as published — an
 * empty FAQ list is a deliberate choice — but rows missing a field get "".
 */
export function mergePage<K extends PageKey>(page: K, published: unknown): (typeof PAGE_DEFAULTS)[K] {
  const base = PAGE_DEFAULTS[page] as PageValues;
  if (!published || typeof published !== "object") return base as (typeof PAGE_DEFAULTS)[K];
  const src = published as Record<string, unknown>;
  const out: PageValues = { ...base };
  for (const [field, fallback] of Object.entries(base)) {
    const v = src[field];
    if (Array.isArray(fallback)) {
      if (Array.isArray(v)) {
        const keys = Object.keys(fallback[0] ?? {});
        out[field] = v
          .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
          .map((row) => Object.fromEntries((keys.length ? keys : Object.keys(row)).map((k) => [k, typeof row[k] === "string" ? (row[k] as string) : ""])));
      }
    } else if (typeof v === "string" && v.trim()) {
      out[field] = v;
    }
  }
  return out as (typeof PAGE_DEFAULTS)[K];
}

/** The legal pages' stored shape back into what PolicyPage draws. */
export function toLegalDoc(values: PageValues): LegalDoc {
  const sections = (values.sections as ListItem[] | undefined) ?? [];
  return {
    title: String(values.title ?? ""),
    updated: String(values.updated ?? ""),
    sections: sections
      .map((s) => ({
        heading: s.heading?.trim() || undefined,
        paragraphs: (s.body ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      }))
      .filter((s) => s.heading || s.paragraphs.length),
  };
}

/*
 * Font and size for any box, chosen in Website pages. Kept beside the words
 * in the same row, under "_styles" (mergePage ignores it), keyed by field id —
 * or "list.field" for every row of a list, e.g. "items.answer". Size is a
 * percentage of the size the website's design gives that text, so a heading
 * stays a heading at 100%.
 */
export const TEXT_FONTS = {
  "garamond-italic": { label: "EB Garamond italic", css: `"EB Garamond", Georgia, "Times New Roman", serif`, italic: true },
  garamond: { label: "EB Garamond upright", css: `"EB Garamond", Georgia, "Times New Roman", serif`, italic: false },
  mono: { label: "Fira Mono", css: `"Fira Mono", Menlo, Consolas, "Courier New", monospace`, italic: false },
  georgia: { label: "Georgia", css: `Georgia, "Times New Roman", serif`, italic: false },
  times: { label: "Times New Roman", css: `"Times New Roman", Times, serif`, italic: false },
  arial: { label: "Arial", css: `Arial, Helvetica, sans-serif`, italic: false },
  verdana: { label: "Verdana", css: `Verdana, Geneva, sans-serif`, italic: false },
  courier: { label: "Courier New", css: `"Courier New", Courier, monospace`, italic: false },
} as const;

export type TextFont = keyof typeof TEXT_FONTS;
export type TextStyle = { font?: TextFont; size?: number };
export type PageStyles = Record<string, TextStyle>;

export const STYLES_FIELD = "_styles";
export const SIZE_MIN = 50;
export const SIZE_MAX = 250;

/** The styles saved with a page, with anything unknown or out of range dropped. */
export function pageStyles(raw: unknown): PageStyles {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>)[STYLES_FIELD] : null;
  if (!src || typeof src !== "object") return {};
  const out: PageStyles = {};
  for (const [id, v] of Object.entries(src as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const { font, size } = v as { font?: unknown; size?: unknown };
    const s: TextStyle = {};
    if (typeof font === "string" && font in TEXT_FONTS) s.font = font as TextFont;
    if (typeof size === "number" && Number.isFinite(size) && size !== 100) s.size = Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(size)));
    if (s.font || s.size) out[id] = s;
  }
  return out;
}

/** Inline CSS for a styled box; undefined when it keeps the website's own look. */
export function textStyleCss(s: TextStyle | undefined): { fontFamily?: string; fontStyle?: "italic" | "normal"; fontSize?: string } | undefined {
  if (!s || (!s.font && !s.size)) return undefined;
  const f = s.font ? TEXT_FONTS[s.font] : null;
  return {
    ...(f ? { fontFamily: f.css, fontStyle: f.italic ? "italic" : "normal" } : {}),
    ...(s.size ? { fontSize: `${s.size}%` } : {}),
  };
}
