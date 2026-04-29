// Kaiman Tennis Widget - Vanilla TS, in Shadow DOM, kein React
// Wird gebundled zu /public/widget.js und kann eingebettet werden via:
//
//   <div data-kaiman-tennis="API_KEY"></div>
//   <script src="https://kaiman.studio/widget.js" async></script>

type Slot = {
  courtId: string;
  courtName: string;
  start: string;
  end: string;
  available: boolean;
};

type AvailabilityResponse = {
  tenant: { name: string; primaryColor: string };
  date: string;
  slots: Slot[];
};

const API_BASE = (() => {
  // Auto-detect aus dem script tag
  const script = document.currentScript as HTMLScriptElement | null;
  if (script?.src) {
    try {
      return new URL(script.src).origin;
    } catch {}
  }
  return "https://kaiman.studio";
})();

const STYLES = `
  :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  .root { color: #111; background: #fff; padding: 16px; border: 1px solid #e5e5e5; border-radius: 8px; max-width: 100%; }
  .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
  .title { font-weight: 700; font-size: 16px; margin: 0; }
  .branding { font-size: 10px; color: #999; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 6px; font-weight: 600; border-bottom: 1px solid #ddd; background: #fafafa; }
  td { padding: 2px; }
  td:first-child { color: #666; padding-left: 6px; font-variant-numeric: tabular-nums; }
  button.slot { width: 100%; height: 28px; font-size: 11px; cursor: pointer; border: 1px solid; background: transparent; transition: all 0.1s; }
  button.slot:hover:not(:disabled) { background: var(--accent); color: #000; }
  button.slot:disabled { opacity: 0.3; cursor: not-allowed; }
  button.slot.selected { background: var(--accent); color: #000; font-weight: 700; }
  .form { margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; display: flex; gap: 8px; align-items: center; }
  input { flex: 1; padding: 6px 8px; border: 1px solid #ccc; font-size: 13px; }
  button.book { padding: 6px 14px; background: var(--accent); color: #000; border: none; font-weight: 700; cursor: pointer; font-size: 13px; }
  button.book:disabled { opacity: 0.5; cursor: not-allowed; }
  .msg { margin-top: 8px; padding: 8px; font-size: 12px; }
  .msg.ok { background: #ecfdf5; color: #065f46; }
  .msg.err { background: #fef2f2; color: #991b1b; }
  .loading { padding: 24px; text-align: center; color: #999; font-size: 13px; }
`;

class KaimanTennisWidget {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private apiKey: string;
  private state: {
    data: AvailabilityResponse | null;
    selected: Slot | null;
    name: string;
    busy: boolean;
    msg: { kind: "ok" | "err"; text: string } | null;
  } = { data: null, selected: null, name: "", busy: false, msg: null };

  constructor(host: HTMLElement, apiKey: string) {
    this.host = host;
    this.apiKey = apiKey;
    this.shadow = host.attachShadow({ mode: "open" });
    this.render();
    this.fetchAvailability();
  }

  private async fetchAvailability() {
    try {
      const res = await fetch(
        `${API_BASE}/api/widget/availability?key=${encodeURIComponent(this.apiKey)}`,
      );
      if (!res.ok) throw new Error(`API ${res.status}`);
      this.state.data = await res.json();
      this.render();
    } catch (e) {
      this.state.msg = {
        kind: "err",
        text: `Fehler beim Laden: ${(e as Error).message}`,
      };
      this.render();
    }
  }

  private async submit() {
    if (!this.state.selected || !this.state.name) return;
    this.state.busy = true;
    this.render();
    try {
      const res = await fetch(`${API_BASE}/api/widget/booking`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: this.apiKey,
          courtId: this.state.selected.courtId,
          start: this.state.selected.start,
          end: this.state.selected.end,
          guestName: this.state.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "UNKNOWN");
      this.state.msg = { kind: "ok", text: `Gebucht! Zutritts-PIN: ${data.pinCode}` };
      this.state.selected = null;
      this.state.name = "";
      this.fetchAvailability();
    } catch (e) {
      this.state.msg = { kind: "err", text: `Fehler: ${(e as Error).message}` };
    } finally {
      this.state.busy = false;
      this.render();
    }
  }

