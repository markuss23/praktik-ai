# 🧪 Návod na testování kurzu "Základy promptování I."

## 📝 Co máte k dispozici

1. **zaklady_promptovani_kurz.xlsx** - Kompletní struktura kurzu
2. **PREHLED_KURZU.md** - Detailní dokumentace
3. **PRIKLAD_AKTIVITY_A8.md** - Konkrétní příklad implementace

---

## 🎯 Co testovat

### 1️⃣ STRUKTURA A LOGIKA

**Otázky k posouzení:**
- ✅ Dává smysl posloupnost modulů?
- ✅ Je progrese obtížnosti přirozená?
- ✅ Jsou cíle jednotlivých modulů dosažitelné?
- ✅ Fungují podmínky odemykání (unlock conditions)?

**Konkrétně zkontrolujte:**
- Modul 1 → Modul 2 → Modul 3 → Modul 4 (je logický flow?)
- Návaznost aktivit v každém modulu (Learn → Practice → Assessment)
- Časová náročnost (je 2-3 hodiny realistické?)

---

### 2️⃣ AKTIVITY - OBSAH A FORMA

**Pro každou aktivitu zkontrolujte:**

**A) Learn aktivity (A1, A4, A7)**
- Je obsah dostatečně detailní pro začátečníky?
- Chybí nějaké klíčové koncepty?
- Je vysvětlení srozumitelné bez předchozích znalostí?

**B) Practice aktivity (A2, A5, A8, A10)**
- Je zadání jasné?
- Poskytuje AI Mentor dostatečnou podporu?
- Mohou studenti úspěšně dokončit bez frustraci?
- Je prostor pro kreativitu?

**C) Concept Check (A3)**
- Jsou otázky relevantní?
- Testují skutečné porozumění, ne jen zapamatování?
- Je AI Mentor přínosný při špatných odpovědích?

**D) Assessment aktivity (A6, A9)**
- Jsou rubrics jasné a měřitelné?
- Dokáže AI Evaluator objektivně hodnotit?
- Jsou kritická kritéria správně označena?
- Je hodnocení spravedlivé?

**E) Reflexe (A11)**
- Vede k skutečnému zamyšlení?
- Poskytuje hodnotu pro studenta?
- Propojuje celý kurz?

---

### 3️⃣ AI ROLE - INSTRUKCE A CHOVÁNÍ

**AI Mentor - testování:**

Zkuste simulovat interakci:
```
Scénář 1: Student napíše velmi slabý prompt
→ Jak by měl AI Mentor reagovat?
→ Poskytne příliš mnoho info? Nebo vede k objevování?

Scénář 2: Student žádá "Dej mi rovnou odpověď"
→ Jak by měl AI Mentor odmítnout a přesto pomoct?

Scénář 3: Student je na správné cestě, ale chybí detail
→ Jak by měl AI Mentor povzbudit a nasměrovat?
```

**AI Evaluator - testování:**

Zkuste vytvořit testovací odpovědi:
```
Test A6 - Assessment:
• Vytvoř excelentní prompt → očekávané hodnocení: 90-100%
• Vytvoř průměrný prompt → očekávané hodnocení: 60-75%
• Vytvoř slabý prompt → očekávané hodnocení: 30-50%

Pro každý:
→ Hodnotí AI podle rubrics?
→ Je feedback konkrétní?
→ Jsou navržená vylepšení užitečná?
```

---

### 4️⃣ RUBRICS - KRITÉRIA HODNOCENÍ

**Pro každou Assessment aktivitu (A6, A9) zkontrolujte:**

| Kontrolní otázka | A6 | A9 |
|-----------------|----|----|
| Jsou kritéria měřitelná? | ☐ | ☐ |
| Dávají váhy smysl? | ☐ | ☐ |
| Jsou kritická kritéria správně označená? | ☐ | ☐ |
| Lze splnit bez kritických kritérií kurz neprošel? | ☐ | ☐ |
| Je součet vah 100%? | ☐ | ☐ |
| Je popis každého kritéria jasný? | ☐ | ☐ |

**Vypočítejte testovací scénáře:**
```
Příklad pro A9:
Student splní všechny kritéria na 80%, ale kritické pouze na 45%
→ Celkem: 80% (≥70% ✓)
→ Kritická: 45% (≥50% ✗)
→ VÝSLEDEK: Kurz nesplněn ❌

Je toto chtěné chování? Pokud ne, upravte váhy nebo kritičnost.
```

---

### 5️⃣ FINÁLNÍ PROJEKT (A9)

**Toto je klíčová aktivita - otestujte podrobně:**

