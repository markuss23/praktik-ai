-- Migration: 0005 - Sjednocení číselníků podle PRAKTIK-AI_ciselniky.xlsx a nový číselník Level
-- Description: Převádí kódy a texty číselníků na znění z PRAKTIK-AI_ciselniky.xlsx
--              (opravuje useknuté texty ze seedu a migrace 0002) a zakládá číselník Level.
--   1) KRAUU kompetence – plné názvy a popisy (i v promptu course_planner)
--   2) Neurovědní principy – plné popisy (i v promptu course_planner)
--   3) Cílové skupiny – kódy a/s/m/h → target.a/s/m/host
--   4) Obory – kódy 01–14 → obor.01–obor.14, doplnění obor.15–17
--   5) Průřezové obory – kódy O001–O020 → O01–O20, plné texty
--   6) Level – nová tabulka course_level (level.1–3) a nepovinný course.course_level_id
--   Vazby kurzů a zdrojů jdou přes ID, takže se převodem kódů nemění.
-- Requires existing tables: migrace 0001–0004
-- Idempotentní — lze spustit opakovaně.


-- ======================================================================
-- 1) KRAUU kompetence
-- ======================================================================

-- Oprava textů KRAUU kompetencí
-- Description: Migrace 0002 a seed vložily názvy a popisy KRAUU kompetencí useknuté (cca na 60 znacích).
--              Doplňuje plné znění podle číselníku PRAKTIK-AI_ciselniky.xlsx (list KRAUU)
--              a opravuje stejné texty v seznamu kompetencí v promptu course_planner.
-- Requires existing tables: krauu_competence, system_setting (migrace 0002)
-- Idempotentní — lze spustit opakovaně.

UPDATE krauu_competence k
SET name = v.name, description = v.description
FROM (VALUES
  ('1.0', 'Oblast 1 – Obsah a didaktika', ''),
  ('1.1', 'Rozumí vyučovaným oborům a rozvíjí se v nich', 'Učitel/ka rozumí oborům, které vyučuje, a systematicky se v nich rozvíjí.'),
  ('1.2', 'Didakticky zprostředkovává obsah žákům', 'Zprostředkovává obsah žákům v souladu s jejich vzdělávacími potřebami.'),
  ('2.0', 'Oblast 2 – Plánování, vedení a reflexe výuky', ''),
  ('2.1', 'Nastavuje cíle výuky', 'Stanovuje srozumitelné cíle a vede k jejich nastavování i žáky.'),
  ('2.2', 'Poznává vzdělávací potřeby a plánuje výuku', 'Plánuje výuku tak, aby každý žák mohl aktivně dosahovat cílů.'),
  ('2.3', 'Podporuje zvídavost a motivaci žáků', 'Podporuje u žáků zvídavost a motivaci k učení.'),
  ('2.4', 'Efektivně vede výuku a zjišťuje porozumění', 'Vede výuku efektivně, zjišťuje porozumění a reaguje na potřeby žáků.'),
  ('2.5', 'Reflektuje výuku', 'Reflektuje vlastní výuku a vyhodnocuje dosahování cílů.'),
  ('3.0', 'Oblast 3 – Prostředí pro učení', ''),
  ('3.1', 'Vytváří bezpečné prostředí pro učení', 'Vytváří fyzicky i psychicky bezpečné prostředí pro učení.'),
  ('3.2', 'Vede žáky k chování podporujícímu učení', 'Vede žáky k chování podporujícímu vlastní učení i spolupráci.'),
  ('3.3', 'Uspořádání fyzického a digitálního prostředí', 'Zajišťuje vhodné uspořádání fyzického a digitálního prostředí učení.'),
  ('4.0', 'Oblast 4 – Zpětná vazba a hodnocení', ''),
  ('4.1', 'Hodnotí na základě kritérií', 'Hodnotí žáky na základě jasných kritérií a vede k tomu i žáky.'),
  ('4.2', 'Poskytuje a přijímá zpětnou vazbu', 'Poskytuje žákům konstruktivní zpětnou vazbu a sám přijímá ZV od žáků.'),
  ('4.3', 'Vede žáky k reflexi jejich učení', 'Vede žáky k reflexi vlastního učení a samostatné metakognici.'),
  ('5.0', 'Oblast 5 – Profesní spolupráce', ''),
  ('5.1', 'Spolupracuje s kolegy a kolegyněmi', 'Spolupracuje s kolegy ve prospěch žáků a společného profesního růstu.'),
  ('5.2', 'Spolupracuje s rodiči a širší komunitou školy', 'Spolupracuje s rodiči a širší komunitou v zájmu žáků.'),
  ('6.0', 'Oblast 6 – Profesní sebepojetí, rozvoj, etika a duševní zdraví', ''),
  ('6.1', 'Utváření profesního sebepojetí a rozvoj', 'Systematicky pracuje na utváření profesního sebepojetí a vlastním rozvoji.'),
  ('6.2', 'Odpovědná práce s informacemi a demokratické hodnoty', 'Odpovědně pracuje s informacemi a digitálními nástroji, vede k etice.'),
  ('6.3', 'Duševní zdraví a psychohygiena', 'Systematicky pečuje o své duševní zdraví a psychohygienu.')
) AS v(code, name, description)
WHERE k.code = v.code
  AND k.is_active
  AND (k.name IS DISTINCT FROM v.name OR k.description IS DISTINCT FROM v.description);

