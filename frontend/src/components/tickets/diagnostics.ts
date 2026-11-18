// Technické informace k tiketu (prohlížeč, rozlišení apod.), které pomůžou podpoře s chybou.
// Backend na ně nemá pole, proto se přidávají na konec první zprávy za MARKER
// a při zobrazení se z textu zase oddělí (splitDiagnostics).

const MARKER = "—— Technické informace ——";

const BROWSERS: [RegExp, string][] = [
  [/Edg\/(\d+)/, "Edge"],
  [/OPR\/(\d+)/, "Opera"],
  [/SamsungBrowser\/(\d+)/, "Samsung Internet"],
  [/Firefox\/(\d+)/, "Firefox"],
  [/Chrome\/(\d+)/, "Chrome"],
  [/Version\/(\d+).*Safari/, "Safari"],
];

function browserName(ua: string): string {
  for (const [pattern, name] of BROWSERS) {
    const match = ua.match(pattern);
    if (match) return `${name} ${match[1]}`;
  }
  return "neznámý";
}

function systemName(ua: string, touchPoints: number): string {
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Windows/.test(ua)) return "Windows";
  const android = ua.match(/Android (\d+(?:\.\d+)?)/);
  if (android) return `Android ${android[1]}`;
  const ios = ua.match(/(?:iPhone|iPad|iPod).* OS (\d+)[_.](\d+)/);
  if (ios) return `iOS ${ios[1]}.${ios[2]}`;
  // iPadOS 13+ se hlásí jako Mac, prozradí ho dotyk.
  if (/Mac OS X/.test(ua)) return touchPoints > 1 ? "iPadOS" : "macOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "neznámý";
}

// Řádky "Popisek: hodnota" pro aktuální prohlížeč; na serveru prázdné.
export function collectDiagnostics(): string[] {
  if (typeof window === "undefined") return [];
  const nav = window.navigator;
  const ua = nav.userAgent;
  const scale = Math.round(window.devicePixelRatio * 100) / 100;
  const connection = (nav as Navigator & { connection?: { effectiveType?: string } }).connection;

  const lines = [
    `Prohlížeč: ${browserName(ua)}`,
    `Systém: ${systemName(ua, nav.maxTouchPoints)}`,
    `Obrazovka: ${window.screen.width}×${window.screen.height} (měřítko ${scale})`,
    `Okno prohlížeče: ${window.innerWidth}×${window.innerHeight}`,
    `Dotykové ovládání: ${nav.maxTouchPoints > 0 ? "ano" : "ne"}`,
    `Jazyk: ${nav.language}`,
    `Časové pásmo: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    `Stránka: ${window.location.pathname}${window.location.search}`,
  ];
  if (connection?.effectiveType) lines.push(`Připojení: ${connection.effectiveType}`);
  lines.push(`User agent: ${ua}`);
  return lines;
}

export function appendDiagnostics(text: string, lines: string[]): string {
  return lines.length > 0 ? `${text}\n\n${MARKER}\n${lines.join("\n")}` : text;
}

// Oddělí přiložené technické informace od textu zprávy.
export function splitDiagnostics(body: string): { text: string; details: string[] } {
  const index = body.lastIndexOf(MARKER);
  if (index === -1) return { text: body, details: [] };
  return {
    text: body.slice(0, index).trimEnd(),
    details: body
      .slice(index + MARKER.length)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  };
}
