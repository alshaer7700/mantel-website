
# MANTEL

Mantel is a café and small house of objects in Hidd, Bahrain. The storefront uses a Vite frontend with Supabase for catalog, accounts, cash-on-pickup ordering, protected form storage, and staff operations.

## Run locally

Copy `.env.example` to `.env.local`, enter the Mantel Supabase public URL and publishable key, then run `npm i` followed by `npm run dev`.

Before publishing, run `npm run typecheck` and `npm run build`. The public site requires the following environment variables in the hosting provider: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `VITE_MONITORING_ENDPOINT` is optional; if it is left blank, client errors are still handled locally but are not sent to a remote monitoring service.

## Staff dashboard

The protected staff dashboard is available at `/admin`. A staff member must first create a normal Mantel account, then an existing database administrator must activate that user in `public.staff_members`. The dashboard deliberately has no public navigation link and is excluded from search indexing.

```sql
insert into public.staff_members (user_id, active)
select id, true
from auth.users
where email = 'staff@example.com'
on conflict (user_id) do update set active = true;
```

Once activated, staff can view order, Contact, and Newsletter operational data and update order, message, subscriber, menu, and Retail availability statuses through protected Supabase RPCs. Customer accounts remain unable to access this data.

## SEO and production checks

Public crawl controls are in `public/robots.txt`; the public route list is in `public/sitemap.xml`; and install/share metadata is in `public/site.webmanifest` and `index.html`. Check the deployed `https://bymantel.com/robots.txt`, `https://bymantel.com/sitemap.xml`, and each primary route after every release.
