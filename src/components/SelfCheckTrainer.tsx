import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Send,
  HelpCircle,
  Code,
  Check,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Question, UserProgress } from '../types';
import { triggerHaptic } from '../lib/telegram';

interface SelfCheckTrainerProps {
  questions: Question[];
  userProgress: UserProgress;
  userAnswers?: Record<string, string>;
  submittedQuestions?: Record<string, boolean>;
  onAnswerChange?: (questionId: string, answer: string) => void;
  onSubmitQuestion?: (questionId: string) => void;
  onResetQuestion?: (questionId: string) => void;
  onMarkLearned: (id: string) => void;
  onMarkRepeat: (id: string) => void;
}

export const SelfCheckTrainer: React.FC<SelfCheckTrainerProps> = ({
  questions,
  userProgress,
  userAnswers,
  submittedQuestions,
  onAnswerChange,
  onSubmitQuestion,
  onResetQuestion,
  onMarkLearned,
  onMarkRepeat,
}) => {
  const [deck, setDeck] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [internalAnswers, setInternalAnswers] = useState<Record<string, string>>({});
  const [internalSubmitted, setInternalSubmitted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDeck(questions);
    setCurrentIndex(0);
  }, [questions]);

  const currentCard = deck[currentIndex];

  const activeAnswers = userAnswers || internalAnswers;
  const activeSubmitted = submittedQuestions || internalSubmitted;

  const currentAnswer = currentCard ? activeAnswers[currentCard.id] || '' : '';
  const isSubmitted = currentCard ? !!activeSubmitted[currentCard.id] : false;

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      triggerHaptic('selection');
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      triggerHaptic('selection');
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleShuffle = () => {
    triggerHaptic('medium');
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
  };

  const handleAnswerChange = (val: string) => {
    if (!currentCard) return;
    if (onAnswerChange) {
      onAnswerChange(currentCard.id, val);
    } else {
      setInternalAnswers((prev) => ({
        ...prev,
        [currentCard.id]: val,
      }));
    }
  };

  const handleSubmit = () => {
    if (!currentCard) return;
    triggerHaptic('medium');
    if (onSubmitQuestion) {
      onSubmitQuestion(currentCard.id);
    } else {
      setInternalSubmitted((prev) => ({
        ...prev,
        [currentCard.id]: true,
      }));
    }
  };

  const handleResetCurrent = () => {
    if (!currentCard) return;
    triggerHaptic('light');
    if (onResetQuestion) {
      onResetQuestion(currentCard.id);
    } else {
      setInternalSubmitted((prev) => ({
        ...prev,
        [currentCard.id]: false,
      }));
    }
  };

  const handleLearned = () => {
    if (!currentCard) return;
    triggerHaptic('success');
    onMarkLearned(currentCard.id);
    confetti({ particleCount: 50, spread: 60 });
    handleNext();
  };

  const handleRepeat = () => {
    if (!currentCard) return;
    triggerHaptic('medium');
    onMarkRepeat(currentCard.id);
    handleNext();
  };

  if (!currentCard || deck.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl cyber-corner transition-colors
        dark:bg-[#0c101c] dark:border dark:border-slate-800
        light:bg-white light:border light:border-slate-200 light:shadow-sm"
      >
        <HelpCircle className="w-12 h-12 mx-auto mb-3 dark:text-slate-600 light:text-slate-400" />
        <h3 className="text-base font-bold mb-1 font-sans dark:text-white light:text-slate-900">Вопросы не найдены</h3>
        <p className="text-xs dark:text-slate-400 light:text-slate-500">
          Попробуйте выбрать другое направление или сбросить фильтры.
        </p>
      </div>
    );
  }

  const isLearned = userProgress.completedQuestions.includes(currentCard.id);
  const isRepeat = userProgress.repeatQuestions.includes(currentCard.id);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Top Header & Navigation */}
      <div className="rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 transition-colors cyber-corner
        dark:bg-[#0c101c]/90 dark:border dark:border-cyan-500/20
        light:bg-white light:border light:border-slate-200 light:shadow-sm"
      >
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="dark:text-slate-400 light:text-slate-600">
            Вопрос <strong className="dark:text-cyan-300 light:text-slate-900">{currentIndex + 1}</strong> из {deck.length}
          </span>
          <span className="dark:text-slate-700 light:text-slate-300">•</span>
          <span className="text-[11px] font-medium dark:text-slate-400 light:text-slate-500">
            {deck.filter((q) => userProgress.completedQuestions.includes(q.id)).length} изучено
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShuffle}
            className="p-1.5 rounded-lg transition-colors
              dark:bg-[#06080f] dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white
              light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-600 light:hover:text-slate-900"
            title="Перемешать вопросы"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-lg disabled:opacity-40 transition-colors
              dark:bg-[#06080f] dark:hover:bg-slate-800 dark:text-slate-300
              light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-700"
            title="Предыдущий вопрос"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === deck.length - 1}
            className="p-1.5 rounded-lg disabled:opacity-40 transition-colors
              dark:bg-[#06080f] dark:hover:bg-slate-800 dark:text-slate-300
              light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-700"
            title="Следующий вопрос"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-2xl p-5 sm:p-6 space-y-5 transition-colors cyber-corner
        dark:bg-[#0c101c]/95 dark:border dark:border-cyan-500/20 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        light:bg-white light:border light:border-slate-200 light:shadow-md"
      >
        {/* Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap font-mono">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold border
              dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300
              light:bg-sky-50 light:border-sky-200 light:text-sky-800"
            >
              {currentCard.category}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium
              dark:bg-slate-800/80 dark:text-slate-300
              light:bg-slate-100 light:text-slate-700"
            >
              {currentCard.difficulty}
            </span>
            {currentCard.subTrackId !== 'core' && (
              <span className="px-2 py-0.5 rounded-md text-[11px] border
                dark:bg-cyan-950/70 dark:border-cyan-800/40 dark:text-cyan-300
                light:bg-sky-50 light:border-sky-200 light:text-sky-800"
              >
                {currentCard.subTrackId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            {isLearned && (
              <span className="inline-flex items-center gap-1 font-medium dark:text-emerald-400 light:text-emerald-700">
                <Check className="w-3.5 h-3.5" />
                Изучено
              </span>
            )}
            {isRepeat && (
              <span className="inline-flex items-center gap-1 font-medium dark:text-amber-400 light:text-amber-700">
                <RotateCcw className="w-3.5 h-3.5" />
                В повторении
              </span>
            )}
          </div>
        </div>

        {/* Title & Question text */}
        <div>
          <h3 className="text-base sm:text-lg font-bold mb-2 leading-snug font-sans dark:text-white light:text-slate-900">
            {currentCard.title}
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed dark:text-slate-300 light:text-slate-600">
            {currentCard.question}
          </p>
        </div>

        {/* Code Snippet if present */}
        {currentCard.codeSnippet && (
          <div className="rounded-xl overflow-hidden border dark:border-slate-800 dark:bg-[#06080f] light:border-slate-200 light:bg-slate-950">
            <div className="px-3 py-1.5 text-[11px] font-mono border-b flex items-center justify-between
              dark:bg-[#0c101c] dark:text-slate-400 dark:border-slate-800
              light:bg-slate-900 light:text-slate-400 light:border-slate-800"
            >
              <span className="flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 dark:text-cyan-400 light:text-cyan-300" />
                {currentCard.codeLanguage || 'code'}
              </span>
              <span className="text-[10px] text-slate-500">Пример из интервью</span>
            </div>
            <pre className="p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              <code>{currentCard.codeSnippet}</code>
            </pre>
          </div>
        )}

        {/* Self-check input area (Active when not submitted) */}
        {!isSubmitted ? (
          <div className="space-y-3 pt-2 border-t dark:border-slate-800 light:border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-1.5 dark:text-slate-300 light:text-slate-700">
                <span>Ваш ответ:</span>
                <span className="text-[11px] font-normal dark:text-slate-500 light:text-slate-500">
                  (напишите порядок вывода или объясните суть)
                </span>
              </label>
              <button
                type="button"
                onClick={handleSubmit}
                className="text-[11px] flex items-center gap-1 font-mono
                  dark:text-slate-400 dark:hover:text-cyan-300
                  light:text-slate-500 light:hover:text-slate-900"
              >
                <Eye className="w-3 h-3" />
                <span>Сверить сразу</span>
              </button>
            </div>

            <textarea
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={3}
              placeholder="Введите ваш ответ (например: 1, 4, 3, 2 или тезисное решение)..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono transition-colors focus:outline-none resize-y
                dark:bg-[#06080f] dark:border dark:border-slate-800 dark:focus:border-cyan-400 dark:text-slate-100 dark:placeholder:text-slate-600
                light:bg-slate-50 light:border light:border-slate-200 light:focus:border-sky-500 light:text-slate-900 light:placeholder:text-slate-400"
            />

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[10px] hidden sm:inline dark:text-slate-500 light:text-slate-500 font-mono">
                Подсказка: нажмите <kbd className="px-1.5 py-0.5 rounded dark:bg-slate-800 dark:text-slate-300 light:bg-slate-200 light:text-slate-700">Enter</kbd> для проверки (<kbd className="px-1.5 py-0.5 rounded dark:bg-slate-800 dark:text-slate-300 light:bg-slate-200 light:text-slate-700">Shift</kbd> + <kbd className="px-1.5 py-0.5 rounded dark:bg-slate-800 dark:text-slate-300 light:bg-slate-200 light:text-slate-700">Enter</kbd> новая строка)
              </span>

              <button
                type="button"
                onClick={handleSubmit}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all font-mono
                  dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_12px_rgba(0,240,255,0.25)]
                  light:bg-slate-900 light:text-white light:shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Проверить ответ</span>
              </button>
            </div>
          </div>
        ) : (
          /* Submitted State: Answer Comparison & Self-Evaluation */
          <div className="space-y-4 pt-2 border-t dark:border-slate-800 light:border-slate-200">
            {/* User's typed answer */}
            {currentAnswer.trim() ? (
              <div className="p-3.5 rounded-xl border space-y-1 transition-colors
                dark:bg-[#06080f] dark:border-slate-800
                light:bg-slate-50 light:border-slate-200"
              >
                <span className="text-[11px] font-bold block uppercase tracking-wider font-mono dark:text-slate-400 light:text-slate-500">
                  Ваш ответ:
                </span>
                <p className="text-xs sm:text-sm whitespace-pre-wrap font-mono dark:text-slate-200 light:text-slate-800">
                  {currentAnswer}
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border text-[11px] italic transition-colors
                dark:bg-[#06080f]/50 dark:border-slate-800 dark:text-slate-500
                light:bg-slate-50 light:border-slate-200 light:text-slate-400"
              >
                Вы не ввели свой ответ перед сверкой.
              </div>
            )}

            {/* Reference Official Answer */}
            <div className="p-4 rounded-xl border space-y-1.5 transition-colors
              dark:bg-[#08131d] dark:border-emerald-900/50
              light:bg-emerald-50/70 light:border-emerald-200"
            >
              <span className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider font-mono dark:text-emerald-400 light:text-emerald-700">
                <Sparkles className="w-3.5 h-3.5" />
                Эталонный ответ:
              </span>
              <p className="text-xs sm:text-sm leading-relaxed dark:text-slate-200 light:text-slate-800">
                {currentCard.answer}
              </p>
            </div>

            {/* Key Takeaways */}
            <div className="p-3.5 rounded-xl border space-y-1.5 transition-colors
              dark:bg-[#06080f]/80 dark:border-slate-800/80
              light:bg-slate-50 light:border-slate-200"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider block font-mono dark:text-slate-400 light:text-slate-500">
                Ключевые тезисы для проверки:
              </span>
              <ul className="text-xs space-y-1 list-disc list-inside dark:text-slate-300 light:text-slate-600">
                {currentCard.keyTakeaways.map((point, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Assessment Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t dark:border-slate-800/60 light:border-slate-200 font-mono">
              <button
                type="button"
                onClick={handleResetCurrent}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors
                  dark:bg-[#06080f] dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200
                  light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Попробовать снова</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRepeat}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors
                    dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:border dark:border-amber-500/30 dark:text-amber-300
                    light:bg-amber-100 light:hover:bg-amber-200 light:text-amber-800 light:border light:border-amber-300"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Нужно повторить</span>
                </button>

                <button
                  type="button"
                  onClick={handleLearned}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all
                    dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white dark:shadow-[0_0_12px_rgba(0,255,157,0.3)]
                    light:bg-emerald-600 light:hover:bg-emerald-500 light:text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ответил верно</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Track Pills */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap px-2 py-1 font-mono">
        {deck.map((q, idx) => {
          const isDone = userProgress.completedQuestions.includes(q.id);
          const isRep = userProgress.repeatQuestions.includes(q.id);
          const isCur = idx === currentIndex;

          let dotClass = 'dark:bg-[#06080f] dark:border-slate-800 dark:text-slate-400 light:bg-slate-100 light:border-slate-200 light:text-slate-600';
          if (isDone) {
            dotClass = 'dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-300 light:bg-emerald-100 light:border-emerald-400 light:text-emerald-800';
          } else if (isRep) {
            dotClass = 'dark:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-300 light:bg-amber-100 light:border-amber-400 light:text-amber-800';
          }

          return (
            <button
              key={q.id}
              onClick={() => {
                triggerHaptic('selection');
                setCurrentIndex(idx);
              }}
              className={`w-7 h-7 rounded-lg text-[11px] font-bold border transition-all ${dotClass} ${
                isCur ? 'ring-2 dark:ring-cyan-400 light:ring-slate-900 scale-110 font-black' : 'hover:scale-105'
              }`}
              title={`${idx + 1}. ${q.title}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
