import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Covery pro karty modulů.
 *
 * Stejný jazyk jako horní plocha onboardingu: světle tónovaná plocha, dva
 * dekorativní kruhy a uprostřed blob v plné barvě tónu. V blobu ale místo
 * ikony sedí malé schéma — graf funkce, sloupce, síť, větve — podle kterého
 * se modul pozná na první pohled.
 *
 * Proč SVG a ne bitmapa: váží pár kB, škáluje se celé najednou (blob roste
 * s kartou) a barvy berou přímo z tokenů v `globals.css`, takže se v tmavém
 * režimu přebarví samy.
 *
 * Tón nese téma: příbuzné kurzy sdílí barvu, jiný obor dostane jinou.
 * Zavedeno — matematika a exaktní obory `purple`, AI a data `green`,
 * vývoj a nástroje `blue`. `rose` a `orange` zbývají na další rodiny.
 *
 * Nový motiv kresli do <CoverFrame> jako schéma v mřížce ±32 kolem středu
 * blobu, stejnými tahy — návod je v `module-covers.md`.
 */

/** Poměr sedí s <CardImage> (590×226 z Figmy), takže cover nikde neuskočí. */
const WIDTH = 590
const HEIGHT = 226

/**
 * Tóny coverů. Každý jen nastaví `--cover-tone`, ze kterého berou barvu
 * plocha, kruhy i blob — stejné tokeny jako tóny onboardingu.
 */
const COVER_TONES = {
  purple: "[--cover-tone:var(--gradient-r)]",
  rose: "[--cover-tone:var(--gradient-l)]",
  green: "[--cover-tone:var(--primary)]",
  blue: "[--cover-tone:var(--tip)]",
  orange: "[--cover-tone:var(--brand-accent)]",
} as const

type CoverTone = keyof typeof COVER_TONES

const DEFAULT_TONE: CoverTone = "purple"

/** Hrana čtverce, do kterého je blob vepsaný — ~76 % výšky plátna. */
const BLOB_SIZE = 172

/**
 * Poloměry rohů blobu v podílech hrany, [vodorovný, svislý] v pořadí
 * TL, TR, BR, BL. Přepis `rounded-[62%_38%_51%_49%/44%_58%_42%_56%]`
 * z OnboardingIcon, ať má cover stejný tvar jako dlaždice v onboardingu.
 */
const BLOB_RADII = {
  tl: [0.62, 0.44],
  tr: [0.38, 0.58],
  br: [0.51, 0.42],
  bl: [0.49, 0.56],
} as const

/** Obrys blobu se středem v počátku — čtyři eliptické oblouky po směru hodin. */
function blobPath(size: number) {
  const h = size / 2
  const n = (v: number) => Math.round(v * 100) / 100
  const { tl, tr, br, bl } = BLOB_RADII
  const arc = (rx: number, ry: number, x: number, y: number) =>
    `A${n(rx * size)} ${n(ry * size)} 0 0 1 ${n(x)} ${n(y)}`

  return [
    `M${n(tl[0] * size - h)} ${-h}`,
    arc(tr[0], tr[1], h, tr[1] * size - h),
    arc(br[0], br[1], bl[0] * size - h, h),
    arc(bl[0], bl[1], -h, tl[1] * size - h),
    arc(tl[0], tl[1], tl[0] * size - h, -h),
    "Z",
  ].join("")
}

const BLOB_PATH = blobPath(BLOB_SIZE)

const STROKE = "#fff"
const STROKE_SOFT = "rgba(255,255,255,0.55)"

/**
 * Síla tahů schématu v blobu. Kresba je drobná, takže tahy jsou tučné jako
 * u ikon — při šířce karty ~350 px musí pořád držet.
 */
const W_MAIN = 5
const W_SOFT = 3.5

/** Poloměr uzlu / commitu. */
const NODE_R = 6

/**
 * Schéma se kreslí v mřížce ±32 kolem středu blobu (jako ikona 64×64)
 * a do blobu se jen zvětší, aby zabralo ~54 % jeho hrany — tahy rostou
 * s ním, takže změna BLOB_SIZE nic nerozbije.
 */
const GLYPH_SCALE = (BLOB_SIZE * 0.54) / 64

type CoverProps = Omit<React.ComponentProps<"svg">, "viewBox" | "children"> & {
  tone?: CoverTone
}

/**
 * Plocha série: podklad karty + 12 % tónu, měkký kruh vlevo dole, obrys
 * vpravo nahoře a blob se stínem. `children` je schéma v souřadnicích
 * kolem středu blobu (počátek = střed, y roste dolů).
 */
