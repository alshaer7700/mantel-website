import type { MenuCategoryKey } from "@/app/types";

/*
 * The menu board's per-category signature: a colour pair, a line drawing and
 * one line of copy.
 *
 * Why this is content rather than component state: the board (a panel per
 * category) and the spread (one category, opened) both need the same three
 * facts about a category, and they are facts about the menu, not about either
 * component. Adding a sixth heading is one entry here plus its colour pair in
 * tokens.css — nothing in either component knows the categories by name.
 *
 * The colours themselves live in tokens.css, where the contrast measurements
 * and the reason a coloured surface is permitted at all are written down. This
 * file only names which pair belongs to which heading.
 */

export type CategoryArtKey = "cup" | "glass" | "bottle" | "panini" | "bun";

export type CategoryTheme = {
  /** The panel fill when open. Carries paper-coloured text. */
  deep: string;
  /** The page wash behind an open category. Carries ink and `deep`. */
  tint: string;
  art: CategoryArtKey;
  /** One line under the heading, in place of the descriptions the DB has yet
      to carry. Sentence case, no full stop — it sits as a caption, not prose.
      Keep it under about 30 characters: the board reserves two lines for it
      and clamps at two, so a longer note is cut with an ellipsis rather than
      pushing its heading out of line with the other four. */
  note: string;
};

export const CATEGORY_THEME: Record<MenuCategoryKey, CategoryTheme> = {
  coffee: {
    deep: "var(--cat-coffee-deep)",
    tint: "var(--cat-coffee-tint)",
    art: "cup",
    note: "Espresso, short and long",
  },
  "not-coffee": {
    deep: "var(--cat-not-coffee-deep)",
    tint: "var(--cat-not-coffee-tint)",
    art: "glass",
    note: "Matcha, hibiscus, cold things",
  },
  aqua: {
    deep: "var(--cat-aqua-deep)",
    tint: "var(--cat-aqua-tint)",
    art: "bottle",
    note: "Still and sparkling",
  },
  sandwiches: {
    deep: "var(--cat-sandwiches-deep)",
    tint: "var(--cat-sandwiches-tint)",
    art: "panini",
    note: "Pressed on the counter grill",
  },
  desserts: {
    deep: "var(--cat-desserts-deep)",
    tint: "var(--cat-desserts-tint)",
    art: "bun",
    note: "Baked in, finished by four",
  },
};
