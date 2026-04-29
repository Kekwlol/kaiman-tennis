// Skill-Level 0-7 wie Playtomic, basierend auf interner ELO
// 600 ELO -> Level 0, 2000 ELO -> Level 7
const ELO_MIN = 600;
const ELO_PER_LEVEL = 200;
const LEVEL_MAX = 7;

export function eloToLevel(eloScore: number): number {
  const raw = (eloScore - ELO_MIN) / ELO_PER_LEVEL;
  return Math.max(0, Math.min(LEVEL_MAX, Math.round(raw * 10) / 10));
}

export function levelToElo(level: number): number {
  return Math.round(ELO_MIN + level * ELO_PER_LEVEL);
}

// Level-Beschreibung wie Playtomic
export function levelLabel(level: number): string {
  if (level < 1) return "Anfaenger";
  if (level < 2) return "Hobby";
  if (level < 3) return "Fortgeschritten";
  if (level < 4) return "Liga";
  if (level < 5) return "Turnierspieler";
  if (level < 6) return "Stark";
  return "Profi";
}

// Sterne-Rating fuer visuelle Anzeige (0-7)
export function levelStars(level: number): string {
  const full = Math.floor(level);
  const half = level - full >= 0.5;
  let stars = "★".repeat(full);
  if (half) stars += "½";
  while (stars.length < 7) stars += "☆";
  return stars.slice(0, 7);
}

export function fmtLevel(eloScore: number): { level: number; label: string; stars: string } {
  const lvl = eloToLevel(eloScore);
  return { level: lvl, label: levelLabel(lvl), stars: levelStars(lvl) };
}
