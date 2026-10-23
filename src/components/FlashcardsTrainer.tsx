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
      <div className="p-8 text-center rounded-[28px] sm:rounded-[32px] transition-all liquid-glass text-neutral-800">
        <HelpCircle className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
        <h3 className="text-lg font-bold mb-1 font-sans text-neutral-950">Вопросы не найдены</h3>
        <p className="text-xs text-neutral-500">
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
      <div className="flex items-center justify-between text-xs px-1 text-neutral-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-neutral-950">
            Карточка {currentIndex + 1} из {deck.length}
          </span>
          {isLearned && (
            <span className="px-2.5 py-0.5 rounded-full font-medium text-[11px] bg-emerald-500/15 text-emerald-800 border border-emerald-500/20">
              Изучено ✓
            </span>
          )}
          {isRepeat && (
            <span className="px-2.5 py-0.5 rounded-full font-medium text-[11px] bg-amber-500/15 text-amber-800 border border-amber-500/20">
              На повторение
            </span>
          )}
        </div>

        <button
          onClick={handleShuffle}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all active:scale-95 liquid-glass-pill hover:bg-white/50 text-neutral-700 cursor-pointer font-medium"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Перемешать</span>
        </button>
      </div>

      {/* Flashcard interactive body */}
      <div
        onClick={handleFlip}
        className="relative min-h-[340px] p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] cursor-pointer select-none transition-all flex flex-col justify-between group liquid-glass liquid-glass-interactive overflow-hidden"
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-medium liquid-glass-pill text-neutral-700">
            {currentCard.category}
          </span>
          <span className="text-xs font-medium text-neutral-500">
            Сложность: {currentCard.difficulty}
          </span>
        </div>

        {/* Card Question or Answer */}
        <div className="my-auto">
          {!isFlipped ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-semibold uppercase tracking-wider block text-neutral-500">
                Вопрос собеседования:
              </span>
              <h3 className="text-lg sm:text-xl font-bold leading-snug font-sans text-neutral-950">
                {currentCard.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600 font-normal">
                {currentCard.question}
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-semibold uppercase tracking-wider block text-emerald-800">
                Развернутый эталонный ответ:
              </span>
              <p className="text-sm leading-relaxed p-4 rounded-2xl liquid-glass-subtle text-neutral-900">
                {currentCard.answer}
              </p>

              {currentCard.codeSnippet && (
                <pre className="p-3.5 rounded-2xl border text-xs font-mono text-neutral-200 overflow-x-auto bg-neutral-950 border-black/10 dark:border-white/10 shadow-sm">
                  <code>{currentCard.codeSnippet}</code>
                </pre>
              )}

              <div className="space-y-1">
                <span className="text-xs font-semibold block text-neutral-700">Ключевые тезисы:</span>
                <ul className="text-xs space-y-1 text-neutral-600">
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
        <div className="pt-4 border-t flex items-center justify-between text-xs border-black/5 dark:border-white/5 text-neutral-500">
          <span className="flex items-center gap-1.5 font-medium">
            <Eye className="w-3.5 h-3.5" />
            {isFlipped ? 'Нажмите, чтобы вернуться к вопросу' : 'Нажмите, чтобы увидеть ответ'}
          </span>
          <span className="text-[11px] hidden sm:inline opacity-70 font-medium">Клик по карточке переворачивает</span>
        </div>
      </div>

      {/* Navigation and Rating Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 liquid-glass-pill hover:bg-white/50 text-neutral-800 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <button
          onClick={handleRepeat}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95 border border-amber-400/40 liquid-glass-pill hover:bg-amber-500/15 text-amber-800 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Повторить</span>
        </button>

        <button
          onClick={handleLearned}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95 bg-neutral-900 hover:bg-black text-white shadow-xs cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Знаю отлично</span>
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === deck.length - 1}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 liquid-glass-pill hover:bg-white/50 text-neutral-800 cursor-pointer"
        >
          <span>Вперед</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
