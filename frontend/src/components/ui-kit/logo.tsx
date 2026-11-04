import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Logo PRAKTIK-AI — tvář rysa, zjednodušená z maskota
 * (`components/layout/LynxMascot.tsx`, viz `lynx-mascot.md`).
 *
 * Značka musí držet i v 24 px, proto oproti maskotovi zůstává jen to, podle
 * čeho se rys pozná: silueta s ušima a třemi ostrými chomáči na lících,
 * černé špičky uší, krémový čenich, velké kulaté brýle, nos a úsměv. Vousky,
 * puntíky (kromě kapky na čele), obočí a plaménky v uších jsou pryč a tahy
 * jsou proti maskotovi zhruba třikrát silnější.
 *
 * Barvy jsou pevné značkové hexy z maskota, ne tokeny — logo se v tmavém
 * režimu nepřebarvuje. Přebarvuje se jen wordmark (`currentColor`).
 */

const FUR = "#E9B860"
const FUR_LINE = "#8A5524"
const SPOT = "#C98B3C"
const CREAM = "#FBEBC8"
const INK = "#2A1A10"
const EAR_INNER = "#D9A08A"
const EYE_WHITE = "#F6ECD6"
const IRIS = "#2E1C10"
const NOSE = "#D4907A"
const NOSE_LINE = "#5A3415"
const MOUTH = "#3D2310"
/** Podklad ikony = tmavá plocha hero karty. */
const TILE = "#0D2F31"

/** Silueta hlavy 1:1 z maskota — uši, tři chomáče na každé líci, zlatá brada. */
const HEAD =
  "M180 89 C194 89 205 91 214.5 95 C232 80 250 60 264 47 C276 62 278 92 270 120 C266 130 265 140 267 148 Q271 162 272 172 Q276 180 282 190 Q277 188 272 187 Q277 201 277 213 Q272 210 266 207 Q265 221 257 233 Q254 228 248 225 C244 238 224 247 208 248 C201 255 191 259 180 259 C169 259 159 255 152 248 C136 247 116 238 112 225 Q106 228 103 233 Q95 221 94 207 Q88 210 83 213 Q83 201 88 187 Q83 188 78 190 Q84 180 88 172 Q89 162 93 148 C95 140 94 130 90 120 C82 92 84 62 96 47 C110 60 128 80 145.5 95 C155 91 166 89 180 89 Z"

/** Krémová spodní část tváře — v logu s hladkou horní hranou místo zubaté srsti. */
const CREAM_FACE =
  "M180 186 C192 186 200 194 218 196 C238 198 256 192 266 207 Q265 221 257 233 Q254 228 248 225 C244 238 224 247 208 248 Q203 242 202 230 C196 237 189 240 180 240 C171 240 164 237 158 230 Q157 242 152 248 C136 247 116 238 112 225 Q106 228 103 233 Q95 221 94 207 C104 192 122 198 142 196 C160 194 168 186 180 186 Z"

const round = { strokeLinejoin: "round", strokeLinecap: "round" } as const