UPDATE system_setting
SET prompt = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(prompt,
    '1.1 Rozumí vyučovaným oborům a rozvíjí — Učitel/ka rozumí oborům, které vyučuje, a systematicky se' || E'\n',
    '1.1 Rozumí vyučovaným oborům a rozvíjí se v nich — Učitel/ka rozumí oborům, které vyučuje, a systematicky se v nich rozvíjí.' || E'\n'),
    '1.2 Didakticky zprostředkovává obsah — Zprostředkovává obsah žákům v souladu s jejich' || E'\n',
    '1.2 Didakticky zprostředkovává obsah žákům — Zprostředkovává obsah žákům v souladu s jejich vzdělávacími potřebami.' || E'\n'),
    '2.1 Nastavuje cíle výuky — Stanovuje srozumitelné cíle a vede k jejich nastavování i' || E'\n',
    '2.1 Nastavuje cíle výuky — Stanovuje srozumitelné cíle a vede k jejich nastavování i žáky.' || E'\n'),
    '2.2 Poznává vzdělávací potřeby a plánuje — Plánuje výuku tak, aby každý žák mohl aktivně dosahovat' || E'\n',
    '2.2 Poznává vzdělávací potřeby a plánuje výuku — Plánuje výuku tak, aby každý žák mohl aktivně dosahovat cílů.' || E'\n'),
    '2.4 Efektivně vede výuku a zjišťuje — Vede výuku efektivně, zjišťuje porozumění a reaguje na' || E'\n',
    '2.4 Efektivně vede výuku a zjišťuje porozumění — Vede výuku efektivně, zjišťuje porozumění a reaguje na potřeby žáků.' || E'\n'),
    '3.2 Vede žáky k chování podporujícímu — Vede žáky k chování podporujícímu vlastní učení i' || E'\n',
    '3.2 Vede žáky k chování podporujícímu učení — Vede žáky k chování podporujícímu vlastní učení i spolupráci.' || E'\n'),
    '3.3 Uspořádání fyzického a digitálního — Zajišťuje vhodné uspořádání fyzického a digitálního' || E'\n',
    '3.3 Uspořádání fyzického a digitálního prostředí — Zajišťuje vhodné uspořádání fyzického a digitálního prostředí učení.' || E'\n'),
    '4.1 Hodnotí na základě kritérií — Hodnotí žáky na základě jasných kritérií a vede k tomu i' || E'\n',
    '4.1 Hodnotí na základě kritérií — Hodnotí žáky na základě jasných kritérií a vede k tomu i žáky.' || E'\n'),
    '4.2 Poskytuje a přijímá zpětnou vazbu — Poskytuje žákům konstruktivní zpětnou vazbu a sám přijímá' || E'\n',
    '4.2 Poskytuje a přijímá zpětnou vazbu — Poskytuje žákům konstruktivní zpětnou vazbu a sám přijímá ZV od žáků.' || E'\n'),
    '4.3 Vede žáky k reflexi jejich učení — Vede žáky k reflexi vlastního učení a samostatné' || E'\n',
    '4.3 Vede žáky k reflexi jejich učení — Vede žáky k reflexi vlastního učení a samostatné metakognici.' || E'\n'),
    '5.1 Spolupracuje s kolegy a kolegyněmi — Spolupracuje s kolegy ve prospěch žáků a společného' || E'\n',
    '5.1 Spolupracuje s kolegy a kolegyněmi — Spolupracuje s kolegy ve prospěch žáků a společného profesního růstu.' || E'\n'),
    '5.2 Spolupracuje s rodiči a širší — Spolupracuje s rodiči a širší komunitou v zájmu žáků.' || E'\n',
    '5.2 Spolupracuje s rodiči a širší komunitou školy — Spolupracuje s rodiči a širší komunitou v zájmu žáků.' || E'\n'),
    '6.1 Utváření profesního sebepojetí a — Systematicky pracuje na utváření profesního sebepojetí a' || E'\n',
    '6.1 Utváření profesního sebepojetí a rozvoj — Systematicky pracuje na utváření profesního sebepojetí a vlastním rozvoji.' || E'\n'),
    '6.2 Odpovědná práce s informacemi a — Odpovědně pracuje s informacemi a digitálními nástroji,' || E'\n',
    '6.2 Odpovědná práce s informacemi a demokratické hodnoty — Odpovědně pracuje s informacemi a digitálními nástroji, vede k etice.' || E'\n')
