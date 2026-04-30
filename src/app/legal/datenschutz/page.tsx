export const metadata = { title: "Datenschutz — Kaiman Tennis" };

export default function Datenschutz() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 prose">
      <h1>Datenschutzerklärung</h1>

      <p>
        Diese Datenschutzerklärung gilt für die Nutzung der Vereinssoftware <strong>Kaiman Tennis</strong>
        (im Folgenden „Plattform"). Wir nehmen den Schutz Ihrer personenbezogenen Daten ernst und behandeln
        Ihre Daten vertraulich entsprechend der gesetzlichen Datenschutzvorschriften (DSGVO, TKG).
      </p>

      <h2>Verantwortlicher</h2>
      <p>
        Klemens Kaindl, Kaiman Studio, Wien Döbling.<br />
        Kontakt: <a href="mailto:datenschutz@kaiman.studio">datenschutz@kaiman.studio</a>
      </p>

      <h2>Welche Daten verarbeiten wir?</h2>
      <ul>
        <li>
          <strong>Mitgliederdaten:</strong> Name, E-Mail, Telefon, Geburtsdatum, IBAN
          (für SEPA-Lastschrift), Spielstärke. Werden vom Verein im Auftrag erfasst.
        </li>
        <li>
          <strong>Buchungs- und Aktivitätsdaten:</strong> Reservierungen, Match-Ergebnisse, Anmeldungen.
        </li>
        <li>
          <strong>Zahlungsdaten:</strong> Beträge, Zahlungsmethode (kein Kartenstamm — durchläuft Zahlungsdienstleister).
        </li>
        <li>
          <strong>Technische Daten:</strong> IP-Adresse, Browser, Zeitstempel (Server-Logs, max. 30 Tage).
        </li>
      </ul>

      <h2>Rechtsgrundlage</h2>
      <p>
        Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung Mitgliedschaft), lit. c (gesetzliche Aufbewahrung,
        z.B. Buchhaltung 7 Jahre), lit. f (berechtigtes Interesse: Sicherheit, Missbrauchserkennung).
      </p>

      <h2>Auftragsverarbeitung</h2>
      <p>
        Wir betreiben die Plattform als Auftragsverarbeiter für die Vereine. Mit jedem Verein
        wird ein Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO geschlossen.
      </p>

      <h2>Eingesetzte Subunternehmer</h2>
      <ul>
        <li>Vercel Inc. (Hosting, USA — DPA + EU-Standardvertragsklauseln)</li>
        <li>Supabase / Neon (Datenbank, EU-Region)</li>
        <li>Open-Meteo (Wetter-API, anonyme Anfragen)</li>
      </ul>

      <h2>Ihre Rechte</h2>
      <p>Sie haben das Recht auf:</p>
      <ul>
        <li>Auskunft (Art. 15 DSGVO) — Datenexport via „Mein Bereich".</li>
        <li>Berichtigung (Art. 16) — über Mein-Profil oder Vereinsadmin.</li>
        <li>Löschung (Art. 17) — auf Anfrage. Aufbewahrungspflichten gehen vor.</li>
        <li>Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21).</li>
        <li>Beschwerde bei der Datenschutzbehörde (Österreich:{" "}
          <a href="https://www.dsb.gv.at" target="_blank" rel="noreferrer">dsb.gv.at</a>).
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Wir setzen ausschließlich technisch notwendige Cookies (Session-Cookie für Login). Keine
        Tracking-Cookies, keine Werbung. Daher ist kein Cookie-Banner erforderlich.
      </p>

      <h2>Speicherdauer</h2>
      <ul>
        <li>Mitgliederdaten: solange aktive Mitgliedschaft besteht + 1 Jahr.</li>
        <li>Buchhaltung: 7 Jahre (BAO §132).</li>
        <li>Server-Logs: 30 Tage.</li>
      </ul>

      <h2>Stand</h2>
      <p>April 2026.</p>
    </main>
  );
}
