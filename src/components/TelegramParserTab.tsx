import { useState, useEffect } from 'react';
import {
  Send,
  Bot,
  Key,
  Bell,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Terminal,
  Users,
  ShieldCheck,
  Check,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { DirectionId, Internship, SubTrackId, TelegramSubscription, TelegramUser } from '../types';
import { DIRECTIONS } from '../data/directions';
import { TEAM_MEMBERS } from '../data/team';
import {
  addInternshipToSupabase,
  fetchSubscriptionsFromSupabase,
  saveSubscriptionToSupabase,
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_URL,
  GITHUB_PAGES_URL,
} from '../lib/supabase';
import {
  autoDetectChatIdFromUpdates,
  getSavedBotToken,
  saveBotToken,
  sendTelegramMessage,
  triggerHaptic,
} from '../lib/telegram';
import { saveLocalSubscription } from '../lib/storage';

interface TelegramParserTabProps {
  telegramUser: TelegramUser | null;
  currentSubscription: TelegramSubscription | null;
  onSubscriptionSaved: (sub: TelegramSubscription) => void;
  onInternshipAdded: (newInternship: Internship) => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

const PRESET_VACANCIES = [
  {
    title: 'Стажёр React / Frontend-разработчик',
    company: 'Т-Банк',
    location: 'Москва / Удаленно',
    format: 'Удаленно' as const,
    salary: 'от 75 000 ₽',
    directionId: 'frontend' as DirectionId,
    subTrackId: 'react' as SubTrackId,
    sourceChannel: '@tbank_start',
    description: 'Разработка новых витрин и финансовых сервисов для мобильного и веб-банкінга.',
    tags: ['React', 'TypeScript', 'Redux', 'Tailwind'],
  },
  {
    title: 'Стажёр Python Backend Developer',
    company: 'Яндекс',
    location: 'Москва / Гибрид',
    format: 'Гибрид' as const,
    salary: 'от 80 000 ₽',
    directionId: 'backend' as DirectionId,
    subTrackId: 'python' as SubTrackId,
    sourceChannel: '@yandex_intern',
    description: 'Разработка высоконагруженных бэкенд-сервисов на FastAPI и асинхронном Python.',
    tags: ['Python 3.12', 'FastAPI', 'PostgreSQL', 'asyncio'],
  },
  {
    title: 'Junior Golang Developer',
    company: 'Ozon Tech',
    location: 'Москва / Удаленно',
    format: 'Удаленно' as const,
    salary: 'от 85 000 ₽',
    directionId: 'backend' as DirectionId,
    subTrackId: 'golang' as SubTrackId,
    sourceChannel: '@ozon_tech_career',
    description: 'Микросервисы логистики и маршрутизации на Go с обменом через gRPC и Kafka.',
    tags: ['Go', 'gRPC', 'PostgreSQL', 'Docker'],
  },
  {
    title: 'Стажёр Data Scientist / ML Engineer',
    company: 'Сбер AI',
    location: 'Москва / Офис',
    format: 'Офис' as const,
    salary: 'от 80 000 ₽',
    directionId: 'data_science' as DirectionId,
    subTrackId: 'ml' as SubTrackId,
    sourceChannel: '@sber_careers',
    description: 'Обучение моделей ранжирования, NLP и классических табличных бустингов.',
    tags: ['Python', 'PyTorch', 'CatBoost', 'SQL'],
  },
  {
    title: 'Стажёр Android-разработчик',
    company: 'Avito Tech',
    location: 'Санкт-Петербург / Гибрид',
    format: 'Гибрид' as const,
    salary: 'от 70 000 ₽',
    directionId: 'mobile' as DirectionId,
    subTrackId: 'android' as SubTrackId,
    sourceChannel: '@avito_tech',
    description: 'Фичи для супераппа объявлений Авито на Kotlin и Jetpack Compose.',
    tags: ['Kotlin', 'Jetpack Compose', 'Coroutines'],
  },
];

export const TelegramParserTab: React.FC<TelegramParserTabProps> = ({
  telegramUser,
  currentSubscription,
  onSubscriptionSaved,
  onInternshipAdded,
}) => {
  // Token state
  const [tokenInput, setTokenInput] = useState<string>(getSavedBotToken());
  const [tokenSavedStatus, setTokenSavedStatus] = useState<string>('');

  // Subscription state
  const [chatId, setChatId] = useState<string>(
    telegramUser
      ? String(telegramUser.id)
      : currentSubscription
      ? String(currentSubscription.chat_id)
      : ''
  );
  const [username, setUsername] = useState<string>(
    telegramUser?.username || currentSubscription?.username || ''
  );
  const [selectedDirections, setSelectedDirections] = useState<DirectionId[]>(
    currentSubscription?.directions || ['frontend', 'backend']
  );
  const [selectedSubTracks, setSelectedSubTracks] = useState<SubTrackId[]>(
    currentSubscription?.sub_tracks || ['react', 'python']
  );
  const [isDetectingChatId, setIsDetectingChatId] = useState<boolean>(false);
  const [subStatus, setSubStatus] = useState<string>('');

  // Auto-synchronize state whenever telegramUser or currentSubscription changes
  useEffect(() => {
    if (telegramUser) {
      setChatId(String(telegramUser.id));
      if (telegramUser.username) setUsername(telegramUser.username);
    } else if (currentSubscription) {
      if (currentSubscription.chat_id) setChatId(String(currentSubscription.chat_id));
      if (currentSubscription.username) setUsername(currentSubscription.username);
      if (currentSubscription.directions?.length) setSelectedDirections(currentSubscription.directions);
      if (currentSubscription.sub_tracks?.length) setSelectedSubTracks(currentSubscription.sub_tracks);
    }
  }, [telegramUser, currentSubscription]);

  // Simulator parser state
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [customTitle, setCustomTitle] = useState<string>(PRESET_VACANCIES[0].title);
  const [customCompany, setCustomCompany] = useState<string>(PRESET_VACANCIES[0].company);
  const [customSalary, setCustomSalary] = useState<string>(PRESET_VACANCIES[0].salary);
  const [customChannel, setCustomChannel] = useState<string>(PRESET_VACANCIES[0].sourceChannel);
  const [customDirection, setCustomDirection] = useState<DirectionId>(PRESET_VACANCIES[0].directionId);
  const [customSubTrack, setCustomSubTrack] = useState<SubTrackId>(PRESET_VACANCIES[0].subTrackId);
  const [customDescription, setCustomDescription] = useState<string>(PRESET_VACANCIES[0].description);
  const [customFormat, setCustomFormat] = useState<'Удаленно' | 'Гибрид' | 'Офис'>(PRESET_VACANCIES[0].format);

  // Activity logs
  const [logs, setLogs] = useState<LogEntry[]>(() => [
    {
      id: 'log-0',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      text: 'Инициализирован модуль интеграции с Telegram Bot API (@' + TELEGRAM_BOT_USERNAME + ')',
    },
  ]);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const addLog = (type: LogEntry['type'], text: string) => {
    setLogs((prev) => [
      {
        id: 'log-' + Date.now() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
        type,
        text,
      },
      ...prev.slice(0, 30),
    ]);
  };

  // Bot Token save
  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    saveBotToken(tokenInput.trim());
    setTokenSavedStatus('Токен сохранен локально в вашем браузере!');
    addLog('success', 'Bot Token обновлен в локальном хранилище');
    setTimeout(() => setTokenSavedStatus(''), 3000);
  };

  // Auto-detect Chat ID
  const handleAutoDetect = async () => {
    setIsDetectingChatId(true);
    setSubStatus('');
    triggerHaptic('medium');
    addLog('info', 'Запрос обновлений бота getUpdates для поиска последнего пользователя...');

    const res = await autoDetectChatIdFromUpdates(tokenInput.trim() || undefined);
    setIsDetectingChatId(false);

    if (res.success && res.chatId) {
      setChatId(String(res.chatId));
      if (res.username) setUsername(res.username);
      setSubStatus(`Найден Chat ID: ${res.chatId} (${res.username ? '@' + res.username : res.firstName || ''})`);
      addLog('success', `Автоопределение успешно: Chat ID ${res.chatId}`);
      triggerHaptic('success');

      // Auto-save subscription to Supabase as specified in Requirement 3.1
      const autoSub: TelegramSubscription = {
        chat_id: String(res.chatId),
        username: res.username || username || '',
        first_name: res.firstName || telegramUser?.first_name || '',
        directions: selectedDirections,
        sub_tracks: selectedSubTracks,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      saveLocalSubscription(autoSub);
      onSubscriptionSaved(autoSub);
      saveSubscriptionToSupabase(autoSub).then((ok) => {
        if (ok) {
          addLog('success', 'Подписка автоматически сохранена в Supabase!');
        }
      });
    } else {
      setSubStatus(res.error || 'Ошибка автоопределения. Убедитесь, что отправили /start боту.');
      addLog('error', `Ошибка автоопределения Chat ID: ${res.error}`);
    }
  };

  // Test Notification
  const handleSendTest = async () => {
    if (!chatId) {
      setSubStatus('Сначала укажите Chat ID');
      return;
    }
    triggerHaptic('medium');
    addLog('info', `Отправка тестового сообщения на Chat ID: ${chatId}...`);

    const text = `<b>🚀 Тестовое уведомление IT-Старт!</b>\n\nБот @${TELEGRAM_BOT_USERNAME} подключен к вашей сессии. Уведомления о новых вакансиях активны!`;
    const res = await sendTelegramMessage(chatId, text, tokenInput.trim() || undefined);

    if (res.success) {
      addLog('success', `Тестовое сообщение успешно отправлено на Chat ID ${chatId}!`);
      triggerHaptic('success');
      confetti({ particleCount: 50, spread: 60 });
    } else {
      addLog('error', `Не удалось отправить сообщение: ${res.error}`);
    }
  };

  // Save Subscription
  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId) {
      setSubStatus('Пожалуйста, укажите Chat ID');
      return;
    }

    const sub: TelegramSubscription = {
      chat_id: chatId.trim(),
      username: username.trim(),
      first_name: telegramUser?.first_name || '',
      directions: selectedDirections,
      sub_tracks: selectedSubTracks,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    saveLocalSubscription(sub);
    onSubscriptionSaved(sub);
    addLog('info', `Сохранение подписки в Supabase (chat_id: ${chatId})...`);

    const ok = await saveSubscriptionToSupabase(sub);
    if (ok) {
      addLog('success', 'Подписка успешно синхронизирована с базой данных Supabase!');
    } else {
      addLog('warning', 'Подписка сохранена локально (Supabase offline fallback)');
    }

    setSubStatus('Подписка успешно сохранена!');
    triggerHaptic('success');
    confetti({ particleCount: 60, spread: 60 });
  };

  // Select Preset
  const handleSelectPreset = (idx: number) => {
    triggerHaptic('selection');
    setPresetIndex(idx);
    const p = PRESET_VACANCIES[idx];
    setCustomTitle(p.title);
    setCustomCompany(p.company);
    setCustomSalary(p.salary);
    setCustomChannel(p.sourceChannel);
    setCustomDirection(p.directionId);
    setCustomSubTrack(p.subTrackId);
    setCustomDescription(p.description);
    setCustomFormat(p.format);
  };

  // Publish Vacancy & Send Real Notifications
  const handlePublishAndNotify = async () => {
    setIsPublishing(true);
    triggerHaptic('medium');

    addLog('info', `1/3: Симуляция парсинга нового поста из Telegram-канала ${customChannel}...`);

    const newVacancy: Internship = {
      id: 'int-new-' + Date.now(),
      title: customTitle,
      company: customCompany,
      location: 'Москва / Удаленно',
      format: customFormat,
      salary: customSalary,
      directionId: customDirection,
      subTrackId: customSubTrack,
      tags: [customSubTrack.toUpperCase(), 'Новая вакансия', 'Парсер TG', 'Intern'],
      description: customDescription,
      requirements: [
        'Базовые знания профильного стека (' + customSubTrack + ')',
        'Понимание алгоритмов и структур данных',
        'Желание обучаться под руководством ментора',
      ],
      responsibilities: [
        'Разработка сервисов и фичей под контролем старших коллег',
        'Участие в код-ревью и написание тестов',
      ],
      sourceChannel: customChannel,
      sourceType: 'telegram',
      applyUrl: TELEGRAM_BOT_URL,
      publishedAt: new Date().toISOString(),
      isHot: true,
    };

    // 1. Save to Supabase table
    addLog('info', '2/3: Сохранение вакансии в базу данных Supabase (public.internships)...');
    const dbResult = await addInternshipToSupabase(newVacancy);
    if (dbResult) {
      addLog('success', 'Вакансия успешно сохранена в Supabase!');
    } else {
      addLog('warning', 'Вакансия добавлена в локальную ленту сайта (Fallback mode)');
    }

    // Update parent state so it shows immediately on the site feed
    onInternshipAdded(newVacancy);

    // 2. Query subscribers from Supabase or active list
    addLog('info', '3/3: Поиск подписчиков со стеком ' + customDirection + ' / ' + customSubTrack + '...');
    const allSubs = await fetchSubscriptionsFromSupabase();

    // Collect target chat IDs (matching direction or subtrack, + include current session chat_id if specified)
    const targetChatIds = new Set<string>();

    allSubs.forEach((s) => {
      if (
        s.is_active &&
        (s.directions.includes(customDirection) || s.sub_tracks.includes(customSubTrack))
      ) {
        targetChatIds.add(String(s.chat_id));
      }
    });

    if (chatId) {
      targetChatIds.add(String(chatId));
    }

    const recipientCount = targetChatIds.size;
    addLog('info', `Найдено получателей: ${recipientCount}. Рассылка сообщений от @${TELEGRAM_BOT_USERNAME}...`);

    const dirTitle = DIRECTIONS.find((d) => d.id === customDirection)?.title.split('-')[0] || customDirection;
    const subTrackTitle =
      DIRECTIONS.flatMap((d) => d.subTracks).find((st) => st.id === customSubTrack)?.name ||
      customSubTrack;

    const notificationMessage = `🔥 <b>Новая стажировка под твой стек!</b>\n\n🏢 <b>${customCompany}</b> — <b>${customTitle}</b> (${dirTitle} / ${subTrackTitle})\n💰 Зарплата: <b>${customSalary}</b>\n📢 Источник: <code>${customChannel}</code>\n\n🎯 <i>Для этой вакансии в IT-Старт уже сформирован план подготовки из профильных вопросов!</i>`;

    let successCount = 0;
    const botTokenToUse = tokenInput.trim() || undefined;

    for (const targetId of Array.from(targetChatIds)) {
      const sendRes = await sendTelegramMessage(
        targetId,
        notificationMessage,
        botTokenToUse,
        '🚀 Открыть IT-Старт',
        GITHUB_PAGES_URL
      );

      if (sendRes.success) {
        successCount++;
        addLog('success', `Успешно отправлено уведомление для Chat ID: ${targetId}`);
      } else {
        addLog('warning', `Не удалось отправить на Chat ID ${targetId}: ${sendRes.error}`);
      }
    }

    setIsPublishing(false);
    triggerHaptic('success');
    confetti({ particleCount: 100, spread: 80 });

    addLog(
      'success',
      `Публикация завершена! Вакансия добавлена в ленту сайта. Разослано уведомлений: ${successCount} из ${recipientCount}.`
    );
  };

  return (
    <div className="space-y-8">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-sky-400" />
                Telegram Bot API & WebApp
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Киллер-фича
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Интеграция с Telegram и Симулятор Парсера
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Настройка реальных пуш-уведомлений от бота @{TELEGRAM_BOT_USERNAME}, автоматическое определение Chat ID, симуляция парсинга каналов и моментальная рассылка подписчикам.
            </p>
          </div>

          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs sm:text-sm font-bold transition-all shrink-0"
          >
            <Bot className="w-4 h-4" />
            <span>Открыть @{TELEGRAM_BOT_USERNAME}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BLOCK 1: BOT TOKEN SETTINGS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Настройка Bot Token от @BotFather
                </h3>
                <p className="text-xs text-slate-400">
                  Сохраняется только локально в вашем браузере (localStorage)
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 leading-relaxed mb-4 space-y-1.5">
              <p className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Безопасность согласно требованиям ТЗ:
              </p>
              <p>
                Так как репозиторий на GitHub публичный, секретный токен бота нельзя хардкодить в исходниках. Введите токен вашего бота @{TELEGRAM_BOT_USERNAME} здесь — он сохранится исключительно в вашем локальном браузере и позволит веб-приложению вызывать Telegram Bot API напрямую!
              </p>
            </div>

            <form onSubmit={handleSaveToken} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Telegram Bot API Token:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="например 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-mono text-slate-200 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {tokenSavedStatus && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{tokenSavedStatus}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Сохранить токен</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTokenInput('');
                    saveBotToken('');
                    addLog('info', 'Bot Token удален из хранилища');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium transition-colors"
                >
                  Очистить
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* BLOCK 2: SUBSCRIPTION & AUTO-DETECT */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Подписка на уведомления в Telegram
              </h3>
              <p className="text-xs text-slate-400">
                Синхронизация с таблицей public.tg_subscriptions в Supabase
              </p>
            </div>
          </div>

          {telegramUser ? (
            <div className="p-3 mb-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
              <span>
                Telegram Mini App активен! Ваш ID: <strong className="font-mono">{telegramUser.id}</strong>
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <a
                href={`${TELEGRAM_BOT_URL}?start=subscribe`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-colors"
              >
                <span>1. Написать /start боту</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={isDetectingChatId}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDetectingChatId ? 'animate-spin' : ''}`} />
                <span>2. Найти Chat ID авто</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSaveSubscription} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Telegram Chat ID:
                </label>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="ID пользователя"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Username в Telegram:
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-slate-400">
                Направления для получения уведомлений:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {DIRECTIONS.map((d) => {
                  const isChecked = selectedDirections.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setSelectedDirections((prev) =>
                          prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                        );
                        setSelectedSubTracks((prev) =>
                          isChecked
                            ? prev.filter((st) => !d.subTracks.some((s) => s.id === st))
                            : Array.from(new Set([...prev, ...d.subTracks.map((s) => s.id)]))
                        );
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border truncate ${
                        isChecked
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {d.title.split('-')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {subStatus && (
              <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs">
                {subStatus}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={!chatId}
                className="w-1/2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-sky-400" />
                <span>Проверить пуш</span>
              </button>

              <button
                type="submit"
                className="w-1/2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Сохранить в БД</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* BLOCK 3: SIMULATOR OF TELEGRAM CHANNEL PARSER */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Симулятор парсера вакансий & Пуш-рассылка
                <Flame className="w-4 h-4 text-rose-500" />
              </h3>
              <p className="text-xs text-slate-400">
                Добавление вакансии в Supabase + мгновенная отправка пуша в Telegram подходящим подписчикам
              </p>
            </div>
          </div>
        </div>

        {/* Presets selector */}
        <div className="pt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Выберите готовый пресет из реального Telegram-канала:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {PRESET_VACANCIES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(idx)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    presetIndex === idx
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold block text-white truncate">{p.company}</span>
                  <span className="text-[11px] text-sky-400 truncate block">{p.sourceChannel}</span>
                  <span className="text-[10px] text-slate-500 truncate block">{p.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Компания:</label>
              <input
                type="text"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Должность:</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Зарплата / Оплата:</label>
              <input
                type="text"
                value={customSalary}
                onChange={(e) => setCustomSalary(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Telegram-канал источник:</label>
              <input
                type="text"
                value={customChannel}
                onChange={(e) => setCustomChannel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-sky-400 font-mono"
              />
            </div>
          </div>

          {/* Big action button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePublishAndNotify}
              disabled={isPublishing}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-600/25 active:scale-98 transition-all disabled:opacity-50"
            >
              <Send className={`w-5 h-5 ${isPublishing ? 'animate-spin' : ''}`} />
              <span>
                {isPublishing
                  ? 'Публикация и рассылка уведомлений в Telegram...'
                  : 'Опубликовать стажировку и разослать уведомления в Telegram! 🚀'}
              </span>
            </button>
          </div>
        </div>

        {/* Live Activity Terminal */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Журнал событий и отчетов Bot API (Live Activity):
            </span>
            <button
              onClick={() => setLogs([])}
              className="text-slate-500 hover:text-slate-300 text-[11px]"
            >
              Очистить лог
            </button>
          </div>

          <div className="h-44 overflow-y-auto bg-slate-950 rounded-2xl p-3 border border-slate-800 font-mono text-[11px] space-y-1.5 custom-scroll">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                <span
                  className={
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'error'
                      ? 'text-rose-400'
                      : log.type === 'warning'
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOCK 4: PROJECT TEAM INFO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              Команда проекта («Проектная деятельность»)
            </h3>
            <p className="text-xs text-slate-400">
              Разработчики сервиса «IT-Старт: агрегатор стажировок и база подготовки»
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEAM_MEMBERS.map((member, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shrink-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{member.name}</h4>
                    <span className="text-[11px] font-semibold text-indigo-400 block">
                      {member.role}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  {member.responsibility}
                </p>
              </div>

              <div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {member.techStack.map((tech, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-400"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-500 text-[11px]">IT-Старт Team</span>
                  <a
                    href={member.telegram || TELEGRAM_BOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                  >
                    <span>Связаться</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