WHERE key = 'course_planner';


-- ======================================================================
-- 2) Neurovědní principy
-- ======================================================================

-- Oprava textů neurovědních principů
-- Description: Migrace 0002 a seed vložily popisy neurovědních principů useknuté (cca na 60 znacích).
--              Doplňuje plné znění podle číselníku PRAKTIK-AI_ciselniky.xlsx (list Neurovědní principy)
--              a opravuje stejné texty v seznamu principů v promptu course_planner.
-- Requires existing tables: neuro_principle, system_setting (migrace 0002)
-- Idempotentní — lze spustit opakovaně.

UPDATE neuro_principle np
SET name = v.name, description = v.description
FROM (VALUES
  ('NP-01', 'Neuroplasticita', 'Opakované učení mění strukturu synaptických sítí v mozku'),
  ('NP-02', 'Distribuované opakování', 'Učení rozložené v čase vede k trvalejšímu zapamatování'),
  ('NP-03', 'Aktivní vybavování', 'Vědomé vybavování z paměti posiluje stopu víc než pasivní čtení'),
  ('NP-04', 'Žádoucí obtíže', 'Mírná obtížnost a kognitivní zápas prohlubují zpracování a transfer'),
  ('NP-05', 'Prokládání', 'Střídání různých typů úloh podporuje rozlišování konceptů'),
  ('NP-06', 'Duální kódování', 'Kombinace verbální a vizuální reprezentace vytváří dvě paměťové stopy'),
  ('NP-07', 'Kognitivní zátěž', 'Pracovní paměť má kapacitu cca 4 ± 1 prvků; přetížení blokuje učení'),
  ('NP-08', 'Elaborativní kódování', 'Propojení nové informace s existujícími znalostmi tvoří síť asociací'),
  ('NP-09', 'Efekt generování', 'Sám vytvořená informace se pamatuje lépe než pasivně přijatá'),
  ('NP-10', 'Testovací efekt', 'Samotné testování konsoliduje dlouhodobou paměť silněji než čtení'),
  ('NP-11', 'Predikční chyba', 'Dopaminový systém reaguje na rozdíl mezi očekáváním a realitou'),
  ('NP-12', 'Konsolidace ve spánku', 'Spánek přepisuje paměťové stopy z hipokampu do neokortexu'),
  ('NP-13', 'Pozornost a pracovní paměť', 'Bez selektivní pozornosti nedochází ke kódování'),
  ('NP-14', 'Slučování do bloků', 'Sdružování informací do smysluplných bloků zvyšuje kapacitu paměti'),
  ('NP-15', 'Metakognice', 'Schopnost přemýšlet o vlastním myšlení a sledovat porozumění'),
  ('NP-16', 'Zrcadlové neurony', 'Pozorování postupu druhého aktivuje stejné okruhy jako vlastní provádění'),
  ('NP-17', 'Stav plynutí (flow)', 'Optimální poměr výzvy a dovednosti maximalizuje zapojení a učení'),
  ('NP-18', 'Okamžitá zpětná vazba', 'Rychlá konkrétní zpětná vazba umožní opravit chybu dřív než se zafixuje'),
  ('NP-19', 'Vtělené poznávání', 'Tělesné zapojení (gesta, řeč nahlas, kreslení) posiluje zpracování'),
  ('NP-20', 'Schémata', 'Nové informace se snáze ukládají při napojení na existující schéma')
) AS v(code, name, description)
WHERE np.code = v.code
  AND np.is_active
  AND (np.name IS DISTINCT FROM v.name OR np.description IS DISTINCT FROM v.description);

