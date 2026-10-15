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
      <div className="p-8 text-center bg-slate-900/90 border border-slate-800 rounded-2xl">
        <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Вопросы не найдены</h3>
        <p className="text-xs text-slate-400">
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Вопрос <strong className="text-white">{currentIndex + 1}</strong> из {deck.length}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] font-medium text-slate-400">
            {deck.filter((q) => userProgress.completedQuestions.includes(q.id)).length} изучено
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShuffle}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Перемешать вопросы"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
            title="Предыдущий вопрос"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === deck.length - 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
            title="Следующий вопрос"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        {/* Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
              {currentCard.category}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-800 text-slate-400 font-medium">
              {currentCard.difficulty}
            </span>
            {currentCard.subTrackId !== 'core' && (
              <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono">
                {currentCard.subTrackId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {isLearned && (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                Изучено
              </span>
            )}
            {isRepeat && (
              <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                <RotateCcw className="w-3.5 h-3.5" />
                В повторении
              </span>
            )}
          </div>
        </div>

        {/* Title & Question text */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
            {currentCard.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {currentCard.question}
          </p>
        </div>

        {/* Code Snippet if present */}
        {currentCard.codeSnippet && (
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <div className="bg-slate-900/90 px-3 py-1.5 text-[11px] font-mono text-slate-400 border-b border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-indigo-400" />
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
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Ваш ответ:</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  (напишите порядок вывода или объясните суть)
                </span>
              </label>
              <button
                type="button"
                onClick={handleSubmit}
                className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1"
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 transition-colors resize-y"
            />

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                Подсказка: нажмите <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Enter</kbd> для проверки (<kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Shift</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Enter</kbd> новая строка)
              </span>

              <button
                type="button"
                onClick={handleSubmit}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Проверить ответ</span>
              </button>
            </div>
          </div>
        ) : (
          /* Submitted State: Answer Comparison & Self-Evaluation */
          <div className="space-y-4 pt-2 border-t border-slate-800">
            {/* User's typed answer */}
            {currentAnswer.trim() ? (
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                  Ваш ответ:
                </span>
                <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap font-mono">
                  {currentAnswer}
                </p>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800 text-[11px] text-slate-500 italic">
                Вы не ввели свой ответ перед сверкой.
              </div>
            )}

            {/* Reference Official Answer */}
            <div className="p-4 bg-slate-950 border border-emerald-900/40 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Эталонный ответ:
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {currentCard.answer}
              </p>
            </div>

            {/* Key Takeaways */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Ключевые тезисы для проверки:
              </span>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {currentCard.keyTakeaways.map((point, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Assessment Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={handleResetCurrent}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Попробовать снова</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRepeat}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Нужно повторить</span>
                </button>

                <button
                  type="button"
                  onClick={handleLearned}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
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

          let dotClass = 'bg-slate-800 border-slate-700 text-slate-400';
          if (isDone) {
            dotClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
          } else if (isRep) {
            dotClass = 'bg-amber-500/20 border-amber-500/50 text-amber-300';
          }

          return (
            <button
              key={q.id}
              onClick={() => {
                triggerHaptic('selection');
                setCurrentIndex(idx);
              }}
              className={`w-7 h-7 rounded-lg text-[11px] font-bold border transition-all ${dotClass} ${
                isCur ? 'ring-2 ring-indigo-500 scale-110 font-black' : 'hover:scale-105'
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
