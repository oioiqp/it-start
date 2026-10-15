import { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  onMarkLearned: (id: string) => void;
  onMarkRepeat: (id: string) => void;
}

export const FlashcardsTrainer: React.FC<FlashcardsTrainerProps> = ({
  questions,
  userProgress,
  onMarkLearned,
  onMarkRepeat,
}) => {
  const [deck, setDeck] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  useEffect(() => {
    setDeck(questions);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [questions]);

  const currentCard = deck[currentIndex];

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      triggerHaptic('selection');
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      triggerHaptic('selection');
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFlip = () => {
    triggerHaptic('light');
    setIsFlipped((prev) => !prev);
  };

  const handleShuffle = () => {
    triggerHaptic('medium');
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
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
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl">
        <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Вопросы не найдены</h3>
        <p className="text-xs text-slate-400">
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
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">
            Карточка {currentIndex + 1} из {deck.length}
          </span>
          {isLearned && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Изучено
            </span>
          )}
          {isRepeat && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              На повторение
            </span>
          )}
        </div>

        <button
          onClick={handleShuffle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Перемешать</span>
        </button>
      </div>

      {/* Flashcard interactive body */}
      <div
        onClick={handleFlip}
        className="relative min-h-[340px] p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 shadow-2xl cursor-pointer select-none transition-all flex flex-col justify-between group"
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {currentCard.category}
          </span>
          <span className="text-xs font-semibold text-slate-400">
            Сложность: {currentCard.difficulty}
          </span>
        </div>

        {/* Card Question or Answer */}
        <div className="my-auto">
          {!isFlipped ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                Вопрос собеседования:
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
                {currentCard.title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {currentCard.question}
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Развернутый ответ:
              </span>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                {currentCard.answer}
              </p>

              {currentCard.codeSnippet && (
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                  <code>{currentCard.codeSnippet}</code>
                </pre>
              )}

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 block">Ключевые тезисы:</span>
                <ul className="text-xs text-slate-300 space-y-1">
                  {currentCard.keyTakeaways.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-indigo-400">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Flip hint at bottom */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            {isFlipped ? 'Нажмите, чтобы вернуться к вопросу' : 'Нажмите, чтобы увидеть ответ'}
          </span>
          <span className="text-[11px] hidden sm:inline text-slate-600">Клик по карточке переворачивает</span>
        </div>
      </div>

      {/* Navigation and Rating Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <button
          onClick={handleRepeat}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Повторить</span>
        </button>

        <button
          onClick={handleLearned}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Знаю отлично</span>
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === deck.length - 1}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-40"
        >
          <span>Вперед</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