UPDATE system_setting
SET prompt = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(prompt,
    'NP-03 Aktivní vybavování — Vědomé vybavování z paměti posiluje stopu víc než pasivní' || E'\n',
    'NP-03 Aktivní vybavování — Vědomé vybavování z paměti posiluje stopu víc než pasivní čtení' || E'\n'),
    'NP-04 Žádoucí obtíže — Mírná obtížnost a kognitivní zápas prohlubují zpracování a' || E'\n',
    'NP-04 Žádoucí obtíže — Mírná obtížnost a kognitivní zápas prohlubují zpracování a transfer' || E'\n'),
    'NP-06 Duální kódování — Kombinace verbální a vizuální reprezentace vytváří dvě' || E'\n',
    'NP-06 Duální kódování — Kombinace verbální a vizuální reprezentace vytváří dvě paměťové stopy' || E'\n'),
    'NP-07 Kognitivní zátěž — Pracovní paměť má kapacitu cca 4 ± 1 prvků; přetížení' || E'\n',
    'NP-07 Kognitivní zátěž — Pracovní paměť má kapacitu cca 4 ± 1 prvků; přetížení blokuje učení' || E'\n'),
    'NP-08 Elaborativní kódování — Propojení nové informace s existujícími znalostmi tvoří síť' || E'\n',
    'NP-08 Elaborativní kódování — Propojení nové informace s existujícími znalostmi tvoří síť asociací' || E'\n'),
    'NP-09 Efekt generování — Sám vytvořená informace se pamatuje lépe než pasivně' || E'\n',
    'NP-09 Efekt generování — Sám vytvořená informace se pamatuje lépe než pasivně přijatá' || E'\n'),
    'NP-10 Testovací efekt — Samotné testování konsoliduje dlouhodobou paměť silněji' || E'\n',
    'NP-10 Testovací efekt — Samotné testování konsoliduje dlouhodobou paměť silněji než čtení' || E'\n'),
    'NP-11 Predikční chyba — Dopaminový systém reaguje na rozdíl mezi očekáváním a' || E'\n',
    'NP-11 Predikční chyba — Dopaminový systém reaguje na rozdíl mezi očekáváním a realitou' || E'\n'),
    'NP-12 Konsolidace ve spánku — Spánek přepisuje paměťové stopy z hipokampu do' || E'\n',
    'NP-12 Konsolidace ve spánku — Spánek přepisuje paměťové stopy z hipokampu do neokortexu' || E'\n'),
    'NP-14 Slučování do bloků — Sdružování informací do smysluplných bloků zvyšuje' || E'\n',
    'NP-14 Slučování do bloků — Sdružování informací do smysluplných bloků zvyšuje kapacitu paměti' || E'\n'),
    'NP-15 Metakognice — Schopnost přemýšlet o vlastním myšlení a sledovat' || E'\n',
    'NP-15 Metakognice — Schopnost přemýšlet o vlastním myšlení a sledovat porozumění' || E'\n'),
    'NP-16 Zrcadlové neurony — Pozorování postupu druhého aktivuje stejné okruhy jako' || E'\n',
    'NP-16 Zrcadlové neurony — Pozorování postupu druhého aktivuje stejné okruhy jako vlastní provádění' || E'\n'),
    'NP-17 Stav plynutí (flow) — Optimální poměr výzvy a dovednosti maximalizuje zapojení' || E'\n',
    'NP-17 Stav plynutí (flow) — Optimální poměr výzvy a dovednosti maximalizuje zapojení a učení' || E'\n'),
    'NP-18 Okamžitá zpětná vazba — Rychlá konkrétní zpětná vazba umožní opravit chybu dřív' || E'\n',
    'NP-18 Okamžitá zpětná vazba — Rychlá konkrétní zpětná vazba umožní opravit chybu dřív než se zafixuje' || E'\n'),
    'NP-19 Vtělené poznávání — Tělesné zapojení (gesta, řeč nahlas, kreslení) posiluje' || E'\n',
    'NP-19 Vtělené poznávání — Tělesné zapojení (gesta, řeč nahlas, kreslení) posiluje zpracování' || E'\n'),
    'NP-20 Schémata — Nové informace se snáze ukládají při napojení na existující' || E'\n',
    'NP-20 Schémata — Nové informace se snáze ukládají při napojení na existující schéma' || E'\n')
