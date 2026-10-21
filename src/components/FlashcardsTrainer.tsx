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
      <div className="p-8 text-center rounded-3xl cyber-corner transition-colors
        dark:bg-[#0c101c] dark:border dark:border-slate-800
        light:bg-white light:border light:border-slate-200 light:shadow-sm"
      >
        <HelpCircle className="w-12 h-12 mx-auto mb-3 dark:text-slate-600 light:text-slate-400" />
        <h3 className="text-lg font-bold mb-1 font-sans dark:text-white light:text-slate-900">Вопросы не найдены</h3>
        <p className="text-xs dark:text-slate-400 light:text-slate-500">
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
      <div className="flex items-center justify-between text-xs px-1 font-mono dark:text-slate-400 light:text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm dark:text-white light:text-slate-900">
            Карточка {currentIndex + 1} из {deck.length}
          </span>
          {isLearned && (
            <span className="px-2 py-0.5 rounded-full font-bold border
              dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30
              light:bg-emerald-100 light:text-emerald-800 light:border-emerald-300"
            >
              Изучено
            </span>
          )}
          {isRepeat && (
            <span className="px-2 py-0.5 rounded-full font-bold border
              dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30
              light:bg-amber-100 light:text-amber-800 light:border-amber-300"
            >
              На повторение
            </span>
          )}
        </div>

        <button
          onClick={handleShuffle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors
            dark:bg-[#06080f] dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800
            light:bg-white light:hover:bg-slate-100 light:text-slate-700 light:border-slate-200 shadow-sm"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Перемешать</span>
        </button>
      </div>

      {/* Flashcard interactive body */}
      <div
        onClick={handleFlip}
        className="relative min-h-[340px] p-6 sm:p-8 rounded-3xl cyber-corner shadow-2xl cursor-pointer select-none transition-all flex flex-col justify-between group
          dark:bg-gradient-to-br dark:from-[#0c101c] dark:via-[#0c101c] dark:to-cyan-950/20 dark:border dark:border-cyan-500/25 dark:hover:border-cyan-400/60 dark:hover:shadow-[0_0_24px_rgba(0,240,255,0.2)]
          light:bg-white light:border light:border-slate-200 light:hover:border-sky-400 light:hover:shadow-xl light:shadow-md"
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-4 font-mono">
          <span className="px-3 py-1 rounded-full text-xs font-bold border
            dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30
            light:bg-sky-50 light:text-sky-800 light:border-sky-200"
          >
            {currentCard.category}
          </span>
          <span className="text-xs font-semibold dark:text-slate-400 light:text-slate-500">
            Сложность: {currentCard.difficulty}
          </span>
        </div>

        {/* Card Question or Answer */}
        <div className="my-auto">
          {!isFlipped ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-bold uppercase tracking-wider block font-mono dark:text-cyan-400 light:text-sky-700">
                Вопрос собеседования:
              </span>
              <h3 className="text-lg sm:text-xl font-black leading-snug font-sans dark:text-white light:text-slate-900">
                {currentCard.title}
              </h3>
              <p className="text-sm leading-relaxed dark:text-slate-300 light:text-slate-600">
                {currentCard.question}
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-bold uppercase tracking-wider block font-mono dark:text-emerald-400 light:text-emerald-700">
                Развернутый ответ:
              </span>
              <p className="text-sm leading-relaxed p-4 rounded-2xl border transition-colors
                dark:bg-[#06080f]/80 dark:border-slate-800/80 dark:text-slate-200
                light:bg-slate-50 light:border-slate-200 light:text-slate-800"
              >
                {currentCard.answer}
              </p>

              {currentCard.codeSnippet && (
                <pre className="p-3 rounded-xl border text-xs font-mono text-emerald-300 overflow-x-auto
                  dark:bg-[#06080f] dark:border-slate-800
                  light:bg-slate-900 light:border-slate-800"
                >
                  <code>{currentCard.codeSnippet}</code>
                </pre>
              )}

              <div className="space-y-1">
                <span className="text-xs font-semibold block font-mono dark:text-slate-400 light:text-slate-500">Ключевые тезисы:</span>
                <ul className="text-xs space-y-1 dark:text-slate-300 light:text-slate-600">
                  {currentCard.keyTakeaways.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="dark:text-cyan-400 light:text-sky-600">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Flip hint at bottom */}
        <div className="pt-4 border-t flex items-center justify-between text-xs font-mono
          dark:border-slate-800/80 dark:text-slate-500
          light:border-slate-200 light:text-slate-500"
        >
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 dark:text-cyan-400 light:text-sky-600" />
            {isFlipped ? 'Нажмите, чтобы вернуться к вопросу' : 'Нажмите, чтобы увидеть ответ'}
          </span>
          <span className="text-[11px] hidden sm:inline opacity-70">Клик по карточке переворачивает</span>
        </div>
      </div>

      {/* Navigation and Rating Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-40
            dark:bg-[#06080f] dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300
            light:bg-white light:hover:bg-slate-100 light:border-slate-200 light:text-slate-700 shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <button
          onClick={handleRepeat}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border
            dark:bg-amber-600/20 dark:hover:bg-amber-600/30 dark:border-amber-500/40 dark:text-amber-300
            light:bg-amber-100 light:hover:bg-amber-200 light:border-amber-300 light:text-amber-800"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Повторить</span>
        </button>

        <button
          onClick={handleLearned}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border
            dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 dark:border-emerald-500/40 dark:text-emerald-300
            light:bg-emerald-600 light:hover:bg-emerald-500 light:text-white light:border-emerald-600 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Знаю отлично</span>
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === deck.length - 1}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-40
            dark:bg-[#06080f] dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300
            light:bg-white light:hover:bg-slate-100 light:border-slate-200 light:text-slate-700 shadow-sm"
        >
          <span>Вперед</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