✅ **Zadání:**
- Je jasné, co má student vytvořit?
- Je příklad/inspirace dostupná?
- Je rozsah realistický?

✅ **Hodnocení:**
- Pokrývají rubrics všechny důležité aspekty?
- Dokáže začátečník splnit kritická kritéria?
- Je hodnocení motivující nebo demotivující?

✅ **Praktická hodnota:**
- Odnese si student něco užitečného?
- Může výsledek opravdu použít ve výuce?
- Je to adequátní zakončení kurzu?

---

## 🔬 Konkrétní testovací scénáře

### Scénář 1: Student absolutní začátečník
**Profil:** Nikdy nepoužil AI, neví co je prompt  
**Test:**
- Projděte Modul 1 z jeho perspektivy
- Jsou vysvětlení dostačující?
- Dokáže se posunout do Modulu 2?

**Kritický bod:** Aktivita A2 (první kontakt s vytvářením promptu)
→ Poskytuje AI Mentor dostatek podpory?

---

### Scénář 2: Student se zkušeností s ChatGPT
**Profil:** Používal ChatGPT osobně, ale nesystematicky  
**Test:**
- Bude se nudit v Modulu 1?
- Objeví něco nového v Modulu 2?
- Je pro něj Modul 3 dostatečně náročný?

**Kritický bod:** Aktivita A6 (první Assessment)
→ Ukáže mu hodnocení, že má mezery v technice?

---

### Scénář 3: Student unavený/frustrovaný
**Profil:** Má mnoho práce, chce to rychle projít  
**Test:**
- Může přeskočit části, nebo je vše povinné?
- Co se stane, když neuspěje v Assessment?
- Může se vrátit a opravit?

**Kritický bod:** Aktivita A9 (finální projekt)
→ Je možné splnit, i když není čas na perfekcionismus?

---

## 📊 Kontrolní seznam pro systém

**Technická implementace - co musí systém zvládnout:**

- [ ] Načítání struktury z Excel
- [ ] Odemykání modulů podle conditions
- [ ] Volání AI Mentora v Practice aktivitách
- [ ] Volání AI Evaluatora v Assessment aktivitách
- [ ] Předávání správných system instructions AI
- [ ] Hodnocení podle rubrics (váhy, kritická kritéria)
- [ ] Výpočet celkového skóre
- [ ] Kontrola podmínky ≥70% celkem + ≥50% kritické
- [ ] Vystavení certifikátu při splnění
- [ ] Udělení badge
- [ ] Ukládání průběhu studenta
- [ ] Možnost vrátit se k aktivitě
- [ ] Export výsledků

---

## ✍️ Zpětná vazba k zachycení

**Během testování zaznamenávejte:**

### Pro každou aktivitu:
```
ID aktivity: ___
Nejasnosti pro studenta: ___
Technické problémy: ___
Návrhy na zlepšení: ___
Čas na dokončení: ___
```

### Pro AI interakce:
```
Typ AI (Mentor/Evaluator): ___
Kvalita odpovědí: 1-5
Přínosnost: 1-5
Konkrétní problémy: ___
```

### Celkový dojem:
```
Obtížnost kurzu: Příliš lehký / Akorát / Příliš těžký
Délka kurzu: Příliš krátký / Akorát / Příliš dlouhý
Praktická hodnota: 1-5
Doporučil bych kolegům: Ano / Ne / Možná
```

---

## 🎯 Prioritní otázky k zodpovězení

1. **Je struktura modulů logická a progresivní?**
2. **Fungují AI role tak, jak mají? (Mentor vs Evaluator)**
3. **Jsou rubrics spravedlivé a měřitelné?**
4. **Dokáže začátečník kurz úspěšně dokončit?**
5. **Odnese si student praktickou hodnotu?**
6. **Je technická implementace feasible?**

---

## 📧 Kam reportovat nálezy

**Připravte:**
- Konkrétní problémy s ID aktivit
- Screenshots AI interakcí (pokud možné)
- Návrhy na vylepšení s konkrétními texty
- Časovou náročnost jednotlivých částí

**Formát reportu:**
```markdown
## Testování kurzu - Session [datum]

### ✅ Co funguje dobře
- ...

### ⚠️ Co potřebuje úpravu
- Aktivita ID: ...
- Problém: ...
- Návrh řešení: ...

### 🔧 Technické poznámky
- ...

### 💡 Nápady na vylepšení
- ...
```

---

**Hodně úspěchů při testování! 🚀**

*Tento kurz je v testovací verzi - každá zpětná vazba je cenná pro jeho vylepšení.*