WHERE key = 'course_planner';


-- ======================================================================
-- 3) Cílové skupiny (Target)
-- ======================================================================

-- Sjednocení číselníku Target (cílové skupiny kurzů)
-- Description: Seed vložil kódy a/s/m/h a delší popisy. Převádí kódy a popisy na znění
--              číselníku PRAKTIK-AI_ciselniky.xlsx (list Target): target.a/s/m/host.
--              Vazby kurzů a zdrojů jdou přes target_id, takže se nemění.
-- Requires existing tables: course_target
-- Idempotentní — lze spustit opakovaně.

UPDATE course_target t
SET code = v.new_code, description = v.description
FROM (VALUES
  ('a', 'target.a',    'Vysokoškolský'),
  ('s', 'target.s',    'Student učitelství'),
  ('m', 'target.m',    'Fakultní učitel'),
  ('h', 'target.host', 'Externí účastník')
) AS v(old_code, new_code, description)
WHERE t.code IN (v.old_code, v.new_code)
  AND t.is_active
  AND (t.code IS DISTINCT FROM v.new_code OR t.description IS DISTINCT FROM v.description);


-- ======================================================================
-- 4) Obory (Obor)
-- ======================================================================

-- Sjednocení číselníku Obor (školní předměty, blok C)
-- Description: Seed vložil kódy 01–14. Převádí kódy na znění číselníku PRAKTIK-AI_ciselniky.xlsx
--              (list Obor): obor.01–obor.17, a doplňuje chybějící obory 15–17
--              (Speciální pedagogika – obecná / – specializace, Ostatní).
--              Vazby kurzů a zdrojů jdou přes subject_id, takže se nemění.
-- Requires existing tables: course_subject
-- Idempotentní — lze spustit opakovaně.

UPDATE course_subject s
SET code = v.new_code, name = v.name, updated_at = now()
FROM (VALUES
  ('01', 'obor.01', 'Český jazyk a literatura'),
  ('02', 'obor.02', 'Cizí jazyky – obecné'),
  ('03', 'obor.03', 'Angličtina'),
  ('04', 'obor.04', 'Němčina'),
  ('05', 'obor.05', 'Primární vzdělávání'),
  ('06', 'obor.06', 'Tělesná výchova'),
  ('07', 'obor.07', 'Hudební výchova'),
  ('08', 'obor.08', 'Výtvarná výchova'),
  ('09', 'obor.09', 'Dramatická výchova'),
  ('10', 'obor.10', 'Dějepis'),
  ('11', 'obor.11', 'Společenské vědy'),
  ('12', 'obor.12', 'Občanská výchova a etika'),
  ('13', 'obor.13', 'Ochrana obyvatelstva'),
  ('14', 'obor.14', 'Mediální výchova'),
  ('15', 'obor.15', 'Speciální pedagogika – obecná'),
  ('16', 'obor.16', 'Speciální pedagogika – specializace'),
  ('17', 'obor.17', 'Ostatní')
) AS v(old_code, new_code, name)
WHERE s.code IN (v.old_code, v.new_code)
  AND s.is_active
  AND (s.code IS DISTINCT FROM v.new_code OR s.name IS DISTINCT FROM v.name);

