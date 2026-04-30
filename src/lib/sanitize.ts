import DOMPurify from "isomorphic-dompurify";

// Sanitize Markdown-User-Input bevor Rendering.
// Erlaubt sicheres HTML-Subset (kein Script, kein iframe, etc.)
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "blockquote", "code", "pre",
      "img", "hr", "table", "thead", "tbody", "tr", "td", "th",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input"],
  });
}

// Markdown -> HTML mit Sanitize. Minimaler Markdown-Renderer (keine extra-Dependency).
export function markdownToHtml(md: string): string {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold & Italic
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    // Paragraphs (split on double newline)
    .split(/\n\n+/)
    .map((p) => (p.startsWith("<") ? p : `<p>${p.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
  return sanitizeHtml(html);
}
