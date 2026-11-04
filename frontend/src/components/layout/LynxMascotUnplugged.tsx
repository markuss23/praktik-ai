import type { SVGProps } from 'react';

// Obrysy jsou vždy tmavší odstín výplně, ne jedna černá — měkčí,
// „kreslený" rukopis maskota.
const FUR = '#E9B860';
const FUR_LINE = '#8A5524';
const SPOT = '#C98B3C';
const CREAM = '#FBEBC8';
const INK = '#2A1A10';
const EAR_INNER = '#D9A08A';

const BERRY = '#B1475C';
const BERRY_DARK = '#9A3B50';
const BERRY_LINE = '#78293B';
const ORANGE = '#F87B1B';
const ORANGE_LINE = '#C4570A';
const SHIRT = '#FFFDF7';
const SHIRT_LINE = '#C9B48A';
// Rekvizita (kabel) smí brandovou zelenou.
const GREEN = '#59AC77';
const GREEN_LINE = '#468F61';

const stroke = (color: string, width = 2.6) =>
  ({
    stroke: color,
    strokeWidth: width,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  }) as const;

const fur = stroke(FUR_LINE);

/**
 * Maskot PraktikAI v póze „vytažený kabel" — stránka chyby serveru. Hlava
 * a tělo jsou 1:1 z LynxMascot (viz lynx-mascot.md), navíc výraz „ups"
 * s otevřenou pusou; paže drží vidlici a zásuvku, mezi nimi jiskra.
 *
 * Čistě dekorativní, proto `aria-hidden`. Mrkání (`.lynx-blink`) a švihání
 * ocasem (`.lynx-tail`) jsou CSS animace v `globals.css`.
 */