function CoverFrame({
  tone = DEFAULT_TONE,
  className,
  children,
  ...props
}: CoverProps & { children: React.ReactNode }) {
  // useId vrací i znaky, které v `url(#…)` nefungují — nechat jen bezpečné.
  const shadowId = `cover-shadow-${React.useId().replace(/[^\w-]/g, "")}`

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden
      className={cn("block h-full w-full", COVER_TONES[tone], className)}
      {...props}
    >
      <defs>
        {/* shadow-md z OnboardingIcon, přepočítaný na velikost blobu */}
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* plocha — 12 % tónu přes podklad karty, ať neprosvítá bg-muted */}
      <rect width={WIDTH} height={HEIGHT} className="fill-card" />
      <rect
        width={WIDTH}
        height={HEIGHT}
        className="fill-(--cover-tone)"
        fillOpacity={0.12}
      />

      {/* dekorativní kruhy, rozmístěné jako v OnboardingMedia */}
      <circle
        cx="81"
        cy="194"
        r="145"
        className="fill-(--cover-tone)"
        fillOpacity={0.12}
      />
      <circle
        cx="509"
        cy="65"
        r="161"
        fill="none"
        className="stroke-(--cover-tone)"
        strokeOpacity={0.25}
        strokeWidth={3}
      />

      <g transform={`translate(${WIDTH / 2} ${HEIGHT / 2})`}>
        <path
          d={BLOB_PATH}
          className="fill-(--cover-tone)"
          filter={`url(#${shadowId})`}
        />
        <g
          transform={`scale(${GLYPH_SCALE})`}
          fill="none"
          stroke={STROKE}
          strokeWidth={W_MAIN}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {children}
        </g>
      </g>
    </svg>
  )
}

/**
 * Uzel / commit. Běžný má výplň v barvě blobu, aby pod ním neprosvítala
 * linka; zvýrazněný (`lit`) je plně bílý.
 */
function CoverNode({
  x,
  y,
  r = NODE_R,
  lit = false,
}: {
  x: number
  y: number
  r?: number
  lit?: boolean
}) {
  return lit ? (
    <circle cx={x} cy={y} r={r} fill={STROKE} />
  ) : (
    <circle cx={x} cy={y} r={r} className="fill-(--cover-tone)" />
  )
}

/**
 * Matematika — graf funkce v soustavě souřadnic s odečtem jednoho bodu.
 */
function MathCover(props: CoverProps) {
  return (
    <CoverFrame {...props}>
      {/* osy */}
      <path d="M-30 -32V28H34" stroke={STROKE_SOFT} strokeWidth={W_SOFT} />
      {/* odečet bodu na osy */}
      <path
        d="M4 -6V28M4 -6H-30"
        stroke={STROKE_SOFT}
        strokeWidth={W_SOFT}
        strokeDasharray="1 7"
      />
      {/* křivka */}
      <path d="M-22 20C-8 20-2 8 4-6S18-28 32-30" />
      <CoverNode x={4} y={-6} lit />
    </CoverFrame>
  )
}

/** Sloupce grafu — střed na ose x a výška vršku nad základnou. */
const STATS_BASE_Y = 28
const STATS_BARS = [
  { x: -24, top: 6 },
  { x: -8, top: -10 },
  { x: 8, top: 0 },
  { x: 24, top: -28 },
]
const STATS_BAR_W = 11

/**
 * Statistika a data — sloupcový graf, nejvyšší sloupec zvýrazněný.
 */
function StatsCover(props: CoverProps) {
  const peak = Math.min(...STATS_BARS.map((bar) => bar.top))

  return (
    <CoverFrame {...props}>
      <g stroke="none">
        {STATS_BARS.map((bar) => (
          <rect
            key={bar.x}
            x={bar.x - STATS_BAR_W / 2}
            y={bar.top}
            width={STATS_BAR_W}
            height={STATS_BASE_Y - bar.top}
            rx="3"
            fill={bar.top === peak ? STROKE : STROKE_SOFT}
          />
        ))}
      </g>
      {/* základna */}
      <path d={`M-34 ${STATS_BASE_Y + 5}H34`} />
    </CoverFrame>
  )
}

/** Vrstvy neuronové sítě — souřadnice, ze kterých se poskládají hrany i uzly. */
const NET_LAYERS: { x: number; ys: number[] }[] = [
  { x: -28, ys: [-16, 16] },
  { x: 0, ys: [-26, 0, 26] },
  { x: 28, ys: [-13, 13] },
]

/** Index uzlu v každé vrstvě, kterým vede rozsvícená aktivace. */
const NET_PATH = [0, 1, 1]

