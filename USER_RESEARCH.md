# User-Research: Was Vereinsmitglieder wirklich wollen

Quellen: schlaegerclub.de Vergleich, capterra Skedda-Reviews,
trustpilot Playtomic, courtreserve Reddit-Survey, eversports,
allbooked, tennify, tennis04, eTennis, Playtomic Manager (April 2026).

---

## Top-15 Pain-Points (was Nutzer hassen)

| # | Pain | Wer |
|---|---|---|
| 1 | **Clunky Mobile-UX** — Buchung braucht zu viele Klicks, kein Touch-First | Mitglieder |
| 2 | **Mandatory Account** für simple Aktionen | Gäste |
| 3 | **Konfuse Preisstruktur** — Modul-Bündel nicht verständlich | Funktionäre |
| 4 | **Schwerfällige Vereinsfunktionäre-UX** — alte Software, viele Klicks | Funktionäre |
| 5 | **Overbooked Open-Play** — chaotische Verteilung, niemand weiß wer kommt | Mitglieder |
| 6 | **Mismatched Skill-Level** — Anfänger spielen versehentlich gegen Profis | Spieler |
| 7 | **Cliquish Behavior** — neue Mitglieder werden ignoriert | Neumitglieder |
| 8 | **Multiple-Tool-Juggling** — separate Apps für Mail, SMS, Buchung, CRM | Vereine |
| 9 | **Schwache Automation** — manuelle Nachverfolgung von Mitgliedsbeiträgen | Kassiere |
| 10 | **Keine native App** — nur Web-PWA, fühlt sich wie Webseite an | Mitglieder |
| 11 | **Buggy Cancel/Waitlist** — niemand wird benachrichtigt bei Storno | Beide |
| 12 | **Lange Migrations-Pfad** von Excel/Papier zu System | Funktionäre |
| 13 | **Datenschutz-Bedenken** — Cloud, US-Server, etc. | Vorstände |
| 14 | **Schlechte Sponsorenintegration** — Logo-Wand, nichts mehr | Sponsoren |
| 15 | **Keine offline-Funktion** — kein Empfang am Platz = kein Buchen | Spieler |

---

## Top-20 Wunsch-Features (von erfolgreichen Tools)

### Was Playtomic erfolgreich macht (4.800 Clubs, 3.1M Spieler)
1. **Skill-Level 0-7 mit Reliability-Score** — visuell, einfach, motivierend
2. **Open Match-Sessions** — "Suche Spieler 3.0-3.5 für Doppel Donnerstag 18h"
3. **Match-Verlauf + Statistiken** — Wins/Losses, Punkte, Trends
4. **Community-Empfehlungen** — "Spieler mit ähnlichem Skill in deiner Naehe"
5. **In-App-Chat** zwischen Spielern
6. **Tournament Discovery** — finde Turniere in der Region
7. **Native App + PWA** statt nur Web
8. **Leveling-System bringt Gamification**

### Was Skedda erfolgreich macht (Capterra 4.9★)
9. **Rules-based Pricing** — extrem flexibel, alle Edge-Cases abbildbar
10. **24/7 Customer Support** — Antwort innerhalb Minuten
11. **Onboarding in 1-2 Stunden** — keine Trainings nötig
12. **Free Tier** für kleine Vereine
13. **Stripe Connect** integriert (Geld direkt zum Verein)

### Was eversports / Anolla / CourtReserve haben
14. **Push-Notifications** für Bestaetigung, Wartelisten, Erinnerung
15. **iCal/Google-Calendar Sync** der Buchungen
16. **Apple Pay / Google Pay** nativ
17. **Loyalty Points** für Buchungen, Events
18. **Targeted Marketing** an Mitglieder-Segmente
19. **Multilingual** (25 Sprachen)
20. **AI Assistant** 24/7 (overkill, aber Trend)

---

## Was wir schon haben (Status Quo Klon)

### ✓ Done
- Reservierung mit Multi-Slot, Buchungsregeln-Engine, Pricing-Tiers
- ELO-Skill-Score (intern 1000-1400, technisch korrekt)
- Wartelisten-Schema (DB)
- Custom Branding pro Verein
- Widget für externe Sites
- Custom Domains mit DNS-Verify
- Forderungspyramide mit ELO-Update
- Turniere mit KO-Bracket-Generator
- Mannschaften
- Buchhaltung mit DATEV-Export
- Kiosk-POS mit RKSV-Schnittstelle
- Hardware-Adapter (7 Provider)
- Mehrsprachig im CMS-Modul (de/en/it)

### ⚠️ Halb fertig
- ELO **gibt es** aber wird **nicht user-friendly angezeigt** (nur Zahl)
- Wartelisten-Schema **da** aber **kein UI fuer Mitglieder**
- Notifications **funktionieren** aber **kein Push** (nur Mail-Stub)
- Spielpartner-Suche **da** aber **kein Match-Making**

### ❌ Fehlt
- Mitglieder-Dashboard "Mein Bereich"
- Passwortlose Anmeldung (Magic-Link)
- Open Play Sessions
- iCal-Export
- Wetter-Integration
- Match-Statistiken pro Spieler
- In-App-Chat
- Native App (Capacitor)

---

## Priorisierung: Was jetzt bauen

### Tier 1 — Game-Changer (jetzt implementieren)
1. **🌐 Open Play Sessions** — fehlt eTennis komplett, Hauptdifferentiator zu Playtomic
2. **👤 Mein Bereich (Mitglieder-Dashboard)** — alle Module in einer persoenlichen View
3. **⭐ Skill-Level 0-7 Anzeige** — UI-Verbesserung des bestehenden ELO
4. **📅 iCal-Export** — sehr einfach umzusetzen, hoher Nutzwert
5. **⏳ Wartelisten-UI** — Schema da, nur UI fehlt

### Tier 2 — Quick-Wins (wenn Zeit)
6. **🌤 Wetter-Integration** im Reservierungsraster (Open-Meteo gratis)
7. **📊 Match-Statistiken** pro Spieler
8. **🔗 Magic-Link-Auth** (passwortlos)

### Tier 3 — spaetere Phase
9. Native App via Capacitor
10. Push-Notifications via Web Push API
11. Apple/Google Pay
12. In-App-Chat
13. AI-Assistant

---

## Konkrete Umsetzungs-Notes

### Open Play Sessions (Tier 1.1)
**Schema:** Neues Modell `OpenSession`
- host (memberId)
- courtId, startsAt, endsAt
- format (singles/doubles/mixed/practice)
- skillMin/skillMax
- maxParticipants (2 fuer Einzel, 4 fuer Doppel)
- participants (Member[])
- status (open/full/started/cancelled/finished)

**UI:** `/sessions` (Liste), `/sessions/new` (erstellen), Session-Detail mit "Beitreten"-Button

### Skill-Level 0-7 (Tier 1.3)
ELO 800 → Level 1.0 (Anfänger)
ELO 1000 → Level 2.0 (Hobby)
ELO 1200 → Level 3.0 (Fortgeschritten)
ELO 1400 → Level 4.0 (Liga)
ELO 1600 → Level 5.0 (Turnier)
ELO 1800+ → Level 6.0+ (Profi)

Formel: `level = (skillScore - 600) / 200` clamped 0-7

### iCal-Export (Tier 1.4)
RFC 5545 Format. Endpoint: `/api/ical/me?token=...`
Zugang via Magic-Token im User-Profile.
