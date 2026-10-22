import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Shuffle,
  Send,
  Eye,
  RefreshCw,
  Code,
  Check,
  Sparkles,
  HelpCircle,
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
  onMarkLearned: (questionId: string) => void;
  onMarkRepeat: (questionId: string) => void;
}

export const SelfCheckTrainer: React.FC<SelfCheckTrainerProps> = ({
  questions,
  userProgress,
  userAnswers = {},
  submittedQuestions = {},
  onAnswerChange,
  onSubmitQuestion,
  onResetQuestion,
  onMarkLearned,
  onMarkRepeat,
}) => {
  const [deck, setDeck] = useState<Question[]>(questions);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Fallback internal state if parent doesn't provide
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [localSubmitted, setLocalSubmitted] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setDeck(questions);
    setCurrentIndex(0);
  }, [questions]);

  const currentCard = deck[currentIndex];

  const currentAnswer =
    currentCard && (userAnswers[currentCard.id] ?? localAnswers[currentCard.id] ?? '');

  const isSubmitted =
    currentCard && (submittedQuestions[currentCard.id] ?? localSubmitted[currentCard.id] ?? false);

  const handleAnswerChange = (val: string) => {
    if (!currentCard) return;
    if (onAnswerChange) {
      onAnswerChange(currentCard.id, val);
    } else {
      setLocalAnswers((prev) => ({ ...prev, [currentCard.id]: val }));
    }
  };

  const handleSubmit = () => {
    if (!currentCard) return;
    triggerHaptic('medium');
    if (onSubmitQuestion) {
      onSubmitQuestion(currentCard.id);
    } else {
      setLocalSubmitted((prev) => ({ ...prev, [currentCard.id]: true }));
    }
  };

  const handleResetCurrent = () => {
    if (!currentCard) return;
    triggerHaptic('selection');
    if (onResetQuestion) {
      onResetQuestion(currentCard.id);
    } else {
      setLocalSubmitted((prev) => ({ ...prev, [currentCard.id]: false }));
    }
  };

  const handleNext = () => {
    triggerHaptic('selection');
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    triggerHaptic('selection');
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleShuffle = () => {
    triggerHaptic('medium');
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
  };

  const handleLearned = () => {
    if (!currentCard) return;
    triggerHaptic('medium');
    onMarkLearned(currentCard.id);
    confetti({ particleCount: 35, spread: 60 });
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
      <div className="p-8 text-center rounded-3xl transition-colors
        bg-white/80 border border-black/[0.06] shadow-xs
        dark:bg-white/[0.035] dark:backdrop-blur-2xl dark:border-white/10"
      >
        <HelpCircle className="w-12 h-12 mx-auto mb-3 text-neutral-400 dark:text-neutral-500" />
        <h3 className="text-base font-bold mb-1 font-sans text-neutral-900 dark:text-white">Вопросы не найдены</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
      <div className="rounded-[28px] sm:rounded-[32px] p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors liquid-glass">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-600 dark:text-neutral-400">
            Вопрос <strong className="text-neutral-900 dark:text-white">{currentIndex + 1}</strong> из {deck.length}
          </span>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            {deck.filter((q) => userProgress.completedQuestions.includes(q.id)).length} изучено
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShuffle}
            className="p-1.5 rounded-full transition-colors shrink-0 liquid-glass-pill hover:bg-white/80 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200"
            title="Перемешать вопросы"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-full disabled:opacity-40 transition-colors shrink-0 liquid-glass-pill hover:bg-white/80 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200"
            title="Предыдущий вопрос"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === deck.length - 1}
            className="p-1.5 rounded-full disabled:opacity-40 transition-colors shrink-0 liquid-glass-pill hover:bg-white/80 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200"
            title="Следующий вопрос"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 space-y-5 transition-colors liquid-glass">
        {/* Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full text-[11px] font-medium liquid-glass-pill text-neutral-700 dark:text-neutral-200">
              {currentCard.category}
            </span>
            <span className="px-3 py-0.5 rounded-full text-[11px] font-medium liquid-glass-pill text-neutral-700 dark:text-neutral-200">
              {currentCard.difficulty}
            </span>
            {currentCard.subTrackId !== 'core' && (
              <span className="px-3 py-0.5 rounded-full text-[11px] font-medium liquid-glass-pill text-neutral-700 dark:text-neutral-200">
                {currentCard.subTrackId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {isLearned && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Изучено
              </span>
            )}
            {isRepeat && (
              <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                <RotateCcw className="w-3.5 h-3.5" />
                В повторении
              </span>
            )}
          </div>
        </div>

        {/* Title & Question text */}
        <div>
          <h3 className="text-base sm:text-lg font-bold mb-2 leading-snug font-sans text-neutral-900 dark:text-white">
            {currentCard.title}
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {currentCard.question}
          </p>
        </div>

        {/* Code Snippet if present */}
        {currentCard.codeSnippet && (
          <div className="rounded-2xl overflow-hidden border border-neutral-200/80 bg-neutral-950 text-neutral-100 dark:border-white/10 dark:bg-black">
            <div className="px-3.5 py-1.5 text-[11px] font-mono border-b border-neutral-800 flex items-center justify-between bg-neutral-900 text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-neutral-400" />
                {currentCard.codeLanguage || 'code'}
              </span>
              <span className="text-[10px] text-neutral-500">Пример из интервью</span>
            </div>
            <pre className="p-3.5 text-xs font-mono text-neutral-200 overflow-x-auto leading-relaxed">
              <code>{currentCard.codeSnippet}</code>
            </pre>
          </div>
        )}

        {/* Self-check input area (Active when not submitted) */}
        {!isSubmitted ? (
          <div className="space-y-3 pt-2 border-t border-neutral-200/80 dark:border-white/[0.08]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <span>Ваш ответ:</span>
                <span className="text-[11px] text-neutral-500">
                  (напишите порядок вывода или объясните суть)
                </span>
              </label>
              <button
                type="button"
                onClick={handleSubmit}
                className="text-[11px] flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
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
              className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm transition-colors focus:outline-none resize-y
                bg-neutral-50 border border-neutral-200/80 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400
                dark:bg-white/[0.04] dark:border-white/10 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white/30"
            />

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[11px] hidden sm:inline text-neutral-500 dark:text-neutral-400">
                Подсказка: нажмите <kbd className="px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-white/10 text-neutral-800 dark:text-neutral-200">Enter</kbd> для проверки (<kbd className="px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-white/10 text-neutral-800 dark:text-neutral-200">Shift</kbd> + <kbd className="px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-white/10 text-neutral-800 dark:text-neutral-200">Enter</kbd> новая строка)
              </span>

              <button
                type="button"
                onClick={handleSubmit}
                className="ml-auto flex items-center gap-2 px-5 py-2 rounded-full font-medium text-xs active:scale-95 transition-all
                  bg-neutral-900 hover:bg-black text-white shadow-xs
                  dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Проверить ответ</span>
              </button>
            </div>
          </div>
        ) : (
          /* Submitted State: Answer Comparison & Self-Evaluation */
          <div className="space-y-4 pt-2 border-t border-neutral-200/80 dark:border-white/[0.08]">
            {/* User's typed answer */}
            {currentAnswer.trim() ? (
              <div className="p-4 rounded-2xl border space-y-1 transition-colors
                bg-neutral-50/90 border-neutral-200/80
                dark:bg-white/[0.03] dark:border-white/[0.08]"
              >
                <span className="text-[11px] font-semibold block uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Ваш ответ:
                </span>
                <p className="text-xs sm:text-sm whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
                  {currentAnswer}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl border text-xs italic transition-colors
                bg-neutral-50 border-neutral-200/80 text-neutral-400
                dark:bg-white/[0.02] dark:border-white/[0.06] dark:text-neutral-500"
              >
                Вы не ввели свой ответ перед сверкой.
              </div>
            )}

            {/* Reference Official Answer */}
            <div className="p-4 sm:p-5 rounded-2xl border space-y-1.5 transition-colors
              bg-emerald-500/5 border-emerald-500/25 text-neutral-800
              dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-neutral-200"
            >
              <span className="text-[11px] font-semibold flex items-center gap-1.5 uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                Эталонный ответ:
              </span>
              <p className="text-xs sm:text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                {currentCard.answer}
              </p>
            </div>

            {/* Key Takeaways */}
            <div className="p-4 rounded-2xl border space-y-1.5 transition-colors
              bg-neutral-50/90 border-neutral-200/80
              dark:bg-white/[0.03] dark:border-white/[0.08]"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider block text-neutral-500 dark:text-neutral-400">
                Ключевые тезисы для проверки:
              </span>
              <ul className="text-xs space-y-1 list-disc list-inside text-neutral-600 dark:text-neutral-400">
                {currentCard.keyTakeaways.map((point, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Assessment Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-neutral-200/80 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={handleResetCurrent}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors
                  bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200/80
                  dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-neutral-300 dark:border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Попробовать снова</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRepeat}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors border
                    bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-700
                    dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:border-amber-500/30 dark:text-amber-300"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Нужно повторить</span>
                </button>

                <button
                  type="button"
                  onClick={handleLearned}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold active:scale-95 transition-all
                    bg-neutral-900 hover:bg-black text-white shadow-xs
                    dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950"
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
      <div className="flex items-center justify-center gap-1.5 flex-wrap px-2 py-1">
        {deck.map((q, idx) => {
          const isDone = userProgress.completedQuestions.includes(q.id);
          const isRep = userProgress.repeatQuestions.includes(q.id);
          const isCur = idx === currentIndex;

          let dotClass = 'bg-neutral-100 border-neutral-200/80 text-neutral-600 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-neutral-400';
          if (isDone) {
            dotClass = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300';
          } else if (isRep) {
            dotClass = 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-300';
          }

          return (
            <button
              key={q.id}
              onClick={() => {
                triggerHaptic('selection');
                setCurrentIndex(idx);
              }}
              className={`w-7 h-7 rounded-xl text-[11px] font-semibold border transition-all ${dotClass} ${
                isCur ? 'ring-2 ring-neutral-900 dark:ring-white scale-110 font-bold' : 'hover:scale-105'
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
