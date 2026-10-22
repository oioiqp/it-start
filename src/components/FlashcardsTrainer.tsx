import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Shuffle,
  Eye,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Question, UserProgress } from '../types';
import { triggerHaptic } from '../lib/telegram';

interface FlashcardsTrainerProps {
  questions: Question[];
  userProgress: UserProgress;
  onMarkLearned: (questionId: string) => void;
  onMarkRepeat: (questionId: string) => void;
}

export const FlashcardsTrainer: React.FC<FlashcardsTrainerProps> = ({
  questions,
  userProgress,
  onMarkLearned,
  onMarkRepeat,
}) => {
  const [deck, setDeck] = useState<Question[]>(questions);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Sync deck when questions filter changes
  React.useEffect(() => {
    setDeck(questions);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [questions]);

  const currentCard = deck[currentIndex];

  const handleFlip = () => {
    triggerHaptic('selection');
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    triggerHaptic('selection');
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    triggerHaptic('selection');
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    triggerHaptic('medium');
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleLearned = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    onMarkLearned(currentCard.id);
    confetti({ particleCount: 30, spread: 50 });
    handleNext();
  };

  const handleRepeat = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    onMarkRepeat(currentCard.id);
    handleNext();
  };

  if (!currentCard || deck.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl transition-colors
        bg-white/80 border border-neutral-200/80 shadow-xs
        dark:bg-neutral-900/60 dark:border-neutral-800"
      >
        <HelpCircle className="w-12 h-12 mx-auto mb-3 text-neutral-400 dark:text-neutral-600" />
        <h3 className="text-lg font-bold mb-1 font-sans text-neutral-900 dark:text-white">Вопросы не найдены</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Попробуйте сбросить фильтры направления или ветки в панели выше.
        </p>
      </div>
    );
  }

  const isLearned = userProgress.completedQuestions.includes(currentCard.id);
  const isRepeat = userProgress.repeatQuestions.includes(currentCard.id);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between text-xs px-1 text-neutral-600 dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-neutral-900 dark:text-white">
            Карточка {currentIndex + 1} из {deck.length}
          </span>
          {isLearned && (
            <span className="px-2.5 py-0.5 rounded-full font-medium text-[11px]
              bg-emerald-500/10 text-emerald-700 border border-emerald-500/20
              dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
            >
              Изучено
            </span>
          )}
          {isRepeat && (
            <span className="px-2.5 py-0.5 rounded-full font-medium text-[11px]
              bg-amber-500/10 text-amber-700 border border-amber-500/20
              dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
            >
              На повторение
            </span>
          )}
        </div>

        <button
          onClick={handleShuffle}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-colors
            bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200/80 shadow-xs
            dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-750"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Перемешать</span>
        </button>
      </div>

      {/* Flashcard interactive body */}
      <div
        onClick={handleFlip}
        className="relative min-h-[340px] p-6 sm:p-8 rounded-3xl cursor-pointer select-none transition-all flex flex-col justify-between group
          bg-white/85 border border-neutral-200/80 hover:border-neutral-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]
          dark:bg-neutral-900/70 dark:border-neutral-800/80 dark:hover:border-neutral-700 dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)]"
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-medium border
            bg-neutral-100 text-neutral-700 border-neutral-200/80
            dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
          >
            {currentCard.category}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Сложность: {currentCard.difficulty}
          </span>
        </div>

        {/* Card Question or Answer */}
        <div className="my-auto">
          {!isFlipped ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-semibold uppercase tracking-wider block text-neutral-500 dark:text-neutral-400">
                Вопрос собеседования:
              </span>
              <h3 className="text-lg sm:text-xl font-bold leading-snug font-sans text-neutral-900 dark:text-white">
                {currentCard.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {currentCard.question}
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-semibold uppercase tracking-wider block text-emerald-700 dark:text-emerald-400">
                Развернутый ответ:
              </span>
              <p className="text-sm leading-relaxed p-4 rounded-2xl border transition-colors
                bg-neutral-50/90 border-neutral-200/80 text-neutral-800
                dark:bg-neutral-850/80 dark:border-neutral-800 dark:text-neutral-200"
              >
                {currentCard.answer}
              </p>

              {currentCard.codeSnippet && (
                <pre className="p-3.5 rounded-2xl border text-xs font-mono text-neutral-200 overflow-x-auto
                  bg-neutral-950 border-neutral-800 dark:bg-black dark:border-neutral-800"
                >
                  <code>{currentCard.codeSnippet}</code>
                </pre>
              )}

              <div className="space-y-1">
                <span className="text-xs font-medium block text-neutral-500 dark:text-neutral-400">Ключевые тезисы:</span>
                <ul className="text-xs space-y-1 text-neutral-600 dark:text-neutral-400">
                  {currentCard.keyTakeaways.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-neutral-400">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Flip hint at bottom */}
        <div className="pt-4 border-t flex items-center justify-between text-xs
          border-neutral-200/80 text-neutral-500
          dark:border-neutral-800/80 dark:text-neutral-400"
        >
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            {isFlipped ? 'Нажмите, чтобы вернуться к вопросу' : 'Нажмите, чтобы увидеть ответ'}
          </span>
          <span className="text-[11px] hidden sm:inline opacity-70">Клик по карточке переворачивает</span>
        </div>
      </div>

      {/* Navigation and Rating Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border text-xs font-medium transition-colors disabled:opacity-40
            bg-white hover:bg-neutral-50 border-neutral-200/80 text-neutral-700 shadow-xs
            dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:border-neutral-750 dark:text-neutral-300"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <button
          onClick={handleRepeat}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-medium transition-all active:scale-95 border
            bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700
            dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:border-amber-500/30 dark:text-amber-300"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Повторить</span>
        </button>

        <button
          onClick={handleLearned}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95
            bg-neutral-900 hover:bg-black text-white shadow-xs
            dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Знаю отлично</span>
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === deck.length - 1}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border text-xs font-medium transition-colors disabled:opacity-40
            bg-white hover:bg-neutral-50 border-neutral-200/80 text-neutral-700 shadow-xs
            dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:border-neutral-750 dark:text-neutral-300"
        >
          <span>Вперед</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