/**
 * AI / strojové učení — neuronová síť s jednou prosvícenou cestou.
 */
function AiCover(props: CoverProps) {
  const edges = NET_LAYERS.slice(0, -1).flatMap((layer, i) =>
    layer.ys.flatMap((y1, j) =>
      NET_LAYERS[i + 1].ys.map((y2, k) => ({
        key: `${i}-${y1}-${y2}`,
        x1: layer.x,
        y1,
        x2: NET_LAYERS[i + 1].x,
        y2,
        lit: j === NET_PATH[i] && k === NET_PATH[i + 1],
      }))
    )
  )

  return (
    <CoverFrame {...props}>
      {/* tlumené hrany vespod, prosvícená cesta navrch */}
      {[...edges]
        .sort((a, b) => Number(a.lit) - Number(b.lit))
        .map((edge) => (
          <line
            key={edge.key}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke={edge.lit ? STROKE : STROKE_SOFT}
            strokeWidth={edge.lit ? W_MAIN : W_SOFT - 1}
          />
        ))}
      <g strokeWidth={W_SOFT}>
        {NET_LAYERS.map((layer, i) =>
          layer.ys.map((y, j) => (
            <CoverNode
              key={`${layer.x}-${y}`}
              x={layer.x}
              y={y}
              lit={j === NET_PATH[i]}
            />
          ))
        )}
      </g>
    </CoverFrame>
  )
}

/** Dvě dráhy grafu větví — hlavní dole, odbočka nahoře. */
const GIT_MAIN_Y = 16
const GIT_BRANCH_Y = -14
/** Commit, ze kterého odbočka vychází, a commit, do kterého se merguje. */
const GIT_FORK_X = -30
const GIT_MERGE_X = 30

/**
 * Git a verzování — graf větví: odbočka odejde esíčkem z hlavní větve,
 * má vlastní commit a vrátí se mergem (zvýrazněný). Pod ní běží commit
 * na hlavní větvi, ať je vidět souběžná práce.
 */
function GitCover(props: CoverProps) {
  const [main, branch] = [GIT_MAIN_Y, GIT_BRANCH_Y]

  return (
    <CoverFrame {...props}>
      <path d={`M-38 ${main}H38`} stroke={STROKE_SOFT} />
      {/* odbočka a merge zpět — esíčka s vodorovnými tečnami */}
      <path
        d={`M${GIT_FORK_X} ${main}C-18 ${main} -22 ${branch} -10 ${branch}H10C22 ${branch} 18 ${main} ${GIT_MERGE_X} ${main}`}
      />
      <g strokeWidth={W_SOFT}>
        <CoverNode x={GIT_FORK_X} y={main} />
        <CoverNode x={0} y={main} />
        <CoverNode x={0} y={branch} />
        <CoverNode x={GIT_MERGE_X} y={main} lit />
      </g>
    </CoverFrame>
  )
}

/**
 * Jiskra — čtyřcípá hvězda se středem `(cx, cy)`, poloměrem `r` a pasem
 * `0.29 × r`.
 */
function sparklePath(cx: number, cy: number, r: number) {
  const k = Math.round(r * 0.29 * 100) / 100
  return (
    `M${cx} ${cy - r}L${cx + k} ${cy - k}L${cx + r} ${cy}L${cx + k} ${cy + k}` +
    `L${cx} ${cy + r}L${cx - k} ${cy + k}L${cx - r} ${cy}L${cx - k} ${cy - k}Z`
  )
}

/**
 * Prompt engineering / práce s AI — bublina s promptem a jiskra odpovědi.
 */
function PromptCover(props: CoverProps) {
  return (
    <CoverFrame {...props}>
      {/* bublina s ocáskem vlevo dole */}
      <path d="M-24 -20H14A10 10 0 0 1 24 -10V10A10 10 0 0 1 14 20H-6L-18 31V20H-24A10 10 0 0 1 -34 10V-10A10 10 0 0 1 -24 -20Z" />
      {/* řádky promptu */}
      <path d="M-22 -4H12" stroke={STROKE_SOFT} strokeWidth={W_SOFT} />
      <path d="M-22 7H0" stroke={STROKE_SOFT} strokeWidth={W_SOFT} />
      {/* odpověď */}
      <path
        d={sparklePath(30, -26, 12)}
        fill={STROKE}
        strokeWidth={W_SOFT - 1.5}
      />
    </CoverFrame>
  )
}

export {
  AiCover,
  GitCover,
  MathCover,
  PromptCover,
  StatsCover,
  COVER_TONES,
  type CoverTone,
}