INSERT INTO course_subject (code, name, is_active)
SELECT v.code, v.name, true
FROM (VALUES
  ('obor.01', 'Český jazyk a literatura'),
  ('obor.02', 'Cizí jazyky – obecné'),
  ('obor.03', 'Angličtina'),
  ('obor.04', 'Němčina'),
  ('obor.05', 'Primární vzdělávání'),
  ('obor.06', 'Tělesná výchova'),
  ('obor.07', 'Hudební výchova'),
  ('obor.08', 'Výtvarná výchova'),
  ('obor.09', 'Dramatická výchova'),
  ('obor.10', 'Dějepis'),
  ('obor.11', 'Společenské vědy'),
  ('obor.12', 'Občanská výchova a etika'),
  ('obor.13', 'Ochrana obyvatelstva'),
  ('obor.14', 'Mediální výchova'),
  ('obor.15', 'Speciální pedagogika – obecná'),
  ('obor.16', 'Speciální pedagogika – specializace'),
  ('obor.17', 'Ostatní')
) AS v(code, name)
WHERE NOT EXISTS (SELECT 1 FROM course_subject s WHERE s.code = v.code AND s.is_active);


-- ======================================================================
-- 5) Průřezové obory
-- ======================================================================

-- Sjednocení číselníku Průřezové obory
-- Description: Migrace 0002 a seed vložily kódy O001–O020 a část názvů a popisů useknutou
--              (cca na 60 znacích, navíc překlep „seberízené“). Převádí kódy na O01–O20
--              a texty na plné znění podle číselníku PRAKTIK-AI_ciselniky.xlsx (list Průřezové obory).
--              Vazby kurzů jdou přes cross_id, takže se nemění.
-- Requires existing tables: cross_subject (migrace 0002)
-- Idempotentní — lze spustit opakovaně.

