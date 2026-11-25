import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  GraduationCap,
  Sparkles,
  CircleAlert,
  Home,
  Building2,
  MapPin,
  PlusCircle,
  Briefcase,
} from 'lucide-react';
import type { Internship, JobApplication } from '../types';
import { triggerHaptic } from '../lib/telegram';
import { formatSalary } from '../lib/vacancyUrl';
import { cleanLocation } from './InternshipCard';

interface ApplicationsViewProps {
  applications: JobApplication[];
  allInternships: Internship[];
  onUpdateApplication: (app: JobApplication) => void;
  onRemoveApplication: (vacancyId: string) => void;
  onOpenPlan: (internship: Internship) => void;
  onOpenCompanyInfo?: (companyName: string) => void;
  onNavigateToCatalog: () => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  allInternships,
  onUpdateApplication,
  onRemoveApplication,
  onOpenPlan,
  onOpenCompanyInfo,
  onNavigateToCatalog,
}) => {
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [newDeadlineDate, setNewDeadlineDate] = useState<string>('');
  const [newDeadlineAction, setNewDeadlineAction] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const parseAppDate = (dateStr: string): Date | null => {
    try {
      if (!dateStr) return null;
      if (dateStr.length === 10 && dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const getDaysLeft = (deadlineDateStr: string) => {
    const deadline = parseAppDate(deadlineDateStr);
    if (!deadline) return null;
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - todayMidnight;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDeadlineDate = (dateStr: string) => {
    const d = parseAppDate(dateStr);
    if (!d) return dateStr;
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleStatusChange = (app: JobApplication, newStatus: JobApplication['status']) => {
    triggerHaptic('selection');
    onUpdateApplication({ ...app, status: newStatus });
  };

  const handleSaveDeadline = (app: JobApplication) => {
    triggerHaptic('selection');
    onUpdateApplication({
      ...app,
      deadlineDate: newDeadlineDate || app.deadlineDate,
      deadlineAction: newDeadlineAction || app.deadlineAction,
    });
    setEditingDeadlineId(null);
    setNewDeadlineDate('');
    setNewDeadlineAction('');
  };

  const filteredApplications = applications.filter((app) => {
    if (filterStatus === 'all') return true;
    return app.status === filterStatus;
  });

  const hasAnyDeadline = applications.some((a) => Boolean(a.deadlineDate && parseAppDate(a.deadlineDate)));
  const urgentCount = applications.filter((a) => {
    const days = getDaysLeft(a.deadlineDate);
    return days !== null && days <= 3 && a.status !== 'offer' && a.status !== 'rejected';
  }).length;
  const activeReviewCount = applications.filter(
    (a) => a.status === 'applied' || a.status === 'test_task' || a.status === 'interview'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header and Summary stats */}
      <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 liquid-glass space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Трекер карьерных заявок
              </span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {hasAnyDeadline ? '• Дедлайны и задачи' : '• Статусы и подготовка'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white font-sans">
              Мои отклики ({applications.length})
            </h2>
          </div>

          <button
            onClick={onNavigateToCatalog}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-neutral-900 hover:bg-black text-white dark:bg-white dark:text-neutral-900 transition-transform active:scale-95 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Найти ещё вакансии</span>
          </button>
        </div>

        {/* Quick stats pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-3 rounded-2xl liquid-glass-subtle">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
              Всего откликов
            </span>
            <span className="text-lg font-bold text-neutral-900 dark:text-white">
              {applications.length}
            </span>
          </div>

          {hasAnyDeadline ? (
            <div className="p-3 rounded-2xl liquid-glass-subtle">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                Горящие дедлайны (≤3 дн.)
              </span>
              <span className={`text-lg font-bold ${urgentCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>
                {urgentCount}
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-2xl liquid-glass-subtle">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                В активном отборе
              </span>
              <span className="text-lg font-bold text-neutral-900 dark:text-white">
                {activeReviewCount}
              </span>
            </div>
          )}

          <div className="p-3 rounded-2xl liquid-glass-subtle">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
              Тестовое / Собеседование
            </span>
            <span className="text-lg font-bold text-neutral-900 dark:text-white">
              {applications.filter((a) => a.status === 'test_task' || a.status === 'interview').length}
            </span>
          </div>

          <div className="p-3 rounded-2xl liquid-glass-subtle">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
              Получено офферов 🎉
            </span>
            <span className="text-lg font-bold text-neutral-900 dark:text-white">
              {applications.filter((a) => a.status === 'offer').length}
            </span>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mr-1">
            Фильтр по статусу:
          </span>
          {[
            { id: 'all', label: 'Все' },
            { id: 'applied', label: 'Отклик отправлен' },
            { id: 'test_task', label: 'Тестовое задание' },
            { id: 'interview', label: 'Собеседование' },
            { id: 'offer', label: 'Оффер 🎉' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => {
                triggerHaptic('selection');
                setFilterStatus(st.id);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                filterStatus === st.id
                  ? 'bg-neutral-900 text-white shadow-xs dark:bg-white dark:text-neutral-900'
                  : 'liquid-glass-pill hover:bg-white/60 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="rounded-3xl p-8 sm:p-12 text-center liquid-glass space-y-4">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center liquid-glass-tile text-neutral-400">
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mb-1">
              {applications.length === 0 ? 'Вы пока не откликнулись ни на одну вакансию' : 'Нет откликов с выбранным статусом'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
              {applications.length === 0
                ? 'Откликайтесь на интересные стажировки в каталоге, устанавливайте дедлайны по тестовым заданиям и ведите всю подготовку в одном месте.'
                : 'Попробуйте переключить фильтр или посмотреть все заявки.'}
            </p>
          </div>
          {applications.length === 0 && (
            <button
              onClick={onNavigateToCatalog}
              className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-neutral-900 hover:bg-black text-white dark:bg-white dark:text-neutral-900 transition-transform active:scale-95 shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <span>Смотреть каталог стажировок</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredApplications.map((app) => {
            const originalInternship = allInternships.find((i) => i.id === app.vacancyId);
            const daysLeft = getDaysLeft(app.deadlineDate);
            const hasDeadline = Boolean(app.deadlineDate && parseAppDate(app.deadlineDate));
            const tgPostUrl = app.sourcePostUrl || originalInternship?.sourcePostUrl;

            // Clean minimalist format badge helper
            const renderFormat = () => {
              let label = 'Гибрид';
              let icon = <Building2 className="w-3 h-3 opacity-60 shrink-0" />;

              if (app.format === 'Удаленно') {
                label = 'Дома';
                icon = <Home className="w-3 h-3 opacity-60 shrink-0" />;
              } else if (app.format === 'Офис') {
                label = 'В офисе';
                icon = <Building2 className="w-3 h-3 opacity-60 shrink-0" />;
              }

              return (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-300 shrink-0"
                  title={`Формат: ${app.format}`}
                >
                  {icon}
                  <span>{label}</span>
                </span>
              );
            };

            return (
              <div
                key={app.id || app.vacancyId}
                className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 liquid-glass liquid-glass-interactive space-y-4"
              >
                {/* Header: Company, Info, Salary, Remove */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    {/* Company & Info button (bound in inline-flex to prevent wrapping circle) */}
                    <div className="inline-flex items-center gap-1.5 max-w-full min-w-0">
                      <span className="font-bold text-sm text-neutral-950 dark:text-white font-sans tracking-tight truncate min-w-0">
                        {app.company}
                      </span>

                      {/* Info icon (circle with exclamation mark) */}
                      <button
                        type="button"
                        onClick={() => onOpenCompanyInfo?.(app.company)}
                        className="p-0.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                        title={`Информация о компании ${app.company}`}
                        aria-label={`О компании ${app.company}`}
                      >
                        <CircleAlert className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Clean minimalist metadata row without stray dots */}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 mt-2 flex-wrap font-medium">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-300 shrink-0">
                        <MapPin className="w-3 h-3 opacity-60 shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-[200px]">{cleanLocation(app.location)}</span>
                      </span>
                      {renderFormat()}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white leading-snug mt-2">
                      {app.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {app.salary && (
                      <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold liquid-glass-pill text-neutral-900 dark:text-white">
                        {formatSalary(app.salary)}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemoveApplication(app.vacancyId)}
                      className="p-1.5 rounded-full text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Удалить заявку из списка"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* DEADLINE BANNER & ACTION REQUIRED — rendered ONLY when a concrete deadline exists */}
                {(hasDeadline || editingDeadlineId === app.vacancyId) && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  daysLeft !== null && daysLeft <= 1
                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-950 dark:text-rose-200'
                    : daysLeft !== null && daysLeft <= 3
                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-950 dark:text-amber-200'
                    : 'bg-blue-500/10 border-blue-500/25 text-neutral-900 dark:text-white'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {daysLeft !== null && daysLeft <= 1 ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Дедлайн по предоставлению тестового задания / резюме:
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold font-sans">
                          {formatDeadlineDate(app.deadlineDate)}
                        </span>

                        {daysLeft !== null && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            daysLeft < 0
                              ? 'bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300'
                              : daysLeft <= 1
                              ? 'bg-rose-600 text-white animate-pulse'
                              : daysLeft <= 3
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {daysLeft < 0
                              ? 'Срок истек'
                              : daysLeft === 0
                              ? 'Срок истекает сегодня!'
                              : daysLeft === 1
                              ? 'Остался 1 день!'
                              : `Осталось ${daysLeft} дн.`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Change deadline trigger */}
                    <div>
                      {editingDeadlineId === app.vacancyId ? (
                        <div className="space-y-2 p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">Срок:</label>
                            <input
                              type="date"
                              value={newDeadlineDate}
                              onChange={(e) => setNewDeadlineDate(e.target.value)}
                              className="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={newDeadlineAction}
                              onChange={(e) => setNewDeadlineAction(e.target.value)}
                              placeholder="Что нужно сделать (например, отправить тестовое)"
                              className="w-full px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveDeadline(app)}
                              className="px-3 py-1 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 cursor-pointer"
                            >
                              Сохранить
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDeadlineId(null)}
                              className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDeadlineId(app.vacancyId);
                            setNewDeadlineDate(app.deadlineDate ? app.deadlineDate.slice(0, 10) : '');
                            setNewDeadlineAction(app.deadlineAction || 'Подготовить и отправить выполненное тестовое задание до указанного срока');
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold liquid-glass-pill hover:bg-white/60 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                        >
                          Изменить дедлайн
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Action prompt */}
                  <div className="mt-2.5 pt-2.5 border-t border-black/5 dark:border-white/10 text-xs flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      <strong>Что нужно сделать: </strong>
                      {app.deadlineAction || 'Подготовить и отправить выполненное тестовое задание до указанного срока'}
                    </span>
                  </div>
                </div>
                )}

                {/* Preparation Steps Checklist */}
                <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-neutral-500 dark:text-neutral-400">
                    Чек-лист для успешного прохождения отбора:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded-xl liquid-glass-pill text-neutral-800 dark:text-neutral-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Отклик и резюме поданы</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl liquid-glass-pill text-neutral-800 dark:text-neutral-200">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        {hasDeadline ? `Сдать тестовое до ${formatDeadlineDate(app.deadlineDate)}` : 'Пройти тестовое / отбор'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl liquid-glass-pill text-neutral-800 dark:text-neutral-200">
                      <GraduationCap className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Пройти тех. интервью</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Status switcher & Action buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                  {/* Status buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mr-1">
                      Статус:
                    </span>
                    {(['applied', 'test_task', 'interview', 'offer'] as const).map((st) => {
                      const labels = {
                        applied: 'Отклик подан',
                        test_task: 'Тестовое',
                        interview: 'Интервью',
                        offer: 'Оффер 🎉',
                      };
                      const isCur = app.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(app, st)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isCur
                              ? st === 'offer'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                              : 'liquid-glass-pill hover:bg-white/60 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {labels[st]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions: Open Plan, TG post & Vacancy link */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {originalInternship && (
                      <button
                        type="button"
                        onClick={() => onOpenPlan(originalInternship)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold liquid-glass-pill hover:bg-white/60 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>План подготовки</span>
                      </button>
                    )}

                    {tgPostUrl && tgPostUrl !== app.applyUrl && (
                      <a
                        href={tgPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold liquid-glass-pill hover:bg-white/60 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                        title={`Открыть сообщение в Telegram: ${tgPostUrl}`}
                      >
                        <span>Пост в TG</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <a
                      href={app.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-neutral-900 hover:bg-black text-white dark:bg-white dark:text-neutral-900 shadow-xs cursor-pointer"
                    >
                      <span>Сайт подачи</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
