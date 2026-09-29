import type { PageKey } from "@/lib/content/pages";

/*
 * What the Website pages editor shows for each page: the boxes, their labels
 * and hints, in the order they appear on the page. The words themselves (and
 * their originals) live in src/lib/content/pages.ts, shared with the website.
 */

export type TextFieldDef = { id: string; label: string; kind: "text" | "textarea"; hint?: string; max?: number; rows?: number };
export type ImageFieldDef = { id: string; label: string; kind: "image"; hint?: string };
export type ListFieldDef = { id: string; label: string; kind: "list"; item: TextFieldDef[]; itemLabel: string; addLabel: string; hint?: string; max?: number };
export type FieldDef = TextFieldDef | ImageFieldDef | ListFieldDef;
export type GroupDef = { title: string; fields: FieldDef[] };
export type PageDef = { key: PageKey; title: string; path: string; note?: string; groups: GroupDef[] };

const legalGroups = (): GroupDef[] => [
  {
    title: "Page",
    fields: [
      { id: "title", label: "Title", kind: "text", max: 80 },
      { id: "updated", label: "Last updated", kind: "text", max: 40, hint: "Shown under the title, e.g. 31 August 2026. Change it when you change the policy." },
    ],
  },
  {
    title: "Sections",
    fields: [
      {
        id: "sections",
        label: "Sections",
        kind: "list",
        itemLabel: "Section",
        addLabel: "Add a section",
        max: 30,
        item: [
          { id: "heading", label: "Heading", kind: "text", max: 80, hint: "Optional. The first section usually has none." },
          { id: "body", label: "Text", kind: "textarea", rows: 6, max: 4000, hint: "Leave an empty line between paragraphs." },
        ],
      },
    ],
  },
];

export const PAGES: PageDef[] = [
  {
    key: "home",
    title: "Home page",
    path: "/",
    groups: [
      {
        title: "Top of the page",
        fields: [
          { id: "hero_image", label: "Main photo", kind: "image", hint: "The large photo at the top. A tall photo works best." },
          { id: "hero_alt", label: "Photo description", kind: "text", max: 160, hint: "Read out to people who can't see the photo." },
          { id: "hero_link", label: "Link text", kind: "text", max: 30, hint: "Opens the menu." },
        ],
      },
      {
        title: "Friday Espresso",
        fields: [
          { id: "ritual_overline", label: "Small heading", kind: "text", max: 60 },
          { id: "ritual_title", label: "Heading", kind: "text", max: 80 },
          { id: "ritual_link", label: "Link text", kind: "text", max: 30, hint: "Opens the Friday Espresso page." },
          { id: "ritual_image", label: "Photo", kind: "image" },
          { id: "ritual_alt", label: "Photo description", kind: "text", max: 160 },
        ],
      },
      {
        title: "Newsletter",
        fields: [
          { id: "newsletter_overline", label: "Small heading", kind: "text", max: 60 },
          { id: "newsletter_title", label: "Heading", kind: "text", max: 80 },
          { id: "newsletter_text", label: "Text", kind: "textarea", rows: 2, max: 300 },
          { id: "newsletter_thanks", label: "Thank-you message", kind: "text", max: 160, hint: "Shown after someone signs up." },
        ],
      },
    ],
  },
  {
    key: "about",
    title: "About Us",
    path: "/story",
    note: "The opening hours on this page come from Shop settings.",
    groups: [
      {
        title: "Page",
        fields: [
          { id: "title", label: "Heading", kind: "text", max: 80 },
          { id: "text", label: "Text", kind: "textarea", rows: 5, max: 2000 },
          { id: "link", label: "Link text", kind: "text", max: 40, hint: "Opens the contact page." },
        ],
      },
    ],
  },
  {
    key: "friday",
    title: "Friday Espresso",
    path: "/friday-espresso",
    note: "The tray photo and where its numbered notes point stay as they are: they're measured off the picture.",
    groups: [
      {
        title: "Top of the page",
        fields: [
          { id: "overline", label: "Small heading", kind: "text", max: 60 },
          { id: "title", label: "Heading", kind: "text", max: 80 },
          { id: "note_1", label: "Note 01 on the photo", kind: "text", max: 40 },
          { id: "note_2", label: "Note 02 on the photo", kind: "text", max: 40 },
        ],
      },
      {
        title: "Special harvest",
        fields: [
          { id: "harvest_overline", label: "Small heading", kind: "text", max: 60 },
          { id: "harvest_title", label: "Heading", kind: "text", max: 80 },
          { id: "harvest_text", label: "Text", kind: "textarea", rows: 4, max: 1200 },
        ],
      },
      {
        title: "The recipe",
        fields: [
          { id: "recipe_overline", label: "Small heading", kind: "text", max: 60 },
          { id: "recipe_title", label: "Heading", kind: "text", max: 80 },
          { id: "recipe_text", label: "Text", kind: "text", max: 200 },
          {
            id: "recipe",
            label: "Recipe lines",
            kind: "list",
            itemLabel: "Line",
            addLabel: "Add a line",
            max: 12,
            hint: "This section only appears once at least one line has a value.",
            item: [
              { id: "label", label: "Name", kind: "text", max: 30 },
              { id: "value", label: "Value", kind: "text", max: 60, hint: "e.g. 18 g in, 36 g out" },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "pickup",
    title: "Pick Up",
    path: "/pickup",
    groups: [
      {
        title: "While ordering ahead is closed",
        fields: [
          { id: "soon_overline", label: "Small heading", kind: "text", max: 60 },
          { id: "soon_title", label: "Heading", kind: "text", max: 80 },
          { id: "soon_text", label: "Text", kind: "textarea", rows: 3, max: 600 },
        ],
      },
      {
        title: "When ordering ahead is open",
        fields: [
          { id: "title", label: "Heading", kind: "text", max: 80 },
          { id: "text", label: "Text", kind: "textarea", rows: 3, max: 600 },
        ],
      },
    ],
  },
  {
    key: "faq",
    title: "FAQ",
    path: "/faq",
    groups: [
      {
        title: "Questions",
        fields: [
          { id: "title", label: "Heading", kind: "text", max: 60 },
          {
            id: "items",
            label: "Questions",
            kind: "list",
            itemLabel: "Question",
            addLabel: "Add a question",
            max: 40,
            item: [
              { id: "question", label: "Question", kind: "text", max: 200 },
              { id: "answer", label: "Answer", kind: "textarea", rows: 3, max: 2000 },
            ],
          },
        ],
      },
    ],
  },
  { key: "privacy", title: "Privacy Policy", path: "/privacy", groups: legalGroups() },
  { key: "terms", title: "Terms of Service", path: "/terms", groups: legalGroups() },
  { key: "refund", title: "Refund Policy", path: "/refund", groups: legalGroups() },
];
