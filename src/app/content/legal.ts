// Legal pages + FAQ content. Drafted from what the site actually collects and
// does (contact form, pick-up orders, localStorage cart/profile, Supabase,
// FormSubmit) — owner should review before launch; this is not legal advice.

export type LegalSection = { heading?: string; paragraphs: string[] };
export type LegalDoc = { title: string; updated: string; sections: LegalSection[] };

export const PRIVACY_POLICY: LegalDoc = {
  title: "Privacy Policy",
  updated: "10 July 2026",
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
        "Saved on your device only — your bag and the name/email you save in the account panel are stored in your browser's local storage. They stay on your device and are only sent to us when you place an order or submit a form.",
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
        "Orders are stored securely with Supabase, our database hosting provider. Messages and sign-ups are delivered to our inbox via FormSubmit, a form email service. Both act only on our instructions.",
      ],
    },
    {
      heading: "Cookies & tracking",
      paragraphs: [
        "We don't use advertising cookies or analytics trackers. The only data kept in your browser is the local storage described above, which you can clear at any time from your browser settings or by signing out in the account panel.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "Under Bahrain's Personal Data Protection Law (Law No. 30 of 2018) you may ask us to show you, correct, or delete the personal information we hold about you. Email us at naiffuad31@gmail.com and we'll take care of it.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "If we change this policy, we'll update it here with a new date at the top. Questions? Email naiffuad31@gmail.com.",
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDoc = {
  title: "Terms of Service",
  updated: "10 July 2026",
  sections: [
    {
      paragraphs: [
        "Welcome to Mantel. By using this website you agree to these terms. If you don't agree, please don't use the site.",
      ],
    },
    {
      heading: "Orders & pick-up",
      paragraphs: [
        "Orders placed through the site are for pick-up at Mantel in Hidd, Kingdom of Bahrain. An order is confirmed once you see the confirmation message. Payment is taken at pick-up by cash or card until online payment launches.",
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
        "These terms are governed by the laws of the Kingdom of Bahrain. Questions? Email naiffuad31@gmail.com.",
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
        "Email naiffuad31@gmail.com or use the contact form and we'll sort it out quickly.",
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
      "At pick-up, by cash or card. Online card payment is coming soon — you'll be able to pay when you place the order.",
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