  private render() {
    const { data, selected, name, busy, msg } = this.state;

    if (!data && !msg) {
      this.shadow.innerHTML = `<style>${STYLES}</style><div class="root"><div class="loading">Lade Verfügbarkeit...</div></div>`;
      return;
    }

    const accent = data?.tenant.primaryColor ?? "#EEFF00";
    const courts = data
      ? Array.from(new Map(data.slots.map((s) => [s.courtId, s.courtName])).entries())
      : [];
    const hours = data ? Array.from(new Set(data.slots.map((s) => s.start))).sort() : [];

    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="root" style="--accent: ${escapeHtml(accent)}">
        <div class="header">
          <h3 class="title">${escapeHtml(data?.tenant.name ?? "Tennis-Reservierung")}</h3>
          <span class="branding">powered by Kaiman</span>
        </div>
        ${
          data
            ? `<table>
          <thead>
            <tr>
              <th>Zeit</th>
              ${courts.map(([, n]) => `<th>${escapeHtml(n)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${hours
              .map((h) => {
                const t = new Date(h);
                const time = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
                return `<tr>
                  <td>${time}</td>
                  ${courts
                    .map(([cid]) => {
                      const slot = data.slots.find(
                        (s) => s.courtId === cid && s.start === h,
                      )!;
                      const sel =
                        selected?.courtId === slot.courtId &&
                        selected?.start === slot.start;
                      return `<td><button class="slot ${sel ? "selected" : ""}"
                        data-court="${escapeAttr(slot.courtId)}"
                        data-start="${escapeAttr(slot.start)}"
                        data-end="${escapeAttr(slot.end)}"
                        ${slot.available ? "" : "disabled"}
                        style="border-color: ${slot.available ? accent : "#ddd"}; color: ${slot.available ? accent : "#999"}">
                        ${slot.available ? (sel ? "✓" : "frei") : "—"}
                      </button></td>`;
                    })
                    .join("")}
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>`
            : ""
        }
        ${
          selected
            ? `<div class="form">
          <input type="text" placeholder="Dein Name" value="${escapeAttr(name)}" />
          <button class="book" ${busy || !name ? "disabled" : ""}>${busy ? "..." : "Buchen"}</button>
        </div>`
            : ""
        }
        ${msg ? `<div class="msg ${msg.kind}">${escapeHtml(msg.text)}</div>` : ""}
      </div>
    `;

    // Event-Listener wieder anhängen
    this.shadow.querySelectorAll<HTMLButtonElement>("button.slot").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const slot: Slot = {
          courtId: btn.dataset.court!,
          courtName:
            data?.slots.find((s) => s.courtId === btn.dataset.court)?.courtName ?? "",
          start: btn.dataset.start!,
          end: btn.dataset.end!,
          available: true,
        };
        this.state.selected = slot;
        this.render();
      });
    });

    const input = this.shadow.querySelector<HTMLInputElement>("input");
    input?.addEventListener("input", (e) => {
      this.state.name = (e.target as HTMLInputElement).value;
      const btn = this.shadow.querySelector<HTMLButtonElement>("button.book");
      if (btn) btn.disabled = !this.state.name || this.state.busy;
    });

    this.shadow
      .querySelector<HTMLButtonElement>("button.book")
      ?.addEventListener("click", () => this.submit());
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
function escapeAttr(s: string) {
  return escapeHtml(s);
}
function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function init() {
  document
    .querySelectorAll<HTMLElement>("[data-kaiman-tennis]:not([data-kaiman-init])")
    .forEach((el) => {
      const apiKey = el.getAttribute("data-kaiman-tennis");
      if (!apiKey) return;
      el.setAttribute("data-kaiman-init", "1");
      new KaimanTennisWidget(el, apiKey);
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Auch bei späteren DOM-Änderungen (SPA-Apps)
new MutationObserver(init).observe(document.body, { childList: true, subtree: true });
