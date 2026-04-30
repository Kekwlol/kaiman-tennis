// Wetter-Integration fuer Outdoor-Plaetze
// Open-Meteo API (gratis, kein API-Key)

type WeatherSlot = { iso: string; tempC: number; precipMm: number; code: number };

// Cache-friendly: hourly forecast fuer 1 Tag
export async function fetchHourlyForecast(
  lat: number,
  lon: number,
  date: Date,
): Promise<WeatherSlot[]> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const dateStr = dayStart.toISOString().slice(0, 10);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lon.toString());
  url.searchParams.set("hourly", "temperature_2m,precipitation,weather_code");
  url.searchParams.set("start_date", dateStr);
  url.searchParams.set("end_date", dateStr);
  url.searchParams.set("timezone", "Europe/Vienna");

  try {
    // Timeout auf 3s damit Reservierung-Page nie haengt
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url.toString(), {
      next: { revalidate: 1800 }, // 30min Cache
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json() as {
      hourly: { time: string[]; temperature_2m: number[]; precipitation: number[]; weather_code: number[] };
    };
    const slots: WeatherSlot[] = [];
    for (let i = 0; i < data.hourly.time.length; i++) {
      slots.push({
        iso: new Date(data.hourly.time[i]).toISOString(),
        tempC: data.hourly.temperature_2m[i],
        precipMm: data.hourly.precipitation[i],
        code: data.hourly.weather_code[i],
      });
    }
    return slots;
  } catch {
    return [];
  }
}

// Map weather_code (WMO) auf Emoji
export function weatherEmoji(code: number, precipMm = 0): string {
  if (precipMm > 5) return "🌧️";
  if (precipMm > 0.5) return "🌦️";
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "";
}
