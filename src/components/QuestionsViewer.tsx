import { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Circle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  LayoutList,
  Layers,
  SlidersHorizontal,
  Code,
  PenTool,
  Send,
  Eye,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { DirectionId, Question, SubTrackId, UserProgress } from '../types';
import { DIRECTIONS } from '../data/directions';
import { FlashcardsTrainer } from './FlashcardsTrainer';
import { SelfCheckTrainer } from './SelfCheckTrainer';
import { triggerHaptic } from '../lib/telegram';

interface QuestionsViewerProps {
  questions: Question[];
  userProgress: UserProgress;
  onToggleQuestion: (questionId: string) => void;
  onMarkRepeat: (questionId: string) => void;
  onMarkLearned: (questionId: string) => void;
}

export const QuestionsViewer: React.FC<QuestionsViewerProps> = ({
  questions,
  userProgress,
  onToggleQuestion,
  onMarkRepeat,
  onMarkLearned,
}) => {
  const [viewMode, setViewMode] = useState<'accordion' | 'self_check' | 'flashcards'>('self_check');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDirection, setSelectedDirection] = useState<DirectionId | 'all'>('all');
  const [selectedSubTrack, setSelectedSubTrack] = useState<SubTrackId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'repeat' | 'completed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inlineAnswers, setInlineAnswers] = useState<Record<string, string>>({});
  const [inlineChecked, setInlineChecked] = useState<Record<string, boolean>>({});

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    // Direction filter
    if (selectedDirection !== 'all' && q.directionId !== selectedDirection) {
      return false;
    }

    // Sub-track filter
    if (
      selectedSubTrack !== 'all' &&
      q.subTrackId !== selectedSubTrack &&
      q.subTrackId !== 'core'
    ) {
      return false;
    }

    // Status filter
    if (statusFilter === 'completed' && !userProgress.completedQuestions.includes(q.id)) {
      return false;
    }
    if (statusFilter === 'repeat' && !userProgress.repeatQuestions.includes(q.id)) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const matchTitle = q.title.toLowerCase().includes(qLower);
      const matchQuestion = q.question.toLowerCase().includes(qLower);
      const matchAnswer = q.answer.toLowerCase().includes(qLower);
      const matchCategory = q.category.toLowerCase().includes(qLower);
      return matchTitle || matchQuestion || matchAnswer || matchCategory;
    }

    return true;
  });

  const completedCount = questions.filter((q) =>
    userProgress.completedQuestions.includes(q.id)
  ).length;

  const repeatCount = questions.filter((q) =>
    userProgress.repeatQuestions.includes(q.id)
  ).length;

  const handleToggle = (id: string) => {
    triggerHaptic('selection');
    onToggleQuestion(id);
    if (!userProgress.completedQuestions.includes(id)) {
      confetti({ particleCount: 40, spread: 50 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats - Minimalist Tech */}
      <div className="rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors cyber-corner
        dark:bg-[#0c101c]/90 dark:border dark:border-cyan-500/20
        light:bg-white light:border light:border-slate-200 light:shadow-sm"
      >
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 font-sans dark:text-white light:text-slate-900">
              Тренажёр вопросов к собеседованию
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono
              dark:bg-cyan-500/15 dark:text-cyan-300 dark:border dark:border-cyan-500/30
              light:bg-sky-50 light:text-sky-800 light:border light:border-sky-200"
            >
              {questions.length} вопросов
            </span>
          </div>
          <p className="text-xs leading-relaxed dark:text-slate-300 light:text-slate-600">
            Реальные вопросы с интервью стажёров: пишите ответ, сверяйте с эталоном и тренируйте насмотренность.
          </p>
        </div>

        {/* View Mode Switcher: 3 Modes */}
        <div className="flex items-center p-1 rounded-xl shrink-0 font-mono text-xs transition-colors
          dark:bg-[#06080f] dark:border dark:border-slate-800
          light:bg-slate-100 light:border light:border-slate-200"
        >
          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('self_check');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'self_check'
                ? 'dark:bg-cyan-500/25 dark:text-cyan-300 dark:border dark:border-cyan-500/40 dark:shadow-[0_0_12px_rgba(0,240,255,0.2)] light:bg-slate-900 light:text-white shadow-sm'
                : 'dark:text-slate-400 dark:hover:text-slate-200 light:text-slate-600 light:hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Самопроверка</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('accordion');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'accordion'
                ? 'dark:bg-cyan-500/25 dark:text-cyan-300 dark:border dark:border-cyan-500/40 dark:shadow-[0_0_12px_rgba(0,240,255,0.2)] light:bg-slate-900 light:text-white shadow-sm'
                : 'dark:text-slate-400 dark:hover:text-slate-200 light:text-slate-600 light:hover:text-slate-900'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Список</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('flashcards');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'flashcards'
                ? 'dark:bg-cyan-500/25 dark:text-cyan-300 dark:border dark:border-cyan-500/40 dark:shadow-[0_0_12px_rgba(0,240,255,0.2)] light:bg-slate-900 light:text-white shadow-sm'
                : 'dark:text-slate-400 dark:hover:text-slate-200 light:text-slate-600 light:hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Карточки</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl p-4 space-y-3 transition-colors cyber-corner
        dark:bg-[#0c101c]/90 dark:border dark:border-cyan-500/20
        light:bg-white light:border light:border-slate-200 light:shadow-sm"
      >
        {/* Row 1: Search + Status tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 dark:text-slate-500 light:text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по вопросу, ключевому слову или коду..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm font-mono transition-colors focus:outline-none
                dark:bg-[#06080f] dark:border dark:border-slate-800 dark:focus:border-cyan-400 dark:text-slate-100 dark:placeholder:text-slate-600
                light:bg-slate-50 light:border light:border-slate-200 light:focus:border-sky-500 light:text-slate-900 light:placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0 font-mono">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                statusFilter === 'all'
                  ? 'dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-400 light:bg-slate-900 light:text-white light:border-slate-900 shadow-sm'
                  : 'dark:bg-[#06080f] dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200 light:bg-slate-50 light:border-slate-200 light:text-slate-600 light:hover:text-slate-900'
              }`}
            >
              Все ({questions.length})
            </button>
            <button
              onClick={() => setStatusFilter('repeat')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                statusFilter === 'repeat'
                  ? 'dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400 light:bg-amber-600 light:text-white light:border-amber-600 shadow-sm'
                  : 'dark:bg-[#06080f] dark:border-slate-800 dark:text-amber-400/80 dark:hover:text-amber-300 light:bg-slate-50 light:border-slate-200 light:text-amber-700 light:hover:text-amber-800'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Повторить ({repeatCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                statusFilter === 'completed'
                  ? 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400 light:bg-emerald-600 light:text-white light:border-emerald-600 shadow-sm'
                  : 'dark:bg-[#06080f] dark:border-slate-800 dark:text-emerald-400/80 dark:hover:text-emerald-300 light:bg-slate-50 light:border-slate-200 light:text-emerald-700 light:hover:text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Изучено ({completedCount})</span>
            </button>
          </div>
        </div>

        {/* Row 2: Directions pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 font-mono">
          <button
            onClick={() => {
              setSelectedDirection('all');
              setSelectedSubTrack('all');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              selectedDirection === 'all'
                ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white light:bg-slate-900 light:text-white'
                : 'dark:bg-[#06080f]/70 dark:text-slate-400 dark:hover:text-slate-200 light:bg-slate-100 light:text-slate-600 light:hover:text-slate-900'
            }`}
          >
            Все направления
          </button>
          {DIRECTIONS.map((dir) => (
            <button
              key={dir.id}
              onClick={() => {
                setSelectedDirection(dir.id);
                setSelectedSubTrack('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedDirection === dir.id
                  ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white light:bg-slate-900 light:text-white'
                  : 'dark:bg-[#06080f]/70 dark:text-slate-400 dark:hover:text-slate-200 light:bg-slate-100 light:text-slate-600 light:hover:text-slate-900'
              }`}
            >
              {dir.title.split('-')[0]}
            </button>
          ))}
        </div>

        {/* Row 3: Sub-tracks pills if direction chosen */}
        {selectedDirection !== 'all' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t dark:border-slate-800/60 light:border-slate-200 font-mono">
            <button
              onClick={() => setSelectedSubTrack('all')}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                selectedSubTrack === 'all'
                  ? 'dark:bg-cyan-500/20 dark:text-cyan-300 dark:border dark:border-cyan-400/40 light:bg-slate-900 light:text-white'
                  : 'dark:text-slate-400 dark:hover:text-slate-200 light:text-slate-500 light:hover:text-slate-800'
              }`}
            >
              Все ветки
            </button>
            {DIRECTIONS.find((d) => d.id === selectedDirection)?.subTracks.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedSubTrack(st.id)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  selectedSubTrack === st.id
                    ? 'dark:bg-cyan-500/20 dark:text-cyan-300 dark:border dark:border-cyan-400/40 light:bg-slate-900 light:text-white'
                    : 'dark:text-slate-400 dark:hover:text-slate-200 light:text-slate-500 light:hover:text-slate-800'
                }`}
              >
                {st.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content: Self-Check Trainer, Flashcards, or Accordion */}
      {viewMode === 'self_check' ? (
        <SelfCheckTrainer
          questions={filteredQuestions}
          userProgress={userProgress}
          userAnswers={inlineAnswers}
          submittedQuestions={inlineChecked}
          onAnswerChange={(qid, ans) => setInlineAnswers((prev) => ({ ...prev, [qid]: ans }))}
          onSubmitQuestion={(qid) => setInlineChecked((prev) => ({ ...prev, [qid]: true }))}
          onResetQuestion={(qid) => setInlineChecked((prev) => ({ ...prev, [qid]: false }))}
          onMarkLearned={onMarkLearned}
          onMarkRepeat={onMarkRepeat}
        />
      ) : viewMode === 'flashcards' ? (
        <FlashcardsTrainer
          questions={filteredQuestions}
          userProgress={userProgress}
          onMarkLearned={onMarkLearned}
          onMarkRepeat={onMarkRepeat}
        />
      ) : (
        <div className="space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl cyber-corner transition-colors
              dark:bg-[#0c101c] dark:border dark:border-slate-800
              light:bg-white light:border light:border-slate-200 light:shadow-sm"
            >
              <SlidersHorizontal className="w-10 h-10 mx-auto mb-2 dark:text-slate-600 light:text-slate-400" />
              <h3 className="text-base font-bold mb-1 font-sans dark:text-white light:text-slate-900">Ничего не найдено</h3>
              <p className="text-xs dark:text-slate-400 light:text-slate-500">
                Попробуйте изменить поисковый запрос или сбросить фильтры.
              </p>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isCompleted = userProgress.completedQuestions.includes(q.id);
              const isRepeat = userProgress.repeatQuestions.includes(q.id);
              const isExpanded = expandedId === q.id;
              const isChecked = !!inlineChecked[q.id];
              const userAnswer = inlineAnswers[q.id] || '';

              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border transition-all cyber-corner ${
                    isCompleted
                      ? 'dark:bg-[#08131d]/90 dark:border-emerald-500/40 dark:shadow-[0_0_16px_rgba(0,255,157,0.1)] light:bg-white light:border-emerald-300 light:shadow-sm'
                      : isRepeat
                      ? 'dark:bg-[#1a1208]/90 dark:border-amber-500/40 dark:shadow-[0_0_16px_rgba(245,158,11,0.1)] light:bg-white light:border-amber-300 light:shadow-sm'
                      : 'dark:bg-[#0c101c]/90 dark:border-slate-800/90 dark:hover:border-cyan-500/30 light:bg-white light:border-slate-200 light:hover:border-slate-300 light:shadow-sm'
                  }`}
                >
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggle(q.id)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                        title={isCompleted ? 'Отметить как неизученное' : 'Отметить как изученное'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 dark:text-slate-600 dark:hover:text-cyan-400 light:text-slate-400 light:hover:text-slate-700" />
                        )}
                      </button>

                      <div
                        className="cursor-pointer flex-1"
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1 font-mono">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border
                            dark:text-cyan-300 dark:bg-cyan-950/60 dark:border-cyan-800/50
                            light:text-sky-800 light:bg-sky-50 light:border-sky-200"
                          >
                            {q.category}
                          </span>
                          <span className="text-[11px] dark:text-slate-400 light:text-slate-500">{q.difficulty}</span>
                          {isRepeat && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border
                              dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-800/50
                              light:text-amber-800 light:bg-amber-50 light:border-amber-200"
                            >
                              В повторении
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold transition-colors font-sans
                          dark:text-white dark:hover:text-cyan-300
                          light:text-slate-900 light:hover:text-sky-700"
                        >
                          {q.title}
                        </h3>

                        <p className="text-xs mt-1 line-clamp-2 dark:text-slate-300 light:text-slate-600">
                          {q.question}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="p-1.5 rounded-xl transition-colors shrink-0
                        dark:bg-[#06080f] dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white
                        light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-600 light:hover:text-slate-900"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t rounded-b-2xl space-y-4 transition-colors
                      dark:border-slate-800/80 dark:bg-[#06080f]/60
                      light:border-slate-200 light:bg-slate-50/70"
                    >
                      {/* Full Question text */}
                      <div className="p-3 rounded-xl border text-xs font-medium transition-colors
                        dark:bg-[#0c101c] dark:border-slate-800 dark:text-slate-200
                        light:bg-white light:border-slate-200 light:text-slate-800"
                      >
                        <strong className="block mb-1 font-mono dark:text-cyan-400 light:text-sky-700">Вопрос интервьюера:</strong>
                        {q.question}
                      </div>

                      {/* Code Snippet if present */}
                      {q.codeSnippet && (
                        <div className="rounded-xl overflow-hidden border dark:border-slate-800 dark:bg-[#06080f] light:border-slate-200 light:bg-slate-900">
                          <div className="px-3 py-1.5 text-xs font-mono border-b flex items-center justify-between
                            dark:bg-[#0c101c] dark:text-slate-400 dark:border-slate-800
                            light:bg-slate-800 light:text-slate-300 light:border-slate-700"
                          >
                            <span className="flex items-center gap-1.5">
                              <Code className="w-3.5 h-3.5 dark:text-cyan-400 light:text-cyan-300" />
                              {q.codeLanguage || 'code'}
                            </span>
                          </div>
                          <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                            <code>{q.codeSnippet}</code>
                          </pre>
                        </div>
                      )}

                      {/* Interactive Self-Check Field */}
                      {!isChecked ? (
                        <div className="p-3.5 rounded-xl border space-y-2.5 transition-colors
                          dark:bg-[#0c101c]/90 dark:border-slate-800
                          light:bg-white light:border-slate-200"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold flex items-center gap-1.5 dark:text-slate-300 light:text-slate-700">
                              <PenTool className="w-3.5 h-3.5 dark:text-cyan-400 light:text-sky-600" />
                              Самопроверка: попробуйте ответить самостоятельно
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineChecked((prev) => ({ ...prev, [q.id]: true }));
                              }}
                              className="text-[11px] flex items-center gap-1 font-mono
                                dark:text-slate-400 dark:hover:text-cyan-300
                                light:text-slate-500 light:hover:text-slate-900"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Показать ответ сразу</span>
                            </button>
                          </div>

                          <textarea
                            value={userAnswer}
                            onChange={(e) => {
                              const val = e.target.value;
                              setInlineAnswers((prev) => ({ ...prev, [q.id]: val }));
                            }}
                            rows={2}
                            placeholder="Введите ваш ответ для сверки..."
                            className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-colors focus:outline-none
                              dark:bg-[#06080f] dark:border dark:border-slate-800 dark:focus:border-cyan-400 dark:text-slate-200 dark:placeholder:text-slate-600
                              light:bg-slate-50 light:border light:border-slate-200 light:focus:border-sky-500 light:text-slate-900 light:placeholder:text-slate-400"
                          />

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('medium');
                                setInlineChecked((prev) => ({ ...prev, [q.id]: true }));
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm font-mono
                                dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_12px_rgba(0,240,255,0.25)]
                                light:bg-slate-900 light:text-white"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Сверить с эталоном</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userAnswer.trim() && (
                            <div className="p-3 rounded-xl border text-xs transition-colors
                              dark:bg-[#06080f] dark:border-slate-800
                              light:bg-white light:border-slate-200"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <strong className="text-[11px] uppercase font-mono dark:text-slate-400 light:text-slate-500">Ваш ответ:</strong>
                                <button
                                  type="button"
                                  onClick={() => setInlineChecked((prev) => ({ ...prev, [q.id]: false }))}
                                  className="text-[10px] flex items-center gap-1 font-mono
                                    dark:text-slate-500 dark:hover:text-cyan-300
                                    light:text-slate-500 light:hover:text-slate-900"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Изменить
                                </button>
                              </div>
                              <p className="font-mono whitespace-pre-wrap dark:text-slate-300 light:text-slate-800">{userAnswer}</p>
                            </div>
                          )}

                          {/* Detailed Answer */}
                          <div className="p-4 rounded-xl border text-xs sm:text-sm leading-relaxed transition-colors
                            dark:bg-[#08131d] dark:border-emerald-900/50 dark:text-slate-200
                            light:bg-emerald-50/60 light:border-emerald-200 light:text-slate-800"
                          >
                            <strong className="block mb-1.5 font-bold font-mono dark:text-emerald-400 light:text-emerald-700">Развернутый ответ:</strong>
                            {q.answer}
                          </div>

                          {/* Key Takeaways */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider block font-mono dark:text-slate-400 light:text-slate-500">
                              Что важно запомнить:
                            </span>
                            <ul className="text-xs space-y-1 list-disc list-inside dark:text-slate-300 light:text-slate-600">
                              {q.keyTakeaways.map((point, idx) => (
                                <li key={idx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-slate-800 light:border-slate-200 font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            onMarkRepeat(q.id);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            isRepeat
                              ? 'dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 light:bg-amber-100 light:text-amber-800 light:border-amber-300'
                              : 'dark:bg-[#06080f] dark:text-slate-400 dark:border-slate-800 dark:hover:text-amber-300 light:bg-slate-100 light:border-slate-200 light:text-slate-700 light:hover:bg-slate-200'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isRepeat ? 'В повторении' : 'Отправить на повторение'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggle(q.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            isCompleted
                              ? 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 light:bg-emerald-600 light:text-white light:border-emerald-600'
                              : 'dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-400 light:bg-slate-900 light:text-white light:border-slate-900'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isCompleted ? 'Изучено' : 'Отметить изученным'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