export function LynxMascotUnplugged(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 360 560"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
      overflow="visible"
      {...props}
    >
      {/* Stín pod nohama */}
      <ellipse cx="182" cy="533" rx="98" ry="8" fill="#000" opacity="0.14" />

      {/* Ocas s černou špičkou — švihá kolem kořene */}
      <g className="lynx-tail">
        <path
          d="M224 470 C252 486 300 482 326 462 C342 450 352 432 348 418 C346 406 332 404 326 414 C318 432 300 448 276 452 C256 455 240 450 228 444 Z"
          fill={FUR}
          {...fur}
        />
        <path
          d="M318 437 C322 429 323 420 326 414 C332 404 346 406 348 418 C352 432 344 448 333 458 C330 450 326 442 318 437 Z"
          fill={INK}
          {...stroke(INK, 2)}
        />
        <g fill={SPOT}>
          <ellipse cx="258" cy="466" rx="4" ry="3" />
          <ellipse cx="282" cy="467" rx="4.5" ry="3.2" />
          <ellipse cx="302" cy="456" rx="4" ry="3" />
          <ellipse cx="270" cy="458" rx="2.6" ry="2" />
        </g>
      </g>

      {/* Nohy — bez kalhot, srst s puntíky a krémové bříško */}
      <path
        d="M120 410 L240 410 C242 440 240 470 236 498 L188 498 C186 472 184 454 180 448 C176 454 174 472 172 498 L124 498 C120 470 118 440 120 410 Z"
        fill={FUR}
        {...fur}
      />
      <path d="M138 411 C142 432 160 444 180 444 C200 444 218 432 222 411 Z" fill={CREAM} />
      <g fill={SPOT}>
        <ellipse cx="134" cy="440" rx="4" ry="3" />
        <ellipse cx="150" cy="462" rx="4.4" ry="3.2" />
        <ellipse cx="136" cy="478" rx="3.4" ry="2.6" />
        <ellipse cx="160" cy="484" rx="2.6" ry="2" />
        <ellipse cx="226" cy="440" rx="4" ry="3" />
        <ellipse cx="210" cy="462" rx="4.4" ry="3.2" />
        <ellipse cx="224" cy="478" rx="3.4" ry="2.6" />
        <ellipse cx="200" cy="484" rx="2.6" ry="2" />
      </g>

      {/* Tlapky */}
      <path
        d="M106 512 C104 494 124 486 142 486 C160 486 178 492 178 510 C178 524 164 528 142 528 C120 528 106 524 106 512 Z"
        fill={FUR}
        {...fur}
      />
      <path
        d="M254 512 C256 494 236 486 218 486 C200 486 182 492 182 510 C182 524 196 528 218 528 C240 528 254 524 254 512 Z"
        fill={FUR}
        {...fur}
      />
      <path
        d="M127 515 L128 527 M141 515 L141 528 M155 515 L154 527 M233 515 L232 527 M219 515 L219 528 M205 515 L206 527"
        {...stroke(FUR_LINE, 2.2)}
      />

      {/* Sako — celé vínové */}
      <path
        d="M180 250 L180 422 L108 422 C100 422 96 416 96 408 L96 286 C96 264 112 250 134 246 L154 244 Z"
        fill={BERRY}
        {...stroke(BERRY_LINE)}
      />
      <path
        d="M180 250 L206 244 L226 246 C248 250 264 264 264 286 L264 408 C264 416 260 422 252 422 L180 422 Z"
        fill={BERRY}
        {...stroke(BERRY_LINE)}
      />
      {/* Klopa vlevo */}
      <path d="M154 244 L140 252 L168 332 L180 346 L180 340 Z" fill={BERRY_DARK} {...stroke(BERRY_LINE, 2.2)} />
      <path d="M206 244 L220 252 L192 332 L180 346 L180 340 Z" fill={BERRY_DARK} {...stroke(BERRY_LINE, 2.2)} />
      {/* Pás dole */}
      <path
        d="M96 398 L264 398 L264 408 C264 416 260 423 251 423 L109 423 C100 423 96 416 96 408 Z"
        fill={BERRY_DARK}
        {...stroke(BERRY_LINE)}
      />

      {/* Košile, límeček, kravata */}
      <path d="M154 244 L206 244 L180 340 Z" fill={SHIRT} {...stroke(SHIRT_LINE, 2.2)} />
      <path d="M172 276 L188 276 L185 288 L175 288 Z" fill={ORANGE} {...stroke(ORANGE_LINE, 2)} />
      <path d="M175 288 L185 288 L192 326 L180 340 L168 326 Z" fill={ORANGE} {...stroke(ORANGE_LINE, 2)} />
      <path d="M155 244 L178 264 L166 280 L148 258 Z" fill={SHIRT} {...stroke(SHIRT_LINE, 2.2)} />
      <path d="M205 244 L182 264 L194 280 L212 258 Z" fill={SHIRT} {...stroke(SHIRT_LINE, 2.2)} />

      {/* Kapesníček, kapsy, knoflíky */}
      <path d="M212 318 L221 305 L231 318 Z" fill={ORANGE} {...stroke(ORANGE_LINE, 2)} />
      <path d="M207 319 L236 319" {...stroke(BERRY_LINE, 2.4)} />
      <rect x="117" y="369" width="37" height="7" rx="2" fill={ORANGE} {...stroke(ORANGE_LINE, 1.8)} />
      <rect x="206" y="369" width="37" height="7" rx="2" fill={ORANGE} {...stroke(ORANGE_LINE, 1.8)} />
      <g fill={BERRY_LINE}>
        <circle cx="192" cy="346" r="3.4" />
        <circle cx="192" cy="366" r="3.4" />
        <circle cx="192" cy="386" r="3.4" />
      </g>

      {/* Kabely: z každé pěsti dolů na zem. Dva tahy přes sebe (tmavší
          širší + světlejší užší) = zelená „trubka" s obrysem. */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M138 368 C134 398 114 412 110 444 C107 474 96 500 64 522" stroke={GREEN_LINE} strokeWidth="9" />
        <path d="M138 368 C134 398 114 412 110 444 C107 474 96 500 64 522" stroke={GREEN} strokeWidth="5" />
        <path d="M222 368 C226 398 246 412 250 444 C253 474 264 500 296 522" stroke={GREEN_LINE} strokeWidth="9" />
        <path d="M222 368 C226 398 246 412 250 444 C253 474 264 500 296 522" stroke={GREEN} strokeWidth="5" />
      </g>

      {/* Levá paže (z pohledu diváka): předloktí šikmo před tělo, pěst drží
          vidlici. Předloktí je pod paží, aby loket nebyl vidět. */}
      <path d="M84 333 L121 343 C127 342 132 347 132 354 C132 361 128 366 122 367 L88 357 Z" fill={BERRY} {...stroke(BERRY_LINE)} />
      <path d="M115 345 L121 343 C127 342 132 347 132 354 C132 361 128 366 122 367 L116 368 Z" fill={BERRY_DARK} {...stroke(BERRY_LINE, 2.2)} />
      <path d="M150 346 L162 346 C164 346 166 348 166 350 L166 360 C166 362 164 364 162 364 L150 364 Z" fill={ORANGE} {...stroke(ORANGE_LINE, 2)} />
      <rect x="166" y="349" width="9" height="3.5" rx="1" fill={SHIRT} {...stroke(SHIRT_LINE, 1.4)} />
      <rect x="166" y="358.5" width="9" height="3.5" rx="1" fill={SHIRT} {...stroke(SHIRT_LINE, 1.4)} />
      <path d="M128 343 C134 337 146 337 152 343 C157 349 157 361 152 367 C146 373 134 373 128 367 C123 361 123 349 128 343 Z" fill={FUR} {...fur} />
      <path d="M136 345 Q134 355 136 365 M145 345 Q143 355 145 365" {...stroke(FUR_LINE, 2)} />
      <ellipse cx="141" cy="340" rx="6" ry="4.5" fill={FUR} {...fur} />
      <path
        d="M110 254 C86 258 72 276 70 300 L70 334 C70 346 80 352 90 350 C100 348 106 340 106 330 L110 300 Z"
        fill={BERRY}
        {...stroke(BERRY_LINE)}
      />

      {/* Pravá paže: zrcadlo levé, pěst drží zásuvku s dírkami. */}
      <path d="M276 333 L239 343 C233 342 228 347 228 354 C228 361 232 366 238 367 L272 357 Z" fill={BERRY} {...stroke(BERRY_LINE)} />
      <path d="M245 345 L239 343 C233 342 228 347 228 354 C228 361 232 366 238 367 L244 368 Z" fill={BERRY_DARK} {...stroke(BERRY_LINE, 2.2)} />
      <path d="M210 346 L198 346 C196 346 194 348 194 350 L194 360 C194 362 196 364 198 364 L210 364 Z" fill={ORANGE} {...stroke(ORANGE_LINE, 2)} />
      <rect x="197" y="349.5" width="4" height="3" rx="0.8" fill="#3D2310" />
      <rect x="197" y="358.5" width="4" height="3" rx="0.8" fill="#3D2310" />
      <path d="M232 343 C226 337 214 337 208 343 C203 349 203 361 208 367 C214 373 226 373 232 367 C237 361 237 349 232 343 Z" fill={FUR} {...fur} />
      <path d="M224 345 Q226 355 224 365 M215 345 Q217 355 215 365" {...stroke(FUR_LINE, 2)} />
      <ellipse cx="219" cy="340" rx="6" ry="4.5" fill={FUR} {...fur} />
      <path
        d="M250 254 C274 258 288 276 290 300 L290 334 C290 346 280 352 270 350 C260 348 254 340 254 330 L250 300 Z"
        fill={BERRY}
        {...stroke(BERRY_LINE)}
      />

      {/* Jiskra v mezeře mezi vidlicí a zásuvkou */}
      <g {...stroke(ORANGE, 2.6)}>
        <path d="M187 345 L182 354 L188 354 L183 363" />
        <path d="M184 340 L183 334 M178 342 L174 338 M190 342 L193 338" />
        <path d="M178 368 L174 372 M184 370 L183 376 M190 368 L193 372" />
      </g>

      {/* Hlava: velké uši tvoří boky hlavy, po stranách hříva srsti, zlatá brada */}
      <path
        d="M180 89 C194 89 205 91 214.5 95 C232 80 250 60 264 47 C276 62 278 92 270 120 C266 130 265 140 267 148 Q271 162 272 172 Q276 180 282 190 Q277 188 272 187 Q277 201 277 213 Q272 210 266 207 Q265 221 257 233 Q254 228 248 225 C244 238 224 247 208 248 C201 255 191 259 180 259 C169 259 159 255 152 248 C136 247 116 238 112 225 Q106 228 103 233 Q95 221 94 207 Q88 210 83 213 Q83 201 88 187 Q83 188 78 190 Q84 180 88 172 Q89 162 93 148 C95 140 94 130 90 120 C82 92 84 62 96 47 C110 60 128 80 145.5 95 C155 91 166 89 180 89 Z"
        fill={FUR}
        {...fur}
      />

      {/* Uši: růžový vnitřek, bílé plaménky srsti, tmavá špička a chomáčky */}
      <path d="M90 76 L97 124 L130 103 Z" fill={EAR_INNER} {...stroke(FUR_LINE, 1.8)} />
      <path
        d="M104 122 C100 110 98 98 97 86 C103 96 108 104 112 110 C109 102 107 96 106 88 C112 97 117 104 121 108 C119 103 117 99 116 94 C121 99 125 102 129 105 Z"
        fill={CREAM}
      />
      <path d="M270 76 L263 124 L230 103 Z" fill={EAR_INNER} {...stroke(FUR_LINE, 1.8)} />
      <path
        d="M256 122 C260 110 262 98 263 86 C257 96 252 104 248 110 C251 102 253 96 254 88 C248 97 243 104 239 108 C241 103 243 99 244 94 C239 99 235 102 231 105 Z"
        fill={CREAM}
      />
      <g fill={INK}>
        <path d="M96 47 C89 56 86 68 85.6 80 Q101 71 115.4 66 C109 59 103 53 96 47 Z" />
        <path d="M90 52 C85 34 80 18 73.5 6.5 C86 18 96 32 102 48 Z" />
        <path d="M96 47 C93 36 90 26 87 17 C97 26 102 36 104 50 Z" />
        <path d="M88 58 C81 46 75 36 68.4 29 C79 34 89 42 97 52 Z" />
        <path d="M264 47 C271 56 274 68 274.4 80 Q259 71 244.6 66 C251 59 257 53 264 47 Z" />
        <path d="M270 52 C275 34 280 18 286.5 6.5 C274 18 264 32 258 48 Z" />
        <path d="M264 47 C267 36 270 26 273 17 C263 26 258 36 256 50 Z" />
        <path d="M272 58 C279 46 285 36 291.6 29 C281 34 271 42 263 52 Z" />
      </g>

      {/* Puntíky: kapka na čele, menší skvrny okolo a na lících */}
      <g fill={SPOT}>
        <path d="M174 98 Q180 95 186 98 Q184 110 180 120 Q176 110 174 98 Z" />
        <ellipse cx="160.5" cy="104" rx="3.6" ry="2.4" transform="rotate(-25 160.5 104)" />
        <ellipse cx="199.5" cy="104" rx="3.6" ry="2.4" transform="rotate(25 199.5 104)" />
        <ellipse cx="165" cy="118" rx="2.2" ry="3" />
        <ellipse cx="195" cy="118" rx="2.2" ry="3" />
        <ellipse cx="102" cy="173" rx="4" ry="3" />
        <ellipse cx="106.5" cy="190" rx="3.4" ry="2.6" />
        <ellipse cx="258" cy="173" rx="4" ry="3" />
        <ellipse cx="253.5" cy="190" rx="3.4" ry="2.6" />
      </g>

      {/* Tmavší hřbet nosu mezi skly */}
      <path d="M173 168 Q180 165 187 168 L190 188 L170 188 Z" fill="#D99A48" opacity="0.55" />

      {/* Krémový čenich a spodní líce. Horní hrana je zubatá srst bez obrysu,
          zlatá tak do krémové přechází plynule. Na každé straně 3 ostré
          chomáče: 1–2 zlaté, 3 krémový; čelist pak jde rovnou do zlaté brady. */}
      <path d="M180 186 C186 186 192 188 196 192 C199 195 204 196 210 196 Q216 198 219 204 Q222 199 228 199 Q234 201 238 208 Q242 202 248 202 Q253 204 256 210 Q261 206 266 207 Q265 221 257 233 Q254 228 248 225 C244 238 224 247 208 248 Q203 242 202 230 C196 237 189 240 180 240 C171 240 164 237 158 230 Q157 242 152 248 C136 247 116 238 112 225 Q106 228 103 233 Q95 221 94 207 Q99 206 104 210 Q107 204 112 202 Q118 202 122 208 Q126 201 132 199 Q138 199 141 204 Q144 198 150 196 C156 196 161 195 164 192 C168 188 174 186 180 186 Z" fill={CREAM} />
      {/* Obrys znovu přes krémovou — jen vnější hrana hlavy, brada a cípy. */}
      <path d="M267 148 Q271 162 272 172 Q276 180 282 190 Q277 188 272 187 Q277 201 277 213 Q272 210 266 207 Q265 221 257 233 Q254 228 248 225 C244 238 224 247 208 248" {...fur} />
      <path
        d="M208 248 Q203 242 202 230 C196 237 189 240 180 240 C171 240 164 237 158 230 Q157 242 152 248"
        {...fur}
      />
      <path d="M208 248 C201 255 191 259 180 259 C169 259 159 255 152 248" {...fur} />
      <path d="M152 248 C136 247 116 238 112 225 Q106 228 103 233 Q95 221 94 207 Q88 210 83 213 Q83 201 88 187 Q83 188 78 190 Q84 180 88 172 Q89 162 93 148" {...fur} />

      {/* Světlé okolí očí */}
      <ellipse cx="139" cy="164" rx="21" ry="17" fill="#F7DFAE" />
      <ellipse cx="221" cy="164" rx="21" ry="17" fill="#F7DFAE" />

      {/* Oči — mandlové, linka s „křidélkem", zorničky k nosu; mrkají */}
      <g className="lynx-blink">
        <path d="M120 158 C124 150 132 147 140 147 C150 147 157 152 159 160 C158 170 151 177 142 177 C131 177 122 168 120 158 Z" fill="#F6ECD6" />
        <circle cx="144" cy="163" r="9.5" fill="#2E1C10" />
        <circle cx="141.5" cy="159.5" r="2.8" fill="#fff" />
        <circle cx="146.5" cy="166.5" r="1.2" fill="#fff" />
        <path d="M121 161 C125 171 133 177 142 177 C151 177 157 170 159 161" {...stroke('#5A3415', 1.6)} />
        <path d="M118 157 C123 149 131 146 140 146 C150 146 157 151 159.5 159 M120 156 L114 152" {...stroke(INK, 3.4)} />

        <path d="M240 158 C236 150 228 147 220 147 C210 147 203 152 201 160 C202 170 209 177 218 177 C229 177 238 168 240 158 Z" fill="#F6ECD6" />
        <circle cx="216" cy="163" r="9.5" fill="#2E1C10" />
        <circle cx="213.5" cy="159.5" r="2.8" fill="#fff" />
        <circle cx="218.5" cy="166.5" r="1.2" fill="#fff" />
        <path d="M239 161 C235 171 227 177 218 177 C209 177 203 170 201 161" {...stroke('#5A3415', 1.6)} />
        <path d="M242 157 C237 149 229 146 220 146 C210 146 203 151 200.5 159 M240 156 L246 152" {...stroke(INK, 3.4)} />
      </g>

      {/* Kulaté brýle */}
      <g {...stroke(INK, 3.8)}>
        <circle cx="138.5" cy="163" r="27" />
        <circle cx="221.5" cy="163" r="27" />
        <path d="M165.5 161 Q180 157 194.5 161" />
        <path d="M112.4 156 L93 149 M247.6 156 L267 149" />
      </g>

      {/* Obočí — měkké hnědé čárky */}
      <path d="M132 126 Q140 122 149 124.5 M211 124.5 Q220 122 228 126" {...stroke('#C27E35', 5.5)} />

      {/* Nos, úsměv a vousky */}
      <path
        d="M165 192 C164 187 168 186 172 186.5 C176 187 184 187 188 186.5 C192 186 196 187 195 192 C194 197 186 202 180 204 C174 202 166 197 165 192 Z"
        fill="#D4907A"
        {...stroke('#5A3415', 2.6)}
      />
      {/* Výraz „ups": otevřená pusa (lynx-mascot.md §6.2) */}
      <path d="M161 214 C165 232 195 232 199 214 C191 218 169 218 161 214 Z" fill="#5A2730" {...stroke('#3D2310', 2.4)} />
      <path d="M168 223 C173 219 187 219 192 223 C187 229 173 229 168 223 Z" fill="#E8808C" />
      <path
        d="M180 204 L180 210 M147 206 C151 213 158 217 166 217 C173 217 178 214 180 210 C182 214 187 217 194 217 C202 217 209 213 213 206"
        {...stroke('#3D2310', 3)}
      />
      <g {...stroke('#3D2310', 1.6)}>
        <path d="M154 198 Q132 197 109 202" />
        <path d="M155 204 Q135 207 117 217" />
        <path d="M206 198 Q228 197 251 202" />
        <path d="M205 204 Q225 207 243 217" />
      </g>
      <g fill="#3D2310">
        <circle cx="158" cy="200.5" r="1.5" />
        <circle cx="160.5" cy="206" r="1.5" />
        <circle cx="202" cy="200.5" r="1.5" />
        <circle cx="199.5" cy="206" r="1.5" />
      </g>
    </svg>
  );
}

export default LynxMascotUnplugged;
