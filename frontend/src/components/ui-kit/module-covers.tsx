import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Ručně kreslené covery pro karty modulů.
 *
 * Proč SVG a ne bitmapa: váží pár kB, jsou ostré v jakékoli šířce a barvy
 * berou přímo z tokenů v `globals.css`, takže se v tmavém režimu přebarví
 * samy a cover nikdy nevypadá jako cizí obrázek nalepený na kartu.
 *
 * Recept série je plochý, ne gradientový: jedna plná značková barva, bílá
 * linková kresba a jeden teplý akcent. Nový motiv kresli dovnitř
 * <CoverFrame> stejnými tahy, ať to zůstane jedna rodina.
 *
 * Tón nese téma: příbuzné kurzy sdílí podklad, jiný obor dostane jiný.
 * Zavedeno — matematika a exaktní obory `purple`, AI a data `green`,
 * vývoj a nástroje `blue`. `rose` a `orange` zbývají na další rodiny.
 */

/** Poměr sedí s <CardImage> (590×226 z Figmy), takže cover nikde neuskočí. */
const VIEW_BOX = "0 0 590 226"

const STROKE = "rgba(255,255,255,0.92)"
const STROKE_SOFT = "rgba(255,255,255,0.5)"

/** Síla tahů. Kresba je záměrně tučná, aby držela i v šířce karty. */
const W_MAIN = 3.5
const W_SOFT = 2.25
const W_ACCENT = 4.5

/**
 * Barevné tóny coverů. Podklad i akcent jdou přes Tailwind třídy nad tokeny
 * (`--gradient-r`, `--primary`, …) — žádné natvrdo zapsané hexy. Akcent se
 * v kresbě bere jako `currentColor`, proto je to `text-*`.
 */
const COVER_TONES = {
  purple: { bg: "fill-gradient-r", accent: "text-brand-accent" },
  rose: { bg: "fill-gradient-l", accent: "text-warning" },
  green: { bg: "fill-primary", accent: "text-warning" },
  blue: { bg: "fill-tip", accent: "text-brand-accent" },
  orange: { bg: "fill-brand-accent", accent: "text-tip" },
} as const

type CoverTone = keyof typeof COVER_TONES

const DEFAULT_TONE: CoverTone = "purple"

/**
 * Třídy tónu. Motivy si sahají po `bg` i mimo podklad — uzly a commity se jím
 * vyplňují, aby byly neprůhledné a linka pod nimi neprosvítala.
 */
function coverTone(tone: CoverTone = DEFAULT_TONE) {
  return COVER_TONES[tone]
}

type CoverProps = Omit<React.ComponentProps<"svg">, "viewBox" | "children"> & {
  tone?: CoverTone
}

/** Plochý podklad série. Akcent visí na `color`, kresba si ho bere přes currentColor. */
function CoverFrame({
  tone,
  className,
  children,
  ...props
}: CoverProps & { children: React.ReactNode }) {
  const { bg, accent } = coverTone(tone)

  return (
    <svg
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden
      className={cn("block h-full w-full", accent, className)}
      {...props}
    >
      <rect width="590" height="226" className={bg} />
      {children}
    </svg>
  )
}

/** Drobné odlesky, které vyplní prázdná místa kompozice. */
function CoverDust({ points }: { points: [number, number, number][] }) {
  return (
    <g fill="#fff" fillOpacity="0.35">
      {points.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
      ))}
    </g>
  )
}

/**
 * Matematika — kruh s vepsaným trojúhelníkem, symboly a graf funkce
 * s odečtem na osách.
 */
