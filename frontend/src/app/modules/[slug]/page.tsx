'use client';

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getModule, getCourse, getModules, learnBlocksChat } from "@/lib/api-client";
import type { Module, Course } from "@/api";
import { CheckCircle, XCircle, SendHorizontal, BookOpenText, Dumbbell, Bot, X, UserRound } from "lucide-react";

type TabType = 'prirucka' | 'procvicovani';

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const moduleId = Number(slug);

  // Data state
  const [module, setModule] = useState<Module | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab & handbook navigation
  const [activeTab, setActiveTab] = useState<TabType>('prirucka');
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [handbookCompleted, setHandbookCompleted] = useState(false);

  // Test state
  const [testAnswers, setTestAnswers] = useState<Record<number, number | string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // AI Tutor state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Ahoj! 👋 Jsem tvůj AI asistent. Máš nějaké otázky k tomuto modulu nebo potřebuješ pomoc s přípravou do výuky?' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Data loading
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (isNaN(moduleId)) { setError('Modul nebyl nalezen.'); return; }

        const moduleData = await getModule(moduleId);
        setModule(moduleData);

        const courseData = await getCourse(moduleData.courseId);
        setCourse(courseData);

        if (courseData.modules && courseData.modules.length > 0) {
          setAllModules(courseData.modules.filter(m => m.isActive).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
        } else {
          const modulesData = await getModules({ courseId: moduleData.courseId });
          setAllModules(modulesData.filter(m => m.isActive).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
        }
      } catch (err) {
        console.error('Failed to fetch module data:', err);
        setError('Nepodařilo se načíst data modulu.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [moduleId]);

  // Hide key concepts sections after content renders
  useEffect(() => {
    if (!contentRef.current) return;
    const elements = contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b, p');
    elements.forEach(el => {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (
        text.startsWith('klíčové koncepty') ||
        text.startsWith('klíčové pojmy') ||
        text === 'klíčové koncepty' ||
        text === 'klíčové pojmy' ||
        text === 'key concepts'
      ) {
        (el as HTMLElement).style.display = 'none';
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
          let next = el.nextElementSibling;
          while (next && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(next.tagName)) {
            (next as HTMLElement).style.display = 'none';
            next = next.nextElementSibling;
          }
        }
      }
    });
  }, [currentBlockIndex, activeTab, module]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    const el = chatEndRef.current;
    if (el?.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [chatMessages, isAiTyping]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F0F0' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Načítání modulu...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !module) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F0F0' }}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Modul nebyl nalezen.'}</p>
          <Link href="/" className="text-purple-600 hover:underline">← Zpět na přehled</Link>
        </div>
      </div>
    );
  }

  // Computed data
  const learnBlocks = (module.learnBlocks ?? []).sort((a, b) => a.position - b.position);
  const practiceQuestions = (module.practiceQuestions ?? []).sort((a, b) => a.position - b.position);
  const totalBlocks = learnBlocks.length;
  const currentBlock = learnBlocks[currentBlockIndex];

  const currentIndex = allModules.findIndex(m => m.moduleId === module.moduleId);
  const prevModule = currentIndex > 0 ? allModules[currentIndex - 1] : null;
  const nextModule = currentIndex < allModules.length - 1 ? allModules[currentIndex + 1] : null;

  const practiceCompleted = testSubmitted;
  const canCompleteModule = handbookCompleted && practiceCompleted;

  // Handlers
  const handleContinue = () => {
    if (activeTab === 'prirucka') {
      if (currentBlockIndex < totalBlocks - 1) {
        setCurrentBlockIndex(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setHandbookCompleted(true);
        setActiveTab('procvicovani');
      }
    }
  };

  const handlePrevBlock = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAnswerChange = (questionId: number, value: number | string) => {
    setTestAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleTestSubmit = () => {
    setTestSubmitted(true);
  };

  const handleCompleteModule = () => {
    if (nextModule) {
      router.push(`/modules/${nextModule.moduleId}`);
    } else if (course) {
      router.push(`/courses/${course.courseId}`);
    }
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim() || isAiTyping) return;
    const msg = chatMessage.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatMessage('');
    setIsAiTyping(true);
    try {
      const blockId = currentBlock?.learnId;
      if (!blockId) throw new Error('No learn block');
      const response = await learnBlocksChat(blockId, msg);
      setChatMessages(prev => [...prev, { role: 'ai', text: response.answer }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Omlouvám se, nepodařilo se spojit s AI tutorem. Zkuste to prosím znovu.' }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Score calculation for evaluation
  const calculateScore = () => {
    let correct = 0;
    const results: { questionId: number; isCorrect: boolean; userAnswer: string; correctAnswer: string; question: string; matchedKeywords?: string[]; missingKeywords?: string[] }[] = [];
    practiceQuestions.forEach(q => {
      const answer = testAnswers[q.questionId];
      let isCorrect = false;
      let userAnswerText = '';
      const correctAnswerText = q.correctAnswer || q.exampleAnswer || '';
      let matchedKeywords: string[] | undefined;
      let missingKeywords: string[] | undefined;

      if (q.questionType === 'closed') {
        const selectedOption = (q.closedOptions ?? []).find(o => o.optionId === answer);
        userAnswerText = selectedOption?.text || '';
        isCorrect = !!(q.correctAnswer && userAnswerText === q.correctAnswer);
      } else {
        userAnswerText = String(answer || '');
        const keywords = (q.openKeywords ?? []).map(k => k.keyword);
        if (keywords.length > 0) {
          const lowerAnswer = userAnswerText.toLowerCase();
          matchedKeywords = keywords.filter(kw => lowerAnswer.includes(kw.toLowerCase()));
          missingKeywords = keywords.filter(kw => !lowerAnswer.includes(kw.toLowerCase()));
          isCorrect = matchedKeywords.length > 0;
        } else {
          isCorrect = userAnswerText.trim().length > 0;
        }
      }

      if (isCorrect) correct++;
      results.push({
        questionId: q.questionId,
        isCorrect,
        userAnswer: userAnswerText,
        correctAnswer: correctAnswerText,
        question: q.question,
        matchedKeywords,
        missingKeywords,
      });
    });
    return { correct, total: practiceQuestions.length, results };
  };

  // Tab configuration (Test tab hidden, Procvičování now holds the test questions)
  const tabs: { key: TabType; label: string; sublabel: string; locked?: boolean; completed?: boolean; icon: React.ReactNode }[] = [
    {
      key: 'prirucka',
      label: 'Příručka',
      sublabel: 'učebnice a metodická příručka',
      completed: handbookCompleted,
      icon: <BookOpenText className="w-5 h-5" />,
    },
    {
      key: 'procvicovani',
      label: 'Procvičování',
      sublabel: 'Zkus si svoje znalosti v praxi',
      completed: practiceCompleted,
      locked: !handbookCompleted,
      icon: <Dumbbell className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F0F0' }}>
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 lg:px-[100px] py-4" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <p className="text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          {' / '}
          <Link href={`/courses/${course?.courseId}`} className="hover:text-gray-700">{course?.title}</Link>
          {' / '}
          <span className="text-gray-700">{module.title}</span>
        </p>
      </div>

      {/* Main Layout */}
      <div className="px-4 sm:px-6 lg:px-[100px] pb-8" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="sticky top-8 space-y-4">
              {/* Module tabs card */}
              <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #e5e7eb' }}>
                <div className="mb-4">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Modul {currentIndex + 1}</span>
                  <h2 className="text-lg font-bold text-gray-900 mt-1">{module.title}</h2>
                </div>

                <div className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        if (!tab.locked) setActiveTab(tab.key);
                      }}
                      className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-start gap-3 ${
                        activeTab === tab.key
                          ? 'border'
                          : tab.locked
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:bg-gray-50'
                      }`}
                      style={activeTab === tab.key ? { backgroundColor: 'rgba(138, 56, 245, 0.2)', borderColor: 'rgba(138, 56, 245, 0.3)' } : undefined}
                      disabled={tab.locked}
                    >
                      <span className="mt-0.5 text-black">
                        {tab.completed ? <CheckCircle className="w-5 h-5 text-green-500" /> : tab.icon}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-black">
                          {tab.label}
                        </div>
                        <div className="text-xs text-black" style={{ opacity: 0.5 }}>
                          {tab.sublabel}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Tutor card */}
              <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                {/* Tutor Header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-gray-700" />
                    <span className="font-semibold text-gray-900 text-sm">AI Tutor</span>
                  </div>
                  {chatOpen && (
                    <button
                      onClick={() => setChatOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Chat area */}
                {chatOpen ? (
                  <>
                    {/* Chat Messages */}
                    <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto border-t border-gray-100 bg-white">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'ai' && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: '#EFEFEF' }}>
                              <Bot className="w-4 h-4 text-black" />
                            </div>
                          )}
                          <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                            msg.role === 'user'
                              ? 'text-white rounded-br-sm'
                              : 'text-black rounded-bl-sm'
                          }`}
                            style={{ backgroundColor: msg.role === 'user' ? '#000000' : '#EFEFEF' }}
                          >
                            {msg.text}
                          </div>
                          {msg.role === 'user' && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: '#EFEFEF' }}>
                              <UserRound className="w-4 h-4 text-black" />
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Loading bubble */}
                      {isAiTyping && (
                        <div className="flex items-end gap-2 justify-start">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#EFEFEF' }}>
                            <Bot className="w-4 h-4 text-black" />
                          </div>
                          <div className="rounded-2xl px-4 py-3 rounded-bl-sm" style={{ backgroundColor: '#EFEFEF' }}>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Suggested questions */}
                    {chatMessages.length <= 1 && (
                      <div className="px-4 pb-2 flex flex-wrap gap-1.5 bg-white">
                        <button
                          onClick={() => {
                            const suggestion = 'Jak můžu využít AI pro diferenciaci výuky?';
                            setChatMessages(prev => [...prev, { role: 'user', text: suggestion }]);
                            setIsAiTyping(true);
                            const blockId = currentBlock?.learnId;
                            if (blockId) {
                              learnBlocksChat(blockId, suggestion)
                                .then(res => setChatMessages(prev => [...prev, { role: 'ai', text: res.answer }]))
                                .catch(() => setChatMessages(prev => [...prev, { role: 'ai', text: 'Omlouvám se, nepodařilo se spojit s AI tutorem.' }]))
                                .finally(() => setIsAiTyping(false));
                            } else {
                              setIsAiTyping(false);
                            }
                          }}
                          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                        >
                          Jak můžu využít AI pro diferenciaci výuky?
                        </button>
                      </div>
                    )}

                    {/* Chat Input */}
                    <div className="px-3 py-3 border-t border-gray-100 bg-white">
                      <div
                        className="flex items-center justify-between border border-gray-300 mx-auto"
                        style={{ maxWidth: 280, height: 50, borderRadius: 100, paddingTop: 4, paddingBottom: 4, paddingLeft: 12, paddingRight: 12 }}
                      >
                        <input
                          type="text"
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                          placeholder="Jak komunikovat s AI?"
                          className="flex-grow bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none min-w-0"
                        />
                        <button
                          onClick={handleSendChat}
                          disabled={!chatMessage.trim() || isAiTyping}
                          className={`flex-shrink-0 transition-all ${
                            chatMessage.trim() && !isAiTyping ? 'text-black hover:opacity-70' : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <SendHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Collapsed state - click to open */
                  <button
                    onClick={() => setChatOpen(true)}
                    className="w-full px-4 py-3 border-t border-gray-100 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#EFEFEF' }}>
                        <Bot className="w-4 h-4 text-black" />
                      </div>
                      <p className="text-sm text-gray-600 leading-snug">
                        Ahoj! 👋 Jsem tvůj AI asistent. Máš nějaké otázky k tomuto modulu?
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-grow min-w-0">
            <div className="bg-white rounded-lg p-6 sm:p-10" style={{ border: '1px solid #e5e7eb' }}>

              {/* ===== PŘÍRUČKA TAB ===== */}
              {activeTab === 'prirucka' && (
                <>
                  {currentBlock ? (
                    <>
                      {/* Block header */}
                      <div className="mb-6 pb-4 border-b border-gray-100">
                        <span className="text-sm text-gray-500">
                          Stránka {currentBlockIndex + 1} z {totalBlocks}
                        </span>
                      </div>

                      {/* Block content */}
                      <div
                        ref={contentRef}
                        className="module-content"
                        dangerouslySetInnerHTML={{ __html: currentBlock.content }}
                      />

                      {/* Navigation buttons */}
                      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                        <button
                          onClick={handlePrevBlock}
                          disabled={currentBlockIndex === 0}
                          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                            currentBlockIndex === 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                          </svg>
                          Předchozí
                        </button>

                        <button
                          onClick={handleContinue}
                          className="inline-flex items-center gap-2 text-white font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 hover:shadow-md"
                          style={{ backgroundColor: '#00C896' }}
                        >
                          {currentBlockIndex < totalBlocks - 1 ? 'Pokračovat' : 'Dokončit příručku'}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <p className="text-lg font-medium">Obsah příručky zatím není k dispozici</p>
                      <p className="text-sm mt-1">Obsah bude brzy doplněn.</p>
                    </div>
                  )}
                </>
              )}

              {/* ===== PROCVIČOVÁNÍ TAB (practice questions) ===== */}
              {activeTab === 'procvicovani' && (
                <>
                  {testSubmitted ? (
                    /* Evaluation view */
                    (() => {
                      const { correct, total, results } = calculateScore();
                      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
                      const passed = percentage >= 50;
                      return (
                        <div>
                          <div className="text-center mb-8">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                              passed ? 'bg-green-50' : 'bg-red-50'
                            }`}>
                              {passed ? (
                                <CheckCircle className="w-12 h-12 text-green-500" />
                              ) : (
                                <XCircle className="w-12 h-12 text-red-400" />
                              )}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-1">Vyhodnocení</h3>
                            <p className={`text-lg font-semibold ${passed ? 'text-green-600' : 'text-red-500'}`}>
                              {correct}/{total} správně ({percentage}%)
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {passed ? 'Gratulujeme! Úspěšně jste prošli procvičováním.' : 'Bohužel jste neprošli. Zkuste to znovu.'}
                            </p>
                          </div>

                          <div className="space-y-4 mb-8">
                            {results.map((r, idx) => (
                              <div key={r.questionId}
                                className={`p-4 rounded-lg border ${r.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-grow">
                                    <p className="font-medium text-gray-800 text-sm">
                                      {idx + 1}. {r.question}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Vaše odpověď: <span className="font-medium">{r.userAnswer || '(bez odpovědi)'}</span>
                                    </p>
                                    {!r.isCorrect && r.correctAnswer && !r.missingKeywords && (
                                      <p className="text-sm text-green-700 mt-1">
                                        Správná odpověď: <span className="font-medium">{r.correctAnswer}</span>
                                      </p>
                                    )}
                                    {r.matchedKeywords && r.matchedKeywords.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {r.matchedKeywords.map(kw => (
                                          <span key={kw} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                            <CheckCircle className="w-3 h-3" /> {kw}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {r.missingKeywords && r.missingKeywords.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {r.missingKeywords.map(kw => (
                                          <span key={kw} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                            <XCircle className="w-3 h-3" /> {kw}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                            <button
                              onClick={() => { setTestSubmitted(false); setTestAnswers({}); }}
                              className="text-gray-600 hover:text-gray-800 font-medium text-sm"
                            >
                              Zkusit znovu
                            </button>
                            <button
                              onClick={handleCompleteModule}
                              disabled={!passed}
                              className={`inline-flex items-center gap-2 font-semibold py-2.5 px-6 rounded-md transition-all ${
                                passed ? 'text-white hover:opacity-90' : 'text-gray-400 cursor-not-allowed'
                              }`}
                              style={{ backgroundColor: passed ? '#00C896' : '#D1D5DB' }}
                            >
                              {nextModule ? 'Další modul' : 'Dokončit modul'}
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={passed && nextModule ? "M13 7l5 5m0 0l-5 5m5-5H6" : "M5 13l4 4L19 7"} />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* Practice questions */
                    <div>
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Procvičování</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Odpovězte na otázky a ověřte si své znalosti z příručky.
                        </p>
                      </div>

                      <div className="space-y-8">
                        {practiceQuestions.map((q, qIdx) => (
                          <div key={q.questionId} className="pb-6 border-b border-gray-100 last:border-b-0">
                            <p className="font-semibold text-gray-800 mb-3">
                              <span className="text-purple-600 mr-2">{qIdx + 1}.</span>
                              {q.question}
                            </p>

                            {q.questionType === 'closed' && q.closedOptions && (
                              <div className="space-y-2 ml-6">
                                {[...q.closedOptions].sort((a, b) => a.position - b.position).map(opt => (
                                  <label
                                    key={opt.optionId}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                      testAnswers[q.questionId] === opt.optionId
                                        ? 'border-purple-300 bg-purple-50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`q-${q.questionId}`}
                                      value={opt.optionId}
                                      checked={testAnswers[q.questionId] === opt.optionId}
                                      onChange={() => handleAnswerChange(q.questionId, opt.optionId)}
                                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-700">{opt.text}</span>
                                  </label>
                                ))}
                              </div>
                            )}

                            {q.questionType === 'open' && (
                              <div className="ml-6">
                                <textarea
                                  value={String(testAnswers[q.questionId] || '')}
                                  onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
                                  placeholder="Napište svou odpověď..."
                                  rows={3}
                                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 resize-none"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {practiceQuestions.length > 0 && (
                        <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
                          <button
                            onClick={handleTestSubmit}
                            className="inline-flex items-center gap-2 text-white font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90"
                            style={{ backgroundColor: '#8B5BA8' }}
                          >
                            Odevzdat
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {practiceQuestions.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-lg font-medium">Žádné otázky k procvičování</p>
                          <p className="text-sm mt-1">Otázky pro tento modul zatím nebyly vytvořeny.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Navigation - commented out per request */}
            {/*
            <div className="flex items-center justify-between mt-6">
              <Link
                href={prevModule ? `/modules/${prevModule.moduleId}` : `/courses/${course?.courseId}`}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                {prevModule ? `Předchozí modul` : 'Zpět na přehled'}
              </Link>

              {nextModule ? (
                <Link
                  href={`/modules/${nextModule.moduleId}`}
                  className={`inline-flex items-center gap-2 font-semibold py-2.5 px-6 rounded-md transition-colors ${
                    canCompleteModule ? 'text-white hover:opacity-90' : 'text-gray-400 cursor-not-allowed pointer-events-none'
                  }`}
                  style={{ backgroundColor: canCompleteModule ? '#00C896' : '#D1D5DB' }}
                  aria-disabled={!canCompleteModule}
                >
                  Další modul
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              ) : (
                <Link
                  href={`/courses/${course?.courseId}`}
                  className={`inline-flex items-center gap-2 font-semibold py-2.5 px-6 rounded-md transition-colors ${
                    canCompleteModule ? 'text-white hover:opacity-90' : 'text-gray-400 cursor-not-allowed pointer-events-none'
                  }`}
                  style={{ backgroundColor: canCompleteModule ? '#00C896' : '#D1D5DB' }}
                  aria-disabled={!canCompleteModule}
                >
                  Dokončit kurz
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </Link>
              )}
            </div>
            */}
          </div>
        </div>
      </div>
    </div>
  );
}
