// loyalty-pass — the Mantel stamp card as an Apple Wallet pass.
//
//   GET  ?t=<pass_token>     the signed .pkpass for that card (bymantel.com
//                            /wallet-pass?t=<token> proxies here, netlify.toml)
//   POST { status: true }    { ready } — whether the Apple certificate is set,
//                            for the dashboard to say so
//
// The pass is an ID card: its barcode is the customer's mobile number, the
// number the card is kept under (supabase/038). Scanned at the counter it
// types that number into the dashboard's search. Stamp counts are not printed
// on the pass because a pass doesn't change by itself; the back of the card
// links to bymantel.com/wallet?t=<token>, which always shows the live count.
//
// verify_jwt is off: the link is opened from a customer's iPhone with no
// session. The token is a random uuid only that card's link carries.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   APPLE_PASS_P12           the Pass Type ID certificate exported from
//                            Keychain as .p12, base64-encoded
//   APPLE_PASS_P12_PASSWORD  the password chosen when exporting it
// Optional:
//   APPLE_WWDR_CERT          Apple's WWDR G4 intermediate (PEM). Fetched from
//                            apple.com when not set.
//   APPLE_PASS_TYPE_ID, APPLE_TEAM_ID   read from the certificate when not set.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import forge from "npm:node-forge@1.3.1";
import { zipSync } from "npm:fflate@0.8.2";

const SITE = "https://bymantel.com";
const WWDR_URL = "https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer";
const IMAGES = ["icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png", "logo@3x.png"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const env = (k: string) => Deno.env.get(k) ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

type Card = { phone: string; name: string; needed: number; reward: string; pass_token: string };

type Signer = { cert: forge.pki.Certificate; key: forge.pki.PrivateKey; wwdr: forge.pki.Certificate; passTypeId: string; teamId: string };

let signerCache: Promise<Signer> | null = null;
let imageCache: Promise<Record<string, Uint8Array>> | null = null;

const configured = () => !!env("APPLE_PASS_P12");

function subjectField(cert: forge.pki.Certificate, nameOrOid: string): string {
  const f = cert.subject.attributes.find((a) => a.shortName === nameOrOid || a.name === nameOrOid || a.type === nameOrOid);
  return typeof f?.value === "string" ? f.value : "";
}

async function loadSigner(): Promise<Signer> {
  const der = forge.util.decode64(env("APPLE_PASS_P12").replace(/\s+/g, ""));
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), env("APPLE_PASS_P12_PASSWORD"));
  const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
  const keyBag = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    ?? p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
  if (!certBag?.cert || !keyBag?.key) throw new Error("The .p12 has no certificate or no private key.");

  let wwdr: forge.pki.Certificate;
  if (env("APPLE_WWDR_CERT")) {
    wwdr = forge.pki.certificateFromPem(env("APPLE_WWDR_CERT"));
  } else {
    const res = await fetch(WWDR_URL);
    if (!res.ok) throw new Error(`Couldn't fetch Apple's WWDR certificate (${res.status}).`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    wwdr = forge.pki.certificateFromAsn1(forge.asn1.fromDer(bin));
  }

  const cert = certBag.cert;
  return {
    cert,
    key: keyBag.key,
    wwdr,
    // A Pass Type ID certificate carries both: UID = pass.com.…, OU = team ID.
    passTypeId: env("APPLE_PASS_TYPE_ID") || subjectField(cert, "0.9.2342.19200300.100.1.1"),
    teamId: env("APPLE_TEAM_ID") || subjectField(cert, "OU"),
  };
}

async function loadImages(): Promise<Record<string, Uint8Array>> {
  const entries = await Promise.all(IMAGES.map(async (name) => {
    const res = await fetch(`${SITE}/pass/${name}`);
    if (!res.ok) throw new Error(`Missing pass image ${name} (${res.status}).`);
    return [name, new Uint8Array(await res.arrayBuffer())] as const;
  }));
  return Object.fromEntries(entries);
}

async function findCard(token: string): Promise<Card | null> {
  const res = await fetch(`${env("SUPABASE_URL")}/rest/v1/rpc/loyalty_pass`, {
    method: "POST",
    headers: {
      apikey: env("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) return null;
  return (await res.json()) as Card | null;
}

function prettyPhone(p: string): string {
  const m = /^\+973(\d{4})(\d{4})$/.exec(p);
  return m ? `+973 ${m[1]} ${m[2]}` : p;
}

function passJson(card: Card, s: Signer): Record<string, unknown> {
  const barcode = { format: "PKBarcodeFormatQR", message: card.phone, messageEncoding: "iso-8859-1", altText: prettyPhone(card.phone) };
  return {
    formatVersion: 1,
    passTypeIdentifier: s.passTypeId,
    teamIdentifier: s.teamId,
    serialNumber: card.pass_token,
    organizationName: "Mantel",
    description: "Mantel stamp card",
    logoText: "MANTEL",
    foregroundColor: "rgb(23, 19, 16)",
    backgroundColor: "rgb(252, 251, 249)",
    labelColor: "rgb(154, 28, 31)",
    sharingProhibited: true,
    storeCard: {
      primaryFields: [{ key: "card", label: "STAMP CARD", value: card.name || "Mantel" }],
      secondaryFields: [{ key: "reward", label: `EVERY ${card.needed} STAMPS`, value: card.reward }],
      auxiliaryFields: [{ key: "number", label: "CARD NUMBER", value: prettyPhone(card.phone) }],
      backFields: [
        { key: "stamps", label: "Your stamps", value: `${SITE}/wallet?t=${card.pass_token}` },
        { key: "how", label: "How it works", value: `Show this card or say your mobile number at the counter. Every order collects a stamp; after ${card.needed} stamps: ${card.reward}.` },
        { key: "where", label: "Mantel", value: "Muharraq, Bahrain · bymantel.com · @mantelbh" },
      ],
    },
    barcodes: [barcode],
    barcode,
  };
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

function sign(manifest: string, s: Signer): Uint8Array {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest, "utf8");
  p7.addCertificate(s.cert);
  p7.addCertificate(s.wwdr);
  p7.addSigner({
    key: s.key as forge.pki.rsa.PrivateKey,
    certificate: s.cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });
  const bin = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function buildPass(card: Card): Promise<Uint8Array> {
  signerCache ??= loadSigner().catch((e) => { signerCache = null; throw e; });
  imageCache ??= loadImages().catch((e) => { imageCache = null; throw e; });
  const [s, images] = await Promise.all([signerCache, imageCache]);
  const files: Record<string, Uint8Array> = {
    "pass.json": new TextEncoder().encode(JSON.stringify(passJson(card, s))),
    ...images,
  };
  const manifest: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) manifest[name] = await sha1Hex(bytes);
  const manifestText = JSON.stringify(manifest);
  files["manifest.json"] = new TextEncoder().encode(manifestText);
  files["signature"] = sign(manifestText, s);
  return zipSync(files, { level: 6 });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (body?.status) return json({ ready: configured() });
    return json({ error: "Unknown request." }, 400);
  }

  if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);
  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "That link isn't complete." }, 400);
  if (!configured()) return json({ error: "Apple Wallet isn't set up yet." }, 503);

  const card = await findCard(token);
  if (!card) return json({ error: "No stamp card for that link." }, 404);

  try {
    const pkpass = await buildPass(card);
    return new Response(pkpass, {
      headers: {
        ...CORS,
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="mantel-stamp-card.pkpass"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("loyalty-pass", e);
    return json({ error: "Couldn't make the Wallet card." }, 500);
  }
});
