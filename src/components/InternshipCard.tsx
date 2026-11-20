import React from 'react';
import {
  MapPin,
  Sparkles,
  ExternalLink,
  Flame,
  Bot,
  GraduationCap,
  Globe,
  Home,
  Building2,
  CircleAlert,
  Star,
  Calendar,
  CheckCircle2,
  ListOrdered,
  Clock,
} from 'lucide-react';
import type { Internship, Question, RoadmapTopic, UserProgress } from '../types';
import { triggerHaptic } from '../lib/telegram';
import {
  formatSalary,
  getVacancySourceDetails,
} from '../lib/vacancyUrl';
import { getCompanyInfo } from '../data/companies';

interface InternshipCardProps {
  internship: Internship;
  userProgress: UserProgress;
  roadmapTopics: RoadmapTopic[];
  questions: Question[];
  onOpenPlan: (internship: Internship) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onOpenCompanyInfo?: (companyName: string) => void;
  isApplied?: boolean;
  appliedDeadline?: string;
  onApplyVacancy?: (internship: Internship) => void;
}

// Helper to clean repetitive noise and trailing stack/program descriptions from title
export function cleanVacancyTitle(title: string): string {
  if (!title) return '';
  // 1. Remove trailing parenthetical details (stack, program, company names)
  let cleaned = title.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  // 2. Remove any remaining program/company references in parens
  cleaned = cleaned.replace(/\s*\([^)]*(?:Контур|Т-Банк|Ozon|Т1|Сбер|Avito|Авито|VK|Яндекс|Directum)[^)]*\)/gi, '').trim();
  return cleaned || title;
}

// Helper to filter out duplicate tags that repeat company name, program names or noise
export function cleanVacancyTags(tags: string[], company: string, _title?: string): string[] {
  const companyLower = (company || '').toLowerCase();
  const excludeWords = [
    'контур.старт',
    'контур старт',
    'контур',
    'скб контур',
    'kontur',
    'т-банк',
    'тинькофф',
    'tbank',
    'т1',
    'директум',
    'directum',
    'directum rx',
    'директум rx',
    'ozon camp',
    'ozon tech',
    'ozon',
    'озон',
    'vk team',
    'vk',
    'вконтакте',
    'сбер',
    'sber',
    'sberseasons',
    'сберseasons',
    'авито',
    'avito',
    'авито старт',
    'avito tech',
    'открытая школа',
    'открытая школа т1',
    'т1 облако',
    'инфраструктура т1',
    'яндекс',
    'yandex',
    'яндекс интерны',
    'интерны',
    'стажировка',
    'старт',
    'финтех',
  ];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags || []) {
    const tagLower = tag.toLowerCase().trim();
    if (!tagLower) continue;

    // Skip if it matches company or known company programs
    if (excludeWords.some((w) => tagLower === w || tagLower.includes(w))) continue;
    if (companyLower && companyLower.includes(tagLower)) continue;

    if (seen.has(tagLower)) continue;
    seen.add(tagLower);

    result.push(tag.trim());
  }

  return result.length > 0 ? result : tags;
}

// Helper to format published date nicely
export function formatPublishedDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Недавно';
    const months = [
      'янв.', 'фев.', 'мар.', 'апр.', 'мая', 'июн.',
      'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return 'Недавно';
  }
}

