// Legal pages + FAQ content. Drafted from what the site actually collects and
// does (contact form, pick-up orders, customer accounts, localStorage bag,
// Supabase) — owner should review before launch; this is not legal
// advice.
//
// The contact address here is the business one, not the owner's personal
// Gmail. Audit H-2 wanted "no @gmail.com in the built bundle" and accepted the
// personal address as required legal content while the site carried
// noindex/nofollow. Removing that tag makes these pages crawlable, so the
// address would be harvested — the exact exposure H-2 described. hello@ is
// used because the site already publishes it; the project plan assigns
// support@bymantel.com to complaints and order issues, which is the better
// home for the refund and PDPL contacts once that mailbox exists.
//
// KEEP THIS IN SYNC WITH THE CODE. The security audit singled the policy out
// for matching what the site really did, and that is only true while someone
// maintains it: accounts (supabase/010) made the previous wording wrong, since
// it described the account panel as a name and email in local storage when it
// now creates a real login with a password Supabase holds.

export type LegalSection = { heading?: string; paragraphs: string[] };
export type LegalDoc = { title: string; updated: string; sections: LegalSection[] };

export const PRIVACY_POLICY: LegalDoc = {
  title: "Privacy Policy",
  updated: "31 August 2026",
  sections: [
    {
      paragraphs: [
        "Mantel (“we”, “us”) is a coffee shop in Hidd, Kingdom of Bahrain. This policy explains what personal information our website collects, how we use it, and the choices you have.",
      ],
    },
    {
      heading: "What we collect",
      paragraphs: [
        "Contact form — your name, email address, phone number, and message, so we can reply to you.",
        "Pick-up orders — your name, email address, the items you order, and your chosen payment method, so we can prepare your order and confirm it.",
        "Account — if you create one, your email address and a password. The password is stored by Supabase in hashed form; we never see it. You may also save a name and mobile number to your profile, which we use to fill in your details at checkout.",
        "Order history — orders you place while signed in are linked to your account so you can see them. Orders placed as a guest are not linked to anyone, and you never need an account to order.",
        "Saved on your device only — your bag is stored in your browser's local storage, and if you sign in, so is the token that keeps you signed in. Both stay on your device; the bag reaches us only when you place an order.",
        "Newsletter — your email address, if you choose to sign up for updates.",
      ],
    },
    {
      heading: "How we use it",
      paragraphs: [
        "We use your information only to prepare and confirm your orders, respond to your messages, and — if you signed up — send you occasional news from Mantel. We do not sell your information or share it with anyone for marketing.",
      ],
    },
    {
      heading: "Who processes it for us",
      paragraphs: [
        "Orders and accounts are stored securely with Supabase, our database and authentication provider, on servers in Tokyo, Japan. Contact messages and newsletter sign-ups are stored in protected Supabase tables so they can be managed by Mantel. Supabase acts only on our instructions.",
      ],
    },
    {
      heading: "Cookies & tracking",
      paragraphs: [
        "Mantel uses a consent preference saved in your browser’s local storage to remember the choice you make in our consent panel. We also use local storage for your bag and, when you sign in, for the session that keeps you signed in. We do not use advertising cookies. If we add analytics or marketing tools, we will describe them here and present the relevant choice in the consent panel.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "Under Bahrain's Personal Data Protection Law (Law No. 30 of 2018) you may ask us to show you, correct, or delete the personal information we hold about you. You can correct your own name and mobile at any time in the account panel. Email us at hello@bymantel.com and we'll take care of anything else, including closing your account — which deletes your profile with it.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "If we change this policy, we'll update it here with a new date at the top. Questions? Email hello@bymantel.com.",
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDoc = {
  title: "Terms of Service",
  updated: "31 August 2026",
  sections: [
    {
      paragraphs: [
        "Welcome to Mantel. By using this website you agree to these terms. If you don't agree, please don't use the site.",
      ],
    },
    {
      heading: "Orders & pick-up",
      paragraphs: [
        "Orders placed through the site are for pick-up at Mantel in Hidd, Kingdom of Bahrain. An order is confirmed once you see the confirmation message. The current online order flow is cash on pick-up only; we do not take card payment through the website until a payment provider is launched and these terms are updated.",
        "All prices are in Bahraini Dinar (BD). Menu items and availability may change without notice; if something you ordered becomes unavailable, we'll offer an alternative or a refund.",
      ],
    },
    {
      heading: "Our content",
      paragraphs: [
        "The Mantel name, wordmark, heart mark, typeface, and everything else on this site belong to Mantel. Please don't copy or reuse them without our written permission.",
      ],
    },
    {
      heading: "Acceptable use",
      paragraphs: [
        "Please use the site only to browse and order. Don't attempt to disrupt the site, place fraudulent orders, or misuse the forms.",
      ],
    },
    {
      heading: "Liability",
      paragraphs: [
        "The site is provided as-is. To the fullest extent permitted by law, Mantel is not liable for indirect losses arising from use of the site. Nothing in these terms limits rights you have under Bahraini consumer law.",
      ],
    },
    {
      heading: "Governing law",
      paragraphs: [
        "These terms are governed by the laws of the Kingdom of Bahrain. Questions? Email hello@bymantel.com.",
      ],
    },
  ],
};

export const REFUND_POLICY: LegalDoc = {
  title: "Refund Policy",
  updated: "10 July 2026",
  sections: [
    {
      paragraphs: [
        "We want every cup to be right. If it isn't, tell us — we'll fix it.",
      ],
    },
    {
      heading: "At the counter",
      paragraphs: [
        "If your drink or food isn't right, let us know at pick-up and we'll remake it or refund it on the spot. Wrong or missing items are always remade or refunded.",
      ],
    },
    {
      heading: "Pick-up orders",
      paragraphs: [
        "Payment is currently taken at pick-up, so nothing is charged until you collect your order. If you can't make it, just let us know — there's nothing to refund.",
        "Once online payment launches, refunds for cancelled or unfulfilled orders will be returned to your original payment method.",
      ],
    },
    {
      heading: "How to reach us",
      paragraphs: [
        "Email hello@bymantel.com or use the contact form and we'll sort it out quickly.",
      ],
    },
  ],
};

export type FaqItem = { question: string; answer: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is Order Before Reach?",
    answer:
      "It's our pick-up ordering — browse the Pick Up page, add what you want, and place your order before you leave. It'll be ready when you reach.",
  },
  {
    question: "Where are you located?",
    answer: "Mantel is a curbside coffee spot in Hidd, Kingdom of Bahrain.",
  },
  {
    question: "How do I pay?",
    answer:
      "Orders are currently cash on pick-up only. Online card payment is not available yet; we will update this page when it launches.",
  },
  {
    question: "When will my order be ready?",
    answer:
      "We start preparing as soon as your order comes in, so it's ready around the time you reach. If you're ordering well ahead, mention it in the contact form and we'll time it.",
  },
  {
    question: "Can I change or cancel my order?",
    answer:
      "Yes — message us through the contact form or tell us at the counter. Since payment happens at pick-up, there's nothing to unwind.",
  },
  {
    question: "Do you deliver?",
    answer: "Not yet — Mantel is pick-up only for now. Order before you reach and skip the wait.",
  },
];
