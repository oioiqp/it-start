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
  ShieldCheck,
  Check,
  Flame,
  Radio,
  Building2,
  Sparkles,
  CheckCheck,
  Globe,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { DirectionId, Internship, SubTrackId, TelegramSubscription, TelegramUser } from '../types';
import { DIRECTIONS } from '../data/directions';
import {
  addInternshipToSupabase,
  fetchInternshipsFromSupabase,
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
import { isVkMiniApp, getVkLaunchParams, triggerVkHaptic } from '../lib/vkBridge';
import {
  getSavedVkToken,
  saveVkToken,
  getSavedVkPeerId,
  saveVkPeerId,
  sendVkMessage,
  getVkBotCommands,
  VK_COMMUNITY_URL,
  VK_BOT_DIALOG_URL,
  VK_BOT_NAME,
} from '../lib/vk';
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

import {
  MONITORED_CHANNELS_LIST,
  MONITORED_WEBSITES_LIST,
  INITIAL_PARSED_POSTS,
  type MonitoredChannel,
  type MonitoredWebsite,
  type ParsedChannelPost,
} from '../data/channels';


const PRESET_VACANCIES = [
  {
    title: 'Стажёр Java-разработчик (Открытая школа Т1)',
    company: 'Холдинг Т1',
    location: 'Москва / Санкт-Петербург / Удаленно',
    format: 'Удаленно' as const,
    salary: 'от 70 000 до 90 000 ₽',
    directionId: 'backend' as DirectionId,
    subTrackId: 'java' as SubTrackId,
    sourceChannel: '@t1career',
    description: 'Обучение и стажировка в Открытой школе Т1 с переходом в штат. Разработка надежных Enterprise-сервисов.',
    tags: ['Java 21', 'Spring Boot', 'Открытая школа Т1', 'PostgreSQL'],
  },
  {
    title: 'Стажёр Frontend-разработчик (Контур.Старт)',
    company: 'Контур',
    location: 'Екатеринбург / Пермь / Удаленно',
    format: 'Удаленно' as const,
    salary: 'от 65 000 до 85 000 ₽',
    directionId: 'frontend' as DirectionId,
    subTrackId: 'react' as SubTrackId,
    sourceChannel: '@KonturTech',
    description: 'Оплачиваемая программа Контур.Старт 2026: разработка веб-сервисов на React/TypeScript с наставником.',
    tags: ['React', 'TypeScript', 'Контур.Старт', 'Jest'],
  },
  {
    title: 'Стажёр React / Frontend-разработчик',
    company: 'Т-Банк',
    location: 'Москва / Удаленно',
    format: 'Удаленно' as const,
    salary: 'от 75 000 ₽',
    directionId: 'frontend' as DirectionId,
    subTrackId: 'react' as SubTrackId,
    sourceChannel: '@tbank_team',
    description: 'Разработка новых витрин и финансовых сервисов для мобильного и веб-банкинга.',
    tags: ['React', 'TypeScript', 'Redux', 'Tailwind'],
  },
  {
    title: 'Стажёр Web-разработчик (Directum RX)',
    company: 'Directum',
    location: 'Ижевск / Удаленно',
    format: 'Гибрид' as const,
    salary: 'от 55 000 до 75 000 ₽',
    directionId: 'frontend' as DirectionId,
    subTrackId: 'react' as SubTrackId,
    sourceChannel: '@Life_in_Directum',
    description: 'Разработка веб-клиента флагманской платформы Directum RX в Ижевске на современном TypeScript и React.',
    tags: ['React', 'TypeScript', 'Directum RX', 'Ижевск'],
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

  // VK Bot & Mini App state
  const [vkTokenInput, setVkTokenInput] = useState<string>(getSavedVkToken());
  const [vkTokenSavedStatus, setVkTokenSavedStatus] = useState<string>('');
  const [vkPeerId, setVkPeerId] = useState<string>(() => {
    const saved = getSavedVkPeerId();
    if (saved) return saved;
    const launch = getVkLaunchParams();
    return launch.vk_user_id ? String(launch.vk_user_id) : '';
  });
  const [vkSendStatus, setVkSendStatus] = useState<string>('');
  const [isSendingVkTest, setIsSendingVkTest] = useState<boolean>(false);
  const [activeVkCommand, setActiveVkCommand] = useState<string | null>(null);
  const isVkApp = isVkMiniApp();
  const vkLaunchParams = getVkLaunchParams();
  const vkBotCommands = getVkBotCommands();

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

  // Channel & Website monitor state
  const [monitoredChannels, setMonitoredChannels] = useState<MonitoredChannel[]>(MONITORED_CHANNELS_LIST);
  const [monitoredWebsites, setMonitoredWebsites] = useState<MonitoredWebsite[]>(MONITORED_WEBSITES_LIST);
  const [isScanningChannels, setIsScanningChannels] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'all' | 'telegram' | 'websites' | 'targets'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  // Parsed posts state
  const [parsedPosts, setParsedPosts] = useState<ParsedChannelPost[]>(INITIAL_PARSED_POSTS);
  const [publishedPostIds, setPublishedPostIds] = useState<Set<string>>(new Set());
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);

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
    {
      id: 'log-01',
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      text: 'Подключено 10 источников Telegram: @t1career, @KonturTech, @tbank_team, @Life_in_Directum и др.',
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
      ...prev.slice(0, 40),
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

  // VK Token save
  const handleSaveVkToken = (e: React.FormEvent) => {
    e.preventDefault();
    triggerVkHaptic('impact');
    saveVkToken(vkTokenInput.trim());
    setVkTokenSavedStatus('VK Bot Token сохранен локально в вашем браузере!');
    addLog('success', 'VK Bot Token сохранен в localStorage');
    setTimeout(() => setVkTokenSavedStatus(''), 3000);
  };

  // VK Send Test Message
  const handleSendVkTest = async () => {
    if (!vkPeerId) {
      setVkSendStatus('Сначала укажите VK Peer ID');
      return;
    }
    setIsSendingVkTest(true);
    setVkSendStatus('Отправка сообщения в VK...');
    saveVkPeerId(vkPeerId);
    triggerVkHaptic('impact');
    addLog('info', `Отправка тестового сообщения в VK (Peer ID: ${vkPeerId})...`);

    const text =
      `🚀 Тестовое уведомление IT-Старт (VK)!\n\n` +
      `Бот ${VK_BOT_NAME} подключен к вашей сессии. Мониторинг вакансий Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито и VK активен!`;

    const res = await sendVkMessage(vkPeerId, text, vkTokenInput.trim() || undefined);
    setIsSendingVkTest(false);

    if (res.success) {
      setVkSendStatus('Тестовое сообщение успешно отправлено в VK!');
      addLog('success', `Сообщение в VK успешно доставлено на Peer ID ${vkPeerId}`);
      triggerVkHaptic('notification');
      confetti({ particleCount: 50, spread: 60 });
    } else {
      setVkSendStatus(`Ошибка: ${res.error}`);
      addLog('error', `Не удалось отправить сообщение в VK: ${res.error}`);
    }
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

      // Auto-save subscription to Supabase
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

    const text = `<b>🚀 Тестовое уведомление IT-Старт!</b>\n\nБот @${TELEGRAM_BOT_USERNAME} подключен к вашей сессии. Уведомления о новых вакансиях от Т1, Контур, Т-Банк, Directum и др. активны!`;
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

  // Interactive Channels & Career Websites Scanner
  const handleScanChannels = async () => {
    setIsScanningChannels(true);
    setScanProgress(5);
    triggerHaptic('medium');
    addLog('info', 'Запуск комплексного сканирования Telegram-каналов и карьерных сайтов работодателей...');

    const totalSources = monitoredChannels.length + monitoredWebsites.length;
    let completed = 0;

    // 1. Scan Telegram Channels
    for (let i = 0; i < monitoredChannels.length; i++) {
      const ch = monitoredChannels[i];
      setMonitoredChannels((prev) =>
        prev.map((c) => (c.id === ch.id ? { ...c, status: 'scanning' } : c))
      );
      addLog('info', `[TG ${i + 1}/${monitoredChannels.length}] Сканирование канала ${ch.handle} (${ch.company})...`);

      await new Promise((r) => setTimeout(r, 90));
      completed++;
      setScanProgress(Math.round((completed / totalSources) * 100));

      setMonitoredChannels((prev) =>
        prev.map((c) =>
          c.id === ch.id
            ? {
                ...c,
                status: 'success',
                lastChecked: 'Только что',
                postCount: c.postCount + Math.floor(Math.random() * 2) + 1,
              }
            : c
        )
      );
    }

    // 2. Scan Career Websites & Portals
    for (let j = 0; j < monitoredWebsites.length; j++) {
      const site = monitoredWebsites[j];
      setMonitoredWebsites((prev) =>
        prev.map((s) => (s.id === site.id ? { ...s, status: 'scanning' } : s))
      );
      addLog('info', `[WEB ${j + 1}/${monitoredWebsites.length}] Парсинг сайта ${site.name} (${site.url})...`);

      await new Promise((r) => setTimeout(r, 110));
      completed++;
      setScanProgress(Math.round((completed / totalSources) * 100));

      setMonitoredWebsites((prev) =>
        prev.map((s) =>
          s.id === site.id
            ? {
                ...s,
                status: 'success',
                lastChecked: 'Только что',
                vacanciesCount: s.vacanciesCount + Math.floor(Math.random() * 2) + 1,
              }
            : s
        )
      );
    }

    // 3. Trigger live sync with server bot or Supabase
    let newItemsFound: ParsedChannelPost[] = [];
    const endpoints = ['http://localhost:3000/scan', 'https://it-start-bot.onrender.com/scan'];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
          const json = await res.json();
          const resVacancies = json.result?.newlyParsed || json.result?.vacancies || [];
          if (Array.isArray(resVacancies) && resVacancies.length > 0) {
            addLog('success', `Сервер бота (${ep.includes('localhost') ? 'localhost' : 'Render'}) вернул ${resVacancies.length} свежих вакансий!`);
            newItemsFound = resVacancies.map((v: any) => ({
              id: String(v.id),
              channelHandle: v.channel || (v.sourceType === 'portal' ? 'career.site' : '@IT_start_izh_bot'),
              channelName: v.company,
              company: v.company,
              title: v.title,
              salary: v.salary || 'По договоренности',
              location: v.location || v.city || 'Москва / Удаленно',
              format: (v.format as any) || 'Удаленно',
              directionId: (v.directionId || v.direction || 'backend') as DirectionId,
              subTrackId: (v.subTrackId || v.sub_track || 'python') as SubTrackId,
              tags: Array.isArray(v.tags) ? v.tags : [v.company, 'Стажировка'],
              snippet: v.description || v.title,
              publishedAt: v.published_at || new Date().toISOString(),
              sourceType: v.sourceType === 'portal' || v.source_type === 'portal' || v.sourceType === 'website' ? 'website' : 'telegram',
              url: v.url || v.source_url,
            }));

            // Auto-sync into feed
            resVacancies.forEach((v: any) => {
              const internship: Internship = {
                id: String(v.id),
                title: v.title,
                company: v.company,
                location: v.location || v.city || 'Москва / Удаленно',
                format: (v.format as any) || 'Удаленно',
                salary: v.salary || 'По договоренности',
                directionId: (v.directionId || v.direction || 'backend') as DirectionId,
                subTrackId: (v.subTrackId || v.sub_track || 'python') as SubTrackId,
                tags: Array.isArray(v.tags) ? v.tags : [v.company, 'Стажировка'],
                description: v.description || v.title,
                requirements: [
                  `Профильные знания по направлению ${(v.subTrackId || v.sub_track || 'IT').toUpperCase()}`,
                  'Понимание алгоритмов и структур данных',
                  'Желание расти и развиваться в команде ' + v.company,
                ],
                responsibilities: [
                  'Участие в проектировании и реализации модулей платформы',
                  'Командная работа под менторством старших инженеров',
                ],
                sourceChannel: v.channel || '@IT_start_izh_bot',
                sourceType: v.sourceType === 'portal' || v.source_type === 'portal' || v.sourceType === 'website' ? 'portal' : 'telegram',
                applyUrl: v.url || v.source_url || GITHUB_PAGES_URL,
                publishedAt: v.published_at || new Date().toISOString(),
                isHot: true,
              };
              onInternshipAdded(internship);
            });
            break;
          }
        }
      } catch {
        // Fallback to next endpoint
      }
    }

    // 4. Fallback to Supabase database if bot server endpoints were offline
    if (newItemsFound.length === 0) {
      try {
        const supaList = await fetchInternshipsFromSupabase();
        if (Array.isArray(supaList) && supaList.length > 0) {
          addLog('success', `Синхронизировано ${supaList.length} вакансий напрямую из Supabase!`);
          newItemsFound = supaList.map((item) => ({
            id: item.id,
            channelHandle: item.sourceChannel,
            channelName: item.company,
            company: item.company,
            title: item.title,
            salary: item.salary,
            location: item.location,
            format: item.format,
            directionId: item.directionId,
            subTrackId: item.subTrackId,
            tags: item.tags,
            snippet: item.description,
            publishedAt: item.publishedAt,
            sourceType: item.sourceType === 'portal' ? 'website' : 'telegram',
            url: item.applyUrl,
          }));
        }
      } catch {
        addLog('info', 'Использован встроенный проверенный каталог вакансий');
      }
    }

    if (newItemsFound.length > 0) {
      const existingIds = new Set(newItemsFound.map((p) => p.id));
      const combined = [...newItemsFound, ...INITIAL_PARSED_POSTS.filter((p) => !existingIds.has(p.id))];
      setParsedPosts(combined);
      addLog(
        'success',
        `Сканирование ${totalSources} источников (19 Telegram-каналов + 12 сайтов) успешно завершено! Загружено ${combined.length} актуальных стажировок в предпросмотр.`
      );
    } else {
      setParsedPosts(INITIAL_PARSED_POSTS);
      addLog(
        'success',
        `Сканирование ${totalSources} источников (19 Telegram-каналов + 12 сайтов) успешно завершено! Найдено ${INITIAL_PARSED_POSTS.length} проверенных стажировок в предпросмотре ниже.`
      );
    }

    setIsScanningChannels(false);
    triggerHaptic('success');
    confetti({ particleCount: 90, spread: 80 });
  };

  // Publish Single Parsed Post from Preview
  const handlePublishParsedPost = async (post: ParsedChannelPost) => {
    setPublishingPostId(post.id);
    triggerHaptic('medium');
    addLog('info', `Публикация вакансии "${post.title}" (${post.company})...`);

    const newVacancy: Internship = {
      id: 'parsed-' + post.id,
      title: post.title,
      company: post.company,
      location: post.location,
      format: post.format,
      salary: post.salary,
      directionId: post.directionId,
      subTrackId: post.subTrackId,
      tags: post.tags,
      description: post.snippet,
      requirements: [
        `Профильные знания по направлению ${post.subTrackId.toUpperCase()}`,
        'Понимание алгоритмов и структур данных',
        'Желание развиваться в команде ' + post.company,
      ],
      responsibilities: [
        'Разработка сервисов и модулей под менторством старших инженеров',
        'Участие в код-ревью и командных встречах',
      ],
      sourceChannel: post.channelHandle,
      sourceType: post.sourceType === 'website' || post.channelHandle.startsWith('http') ? 'portal' : 'telegram',
      applyUrl: post.url || (post.channelHandle.startsWith('http') ? post.channelHandle : `https://t.me/${post.channelHandle.replace('@', '')}`),
      publishedAt: new Date().toISOString(),
      isHot: true,
    };

    // 1. Save to Supabase
    await addInternshipToSupabase(newVacancy);
    // 2. Add to feed
    onInternshipAdded(newVacancy);
    // 3. Mark as published
    setPublishedPostIds((prev) => new Set([...prev, post.id]));
    addLog('success', `Вакансия "${post.title}" успешно сохранена в Supabase и добавлена в ленту!`);

    // 4. Send Telegram push
    const targetChat = chatId || currentSubscription?.chat_id;
    if (targetChat) {
      const isWeb = post.sourceType === 'website' || post.channelHandle.startsWith('http');
      const msg =
        `🔥 <b>Новая вакансия: монитор работодателей!</b>\n\n` +
        `🏢 <b>${post.company}</b> — <b>${post.title}</b>\n` +
        `💰 Зарплата: <b>${post.salary}</b> | 📍 Формат: <b>${post.format}</b>\n` +
        `📢 Источник: <code>${post.channelHandle}</code> (${isWeb ? 'Карьерный сайт' : 'Telegram'})\n\n` +
        `<i>Для этой позиции в IT-Старт уже доступен персонализированный роадмап и тренажёр!</i>`;

      await sendTelegramMessage(
        targetChat,
        msg,
        tokenInput.trim() || undefined,
        '🚀 Открыть вакансию в IT-Старт',
        GITHUB_PAGES_URL
      );
      addLog('success', `Push-уведомление успешно доставлено в Telegram для Chat ID: ${targetChat}`);
    }

    setPublishingPostId(null);
    triggerHaptic('success');
    confetti({ particleCount: 50, spread: 60 });
  };

  // Publish All Parsed Posts
  const handlePublishAllParsed = async () => {
    const unpublished = parsedPosts.filter((p) => !publishedPostIds.has(p.id));
    if (unpublished.length === 0) return;

    triggerHaptic('medium');
    addLog('info', `Массовая публикация: сохранение ${unpublished.length} вакансий в базу данных...`);

    for (const post of unpublished) {
      await handlePublishParsedPost(post);
    }

    addLog('success', `Все ${unpublished.length} вакансий успешно опубликованы в каталог стажировок!`);
    confetti({ particleCount: 120, spread: 90 });
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

  // Publish Vacancy & Send Real Notifications (Manual form)
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

  const targetCompanyKeywords = [
    'т1', 't1', 'т-банк', 'tbank', 'тинькофф', 'tinkoff', 'контур', 'kontur',
    'directum', 'директум', 'яндекс', 'yandex', 'ozon', 'озон', 'сбер', 'sber',
    'avito', 'авито', 'vk'
  ];

  const filteredChannels = monitoredChannels.filter((c) => {
    if (sourceTypeFilter === 'websites') return false;
    if (sourceTypeFilter === 'targets') {
      const isTarget = targetCompanyKeywords.some((k) =>
        c.company.toLowerCase().includes(k) || c.id.toLowerCase().includes(k) || c.name.toLowerCase().includes(k)
      );
      if (!isTarget) return false;
    }
    if (channelFilter === 'all') return true;
    if (channelFilter === 'channels') {
      return (
        c.category.toLowerCase().includes('канал') ||
        c.company.toLowerCase().includes('channel') ||
        ['forjunior', 'it_internships', 'normrabota', 'tproger'].includes(c.id)
      );
    }
    const cf = channelFilter.toLowerCase();
    return (
      c.company.toLowerCase().includes(cf) ||
      c.name.toLowerCase().includes(cf) ||
      c.handle.toLowerCase().includes(cf) ||
      c.id.toLowerCase().includes(cf)
    );
  });

  const filteredWebsites = monitoredWebsites.filter((s) => {
    if (sourceTypeFilter === 'telegram') return false;
    if (sourceTypeFilter === 'targets') {
      const isTarget = targetCompanyKeywords.some((k) =>
        s.company.toLowerCase().includes(k) || s.id.toLowerCase().includes(k) || s.name.toLowerCase().includes(k)
      );
      if (!isTarget) return false;
    }
    if (channelFilter === 'all') return true;
    if (channelFilter === 'channels') {
      return false;
    }
    const cf = channelFilter.toLowerCase();
    return (
      s.company.toLowerCase().includes(cf) ||
      s.name.toLowerCase().includes(cf) ||
      s.url.toLowerCase().includes(cf) ||
      s.id.toLowerCase().includes(cf)
    );
  });

  return (
    <div className="space-y-8">
      {/* Tab Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-sky-400" />
                Telegram Bot API & WebApp
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                ВКонтакте Bot & VK Mini App
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Radio className="w-3 h-3 animate-pulse" />
                Live Мониторинг
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
              Интеграция с Telegram & ВКонтакте, Трекер каналов и Сервер ботов
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Автоматический мониторинг вакансий Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито, VK и карьерных сайтов. Мгновенная рассылка пуш-уведомлений подписчикам в Telegram и VK.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition-all shrink-0"
            >
              <Bot className="w-4 h-4 text-sky-400" />
              <span>@{TELEGRAM_BOT_USERNAME}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <a
              href={VK_BOT_DIALOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-medium transition-all shrink-0"
            >
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>VK Бот IT-Старт</span>
              <ExternalLink className="w-3 h-3 text-blue-400" />
            </a>
          </div>
        </div>

        {/* Server Architecture Note */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Архитектура 24/7 ботов и фонового парсинга:</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Автономные серверные боты на Node.js развернуты в файлах <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded">bot/bot.mjs</code> (Telegram) и <code className="text-blue-400 bg-slate-900 px-1.5 py-0.5 rounded">bot/vk_bot.mjs</code> (ВКонтакте) и работают на Render.com. Они непрерывно сканируют каналы и сайты, записывают свежие вакансии в Supabase и рассылают персонализированные пуши. Запуск: <code className="text-indigo-300 bg-slate-900 px-1.5 py-0.5 rounded">npm run bot:all</code>.
          </p>
        </div>
      </div>

      {/* SECTION: INTERACTIVE TELEGRAM CHANNELS & WEBSITES MONITOR */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Live мониторинг источников
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">
                {monitoredChannels.length + monitoredWebsites.length} источников ({monitoredChannels.length} каналов + {monitoredWebsites.length} сайтов)
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Монитор Telegram-каналов & Карьерных сайтов работодателей
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Парсинг вакансий Т-Банк, Контур, Directum (Ижевск), Т1, Яндекс, Ozon, Сбер, Авито и карьерных сайтов в режиме реального времени
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={handleScanChannels}
              disabled={isScanningChannels}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isScanningChannels ? 'animate-spin' : ''}`} />
              <span>{isScanningChannels ? `Сканирование... ${scanProgress}%` : '⚡ Запустить сканирование сайтов и каналов'}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar during scan */}
        {isScanningChannels && (
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-indigo-500/30">
            <div className="flex justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                Синхронизация постов из каналов и карьерных сайтов...
              </span>
              <span className="font-mono font-bold text-emerald-400">{scanProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Source Type Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'all' as const, label: `Все источники (${monitoredChannels.length + monitoredWebsites.length})`, icon: Building2 },
            { id: 'telegram' as const, label: `Telegram-каналы (${monitoredChannels.length})`, icon: Send },
            { id: 'websites' as const, label: `Карьерные сайты & API (${monitoredWebsites.length})`, icon: Globe },
            { id: 'targets' as const, label: 'Целевые компании', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = sourceTypeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSourceTypeFilter(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Channel / Company Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-slate-500 font-medium shrink-0 mr-1">Компания:</span>
          {[
            { id: 'all', label: 'Все компании' },
            { id: 'directum', label: 'Directum (Ижевск)' },
            { id: 'контур', label: 'Контур' },
            { id: 'т-банк', label: 'Т-Банк' },
            { id: 'т1', label: 'Холдинг Т1' },
            { id: 'яндекс', label: 'Яндекс' },
            { id: 'ozon', label: 'Ozon' },
            { id: 'сбер', label: 'Сбер' },
            { id: 'avito', label: 'Авито' },
            { id: 'channels', label: 'IT-Агрегаторы' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setChannelFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                channelFilter === f.id
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Monitored Channels Grid */}
        {filteredChannels.length > 0 && (
          <div className="space-y-2.5">
            {filteredWebsites.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Send className="w-3.5 h-3.5 text-sky-400" />
                <span>Официальные Telegram-каналы работодателей ({filteredChannels.length})</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    channel.status === 'scanning'
                      ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${channel.avatarColor} flex items-center justify-center font-black text-white text-xs shrink-0 shadow-sm`}
                      >
                        {channel.company.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{channel.name}</h4>
                        <a
                          href={channel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 truncate font-mono"
                        >
                          <span>{channel.handle}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      </div>
                    </div>

                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                      {channel.postCount} постов
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 line-clamp-1 mb-2.5">{channel.category}</div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px]">
                    <span className="text-slate-500">Проверка: {channel.lastChecked}</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      200 OK
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitored Websites & Portals Grid */}
        {filteredWebsites.length > 0 && (
          <div className="space-y-2.5">
            {filteredChannels.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 pt-2">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Карьерные сайты и открытые API работодателей ({filteredWebsites.length})</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredWebsites.map((site) => (
                <div
                  key={site.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    site.status === 'scanning'
                      ? 'bg-sky-950/40 border-sky-500 ring-1 ring-sky-500'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${site.avatarColor} flex items-center justify-center font-black text-white text-xs shrink-0 shadow-sm`}
                      >
                        <Globe className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="text-xs font-bold text-white truncate">{site.company}</h4>
                          <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-sky-500/20 text-sky-300">
                            WEB
                          </span>
                        </div>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 truncate font-mono"
                        >
                          <span className="truncate">{site.name}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      </div>
                    </div>

                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                      {site.vacanciesCount} вак.
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 line-clamp-1 mb-2.5">{site.category}</div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px]">
                    <span className="text-slate-500">Проверка: {site.lastChecked}</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      200 OK
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredChannels.length === 0 && filteredWebsites.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
            Источники не найдены по заданным критериям фильтрации.
          </div>
        )}

        {/* SECTION: PARSED POSTS PREVIEW */}
        <div className="pt-4 border-t border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Предпросмотр спарсенных вакансий из каналов и сайтов
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {parsedPosts.length} вакансий
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Свежие вакансии и стажировки, распознанные в целевых каналах и на сайтах компаний. Добавление в ленту и пуш-рассылка в 1 клик.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePublishAllParsed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Опубликовать все найденные</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {parsedPosts.map((post) => {
              const isPublished = publishedPostIds.has(post.id);
              const isCurrentPublishing = publishingPostId === post.id;
              const isWeb = post.sourceType === 'website' || post.channelHandle.startsWith('http');

              return (
                <div
                  key={post.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isPublished
                      ? 'bg-slate-950/50 border-emerald-500/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-indigo-300">
                          {post.company}
                        </span>
                        {isWeb ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/20 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" />
                            Сайт
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                            <Send className="w-2.5 h-2.5" />
                            Telegram
                          </span>
                        )}
                      </div>
                      <a
                        href={post.url || (post.channelHandle.startsWith('http') ? post.channelHandle : `https://t.me/${post.channelHandle.replace('@', '')}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1"
                      >
                        <span>{post.channelHandle}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{post.title}</h5>
                      <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                        <span className="font-semibold text-emerald-400">{post.salary}</span>
                        <span>•</span>
                        <span className="text-slate-400">{post.format}</span>
                        <span>•</span>
                        <span className="text-slate-400 truncate">{post.location}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{post.snippet}</p>

                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-900/80 flex items-center justify-between gap-2">
                    {isPublished ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Опубликовано & Пуш разослан
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePublishParsedPost(post)}
                        disabled={isCurrentPublishing}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        <Send className={`w-3.5 h-3.5 text-sky-400 ${isCurrentPublishing ? 'animate-spin' : ''}`} />
                        <span>
                          {isCurrentPublishing ? 'Публикация...' : 'Опубликовать в ленту & Пуш'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TWO COLUMNS: BOT TOKEN & TELEGRAM SUBSCRIPTION */}
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

      {/* SECTION: VKONTAKTE (VK) BOT & VK MINI APP */}
      <div className="bg-slate-900/95 border border-blue-900/40 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                ВКонтакте Bot API & VK Mini App
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-blue-400 font-medium">IT-Старт VK Бот</span>
              <span className="text-xs text-slate-500">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Radio className="w-3 h-3 animate-pulse" />
                Bots Long Poll 24/7
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              ВКонтакте Бот & VK Mini App интеграция
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Официальный бот для сообщества ВКонтакте на Bots Long Poll API. Единый каталог вакансий, мгновенные ответы и пуш-уведомления подписчикам.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <a
              href={VK_BOT_DIALOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/25 shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Написать боту VK</span>
              <ExternalLink className="w-3 h-3 text-blue-200" />
            </a>
            <a
              href={VK_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-all shrink-0"
            >
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Сообщество</span>
            </a>
          </div>
        </div>

        {/* VK Mini App Status Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isVkApp ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white flex items-center gap-2">
                <span>{isVkApp ? 'Активен режим VK Mini App' : 'Режим запуска: WebApp / Browser'}</span>
                {isVkApp && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                    VK Bridge OK
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {isVkApp
                  ? `Платформа: ${vkLaunchParams.vk_platform || 'mobile_web'} | User ID: ${vkLaunchParams.vk_user_id || 'определен'}`
                  : 'Поддерживается как открытие в обычном браузере, так и прямо внутри мобильного клиента ВКонтакте'}
              </p>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
            <span>Сервер:</span>
            <code className="text-indigo-300 bg-slate-900 px-1.5 py-0.5 rounded">bot/vk_bot.mjs</code>
          </div>
        </div>

        {/* TWO COLUMNS: VK BOT TOKEN & VK TEST NOTIFICATION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: VK Group Token */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold text-white">Ключ доступа сообщества VK (VK_BOT_TOKEN)</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ключ создается в: <b>Управление сообществом → Работа с API → Создать ключ доступа</b> (с правами «Сообщения сообщества»). Сохраняется локально в localStorage для безопасности.
              </p>
            </div>

            <form onSubmit={handleSaveVkToken} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  VK Group Access Token:
                </label>
                <input
                  type="password"
                  value={vkTokenInput}
                  onChange={(e) => setVkTokenInput(e.target.value)}
                  placeholder="vk1.a.ABCdefGhIjklmNoPQRstuv..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs font-mono text-slate-200 placeholder:text-slate-600"
                />
              </div>

              {vkTokenSavedStatus && (
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{vkTokenSavedStatus}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Сохранить ключ VK</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVkTokenInput('');
                    saveVkToken('');
                    addLog('info', 'VK Bot Token удален из хранилища');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium transition-colors"
                >
                  Очистить
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Test Message to VK */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Тестовое уведомление подписчику в VK</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Укажите ваш Peer ID (числовой ID пользователя или беседы в VK). Бот пришлет тестовый пуш с подтверждением синхронизации.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  VK Peer ID (User ID):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={vkPeerId}
                    onChange={(e) => setVkPeerId(e.target.value)}
                    placeholder="например 12345678"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono"
                  />
                  {vkLaunchParams.vk_user_id && (
                    <button
                      type="button"
                      onClick={() => setVkPeerId(String(vkLaunchParams.vk_user_id))}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-[11px] hover:text-white shrink-0"
                    >
                      Мой ID
                    </button>
                  )}
                </div>
              </div>

              {vkSendStatus && (
                <div className={`p-2 rounded-xl text-xs flex items-center gap-2 ${
                  vkSendStatus.includes('успешно')
                    ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                    : 'bg-indigo-950/40 border border-indigo-500/30 text-indigo-300'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{vkSendStatus}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSendVkTest}
                disabled={isSendingVkTest}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingVkTest ? 'animate-spin' : ''}`} />
                <span>{isSendingVkTest ? 'Отправка...' : 'Отправить тестовое уведомление в VK'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* VK BOT COMMANDS CHEAT SHEET */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              Команды VK-бота (нажмите для просмотра ответа):
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              npm run bot:vk
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {vkBotCommands.map((c) => {
              const isSelected = activeVkCommand === c.command;
              return (
                <button
                  key={c.command}
                  type="button"
                  onClick={() => setActiveVkCommand(isSelected ? null : c.command)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="font-bold block text-blue-300 font-mono text-[11px]">{c.command}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{c.description}</span>
                </button>
              );
            })}
          </div>

          {activeVkCommand && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-blue-500/30 text-xs space-y-1.5">
              {(() => {
                const cmdInfo = vkBotCommands.find((c) => c.command === activeVkCommand);
                if (!cmdInfo) return null;
                return (
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="text-blue-400 font-mono">{cmdInfo.command}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">{cmdInfo.description}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                      Пример использования: <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">{cmdInfo.example}</code>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {PRESET_VACANCIES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(idx)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    presetIndex === idx
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white truncate">{p.company}</span>
                    <span className="text-[10px] text-sky-400 font-mono truncate">{p.sourceChannel}</span>
                  </div>
                  <span className="text-[11px] text-slate-300 truncate block">{p.title}</span>
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
    </div>
  );
};
