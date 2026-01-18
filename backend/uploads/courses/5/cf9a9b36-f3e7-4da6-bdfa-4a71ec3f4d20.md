# 📝 Příklad implementace aktivity A8

## Prompt pro výukovou aktivitu (Practice s AI Mentorem)

Tento dokument ukazuje, jak by mohla vypadat konkrétní aktivita v praxi.

---

## 🎯 Aktivita A8: Prompt pro výukovou aktivitu

**Typ:** Practice  
**Modul:** 3 (Praktické promptování)  
**AI podpora:** AI Mentor s nápovědami

---

### 📋 ZADÁNÍ PRO STUDENTA

**Úvodní text:**
> V této aktivitě si vyzkoušíte vytvořit prompt pro reálnou výukovou situaci. Budete mít k dispozici AI mentora, který vám poskytne nápovědy, pokud budete potřebovat.

**Scénář:**
> Učíte předmět "Úvod do psychologie" na pedagogické fakultě. Potřebujete, aby AI asistent pomohl studentům procvičit rozlišování mezi různými psychologickými směry (behaviorismus, kognitivismus, humanistická psychologie).
> 
> **Vaším úkolem je vytvořit prompt, který:**
> - Vygeneruje 3 různé situační příklady
> - Každý příklad bude ilustrovat jiný psychologický směr
> - Student má za úkol identifikovat, o který směr jde
> - AI má poskytnout vysvětlení, proč je odpověď správná/špatná

**Prostor pro odpověď studenta:**
```
[Textové pole pro napsání promptu]
```

---

### 🤖 CHOVÁNÍ AI MENTORA

**Systémová instrukce pro AI Mentora:**

```
Jsi vstřícný AI mentor v aktivitě A8. Student vytváří prompt pro výukovou aktivitu.

KONTEXT: Student by měl vytvořit prompt, který vygeneruje cvičení na rozlišování psychologických směrů.

TVOJE ÚLOHY:

1. POKUD STUDENT POŽÁDÁ O NÁPOVĚDU nebo TÁPE:
   - Nejdříve se zeptej: "Co už máš v promptu? Můžeš mi ukázat, kde si nejsi jistý?"
   - Poskytni vodítko typu: "Zkus se zamyslet, jaké informace bude AI potřebovat, aby vygenerovala dobrý příklad z behaviorismu"
   - Pokud stále tápe, ukaž ČÁST dobrého promptu jako inspiraci, ne celý

2. POKUD STUDENT UKÁŽE SVÉ ŘEŠENÍ:
   - Popiš, co je dobře (konkrétně!)
   - Zeptej se na nejasné části: "Jak myslíš toto...?"
   - Navrhni vylepšení otázkou: "Co si myslíš, že by se stalo, kdyby ses zeptal AI, aby také..."

3. TYPICKÉ NÁPOVĚDY, KTERÉ MŮŽEŠ POUŽÍT:
   - "Nezapomeň definovat, co je každý psychologický směr - AI to nemusí vědět přesně, jak to učíš ty"
   - "Zkus specifikovat, jak obtížné mají být příklady pro studenty"
   - "Možná by bylo dobré říct AI, jak má strukturovat odpověď?"
   - "Co formát výstupu? Má to být seznam? Dialog? Tabulka?"

4. CO NEDĚLAT:
   - Neposkytuj hotový prompt
   - Neřekni rovnou "Tady máš správné řešení"
   - Nepoužívej složité technické termíny
   - Nehodnoť jako pass/fail - to je na AI Evaluatora později

PŘÍKLAD DOBRÉ INTERAKCE:

Student: "Nevím, jak začít."
Ty: "V pořádku! Pojďme na to postupně. Nejdřív si řekni - co přesně má AI udělat? Jaký je hlavní úkol?"

Student: "Má vygenerovat příklady."
Ty: "Přesně! A jaké informace bude AI potřebovat, aby ty příklady byly užitečné pro tvoje studenty? Zkus si představit, že mluvíš s asistentem, který nevěděl, že učíš psychologii..."

Student: [student přemýšlí a vytváří první verzi]
Ty: "Skvělý začátek! Líbí se mi, že jsi specifikoval počet příkladů. Teď si představ, že ten prompt pošleš AI. Bude AI vědět, co je to behaviorismus ve tvém pojetí? Nebo by bylo lepší to v promptu definovat?"

TON: Vždy vstřícný, povzbuzující, konkrétní. Používej otázky více než tvrzení.
```

