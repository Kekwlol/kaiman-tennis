# Kaiman Tennis — Vollst&auml;ndige Modul-Spec mit Verbesserungen

Vollst&auml;ndige Analyse aller eTennis-Module + Verbesserungsideen + Implementierungsplan.
Quelle: etennis.at/funktionen/* (April 2026 recherchiert).

Legende:
- **eT** = was eTennis hat
- **+** = unsere Verbesserung
- **API** = REST/Server-Action

---

## 1. Mitgliederverwaltung

### eT
- Individuelle Datenfelder (Custom Fields)
- Mitgliedschaftstypen: Kind, Erwachsen, Paar, Familie
- Benutzergruppen mit automatischem &Uuml;bergang nach Zahlung
- Saison&uuml;bergang: Bulk-Operation auf Gastspieler
- SEPA, PayPal, Stripe, Sofortueberweisung, PaysafeCash

### + Verbesserung
- **Audit-Log** auf Stammdaten-&Auml;nderungen (DSGVO)
- **Soft-Delete** mit Re-Identification-Sperre nach Austritt
- **Selbst-Service-Portal**: Mitglied bearbeitet eigene Daten + Datenexport (DSGVO Art. 15)
- **Mitgliedschafts-Vorschauen**: System zeigt vor Saisonstart wer abf&auml;llt
- **Bulk-Mahnwesen** mit konfigurierbarer Eskalation (3 Stufen)
- **Family-Linking**: Familien-Mitgliedschaft = ein Hauptzahler + Kinder als verkn&uuml;pfte Konten
- **Mitglieder-Onboarding-Workflow**: Anmeldung → SEPA-Mandat → Zahlung → Status active in einem Flow
- **Beitragsproration** bei Mid-Season-Eintritt

### Datenmodell
- `Member`: name, email, phone, birthdate, group, status, customFields (JSON)
- `MembershipType`: tenantId, name, fee, durationMonths, eligibleGroups
- `MembershipPurchase`: memberId, typeId, validFrom, validUntil, paid
- `FamilyLink`: primaryMemberId, dependentMemberId

---

## 2. Online Reservierung

### eT
- Konfigurierbare Buchungsregeln (Dauer, Vorlauf, Spaeteste Stornierung, max/Woche)
- Regeln pro Gruppe + Platzkategorie + Tag/Zeit
- Preiszonen mit Farbcodes
- Aboplaner: Saison-Abos, kopierbar
- Spielguthaben (Pre-Paid)
- Info-Screen-Modus
- KI-Mitspieler-Vorschlaege

### + Verbesserung
- **Regel-Engine als Code** (statt nur UI-Settings) → testbare DSL
- **Conflict-Resolution**: Paralleles Buchen → optimistic locking auf DB-Ebene
- **Wartelisten** auf belegte Slots
- **Smart-Cancellation**: Bei Storno automatisch Wartenden benachrichtigen
- **Wetterintegration**: Wettervorhersage neben Slot anzeigen
- **Recurring-Slots als First-Class**: Abos erscheinen wie normale Buchungen
- **Capacity-Management** f&uuml;r Mehrfach-Plaetze (z.B. Beach-Volleyball mit mehreren Spielern)
- **Mobile-First-UX**: Touch-optimiertes Time-Picker-Wheel statt Desktop-Grid
- **Multi-Court-Buchung** in einem Schritt (Familie bucht 2 Plaetze nebeneinander)

### Datenmodell
- `Booking` (existiert)
- `BookingRule`: tenantId, scope (group+court+timeOfDay), maxPerWeek, minAdvanceHours, maxAdvanceDays, cancelDeadlineHours
- `PriceZone`: tenantId, name, color, defaultPrice
- `PriceTier`: zoneId, dayOfWeek, hourFrom, hourTo, price, eligibleGroups
- `Subscription`: memberId, courtId, weekday, hourFrom, validFrom, validUntil
- `Waitlist`: bookingSlotId, memberId, position

---

## 3. Spielpartner-Suche

### eT
- Anfragen via Reservierung oder Datum/Zeit
- Filter: Anzahl, Match-Typ, Spielstaerke, Zielgruppe
- Matching via "eTennis Score"
- Push + Mail-Notification
- Persoenliche Spielerliste

### + Verbesserung
- **Public Skill-Score** (sichtbar fuer Vereine)
- **Reziproker Score-Algorithmus**: Sieg gegen staerkeren = mehr Punkte
- **Match-Verlauf** sichtbar
- **DSGVO-Opt-In**: Sichtbarkeit pro Mitglied einstellbar
- **Geo-Filter** fuer hallenuebergreifende Suche
- **Player-Cards** mit Bestzeit, Schlaeger, Spielstil
- **Booking + Find-in-One**: Beim Buchen direkt Mitspieler-Suche triggern

### Datenmodell
- `PlayerProfile`: memberId, skillScore, preferredTimes, visibility
- `MatchRequest`: memberId, courtId?, dateRange, skillMin/Max, status
- `MatchHistory`: memberA, memberB, score, date, courtId

---

## 4. Oeffentlichkeitsarbeit (CMS)

### eT
- Startseite mit News
- Individuelle Seiten
- Newsletter (E-Mail + SMS)
- Sponsoren-Bereich
- Arbeitsdienstverwaltung mit Stundenerfassung

### + Verbesserung
- **Headless CMS**: Markdown statt WYSIWYG, versionskontrolliert
- **A/B-Test fuer News** (Headlines testen)
- **SEO-Optimization**: Meta-Tags, OG-Image-Generator
- **Newsletter-Templates** mit Live-Preview
- **Open-Rate-Tracking** mit Pixel
- **Sponsoren-Klicktracking**: Vereine koennen Sponsoren-Vertraege rechtfertigen
- **Image-Pipeline**: Auto-Optimierung mit next/image
- **iCal-Export** fuer Event-Kalender
- **Mehrsprachig** (de/en/it) mit per-Field Uebersetzung

### Datenmodell
- `Page`: tenantId, slug, title, contentMd, locale, publishedAt, seoMeta
- `News`: tenantId, title, body, image, publishedAt
- `Newsletter`: tenantId, subject, bodyMd, sentAt, recipientCount, openCount
- `Sponsor`: tenantId, name, logoUrl, link, validFrom/Until
- `WorkAssignment`: memberId, hoursAssigned, hoursWorked, dueDate

---

## 5. Buchhaltung

### eT
- Rechnungen (manuell + auto aus Buchungen)
- EAR (Einnahmen-Ausgaben-Rechnung)
- Konten + Buchungskonten
- Jahresabschluss

### + Verbesserung
- **DATEV-Export** (CSV-Format Pruefziffer)
- **Steuersatz-Engine** (USt 0/10/20% Oesterreich konfigurierbar)
- **Spendenbescheinigungen** (Vereine!)
- **Rechnungskorrektur** mit Storno-Workflow
- **Belege-Upload** + OCR fuer Eingangsrechnungen
- **Cashflow-Forecast** auf Basis offener Rechnungen + Abos
- **Multi-Mandanten-Konsolidierung** fuer Sektionen
- **Kontenrahmen-Vorlagen** fuer AT/DE Vereine

### Datenmodell
- `Invoice`: tenantId, number, recipient, items (JSON), total, vat, paid, dueDate
- `LedgerEntry`: tenantId, date, account, debit, credit, description, sourceRef
- `Account`: tenantId, code (z.B. "4000"), name, type (revenue/expense/asset)
- `TaxRate`: code, percent, country

---

## 6. Forderungspyramide

### eT
- Pyramide oder Punktesystem
- Bewerbe pro Gruppe (Gaeste, Mitglieder, Damen, Jugend, Doppel)
- Forderung sichtbar fuer alle
- Mail/SMS-Notification
- Auto-Update der Pyramide nach Ergebnis
- Integration in Reservierung

### + Verbesserung
- **Cool-Down-Periode** (z.B. nach Forderung 7 Tage Sperre)
- **Annahmefrist** (z.B. Annahme innerhalb 7 Tagen, sonst Forderung gilt)
- **No-Show-Logik** (Gegner erscheint nicht → Wertung)
- **Saisonreset mit Hall-of-Fame**
- **Live-Animation** wenn jemand klettert
- **Rangliste**: Pareto-Punktesystem (Sieg gegen Schwaecheren bringt weniger)
- **Mehrere parallele Pyramiden** pro Saison
- **Round-Robin** als drittes Format

### Datenmodell
- `Ladder`: tenantId, name, format ("pyramid"|"points"|"roundrobin"), seasonStart/End
- `LadderParticipant`: ladderId, memberId, currentPosition, points
- `Challenge`: ladderId, challengerId, challengedId, status (open/accepted/played/declined), deadline
- `MatchResult`: challengeId, sets (JSON), winnerId, validatedAt

---

## 7. Turnierverwaltung

### eT
- KO, Doppel-KO, Tabelle (Round-Robin)
- Online-Anmeldung
- Setzliste implizit
- Brackets, Loser-Bracket, Platzierung, Rangliste, Teilnehmer in Tabs
- Auto-Update bei Ergebnis-Eingabe

### + Verbesserung
- **Schweizer System** (fehlt eT)
- **Setzliste explizit + Seeding-Algorithmus**
- **Mixed-Doppel** Format
- **Online-Bezahlung** der Anmeldegebuehr (eT unklar ob integriert)
- **Live-Score** (Punkt fuer Punkt) per Mobile App
- **Bracket-Visualisierung als SVG** mit Drag-and-Drop fuer Admin
- **Print-Layout** fuer Turniertafel im Clubhaus
- **Photofinish-Upload** durch Schiedsrichter
- **Tournament-Director-Chat** zwischen Spielern
- **TV-Modus** mit Live-Anzeige auf Fernseher

### Datenmodell
- `Tournament`: tenantId, name, format, drawSize, registrationOpen/Close, entryFee
- `TournamentEntry`: tournamentId, memberId|guestName, paid, seed
- `Match`: tournamentId, round, slot, playerA, playerB, courtId?, scheduledAt, score (JSON), winnerId

---

## 8. Steuerungsmodul (Hardware)

### eT
- 72mm DIN-Hutschienenmodul, 8 Relais + Operate + Fault + Info-LEDs
- 12/24V, RJ45
- Konfiguration: Platz → Relais
- Karenzzeit vor/nach Reservierung
- Verhalten bei Internet-Ausfall

### + Verbesserung
- **MQTT-Adapter** fuer Standard-IoT-Geraete (statt Custom-Hardware)
- **Home-Assistant-Integration** (Vereine die schon HA haben)
- **Energie-Monitoring** mit Smart-Meter
- **Predictive-Heating**: Halle vorheizen bei kommender Buchung
- **Failure-Webhook**: Bei Hardware-Ausfall Admin per Mail
- **Manueller Override** im Admin-UI
- **Test-Mode**: Trockenlauf ohne Stromschalten
- **Sunset-API** fuer auto-Flutlicht ab Daemmerung

### Datenmodell
- `Device`: tenantId, kind (relay/mqtt/exivo/comydo), endpoint, credentials (encrypted)
- `DeviceMapping`: deviceId, courtId, channel, action (light/heat/door)
- `DeviceLog`: deviceId, action, status, timestamp

---

## 9. Online Zahlung

### eT
- Sofortueberweisung, Kreditkarten, PayPal, PaysafeCash
- Spielguthaben (Pre-Paid-Account)
- Auto-Rechnung
- Aboplaner

### + Verbesserung
- **Stripe als Default** mit allen Methoden inkl. SEPA
- **Apple/Google Pay** native
- **Klarna** fuer Camps (Ratenzahlung)
- **Refund-Policy** automatisiert: Storno X Tage vorher = 100% refund
- **Zahlungserinnerungen** mit Eskalation
- **Payment-Links** (kein Login noetig)
- **Crypto** (USDC) fuer internationale Gaeste — optional
- **Receipt-Email** per Resend mit PDF-Anhang

### Datenmodell
- `Payment`: tenantId, memberId?, amount, currency, provider, status, externalRef
- `Wallet`: memberId, balance
- `WalletTransaction`: walletId, amount, reason, bookingId?

---

## 10. Mannschaftsverwaltung

### eT
- Mannschaft anlegen mit Spielern + Fotos
- Spieltermine in Kalender
- Mail-Verfuegbarkeitsabfrage (Zu-/Absage)
- Mannschaftsfuehrer-Rolle

### + Verbesserung
- **Liga-Tabelle** + automatische Berechnung
- **OETV/DTB-API-Anbindung** fuer offizielle Ergebnisse
- **Auf-/Abstiegslogik** mit Saisonreset
- **Auswahl-Algorithmus** fuer Aufstellung (sortiert nach Skill, beruecksichtigt Verfuegbarkeit)
- **Doppel-Kombinationen** vorschlagen
- **Statistik pro Spieler** (Win/Loss, Sets gewonnen)
- **Matchday-Briefing** als auto-PDF
- **Shuttle-Service-Koordination** fuer Auswaertsspiele
- **Heim-Spiel-Briefing** fuer Helfer

### Datenmodell
- `Team`: tenantId, name, league, division, captainId
- `TeamMember`: teamId, memberId, position
- `LeagueMatch`: teamId, opponent, date, courtId?, isHome, lineup (JSON), score (JSON)

---

## 11. Kiosk POS

### eT
- Lagerverwaltung mit Auto-Mail bei Niedrigstand
- Selbstbedienungs- + Rezeptionsmodus
- Bar, Bankomat, Rechnung, SEPA
- Hello Cash Anbindung (Registrierkasse)
- Sammelabrechnung monatlich

### + Verbesserung
- **Stripe-Terminal-Anbindung** fuer Kartenzahlung
- **TSE-Konformitaet** (DE) bzw. RKSV (AT) → Hello Cash + native Alternative
- **Tageskasse-Abschluss** mit X/Z-Bons
- **Inventur-UI** (Mobile)
- **Lieferschein-Upload** fuer Wareneingang
- **Happy-Hour-Preise** zeitabhaengig
- **Mitglieder-Rabatt** automatisch
- **Tab-System**: Auf Karte buchen, Ende Monat abrechnen
- **Voice-Order** fuer Pad-Teilnehmer

### Datenmodell
- `Product`: tenantId, name, price, cost, stock, vatRate, category
- `Sale`: tenantId, memberId?, items (JSON), total, paymentMethod, registerSession
- `RegisterSession`: openingBalance, closingBalance, openedAt, closedBy

---

## 12. Zutrittssteuerung

### eT
- Exivo (dormakaba), Comydo
- Chip oder PIN/QR
- Auto-PIN bei Reservierung
- Zeitfenster vor/nach Buchung
- Echtzeit-Sperre bei Statuswechsel

### + Verbesserung
- **NFC-Mobile** als Schluesselersatz (Apple Wallet, Google Wallet)
- **BLE-basiert** fuer touchless entry
- **Generische API-Schicht**: dormakaba, Comydo, Salto, Tedee, Nuki
- **Anti-Tailgating-Logging**
- **Notfall-Override**
- **Cleanup-Job**: PINs nach Buchungsende invalidieren
- **Audit-Trail** wer wann eingelassen wurde

### Datenmodell (siehe Device-Modell)
- `AccessGrant`: bookingId, deviceId, pinCode, validFrom/Until, usedAt

---

## 13. Event-/Kurs-/Camp-Verwaltung

### eT
- Ein-/mehrtaegig
- Detail-Ansicht mit Anmeldung
- Sichtbarkeit pro Benutzergruppe

### + Verbesserung
- **Online-Bezahlung** der Anmeldung (eT unklar)
- **Wartelisten** mit auto-promote
- **Teilnehmer-Limit + Mindestteilnehmer** (Camp wird abgesagt unter X)
- **Teilrueckerstattung** bei Storno
- **Trainer-Zuordnung** mit Stundensatz
- **Wiederkehrende-Kurse** (jeder Mittwoch 18-19 fuer 12 Wochen)
- **Anwesenheitscheck-In** per QR
- **Auto-Bestaetigungsmail** mit Kalender-Anhang (.ics)
- **Wettercheck** vor Outdoor-Camps mit Auto-Verschiebung

### Datenmodell
- `Course`: tenantId, name, type (course/camp/event), description, startsAt, endsAt, capacity, minParticipants, price, visibilityGroups
- `CourseSession`: courseId, sessionAt, courtId?, trainerId
- `CourseRegistration`: courseId, memberId|guestName, paid, attendance (JSON)

---

## 14. Halle-Konzept

### eT
- Personal-Chips, Gast-PINs
- Auto-Licht/Strom
- Vorab-Online-Bezahlung
- Multi-Sport (Tennis, Golf-Sim, Schiess, Bowling, Pool, Climbing)

### + Verbesserung
- **Generisches Sportartmodell** statt nur Tennis
- **Kombinierte Bookings** (Tennis + Sauna danach)
- **Gast-Self-Service-Terminal** im Eingang
- **Smart-Display** im Eingang zeigt freie Plaetze live

---

## Querschnittsthemen (alle Module)

### Auth & RBAC
- **Magic-Link** (Auth.js v5)
- **Rollen**: superadmin, tenantAdmin, manager, member, guest
- **Granular Permissions**: pro Modul (z.B. accounting:read, ladder:admin)
- **Impersonation** fuer Support
- **2FA** fuer Admin-Konten

### Notifications
- **Multi-Channel**: Mail (Resend), SMS (Twilio), Push (PWA)
- **Preferences pro User**: pro Notif-Typ Channel-Praeferenz
- **Templates** mit i18n
- **Digest-Mode** (taeglich/woechentlich)

### Audit & DSGVO
- Audit-Log auf Stammdaten
- Datenexport-API (Art. 15)
- Recht auf Loeschung (Art. 17)
- Auftragsverarbeitungsvertrag-Vorlage

### Performance / Skalierung
- Server-Components default, Client nur wo noetig
- Cache: Tenant-Lookup nach Hostname mit Redis (Phase 2)
- DB: PostgreSQL + Connection-Pooling (Vercel Postgres)
- Edge Middleware fuer schnelle Subdomain-Resolution

### Mobile
- PWA + Manifest
- Native App via Capacitor (Phase 3)

---

## Implementation-Priorit&auml;t (was zuerst)

**Phase 1 (jetzt)** — Kern-Features die jeder Verein braucht
1. Datenmodell erweitern
2. Mitgliederverwaltung (CRUD + Beitragsabrechnung)
3. BookingRule-Engine + Preiszonen
4. Notifications (Mail-Stub)
5. Admin-Panel-Grundgeruest

**Phase 2** — Vereinsleben
6. CMS (News, Pages, Newsletter)
7. Forderungspyramide
8. Turniere
9. Mannschaft

**Phase 3** — Hardware/Kommerzielles
10. Kurse/Camps mit Bezahlung
11. Buchhaltung
12. Kiosk
13. Hardware-Adapter (Stub)
14. Spielpartner-Suche