/** Samotná kresba tváře v souřadnicích maskota (obsah zhruba x 64–296, y 4–262). */
function LynxFace() {
  return (
    <>
      <path d={HEAD} fill={FUR} />
      <path d="M90 76 L97 124 L130 103 Z M270 76 L263 124 L230 103 Z" fill={EAR_INNER} />
      <path d={CREAM_FACE} fill={CREAM} />
      <path d="M174 100 Q180 96 186 100 Q184 112 180 122 Q176 112 174 100 Z" fill={SPOT} />

      {/* Obrys siluety až nad krémovou, ať ho nepřekryje. */}
      <path d={HEAD} stroke={FUR_LINE} strokeWidth={8} {...round} />

      {/* Černé špičky uší a chomáče */}
      <g fill={INK}>
        <path d="M96 47 C89 56 86 68 85.6 80 Q101 71 115.4 66 C109 59 103 53 96 47 Z" />
        <path d="M90 52 C85 34 80 18 73.5 6.5 C86 18 96 32 102 48 Z" />
        <path d="M96 47 C93 36 90 26 87 17 C97 26 102 36 104 50 Z" />
        <path d="M264 47 C271 56 274 68 274.4 80 Q259 71 244.6 66 C251 59 257 53 264 47 Z" />
        <path d="M270 52 C275 34 280 18 286.5 6.5 C274 18 264 32 258 48 Z" />
        <path d="M264 47 C267 36 270 26 273 17 C263 26 258 36 256 50 Z" />
      </g>

      {/* Brýle s očima — nejčitelnější prvek značky, proto větší než u maskota. */}
      <circle cx="138.5" cy="163" r="29" fill={EYE_WHITE} />
      <circle cx="221.5" cy="163" r="29" fill={EYE_WHITE} />
      <circle cx="144" cy="165" r="11" fill={IRIS} />
      <circle cx="216" cy="165" r="11" fill={IRIS} />
      <circle cx="140.5" cy="160.5" r="3.6" fill="#fff" />
      <circle cx="212.5" cy="160.5" r="3.6" fill="#fff" />
      <g stroke={INK} {...round}>
        <circle cx="138.5" cy="163" r="29" strokeWidth={9} />
        <circle cx="221.5" cy="163" r="29" strokeWidth={9} />
        <path d="M167.5 161 Q180 155 192.5 161" strokeWidth={8} />
        <path d="M109.5 156 L92 150 M250.5 156 L268 150" strokeWidth={7} />
      </g>

      <path
        d="M165 192 C164 187 168 186 172 186.5 C176 187 184 187 188 186.5 C192 186 196 187 195 192 C194 197 186 202 180 204 C174 202 166 197 165 192 Z"
        fill={NOSE}
        stroke={NOSE_LINE}
        strokeWidth={3}
        {...round}
      />
      <path
        d="M180 204 L180 210 M150 207 C153 213 159 217 166 217 C173 217 178 214 180 210 C182 214 187 217 194 217 C201 217 207 213 210 207"
        stroke={MOUTH}
        strokeWidth={5}
        {...round}
      />
    </>
  )
}

type LogoMarkProps = Omit<React.SVGProps<SVGSVGElement>, "children"> & {
  /** Ikona na tmavé zaoblené dlaždici (favicon, app ikona, avatar). */
  tile?: boolean
  /** Přístupný název. Bez něj je značka dekorace (`aria-hidden`) — typicky vedle wordmarku. */
  title?: string
}

/** Samotná značka — čtvercová tvář rysa, volitelně na dlaždici. */
function LogoMark({ tile = false, title, className, ...props }: LogoMarkProps) {
  const a11y = title
    ? { role: "img" as const, "aria-label": title }
    : { "aria-hidden": true as const }

  return (
    <svg
      data-slot="logo-mark"
      viewBox="46 0 268 268"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      className={cn("size-10 shrink-0", className)}
      {...a11y}
      {...props}
    >
      {title && <title>{title}</title>}
      {tile ? (
        <>
          <rect x="46" y="0" width="268" height="268" rx="64" fill={TILE} />
          {/* Na dlaždici se tvář zmenší, aby chomáče uší nenarazily na hranu. */}
          <g transform="translate(180 140) scale(0.78) translate(-180 -132)">
            <LynxFace />
          </g>
        </>
      ) : (
        <LynxFace />
      )}
    </svg>
  )
}

const LOGO_SIZES = {
  sm: { mark: "size-8", text: "text-base" },
  default: { mark: "size-10", text: "text-lg" },
  lg: { mark: "size-14", text: "text-2xl" },
} as const

/**
 * Značka + wordmark „PRAKTIK-AI". Wordmark bere `currentColor`, takže na
 * tmavém podkladu stačí `text-white`.
 */
function Logo({
  size = "default",
  tile = false,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  size?: keyof typeof LOGO_SIZES
  tile?: boolean
}) {
  const s = LOGO_SIZES[size]
  return (
    <span
      data-slot="logo"
      className={cn("inline-flex items-center gap-2.5", className)}
      {...props}
    >
      <LogoMark tile={tile} className={s.mark} />
      <span className={cn("font-bold tracking-[-0.01em] whitespace-nowrap", s.text)}>
        PRAKTIK-AI
      </span>
    </span>
  )
}

export { Logo, LogoMark }