UPDATE cross_subject c
SET code = v.new_code, name = v.name, description = v.description, updated_at = now()
FROM (VALUES
  ('O001', 'O01', 'AI gramotnost – technický základ', 'Jak fungují jazykové modely, tokeny, kontextové okno, pravděpodobnostní povaha výstupu.'),
  ('O002', 'O02', 'AI gramotnost – kritické posuzování výstupů', 'Rozpoznávání halucinací, ověřování faktů, srovnávání nástrojů a výstupů.'),
  ('O003', 'O03', 'Etika a odpovědné využití AI', 'Etické principy práce s AI ve vzdělávání, hranice akceptovatelného použití, transparentnost.'),
  ('O004', 'O04', 'Ochrana dat a soukromí ve výuce', 'GDPR, citlivá data žáků, bezpečné nakládání s informacemi v AI nástrojích.'),
  ('O005', 'O05', 'Rozvoj kritického myšlení', 'Vedení žáků ke kritickému uvažování, argumentaci, posuzování zdrojů — s podporou i navzdory AI.'),
  ('O006', 'O06', 'Metakognice a sebeřízené učení', 'Reflexe vlastního učení, uvědomování si procesu poznávání, strategie učení.'),
  ('O007', 'O07', 'Plánování výuky a tvorba scénářů', 'Návrh výukových jednotek, cíle, aktivity, role AI ve scénáři, časové rozvržení.'),
  ('O008', 'O08', 'Didaktická transformace obsahu', 'Převod oborového obsahu do podoby srozumitelné pro žáky daného stupně.'),
  ('O009', 'O09', 'Diferenciace a inkluze (žáci se SVP)', 'Práce s heterogenní třídou, individuální vzdělávací plány, AI jako podpora diferenciace.'),
  ('O010', 'O10', 'Hodnocení a zpětná vazba', 'Formativní i sumativní hodnocení, kvalitní zpětná vazba, rubriky, AI jako asistent hodnocení.'),
  ('O011', 'O11', 'Tvorba zadání a úloh (AI-resistant + AI-supported)', 'Design zadání odolných vůči zneužití AI a zároveň zadání využívajících AI jako nástroj učení.'),
  ('O012', 'O12', 'Práce s prekoncepty a miskoncepty', 'Diagnostika a práce s chybnými představami žáků, AI jako nástroj odhalování miskonceptů.'),
  ('O013', 'O13', 'Prostředí pro učení a klima třídy', 'Bezpečné prostředí, pravidla práce s AI ve třídě, kultura ne/používání AI.'),
  ('O014', 'O14', 'Motivace a vedení žáků', 'Vnitřní motivace, vedení diskuse, zapojování žáků, AI jako nástroj individualizace motivace.'),
  ('O015', 'O15', 'Komunikace s rodiči a zákonnými zástupci', 'Vysvětlování role AI ve výuce rodičům, řešení obav, společná dohoda o pravidlech.'),
  ('O016', 'O16', 'Profesní spolupráce a kolegiální učení', 'Sdílení dobré praxe, peer review, budování AI-gramotné školy jako celku.'),
  ('O017', 'O17', 'Mentoring a uvádění začínajících učitelů', 'Provázení nastupujících kolegů, mentorský dialog, integrace AI do mentorské praxe.'),
  ('O018', 'O18', 'Profesní sebepojetí a reflexe vlastní praxe', 'Vlastní identita učitele v éře AI, reflektivní praxe, profesní rozvoj.'),
  ('O019', 'O19', 'Duševní zdraví a wellbeing učitele', 'Práce s kognitivní zátěží, využití AI pro snížení administrativy, hranice pracovního času.'),
  ('O020', 'O20', 'Tvořivost a designové myšlení ve výuce', 'Tvořivé využití AI při návrhu výukových materiálů, design thinking v pedagogice.')
) AS v(old_code, new_code, name, description)
WHERE c.code IN (v.old_code, v.new_code)
  AND c.is_active
  AND (c.code IS DISTINCT FROM v.new_code OR c.name IS DISTINCT FROM v.name OR c.description IS DISTINCT FROM v.description);


-- ======================================================================
-- 6) Level (úroveň pokročilosti v práci s AI)
-- ======================================================================

-- Číselník Level (úroveň pokročilosti v práci s AI)
-- Description: Nová tabulka course_level s hodnotami level.1–3 podle číselníku
--              PRAKTIK-AI_ciselniky.xlsx (list Level) a nepovinný sloupec course.course_level_id.
--              Údaj není povinný, existující kurzy zůstávají bez levelu (NULL).
-- Requires existing tables: course
-- Idempotentní — lze spustit opakovaně.

CREATE TABLE IF NOT EXISTS course_level (
	level_id BIGINT GENERATED BY DEFAULT AS IDENTITY (START WITH 1),
	code VARCHAR(10) NOT NULL,
	name VARCHAR(200) NOT NULL,
	description VARCHAR(255) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	is_active BOOLEAN NOT NULL,
	PRIMARY KEY (level_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_level_code_active ON course_level (code) WHERE is_active;

INSERT INTO course_level (code, name, description, is_active)
SELECT v.code, v.name, v.description, true
FROM (VALUES
  ('level.1', 'Vstupní', 'Bez předchozí zkušenosti s AI'),
  ('level.2', 'Středně pokročilý', 'Základní orientace s AI'),
  ('level.3', 'Pokročilý', 'Aktivní práce s AI ve výuce')
) AS v(code, name, description)
WHERE NOT EXISTS (SELECT 1 FROM course_level l WHERE l.code = v.code AND l.is_active);

ALTER TABLE course ADD COLUMN IF NOT EXISTS course_level_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_course_level_id_fkey') THEN
        ALTER TABLE course ADD CONSTRAINT course_course_level_id_fkey
            FOREIGN KEY (course_level_id) REFERENCES course_level(level_id);
    END IF;
END $$;