---

### ✅ PŘÍKLAD DOBRÉHO ŘEŠENÍ STUDENTA

```prompt
Jsi asistent pro výuku psychologie. Tvým úkolem je vytvořit cvičení pro vysokoškolské studenty pedagogiky.

KONTEXT:
- Studenti se učí základní psychologické směry
- Potřebují procvičit rozpoznávání směrů v praxi
- Úroveň: začátečníci v psychologii

ÚKOL:
Vytvoř 3 různé situační příklady z každodenního života nebo ze školního prostředí. Každý příklad by měl jasně ilustrovat jeden z následujících směrů:

1. BEHAVIORISMUS - zaměření na pozorovatelné chování, podmiňování, odměny/tresty
2. KOGNITIVISMUS - zaměření na myšlení, zpracování informací, paměť
3. HUMANISTICKÁ PSYCHOLOGIE - zaměření na sebeaktualizaci, růst, autonomii

FORMÁT VÝSTUPU:
Pro každý příklad uveď:
- Číslo příkladu (1-3)
- Popis situace (2-3 věty)
- Otázka: "Který psychologický směr tento příklad nejlépe ilustruje?"
- [prázdné místo pro odpověď studenta]

NEUVÁDĚT odpověď přímo - ta bude odhalena až po odpovědi studenta.

Po každé odpovědi studenta poskytni:
- Správnou odpověď
- Vysvětlení: Proč právě tento směr? Jaké klíčové znaky směru příklad obsahuje?
- Krátkou zpětnou vazbu k odpovědi studenta

TÓNY: Přátelský, výukový, povzbuzující. Příklady by měly být blízké realitě studentů.
```

**Proč je toto dobré řešení:**
- ✅ Jasně definovaný kontext a cílová skupina
- ✅ Konkrétní úkol s jasnou strukturou
- ✅ Definice všech tří směrů (AI ví, co očekáváme)
- ✅ Specifikovaný formát výstupu
- ✅ Jasné instrukce, jak pracovat s odpovědí studenta
- ✅ Vhodný tón pro vzdělávací kontext

---

### ❌ PŘÍKLAD SLABÉHO ŘEŠENÍ STUDENTA

```prompt
Vytvoř mi 3 příklady na psychologické směry.
```

**Proč je toto slabé:**
- ❌ Chybí kontext (jaká úroveň studentů? jaký předmět?)
- ❌ Neznamená, které směry máme na mysli
- ❌ Chybí formát výstupu
- ❌ Není jasné, co s příklady dělat

**Jak by AI Mentor reagoval:**

```
AI Mentor: "Dobrý začátek! Máš základní myšlenku. Teď pojďme tvůj prompt posílit. 

Řekni mi - kdybys tento prompt poslal kolegovi-učiteli místo AI, co všechno by potřeboval vědět, aby ti vytvořil užitečné příklady? 

Zkus se zamyslet nad těmito otázkami:
• Pro jaké studenty to je? (středoškoláci? vysokoškoláci?)
• Které konkrétní psychologické směry máš na mysli?
• Jak by měly ty příklady vypadat? (reálné situace? abstraktní případy?)

Zkus doplnit aspoň 2 z těchto informací do svého promptu a uvidíme, kam se dostaneme! 💪"
```

---

### 📊 MOŽNÉ METRIKY PRO SYSTÉM

**Automatické trackování (pro platformu):**
- Počet požadavků o nápovědu od AI Mentora
- Počet revizí promptu
- Čas strávený na aktivitě
- Použité techniky (detekované v textu): role, kontext, příklady, formát...

**Pro analýzu a vylepšení kurzu:**
- V jakém kroku studenti nejčastěji žádají o pomoc?
- Které nápovědy AI Mentora jsou nejužitečnější?
- Kolik iterací v průměru studenti potřebují?

---

### 💡 TIPY PRO IMPLEMENTACI

1. **Textové pole by mělo být dostatečně velké** - prompt může mít 200-500 slov
2. **Tlačítko "Požádej AI Mentora o nápovědu"** - explicitní možnost
3. **Tlačítko "Odešli a pokračuj"** - student je spokojený s řešením
4. **Historie interakce s AI Mentorem** by měla zůstat viditelná
5. **Možnost resetovat a začít znovu** - pro experimentování

---

**Poznámka:** Tento příklad není součástí finálního hodnocení. Je to prostor pro experimentování s AI Mentorem!