function MathCover(props: CoverProps) {
  return (
    <CoverFrame {...props}>
      <g
        fill="none"
        stroke={STROKE}
        strokeWidth={W_MAIN}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* geometrie */}
        <circle cx="132" cy="112" r="52" />
        <path d="M132 60 176 138H88Z" />
        <path
          d="M132 112h52"
          stroke={STROKE_SOFT}
          strokeWidth={W_SOFT}
          strokeDasharray="6 8"
        />

        {/* soustava souřadnic */}
        <path d="M330 40v148h216" />
        <path d="M323 53l7-13 7 13M533 181l13 7-13 7" />
        <g stroke={STROKE_SOFT} strokeWidth={W_SOFT}>
          <path d="M368 183v10M406 183v10M444 183v10M482 183v10M520 183v10" />
          <path d="M325 152h10M325 116h10M325 80h10" />
        </g>

        {/* graf funkce s vyznačeným bodem */}
        <path
          d="M344 176c34 0 58-14 76-40s34-64 76-84"
          stroke="currentColor"
          strokeWidth={W_ACCENT}
        />
        <path
          d="M420 136v52M420 136h-90"
          stroke={STROKE_SOFT}
          strokeWidth={W_SOFT}
          strokeDasharray="5 7"
        />
      </g>

      {/* body na křivce */}
      <g fill="currentColor" stroke={STROKE} strokeWidth={W_MAIN}>
        <circle cx="420" cy="136" r="7" />
        <circle cx="496" cy="52" r="7" />
      </g>

      {/* symboly */}
      <g
        fill="rgba(255,255,255,0.7)"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
      >
        <text x="206" y="96" fontSize="46">
          π
        </text>
        <text x="196" y="168" fontSize="30">
          √x
        </text>
        <text x="248" y="172" fontSize="34">
          ∑
        </text>
      </g>

      <CoverDust
        points={[
          [58, 52, 3],
          [286, 60, 2.5],
          [180, 198, 2.5],
          [566, 128, 3],
          [64, 180, 2],
        ]}
      />
    </CoverFrame>
  )
}

/** Vrstvy neuronové sítě — souřadnice, ze kterých se poskládají hrany i uzly. */
const NET_LAYERS: { x: number; ys: number[] }[] = [
  { x: 322, ys: [70, 118, 166] },
  { x: 424, ys: [48, 96, 144, 192] },
  { x: 526, ys: [82, 130] },
]

/** Index uzlu v každé vrstvě, kterým vede rozsvícená (akcentová) aktivace. */
const NET_PATH = [1, 2, 1]

/**
 * AI / strojové učení — čip, prompt jako tři řádky a neuronová síť
 * s jednou prosvícenou cestou.
 */
function AiCover(props: CoverProps) {
  const { bg } = coverTone(props.tone)
  const edges = NET_LAYERS.slice(0, -1).flatMap((layer, i) =>
    layer.ys.flatMap((y1) =>
      NET_LAYERS[i + 1].ys.map((y2) => ({
        key: `${i}-${y1}-${y2}`,
        x1: layer.x,
        y1,
        x2: NET_LAYERS[i + 1].x,
        y2,
        lit:
          y1 === layer.ys[NET_PATH[i]] &&
          y2 === NET_LAYERS[i + 1].ys[NET_PATH[i + 1]],
      }))
    )
  )

  return (
    <CoverFrame {...props}>
      <g
        fill="none"
        stroke={STROKE}
        strokeWidth={W_MAIN}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* čip */}
        <rect x="62" y="64" width="108" height="108" rx="20" />
        <rect
          x="88"
          y="90"
          width="56"
          height="56"
          rx="12"
          stroke={STROKE_SOFT}
          strokeWidth={W_SOFT}
        />
        <g stroke={STROKE_SOFT} strokeWidth={W_SOFT}>
          <path d="M88 64V48M116 64V48M144 64V48M88 172v16M116 172v16M144 172v16" />
          <path d="M62 90H46M62 118H46M62 146H46M170 90h16M170 118h16M170 146h16" />
        </g>
        {/* mini-síť uvnitř čipu, echo velké sítě vpravo */}
        <path d="M104 106h24M104 106l12 24M128 106l-12 24" strokeWidth={W_SOFT} />
        <g fill={STROKE} stroke="none">
          <circle cx="104" cy="106" r="4" />
          <circle cx="128" cy="106" r="4" />
          <circle cx="116" cy="130" r="4" />
        </g>

        {/* prompt → síť */}
        <g stroke={STROKE_SOFT} strokeWidth={W_SOFT}>
          <rect x="206" y="76" width="76" height="15" rx="7.5" />
          <rect x="206" y="104" width="56" height="15" rx="7.5" />
          <rect x="206" y="132" width="68" height="15" rx="7.5" />
        </g>
        <path
          d="M288 111h20M301 104l8 7-8 7"
          stroke="currentColor"
          strokeWidth={W_MAIN}
        />
      </g>

      {/* hrany sítě */}
      <g strokeLinecap="round">
        {edges.map((edge) => (
          <line
            key={edge.key}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke={edge.lit ? "currentColor" : STROKE_SOFT}
            strokeWidth={edge.lit ? W_ACCENT : 1.75}
          />
        ))}
      </g>

      {/* uzly */}
      <g stroke={STROKE} strokeWidth={W_MAIN}>
        {NET_LAYERS.map((layer, i) =>
          layer.ys.map((y, j) =>
            j === NET_PATH[i] ? (
              <circle
                key={`${layer.x}-${y}`}
                cx={layer.x}
                cy={y}
                r="10"
                fill="currentColor"
              />
            ) : (
              <circle
                key={`${layer.x}-${y}`}
                cx={layer.x}
                cy={y}
                r="10"
                className={bg}
              />
            )
          )
        )}
      </g>

      {/* jiskra */}
      <path
        d="M188 42l6 14.5L208 63l-14 6.5L188 84l-6-14.5L168 63l14-6.5z"
        fill="currentColor"
      />

      <CoverDust
        points={[
          [44, 40, 3],
          [232, 188, 2.5],
          [300, 44, 2.5],
          [560, 186, 3],
          [566, 44, 2],
        ]}
      />
    </CoverFrame>
  )
}

