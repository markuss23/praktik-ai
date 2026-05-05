'use client';

import { useState } from 'react';
import { Trash2, Plus, ChevronUp, Upload, Info, GripVertical } from 'lucide-react';

// Rubrika kurzu
export function CourseRubric() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [garant, setGarant] = useState('');

  const [moduleCount, setModuleCount] = useState(8);
  const [minModulesForFinal, setMinModulesForFinal] = useState(6);
  const [badgeThreshold, setBadgeThreshold] = useState(75);

  const [practiceAvailable, setPracticeAvailable] = useState(true);
  const [assessmentAvailable, setAssessmentAvailable] = useState(true);
  const [courseFinalRequired, setCourseFinalRequired] = useState(true);

  const [questionFormulationOpen, setQuestionFormulationOpen] = useState(true);
  const [questionFormulationEnabled, setQuestionFormulationEnabled] = useState(true);
  const [qfPractice, setQfPractice] = useState(true);
  const [qfAssessment, setQfAssessment] = useState(true);
  const [qfCourseFinal, setQfCourseFinal] = useState(true);
  const [qfTopics, setQfTopics] = useState<string[]>([
    'Etika používání AI ve výuce',
    'Bezpečnost a ochrana osobních údajů',
    'Promptování a kritické myšlení',
  ]);
  const [newTopic, setNewTopic] = useState('');

  const [socraticOpen, setSocraticOpen] = useState(true);
  const [socraticEnabled, setSocraticEnabled] = useState(true);
  const [socraticTopic, setSocraticTopic] = useState('');
  const [socraticSteps, setSocraticSteps] = useState(4);
  const [socraticPrompt, setSocraticPrompt] = useState('');
  const [socraticMemory, setSocraticMemory] = useState(true);

  // Rubrika (hodnotící tabulka)
  const [rubricOpen, setRubricOpen] = useState(true);
  const [rubricEnabled, setRubricEnabled] = useState(true);
  const [rubricEvaluator, setRubricEvaluator] = useState<'ai' | 'lector' | 'both'>('both');
  const [rubricLevels, setRubricLevels] = useState<string[]>([
    'Nezačínající',
    'Rozvíjející se',
    'Pokročilé',
    'Expertní',
  ]);
  const [rubricCriteria, setRubricCriteria] = useState<{ name: string; descriptions: string[] }[]>([
    { name: 'Jasnost cílů', descriptions: ['', '', '', ''] },
    { name: 'Využití AI nástrojů', descriptions: ['', '', '', ''] },
    { name: 'Etická reflexe', descriptions: ['', '', '', ''] },
    { name: 'Praktická použitelnost', descriptions: ['', '', '', ''] },
  ]);

  const addRubricCriterion = () => {
    setRubricCriteria([
      ...rubricCriteria,
      { name: '', descriptions: rubricLevels.map(() => '') },
    ]);
  };
  const addRubricLevel = () => {
    const nextName = `Úroveň ${rubricLevels.length + 1}`;
    setRubricLevels([...rubricLevels, nextName]);
    setRubricCriteria(rubricCriteria.map(c => ({ ...c, descriptions: [...c.descriptions, ''] })));
  };
  const updateRubricCriterionName = (index: number, name: string) => {
    setRubricCriteria(rubricCriteria.map((c, i) => i === index ? { ...c, name } : c));
  };
  const updateRubricLevelName = (index: number, name: string) => {
    setRubricLevels(rubricLevels.map((l, i) => i === index ? name : l));
  };
  const updateRubricDescription = (criterionIndex: number, levelIndex: number, value: string) => {
    setRubricCriteria(rubricCriteria.map((c, i) => {
      if (i !== criterionIndex) return c;
      const descriptions = [...c.descriptions];
      descriptions[levelIndex] = value;
      return { ...c, descriptions };
    }));
  };

  // Artefakt (seminární práce)
  const [artifactOpen, setArtifactOpen] = useState(true);
  const [artifactEnabled, setArtifactEnabled] = useState(true);
  const [artifactTopic, setArtifactTopic] = useState('');
  const [artifactSections, setArtifactSections] = useState<{ title: string; description: string; enabled: boolean }[]>([
    { title: 'Úvod a kontext', description: 'Stručný úvod, vymezení problému, motivace.', enabled: true },
    { title: 'Analýza a rešerše', description: 'Přehled existujících přístupů a relevantních zdrojů.', enabled: false },
    { title: 'Vlastní návrh', description: 'Detailní popis navrhovaného řešení / aktivity.', enabled: false },
    { title: 'Reflexe a závěr', description: 'Vyhodnocení, limity a možnosti dalšího rozvoje.', enabled: false },
  ]);
  const [allowResubmission, setAllowResubmission] = useState(true);

  const addArtifactSection = () => {
    setArtifactSections([...artifactSections, { title: '', description: '', enabled: false }]);
  };
  const removeArtifactSection = (index: number) => {
    setArtifactSections(artifactSections.filter((_, i) => i !== index));
  };
  const toggleArtifactSection = (index: number) => {
    setArtifactSections(artifactSections.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s));
  };

  const addTopic = () => {
    const t = newTopic.trim();
    if (!t) return;
    setQfTopics([...qfTopics, t]);
    setNewTopic('');
  };

  const removeTopic = (index: number) => {
    setQfTopics(qfTopics.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Základní informace */}
      <section className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-black mb-1">Základní informace o kurzu</h3>
        <p className="text-xs sm:text-sm text-gray-500 mb-4">Obecné údaje, které se zobrazí studentům v katalogu.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Název kurzu</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Např. Základy práce s AI pro učitele"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Kategorie</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Vyberte kategorii"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Popis kurzu</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krátký popis, který uvidí studenti v katalogu..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Garant kurzu</label>
            <input
              type="text"
              value={garant}
              onChange={(e) => setGarant(e.target.value)}
              placeholder="Vyberte lektora / garanta"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Náhled kurzu</label>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <Upload size={14} />
              <span>Nahrát obrázek</span>
            </button>
          </div>
        </div>
      </section>

      {/* Struktura kurzu */}
      <section className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-black mb-1">Struktura kurzu</h3>
        <p className="text-xs sm:text-sm text-gray-500 mb-4">Definujte počet modulů a podmínky pro Course Final.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Počet modulů</label>
            <input
              type="number"
              min={1}
              max={20}
              value={moduleCount}
              onChange={(e) => setModuleCount(Number(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Minimální počet splněných modulů pro Course Final</label>
            <input
              type="number"
              min={1}
              max={moduleCount}
              value={minModulesForFinal}
              onChange={(e) => setMinModulesForFinal(Number(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Badge threshold (% úspěšnosti)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={badgeThreshold}
              onChange={(e) => setBadgeThreshold(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
            />
          </div>
        </div>

        <div className="space-y-4">
          <ToggleRow
            title="Practice modul dostupný"
            description="Studenti si mohou procvičovat bez hodnocení."
            checked={practiceAvailable}
            onChange={setPracticeAvailable}
          />
          <ToggleRow
            title="Assessment modul dostupný"
            description="Moduly s hodnocením, které se započítávají do průměru."
            checked={assessmentAvailable}
            onChange={setAssessmentAvailable}
          />
          <ToggleRow
            title="Course Final povinný"
            description="Studenti musí splnit závěrečnou část k získání certifikátu."
            checked={courseFinalRequired}
            onChange={setCourseFinalRequired}
          />
        </div>
      </section>

      {/* Interaktivní formáty */}
      <section className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-black mb-1">Interaktivní formáty</h3>
            <p className="text-xs sm:text-sm text-gray-500">Nakonfigurujte, které formáty budou studentům dostupné a v jakých modulech.</p>
          </div>
          <div className="flex flex-wrap gap-1.5 flex-shrink-0">
            <FormatPill label="PRACTICE" />
            <FormatPill label="ASSESSMENT" />
            <FormatPill label="COURSE FINAL" />
          </div>
        </div>

        {/* Formulace otázek */}
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          <CollapsibleHeader
            open={questionFormulationOpen}
            onToggle={() => setQuestionFormulationOpen(!questionFormulationOpen)}
            title="Formulace otázek"
            description="Student napíše 3 otázky k tématu. AI dává zpětnou vazbu (bez skóre)."
            switchChecked={questionFormulationEnabled}
            onSwitchChange={setQuestionFormulationEnabled}
          />

          {questionFormulationOpen && (
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Dostupnost</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                  <Checkbox label="Practice modul" checked={qfPractice} onChange={setQfPractice} />
                  <Checkbox label="Assessment modul" checked={qfAssessment} onChange={setQfAssessment} />
                  <Checkbox label="Course Final" checked={qfCourseFinal} onChange={setQfCourseFinal} />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Témata pro formulaci otázek (garant)</p>
                <div className="space-y-2">
                  {qfTopics.map((topic, index) => (
                    <div key={index} className="flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-md">
                      <span className="text-xs font-mono text-gray-400 w-6 flex-shrink-0">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm text-black flex-1 min-w-0 truncate">{topic}</span>
                      <button
                        type="button"
                        onClick={() => removeTopic(index)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        aria-label="Odebrat téma"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
                      placeholder="Nové téma..."
                      className="flex-1 px-3 py-2 border border-dashed border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
                    />
                    <button
                      type="button"
                      onClick={addTopic}
                      className="flex items-center gap-1 px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    >
                      <Plus size={14} />
                      <span>Přidat téma</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sokratický dialog */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <CollapsibleHeader
            open={socraticOpen}
            onToggle={() => setSocraticOpen(!socraticOpen)}
            title="Sokratický dialog"
            description="Chatový rozhovor 2–6 kroků. AI klade otázky, nedává verdikt. Vyžaduje konverzační paměť."
            switchChecked={socraticEnabled}
            onSwitchChange={setSocraticEnabled}
          />

          {socraticOpen && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Téma dialogu</label>
                  <input
                    type="text"
                    value={socraticTopic}
                    onChange={(e) => setSocraticTopic(e.target.value)}
                    placeholder="Např. Role učitele v době AI"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Počet kroků (2–6)</label>
                  <div className="flex gap-1">
                    {[2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSocraticSteps(n)}
                        className={`w-9 h-9 rounded-md text-sm font-medium transition-colors ${
                          socraticSteps === n
                            ? 'bg-[#1e1b4b] text-white border-[#1e1b4b]'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Úvodní prompt pro AI</label>
                <input
                  type="text"
                  value={socraticPrompt}
                  onChange={(e) => setSocraticPrompt(e.target.value)}
                  placeholder="AI zahájí dialog otázkou na studentův aktuální pohled na téma..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
                />
              </div>
              <ToggleRow
                title="Konverzační paměť"
                description="AI si pamatuje předchozí odpovědi a navazuje na ně."
                checked={socraticMemory}
                onChange={setSocraticMemory}
              />
            </div>
          )}
        </div>
      </section>

      {/* Rubrika (hodnotící tabulka) */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <CollapsibleHeader
          open={rubricOpen}
          onToggle={() => setRubricOpen(!rubricOpen)}
          title="Rubrika"
          description="Tabulka kritéria × úrovně hodnocení. Dostupná pouze v Course Final. Badge při ≥ 75 %."
          switchChecked={rubricEnabled}
          onSwitchChange={setRubricEnabled}
          variant="section"
        />

        {rubricOpen && (
          <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Počet řádků (kritérií)</label>
                <input
                  type="number"
                  min={1}
                  value={rubricCriteria.length}
                  onChange={(e) => {
                    const next = Math.max(1, Number(e.target.value) || 1);
                    if (next > rubricCriteria.length) {
                      const toAdd = next - rubricCriteria.length;
                      setRubricCriteria([
                        ...rubricCriteria,
                        ...Array.from({ length: toAdd }, () => ({ name: '', descriptions: rubricLevels.map(() => '') })),
                      ]);
                    } else {
                      setRubricCriteria(rubricCriteria.slice(0, next));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Počet sloupců (úrovně)</label>
                <input
                  type="number"
                  min={1}
                  value={rubricLevels.length}
                  onChange={(e) => {
                    const next = Math.max(1, Number(e.target.value) || 1);
                    if (next > rubricLevels.length) {
                      const toAdd = next - rubricLevels.length;
                      const newLevels = Array.from({ length: toAdd }, (_, i) => `Úroveň ${rubricLevels.length + i + 1}`);
                      setRubricLevels([...rubricLevels, ...newLevels]);
                      setRubricCriteria(rubricCriteria.map(c => ({
                        ...c,
                        descriptions: [...c.descriptions, ...Array.from({ length: toAdd }, () => '')],
                      })));
                    } else {
                      setRubricLevels(rubricLevels.slice(0, next));
                      setRubricCriteria(rubricCriteria.map(c => ({
                        ...c,
                        descriptions: c.descriptions.slice(0, next),
                      })));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kdo hodnotí</label>
                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                  {(['ai', 'lector', 'both'] as const).map((opt) => {
                    const labels = { ai: 'AI', lector: 'Lektor', both: 'Oba' };
                    const isActive = rubricEvaluator === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setRubricEvaluator(opt)}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                          isActive ? 'bg-[#1e1b4b] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {labels[opt]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-md">
              <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-700">
                Systém automaticky přidá dva sloupce navíc: Sebehodnocení (student) a Finální hodnocení (lektor).
                Výsledná tabulka bude mít {rubricLevels.length + 3} sloupců.
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Editor hodnotící tabulky</p>
              <div className="border border-gray-200 rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 min-w-[140px]">Kritérium</th>
                      {rubricLevels.map((level, i) => (
                        <th key={i} className="text-left px-3 py-2 text-xs font-medium text-gray-600 min-w-[140px]">
                          <input
                            type="text"
                            value={level}
                            onChange={(e) => updateRubricLevelName(i, e.target.value)}
                            className="w-full bg-transparent text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5"
                          />
                        </th>
                      ))}
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 min-w-[120px]">
                        <span className="inline-flex items-center gap-1.5">
                          Sebehodnocení
                          <span className="text-[9px] font-bold tracking-wide text-gray-500 bg-gray-200 rounded px-1 py-0.5">AUTO</span>
                        </span>
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 min-w-[120px]">
                        <span className="inline-flex items-center gap-1.5">
                          Lektor
                          <span className="text-[9px] font-bold tracking-wide text-gray-500 bg-gray-200 rounded px-1 py-0.5">AUTO</span>
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubricCriteria.map((criterion, ci) => (
                      <tr key={ci} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-3 py-2 align-top">
                          <input
                            type="text"
                            value={criterion.name}
                            onChange={(e) => updateRubricCriterionName(ci, e.target.value)}
                            placeholder="Název kritéria"
                            className="w-full text-sm font-medium text-black bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5"
                          />
                        </td>
                        {rubricLevels.map((_, li) => (
                          <td key={li} className="px-3 py-2 align-top">
                            <input
                              type="text"
                              value={criterion.descriptions[li] ?? ''}
                              onChange={(e) => updateRubricDescription(ci, li, e.target.value)}
                              placeholder="Popis úrovně..."
                              className="w-full text-xs text-gray-600 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center text-gray-300 text-sm">—</td>
                        <td className="px-3 py-2 text-center text-gray-300 text-sm">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={addRubricCriterion}
                  className="flex items-center gap-1 px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Plus size={14} />
                  <span>Přidat kritérium</span>
                </button>
                <button
                  type="button"
                  onClick={addRubricLevel}
                  className="flex items-center gap-1 px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Plus size={14} />
                  <span>Přidat úroveň</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Artefakt (seminární práce) */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <CollapsibleHeader
          open={artifactOpen}
          onToggle={() => setArtifactOpen(!artifactOpen)}
          title="Artefakt"
          description="Student vyplňuje sekce šablony (seminární práce). AI hodnocení + badge při ≥ 75 %. Pouze Course Final."
          switchChecked={artifactEnabled}
          onSwitchChange={setArtifactEnabled}
          variant="section"
          rightContent={(
            <div className="hidden sm:flex flex-wrap gap-1.5">
              <FormatPill label="PRACTICE" muted />
              <FormatPill label="ASSESSMENT" muted />
              <FormatPill label="COURSE FINAL" />
            </div>
          )}
        />

        {artifactOpen && (
          <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Téma seminární práce</label>
              <input
                type="text"
                value={artifactTopic}
                onChange={(e) => setArtifactTopic(e.target.value)}
                placeholder="Např. Návrh didaktické aktivity s využitím AI pro předmět dle vaší aprobace"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Sekce šablony</p>
              <div className="space-y-2">
                {artifactSections.map((section, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 px-3 py-3 border border-gray-200 rounded-md hover:border-gray-300 transition-colors"
                  >
                    <GripVertical size={16} className="text-gray-300 mt-0.5 flex-shrink-0 cursor-grab" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => setArtifactSections(artifactSections.map((s, i) => i === index ? { ...s, title: e.target.value } : s))}
                        placeholder="Název sekce"
                        className="w-full text-sm font-semibold text-black bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5"
                      />
                      <input
                        type="text"
                        value={section.description}
                        onChange={(e) => setArtifactSections(artifactSections.map((s, i) => i === index ? { ...s, description: e.target.value } : s))}
                        placeholder="Popis sekce..."
                        className="w-full text-xs text-gray-500 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {section.enabled && (
                        <Switch checked={section.enabled} onChange={() => toggleArtifactSection(index)} />
                      )}
                      <button
                        type="button"
                        onClick={() => removeArtifactSection(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        aria-label="Odebrat sekci"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addArtifactSection}
                  className="w-full flex items-center justify-center gap-1 px-3 py-3 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Plus size={14} />
                  <span>Přidat sekci</span>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md px-3 py-3">
              <ToggleRow
                title="Povolit opakované odevzdání"
                description="Pokud lektor neuzná práci, student ji může přepracovat a odevzdat znovu."
                checked={allowResubmission}
                onChange={setAllowResubmission}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-black">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function CollapsibleHeader({
  open,
  onToggle,
  title,
  description,
  switchChecked,
  onSwitchChange,
  variant = 'inner',
  rightContent,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  description: string;
  switchChecked: boolean;
  onSwitchChange: (v: boolean) => void;
  variant?: 'inner' | 'section';
  rightContent?: React.ReactNode;
}) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };
  const padding = variant === 'section'
    ? 'px-4 py-3 sm:px-6 sm:py-4'
    : 'px-4 py-3';
  const bg = variant === 'section'
    ? 'hover:bg-gray-50'
    : 'bg-gray-50 hover:bg-gray-100';
  const titleClass = variant === 'section'
    ? 'text-base sm:text-lg font-semibold text-black'
    : 'text-sm font-semibold text-black';
  const descClass = variant === 'section'
    ? 'text-xs sm:text-sm text-gray-500 mt-0.5'
    : 'text-xs text-gray-500 mt-0.5';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKey}
      aria-expanded={open}
      className={`w-full flex items-center justify-between gap-3 ${padding} ${bg} transition-colors text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1`}
    >
      <div className="min-w-0 flex-1">
        <h4 className={titleClass}>{title}</h4>
        <p className={descClass}>{description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {rightContent}
        <Switch checked={switchChecked} onChange={onSwitchChange} stopPropagation />
        <ChevronUp
          size={16}
          className={`text-gray-400 transition-transform ${open ? '' : 'rotate-180'}`}
        />
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  stopPropagation,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  stopPropagation?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${
        checked ? 'bg-[#1e1b4b]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span
        className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
          checked ? 'bg-[#1e1b4b] border-[#1e1b4b]' : 'border-gray-300 bg-white'
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className="text-sm text-black">{label}</span>
    </label>
  );
}

function FormatPill({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border text-[10px] font-semibold tracking-wide ${
        muted ? 'border-gray-200 text-gray-400' : 'border-gray-200 text-gray-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${muted ? 'bg-gray-300' : 'bg-[#1e1b4b]'}`} />
      {label}
    </span>
  );
}

export default CourseRubric;
