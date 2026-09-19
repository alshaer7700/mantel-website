# Notification email

Three Edge Functions send mail, all through Resend, all to the café:

| Function | Trigger | Subject |
| --- | --- | --- |
| `supabase/functions/contact-notify` | insert on `contact_messages` (022) | `Contact form — <name>` |
| `supabase/functions/order-notify` | insert on `orders` (024) | `Order <ref> — <name>` |
| `supabase/functions/newsletter-notify` | insert on `newsletter_subscribers` (025) | `New subscriber — <email>` |

Nothing is sent to customers. Every message goes to `hello@bymantel.com`, with
`reply_to` set to the customer on the two that came from a person writing in, so
hitting reply in the café's inbox answers them.

## The sending domain

Mail is sent **from `notifications@bymantel.com`**, which means the domain
verified in Resend must be `bymantel.com` — the apex, not a subdomain. Resend
matches the From address against the exact domain on the account: a From of
`@send.bymantel.com` against a verified `bymantel.com` is rejected with a 403,
and vice versa. That address is send-only; no mailbox receives it.

`notifications@` sits alongside Google Workspace on the same domain without
touching it. Workspace owns inbound mail (the apex `MX` → `smtp.google.com`) and
signs with its own DKIM selector; Resend signs with `resend._domainkey` and
bounces to its own return-path subdomain, so the apex SPF record stays exactly
as Workspace wrote it. Do not add `include:resend.com` to it.

The address is overridable per function without a deploy — `CONTACT_NOTIFY_FROM`,
`ORDER_NOTIFY_FROM`, `NEWSLETTER_NOTIFY_FROM` in the Supabase Edge Function
secrets. If the domain on the Resend account is ever moved to a subdomain, set
those three rather than editing the defaults in the function source.

## DNS

`bymantel.com` is served by Netlify DNS (`dns1–4.p08.nsone.net`). That zone is
the only one that counts — records added in a registrar panel are not
authoritative and will never be seen. Add records in Netlify → Domains →
`bymantel.com` → DNS records, and put **only the label** in the Name field:
Netlify appends `.bymantel.com` itself. Pasting the full hostname produces
`resend._domainkey.bymantel.com.bymantel.com`, which resolves to nothing and is
the usual reason a domain sits at "Missing records".

Three records, copied from the Resend dashboard (Domains → `bymantel.com` →
Records):

| Type | Name | Value |
| --- | --- | --- |
| TXT | `resend._domainkey` | the full `p=MIGf…IDAQAB` key |
| CNAME | `rsend` | `rsend-apne1.forge.rmta.net` |
| CNAME | `send` | `send.forge.rmta.net` |

Take the DKIM value from the dashboard rather than from anywhere else — the
Records table truncates it in the middle for display, so it has to be copied
with the field's copy button, and it goes in as one unbroken string.

`apne1` is Tokyo, matching the Supabase project's own region. If the Resend
domain is ever recreated in another region that hostname changes with it.

## Verifying

The records are public, so they can be checked from anywhere:

```sh
for q in resend._domainkey:TXT rsend:CNAME send:CNAME; do
  curl -s "https://dns.google/resolve?name=${q%%:*}.bymantel.com&type=${q##*:}" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["Question"][0]["name"], d["Status"], [a["data"] for a in d.get("Answer",[])])'
done
```

`Status 0` with the value beside it is published; `Status 3` is NXDOMAIN — the
name does not exist, which is what all three currently answer. Ask for the
record's own type rather than `ANY`: resolvers answer `ANY` with `RFC8482`
instead of the data, which reads as success whether or not the record is there.
Netlify publishes within a minute or two, and Resend's Verify button is what
actually flips the domain to Verified.

## Secrets

Supabase dashboard → Edge Functions → Secrets. Without them each function logs
`… _SECRET or RESEND_API_KEY missing` and returns; the customer's row is still
committed, so a missing key loses the notification, never the order.

- `RESEND_API_KEY` — one key, shared by all three functions
- `CONTACT_NOTIFY_SECRET`, `ORDER_NOTIFY_SECRET`, `NEWSLETTER_NOTIFY_SECRET` —
  each the same value as the matching Vault entry the trigger reads

## Order of operations

1. Add the three DNS records, then press Verify in Resend.
2. Set `RESEND_API_KEY` in the Supabase secrets.
3. Send a live test — submit the contact form and confirm the mail arrives at
   `hello@bymantel.com` and that replying reaches the sender.

Steps 1 and 2 are independent: with the key set but the domain unverified,
Resend returns a 403 and the function logs `Resend rejected the send 403`.