/** Commity na hlavní větvi — pozice na ose x, y drží GIT_MAIN_Y. */
const GIT_MAIN_Y = 158
const GIT_MAIN_COMMITS = [84, 176, 300, 428, 520]
/** Commit, do kterého se odbočka merguje — musí sedět s koncem cesty níž. */
const GIT_MERGE_X = 428
/** Commity na odbočené větvi. */
const GIT_BRANCH_Y = 74
const GIT_BRANCH_COMMITS = [286, 358]

/**
 * Git a verzování — graf větví: hlavní linka s commity, odbočka, která se
 * merguje zpátky (akcentem), a jedna nedotažená větev.
 */
function GitCover(props: CoverProps) {
  const { bg } = coverTone(props.tone)

  return (
    <CoverFrame {...props}>
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={W_MAIN}
      >
        {/* hlavní větev */}
        <path d="M50 158h496" stroke={STROKE} />

        {/* nedotažená větev dolů */}
        <path
          d="M300 158q40 0 40 40h72"
          stroke={STROKE_SOFT}
          strokeWidth={W_SOFT}
          strokeDasharray="10 9"
        />

        {/* odbočka a merge zpět do hlavní větve (končí v GIT_MERGE_X) */}
        <path
          d="M176 158q40 0 40-42t40-42h132q40 0 40 42v42"
          stroke="currentColor"
          strokeWidth={W_ACCENT}
        />
      </g>

      {/* commity */}
      <g stroke={STROKE} strokeWidth={W_MAIN}>
        {GIT_MAIN_COMMITS.map((x) =>
          x === GIT_MERGE_X ? (
            <circle key={x} cx={x} cy={GIT_MAIN_Y} r="11" fill="currentColor" />
          ) : (
            <circle key={x} cx={x} cy={GIT_MAIN_Y} r="11" className={bg} />
          )
        )}
        {GIT_BRANCH_COMMITS.map((x) => (
          <circle key={x} cx={x} cy={GIT_BRANCH_Y} r="11" fill="currentColor" />
        ))}
        <circle
          cx="412"
          cy="198"
          r="8"
          className={bg}
          stroke={STROKE_SOFT}
          strokeWidth={W_SOFT}
        />
      </g>

      {/* štítek nad odbočkou */}
      <g
        fill="none"
        stroke={STROKE_SOFT}
        strokeWidth={W_SOFT}
        strokeLinejoin="round"
      >
        <path d="M262 22h68l18 18-18 18h-68z" />
      </g>
      <g fill="rgba(255,255,255,0.7)">
        <circle cx="282" cy="40" r="4" />
        <circle cx="300" cy="40" r="4" />
        <circle cx="318" cy="40" r="4" />
      </g>

      <CoverDust
        points={[
          [60, 60, 3],
          [140, 96, 2.5],
          [500, 96, 2.5],
          [548, 40, 3],
          [88, 204, 2],
        ]}
      />
    </CoverFrame>
  )
}

export { AiCover, GitCover, MathCover, COVER_TONES, type CoverTone }
