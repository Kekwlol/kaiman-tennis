# Kaiman Tennis (eTennis-Klon)

Multi-Tenant Tennisverein-Software mit drei Integrations-Strategien:

1. **Subdomain-Hosting** — `verein.kaiman.studio` (komplette Vereins-Website)
2. **Custom Domain** — `tc-verein.at` mit automatischem SSL via DNS-CNAME
3. **JavaScript-Widget** — `<script src="/widget.js">` auf bestehende Websites

## Quick-Start

```bash
npm install
npm run db:push     # SQLite-Schema erstellen
npm run db:seed     # Demo-Tenants anlegen
npm run dev
```

## Demo-URLs

| URL | Was |
|---|---|
| `http://localhost:3000` | Marketing-Seite (Root) |
| `http://greinsfurth.lvh.me:3000` | Strategie 1 — Subdomain (gelb) |
| `http://racketworld.lvh.me:3000` | Strategie 1 — andere Subdomain (rot) |
| `http://localhost:3000/widget-demo` | Strategie 3 — Widget eingebettet |

`lvh.me` zeigt automatisch auf `127.0.0.1` (oeffentlicher DNS-Trick fuer lokale Subdomain-Tests).

## Architektur

```
src/
  proxy.ts                  # Multi-Tenant Routing (Next 16: proxy = middleware)
  lib/
    tenant.ts               # Hostname-Parser (Strategie 1 + 2)
    booking.ts              # Verfuegbarkeit + Buchungslogik
    db.ts                   # Prisma Client Singleton
  app/
    page.tsx                # /  -> Marketing
    marketing/page.tsx
    tenant/[ident]/         # Per-Tenant-Routes (von proxy.ts rewriten)
      layout.tsx            # Vereins-Header mit Branding
      page.tsx              # Vereins-Home
      reservierung/
        page.tsx            # Server-Component
        grid.tsx            # Client-Component (Buchungs-UI)
      mitgliedschaft/
    widget-demo/page.tsx    # Demo: Widget auf "fremder" Seite
    api/
      booking/              # POST: Web-Buchung
      widget/
        availability/       # GET: oeffentliches API fuer Widget (CORS)
        booking/            # POST: oeffentliche Buchung fuer Widget
      admin/domains/
        verify/             # POST: DNS-Check fuer Custom Domain
        instructions/       # GET: DNS-Anleitung

widget/src/index.ts         # Vanilla TS Widget (Shadow DOM, 6kb minified)
scripts/build-widget.ts     # esbuild Bundle -> public/widget.js
prisma/
  schema.prisma             # Tenant, Court, Member, Booking
  seed.ts                   # 2 Demo-Vereine + Buchung
```

## Wie die 3 Strategien zusammenspielen

### 1. Subdomain (`greinsfurth.kaiman.studio`)

`proxy.ts` extrahiert `greinsfurth` aus dem `Host`-Header, rewrited intern auf `/tenant/greinsfurth/...`. Layout laedt Tenant-Daten und appliziert Branding via CSS-Custom-Property `--accent`.

### 2. Custom Domain (`racketworld.wien`)

Verein traegt CNAME-Record ein:
```
racketworld.wien   CNAME   kaiman.studio
```
`POST /api/admin/domains/verify` macht DNS-Lookup, schreibt `customDomain` in Tenant-Tabelle. `proxy.ts` matcht den Host gegen `customDomain` (Fallback wenn keine Subdomain). SSL-Cert macht Vercel/Caddy automatisch.

### 3. Widget (`<script src="/widget.js">`)

Verein bindet ein:
```html
<div data-kaiman-tennis="API_KEY"></div>
<script src="https://kaiman.studio/widget.js" async></script>
```

Widget rendert in **Shadow DOM** (Style-Isolation), spricht via CORS gegen `/api/widget/*`. Auth ueber `apiKey` (pro Tenant, in Tenant-Tabelle gespeichert). Kein React = 6kb minified.

## Naechste Schritte

- [ ] Auth (NextAuth mit Magic-Link fuer Mitglieder)
- [ ] Stripe Payment-Integration (Gaststunden + Mitgliedsbeitrag)
- [ ] Admin-Panel (`/admin/[tenant]`)
- [ ] CMS-Modul ("Oeffentlichkeitsarbeit") fuer Vereinshomepage
- [ ] Hardware-Adapter (dormakaba/Comydo API)
- [ ] Migrationspfad SQLite -> PostgreSQL fuer Production
- [ ] PostgreSQL + Vercel-Deployment
- [ ] Custom-Domain-Provisionierung via Vercel API in `verify` einbauen