export const InternshipCard: React.FC<InternshipCardProps> = ({
  internship,
  userProgress,
  roadmapTopics,
  questions,
  onOpenPlan,
  isFavorite = false,
  onToggleFavorite,
  onOpenCompanyInfo,
  isApplied = false,
  appliedDeadline,
  onApplyVacancy,
}) => {
  const [showSteps, setShowSteps] = React.useState(false);
  const companyInfo = getCompanyInfo(internship.company);
  const selectionSteps = companyInfo.selectionSteps && companyInfo.selectionSteps.length > 0
    ? companyInfo.selectionSteps
    : [
        'Подача онлайн-заявки и резюме',
        'Онлайн-тестирование по профильному стеку',
        'Тестовое задание с установленным дедлайном',
        'Техническое онлайн-собеседование',
        'Получение оффера и старт стажировки',
      ];

  // Compute readiness percentage
  const relevantTopics = roadmapTopics.filter(
    (t) =>
      t.directionId === internship.directionId &&
      (t.category === 'core' || t.subTrackId === internship.subTrackId)
  );

  const relevantQuestions = questions.filter(
    (q) =>
      q.directionId === internship.directionId &&
      (q.subTrackId === 'core' || q.subTrackId === internship.subTrackId)
  );

  const totalItems = relevantTopics.length + relevantQuestions.length;
  const completedCount =
    relevantTopics.filter((t) => userProgress.completedTopics.includes(t.id)).length +
    relevantQuestions.filter((q) => userProgress.completedQuestions.includes(q.id)).length;

  const readinessPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const handleOpenPlan = () => {
    triggerHaptic('medium');
    onOpenPlan(internship);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onToggleFavorite?.(internship.id);
  };

  const handleOpenCompanyInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onOpenCompanyInfo?.(internship.company);
  };

  const handleApplyClick = () => {
    triggerHaptic('medium');
    onApplyVacancy?.(internship);
  };

  // Format badge rendering with visual icons (Дома, В офисе, Гибрид)
  const renderFormatBadge = () => {
    if (internship.format === 'Удаленно') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          title="Удаленная работа (дома)"
        >
          <Home className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>Дома</span>
        </span>
      );
    }
    if (internship.format === 'Офис') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300"
          title="Работа в офисе компании"
        >
          <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span>В офисе</span>
        </span>
      );
    }
    // Гибрид
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-300"
        title="Гибридный формат (офис + дом)"
      >
        <Home className="w-3 h-3 text-violet-600 dark:text-violet-400" />
        <span className="text-[10px] opacity-60">+</span>
        <Building2 className="w-3 h-3 text-violet-600 dark:text-violet-400" />
        <span>Гибрид</span>
      </span>
    );
  };

  const cleanedTitle = cleanVacancyTitle(internship.title);
  const cleanedTags = cleanVacancyTags(internship.tags, internship.company, cleanedTitle);
  const publishedDateText = formatPublishedDate(internship.publishedAt);

  return (
    <div className="group relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between liquid-glass liquid-glass-interactive overflow-hidden">
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-2.5 sm:gap-3 mb-3">
          <div className="min-w-0 flex-1">
            {/* Company & Info button + Hot badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-neutral-950 dark:text-white font-sans tracking-tight">
                {internship.company}
              </span>

              {/* Information icon: circle with exclamation mark as specified in requirements */}
              <button
                type="button"
                onClick={handleOpenCompanyInfo}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title={`Информация о компании ${internship.company} (штат, позиция на рынке)`}
                aria-label={`О компании ${internship.company}`}
              >
                <CircleAlert className="w-3.5 h-3.5" />
              </button>

              {internship.isHot && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold liquid-glass-pill text-neutral-800 dark:text-neutral-200">
                  <Flame className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                  HOT
                </span>
              )}
            </div>

            {/* Location & Format badges & Publication Date */}
            <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 flex-wrap font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 opacity-70" />
                <span className="truncate max-w-[150px]">{internship.location}</span>
              </span>
              <span>•</span>
              {renderFormatBadge()}
              <span>•</span>
              <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                <Calendar className="w-3 h-3 opacity-70" />
                <span>{publishedDateText}</span>
              </span>
            </div>
          </div>

          {/* Right Header Capsule: Favorite Yellow Star & Clean Salary Pill (without "оплата") */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Yellow Favorite Star */}
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`p-1.5 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${
                isFavorite
                  ? 'bg-amber-400/15 text-amber-500'
                  : 'text-neutral-400 hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={isFavorite ? 'В избранном (нажмите, чтобы убрать)' : 'Добавить в избранное'}
              aria-label="В избранное"
            >
              <Star
                className={`w-4 h-4 transition-colors ${
                  isFavorite ? 'fill-amber-400 text-amber-500' : ''
                }`}
              />
            </button>

            {/* Salary badge (clean, without word "оплата") */}
            <div className="text-right shrink-0">
              <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold block liquid-glass-pill text-neutral-900 dark:text-white tracking-tight">
                {formatSalary(internship.salary)}
              </span>
            </div>
          </div>
        </div>

        {/* Position Title (clean and concise) */}
        <h3 className="text-sm sm:text-base font-bold transition-colors tracking-tight line-clamp-2 mb-2 leading-snug text-neutral-950 group-hover:text-black dark:text-white dark:group-hover:text-neutral-100 font-sans">
          {cleanedTitle}
        </h3>

        {/* Applied vacancy notice if user applied */}
        {isApplied && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-500" />
            <span className="truncate">
              Отклик подан {appliedDeadline ? `• Дедлайн: ${appliedDeadline}` : ''}
            </span>
          </div>
        )}

        {/* Clean Tech Stack Tags (filtered against company name & title repetitions) */}
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {cleanedTags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors liquid-glass-pill text-neutral-700 dark:text-neutral-300 hover:bg-white/50 cursor-default"
            >
              {tag}
            </span>
          ))}
          {cleanedTags.length > 4 && (
            <span className="px-2 py-1 rounded-full text-[10px] font-medium liquid-glass-pill text-neutral-500 dark:text-neutral-400">
              +{cleanedTags.length - 4}
            </span>
          )}
        </div>

        {/* Selection Steps Toggle (Что нужно сделать для того, чтобы пройти на стажировку) */}
        <div className="mb-3.5">
          <button
            type="button"
            onClick={() => setShowSteps(!showSteps)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ListOrdered className="w-3.5 h-3.5 text-neutral-500" />
            <span>{showSteps ? 'Скрыть этапы отбора' : 'Как пройти на стажировку (этапы)'}</span>
          </button>

          {showSteps && (
            <div className="mt-2 p-2.5 rounded-xl liquid-glass-subtle space-y-1 text-[11px] text-neutral-700 dark:text-neutral-300 animate-fade-in">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white mb-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>Этапы отбора в {companyInfo.shortName || internship.company}:</span>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 pl-0.5">
                {selectionSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section: Readiness bar & Buttons */}
      <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-3">
        {/* Readiness Bar */}
        <div className="rounded-2xl p-3 liquid-glass-subtle">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 font-medium">
              <Sparkles className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
              Готовность к стеку:
            </span>
            <span className="font-bold text-neutral-900 dark:text-white">{readinessPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 bg-neutral-800 dark:bg-neutral-200"
              style={{ width: `${readinessPercent}%` }}
            />
          </div>
        </div>

        {/* Source and Actions */}
        <div className="flex items-center justify-between gap-2">
          {(() => {
            const src = getVacancySourceDetails(
              internship.applyUrl,
              internship.company,
              internship.sourceChannel,
              internship.directionId,
              internship.subTrackId
            );

            return (
              <>
                <a
                  href={src.badgeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-semibold truncate min-w-0 text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
                  title={src.badgeTooltip}
                >
                  {src.type === 'telegram_post' ? (
                    <Bot className="w-3.5 h-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  )}
                  <span className="truncate underline decoration-neutral-300 dark:decoration-neutral-700">
                    {src.badgeLabel}
                  </span>
                </a>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenPlan}
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-semibold transition-transform duration-150 active:scale-95 liquid-glass-pill hover:bg-white/50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                    <span>План</span>
                  </button>

                  <a
                    href={src.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleApplyClick}
                    className="flex items-center gap-1.5 px-4 sm:px-5 py-2 min-h-[38px] rounded-full text-xs font-semibold transition-transform duration-150 active:scale-95 bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 shadow-xs cursor-pointer"
                    title={src.actionLabel}
                  >
                    <span>{src.type === 'telegram_post' ? 'В Telegram' : 'Отклик'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
