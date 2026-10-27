import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Send,
  Check,
  AlertCircle,
  ExternalLink,
  Bot,
  RefreshCw,
  Repeat,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { DirectionId, SubTrackId, TelegramSubscription, TelegramUser } from '../types';
import type { VkUser } from '../lib/vkBridge';
import { DIRECTIONS } from '../data/directions';
import { saveSubscriptionToSupabase, TELEGRAM_BOT_USERNAME, TELEGRAM_BOT_URL } from '../lib/supabase';
import {
  autoDetectChatIdFromUpdates,
  getSavedBotToken,
  saveBotToken,
  sendTelegramMessage,
  triggerHaptic,
} from '../lib/telegram';
import { saveLocalSubscription } from '../lib/storage';
import { getSavedVkToken, sendVkMessage, getVkBotDialogUrl, getSavedVkPeerId, saveVkPeerId } from '../lib/vk';
import { useScrollLock } from '../lib/useScrollLock';

export type NotificationPlatform = 'vk' | 'telegram';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramUser: TelegramUser | null;
  vkUser?: VkUser | null;
  isVk?: boolean;
  currentSubscription: TelegramSubscription | null;
  onSubscriptionSaved: (sub: TelegramSubscription) => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({
  isOpen,
  onClose,
  telegramUser,
  vkUser,
  isVk,
  currentSubscription,
  onSubscriptionSaved,
}) => {
  // Determine initial platform based on client environment:
  // Inside VK -> VK notifications by default
  // Inside TG -> Telegram notifications by default
  // Regular Web -> Telegram by default (with prominent dual-choice switch)
  const initialPlatform: NotificationPlatform = vkUser || isVk ? 'vk' : 'telegram';
  const [platform, setPlatform] = useState<NotificationPlatform>(initialPlatform);

  const [chatId, setChatId] = useState<string>(() => {
    if (vkUser) return String(vkUser.id);
    if (telegramUser) return String(telegramUser.id);
    if (currentSubscription) return String(currentSubscription.chat_id);
    return getSavedVkPeerId() || '';
  });

  const [username, setUsername] = useState<string>(() => {
    if (vkUser) return `${vkUser.first_name || ''} ${vkUser.last_name || ''}`.trim();
    if (telegramUser) return telegramUser.username || '';
    if (currentSubscription) return currentSubscription.username || '';
    return '';
  });

  const [firstName, setFirstName] = useState<string>(() => {
    if (vkUser?.first_name) return vkUser.first_name;
    if (telegramUser?.first_name) return telegramUser.first_name;
    if (currentSubscription?.first_name) return currentSubscription.first_name;
    return '';
  });

  const [botTokenInput, setBotTokenInput] = useState<string>(getSavedBotToken());
  const [showTokenInput, setShowTokenInput] = useState<boolean>(!getSavedBotToken());
  const [selectedDirections, setSelectedDirections] = useState<DirectionId[]>(
    currentSubscription?.directions || ['frontend', 'backend']
  );
  const [selectedSubTracks, setSelectedSubTracks] = useState<SubTrackId[]>(
    currentSubscription?.sub_tracks || ['react', 'python']
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Lock background scroll on mobile and desktop while modal is open
  useScrollLock(isOpen);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Switch between Telegram and VK notification channels
  const handleSwitchPlatform = (targetPlatform: NotificationPlatform) => {
    triggerHaptic('selection');
    setPlatform(targetPlatform);
    setStatusMessage(null);

    if (targetPlatform === 'vk') {
      if (vkUser) {
        setChatId(String(vkUser.id));
        setFirstName(vkUser.first_name || '');
        const fullName = `${vkUser.first_name || ''} ${vkUser.last_name || ''}`.trim();
        setUsername(fullName);
      } else {
        const savedPeer = getSavedVkPeerId();
        setChatId(savedPeer || '');
        setUsername('');
      }
    } else {
      if (telegramUser) {
        setChatId(String(telegramUser.id));
        if (telegramUser.username) setUsername(telegramUser.username);
        if (telegramUser.first_name) setFirstName(telegramUser.first_name);
      } else if (currentSubscription) {
        setChatId(String(currentSubscription.chat_id));
        if (currentSubscription.username) setUsername(currentSubscription.username);
        if (currentSubscription.first_name) setFirstName(currentSubscription.first_name);
      } else {
        setChatId('');
        setUsername('');
      }
    }
  };

  if (!isOpen) return null;

  const toggleDirection = (dirId: DirectionId) => {
    triggerHaptic('selection');
    setSelectedDirections((prev) => {
      const exists = prev.includes(dirId);
      const nextDirs = exists ? prev.filter((d) => d !== dirId) : [...prev, dirId];

      if (!exists) {
        const dir = DIRECTIONS.find((d) => d.id === dirId);
        if (dir && dir.subTracks.length > 0) {
          setSelectedSubTracks((s) => Array.from(new Set([...s, ...dir.subTracks.map((st) => st.id)])));
        }
      }
      return nextDirs;
    });
  };

  const toggleSubTrack = (subId: SubTrackId) => {
    triggerHaptic('selection');
    setSelectedSubTracks((prev) =>
      prev.includes(subId) ? prev.filter((s) => s !== subId) : [...prev, subId]
    );
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    setStatusMessage(null);
    triggerHaptic('medium');

    const tokenToUse = botTokenInput.trim() || undefined;
    if (botTokenInput.trim()) {
      saveBotToken(botTokenInput.trim());
    }

    const result = await autoDetectChatIdFromUpdates(tokenToUse);
    setIsDetecting(false);

    if (result.success && result.chatId) {
      setChatId(String(result.chatId));
      if (result.username) setUsername(result.username);
      if (result.firstName) setFirstName(result.firstName);
      setStatusMessage({
        type: 'success',
        text: `Chat ID успешно найден: ${result.chatId} (${result.username ? '@' + result.username : result.firstName || 'Пользователь'})! Подписка синхронизирована с Supabase.`,
      });
      triggerHaptic('success');

      const subData: TelegramSubscription = {
        chat_id: String(result.chatId),
        username: (result.username || username).trim(),
        first_name: (result.firstName || firstName).trim(),
        directions: selectedDirections,
        sub_tracks: selectedSubTracks,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      saveLocalSubscription(subData);
      onSubscriptionSaved(subData);
      saveSubscriptionToSupabase(subData);
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Не удалось найти Chat ID автоматически. Нажмите кнопку шага 1, напишите /start боту и повторите!',
      });
    }
  };

  const handleTestNotification = async () => {
    if (!chatId) {
      setStatusMessage({
        type: 'error',
        text: platform === 'vk' ? 'Сначала укажите ваш VK ID' : 'Сначала укажите или определите ваш Telegram Chat ID',
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    if (platform === 'vk') {
      const testText = `🔥 Тестовое уведомление IT-Старт ВКонтакте!\n\nВы успешно подключили уведомления в сервисе IT-Старт.\nВыбранные направления: ${selectedDirections.join(', ')}\nВетки: ${selectedSubTracks.join(', ')}\n\nКак только появится новая стажировка под ваш стек, вы получите мгновенный пуш!`;
      const vkToken = getSavedVkToken();

      if (vkToken) {
        const res = await sendVkMessage(chatId, testText, vkToken);
        setIsLoading(false);
        if (res.success) {
          setStatusMessage({
            type: 'success',
            text: 'Тестовое уведомление успешно отправлено в VK! Проверьте диалог с сообществом.',
          });
          triggerHaptic('success');
          confetti({ particleCount: 60, spread: 60 });
        } else {
          setStatusMessage({
            type: 'error',
            text: res.error || 'Не удалось отправить сообщение в VK.',
          });
        }
      } else {
        setIsLoading(false);
        setStatusMessage({
          type: 'success',
          text: 'Уведомления ВКонтакте активны! Чтобы бот мог писать вам в личные сообщения, отправьте /subscribe в диалоге ВКонтакте.',
        });
        triggerHaptic('success');
        confetti({ particleCount: 60, spread: 60 });
      }
      return;
    }

    // Telegram Mode
    if (botTokenInput.trim()) {
      saveBotToken(botTokenInput.trim());
    }

    const testText = `<b>🚀 Тестовое уведомление от @${TELEGRAM_BOT_USERNAME}!</b>\n\nВы успешно подключили уведомления в сервисе <b>IT-Старт</b>.\n\nВыбранные направления: ${selectedDirections.join(', ')}\nВетки: ${selectedSubTracks.join(', ')}\n\nКак только появится новая стажировка под ваш стек, вы получите мгновенный пуш!`;
    const res = await sendTelegramMessage(chatId, testText, botTokenInput.trim() || undefined);
    setIsLoading(false);

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: 'Тестовое сообщение успешно доставлено в ваш Telegram! Проверьте диалог с ботом.',
      });
      triggerHaptic('success');
      confetti({ particleCount: 60, spread: 60 });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Не удалось отправить сообщение.',
      });
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId.trim()) {
      setStatusMessage({
        type: 'error',
        text: platform === 'vk' ? 'Пожалуйста, укажите ваш VK ID' : 'Пожалуйста, укажите Telegram Chat ID',
      });
      return;
    }

    if (selectedDirections.length === 0) {
      setStatusMessage({ type: 'error', text: 'Выберите хотя бы одно направление стажировок' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const subData: TelegramSubscription = {
      chat_id: chatId.trim(),
      username: username.trim(),
      first_name: firstName.trim(),
      directions: selectedDirections,
      sub_tracks: selectedSubTracks,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    if (platform === 'vk') {
      saveVkPeerId(chatId.trim());
    }

    // Save locally
    saveLocalSubscription(subData);

    // Save to Supabase
    const savedToSupabase = await saveSubscriptionToSupabase(subData);

    setIsLoading(false);
    triggerHaptic('success');
    confetti({ particleCount: 90, spread: 70 });

    onSubscriptionSaved(subData);
    setStatusMessage({
      type: 'success',
      text: savedToSupabase
        ? `Подписка успешно сохранена! Уведомления ${platform === 'vk' ? 'ВКонтакте' : 'в Telegram'} активированы.`
        : `Подписка сохранена локально! Уведомления ${platform === 'vk' ? 'ВКонтакте' : 'в Telegram'} активированы.`,
    });

    setTimeout(() => {
      onClose();
    }, 1800);
  };

  const isInsideVkClient = Boolean(vkUser || isVk);
  const isInsideTgClient = Boolean(telegramUser);
  const isStandaloneWeb = !isInsideVkClient && !isInsideTgClient;
  const botToken = getSavedBotToken();

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] liquid-modal-overlay overflow-y-auto overscroll-contain touch-pan-y modal-overlay-animation"
    >
      <div
        className="relative w-full max-w-xl rounded-[24px] sm:rounded-[32px] shadow-2xl p-4 sm:p-7 my-auto sm:my-8 modal-enter-animation liquid-glass-modal text-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 min-w-[44px] min-h-[44px] p-2.5 rounded-full transition-transform duration-150 z-10 active:scale-95 liquid-glass-pill hover:bg-white/50 text-neutral-600 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white cursor-pointer flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-black/5 dark:border-white/5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
              platform === 'vk' ? 'bg-blue-600' : 'bg-neutral-900'
            }`}
          >
            {platform === 'vk' ? <Bot className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </div>
          <div className="min-w-0 pr-8">
            <h2 className="text-lg font-bold font-sans text-neutral-950 truncate">
              {platform === 'vk' ? 'Уведомления ВКонтакте' : 'Уведомления в Telegram'}
            </h2>
            <p className="text-xs text-neutral-600 truncate">
              {platform === 'vk'
                ? 'Мгновенные пуши о новых стажировках от официального VK-бота IT-Старт'
                : `Мгновенные пуши о новых стажировках от бота @${TELEGRAM_BOT_USERNAME}`}
            </p>
          </div>
        </div>

        {/* On Regular Web: Prominent Two-Channel Tabs for TG and VK */}
        {isStandaloneWeb ? (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl liquid-glass-subtle mb-4">
            <button
              type="button"
              onClick={() => handleSwitchPlatform('telegram')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                platform === 'telegram'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram-бот</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPlatform('vk')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                platform === 'vk'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>ВКонтакте-бот</span>
            </button>
          </div>
        ) : (
          /* When opened inside VK or Telegram: Quick Cross-Platform Switch Pill */
          <div className="flex items-center justify-between gap-2 mb-3 px-1">
            <span className="text-[11px] text-neutral-500 font-medium">
              Канал: <strong className="text-neutral-800">{platform === 'vk' ? 'VK' : 'Telegram'}</strong>
            </span>
            <button
              type="button"
              onClick={() => handleSwitchPlatform(platform === 'vk' ? 'telegram' : 'vk')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold liquid-glass-pill hover:bg-white/60 text-neutral-700 active:scale-95 transition-all cursor-pointer"
            >
              <Repeat className="w-3 h-3 text-neutral-500" />
              <span>{platform === 'vk' ? 'Настроить через Telegram' : 'Настроить через ВКонтакте'}</span>
            </button>
          </div>
        )}

        {/* Platform Guidance & Auto-Detection Callouts */}
        {platform === 'vk' ? (
          vkUser ? (
            <div className="mb-4 p-3 rounded-2xl border text-xs flex items-center gap-2.5 bg-blue-500/10 border-blue-500/20 text-blue-900">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold">VK Mini App подключен:</span> Профиль{' '}
                <strong className="font-bold">{vkUser.first_name}</strong> (VK ID:{' '}
                <span className="font-mono font-bold">{vkUser.id}</span>). Уведомления будут отправляться в личные сообщения.
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-2xl border text-xs space-y-2 bg-blue-500/5 border-blue-500/15">
              <div className="font-semibold text-neutral-800 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-600" />
                <span>Как получать уведомления ВКонтакте:</span>
              </div>
              <p className="text-[11px] text-neutral-600">
                Откройте диалог с официальным ботом IT-Старт и отправьте команду /start или /subscribe:
              </p>
              <a
                href={getVkBotDialogUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors"
              >
                <span>💬 Открыть диалог с VK-ботом</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )
        ) : telegramUser ? (
          <div className="mb-4 p-3 rounded-2xl border text-xs flex items-center gap-2.5 bg-emerald-500/10 border-emerald-500/20 text-emerald-900">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold">Telegram Mini App:</span> Chat ID (
              <span className="font-mono font-bold">{telegramUser.id}</span>) подставлен автоматически!
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-2xl border text-xs space-y-2 bg-neutral-50 border-neutral-200/80">
            <div className="font-semibold flex items-center gap-1.5 text-neutral-800">
              <Bot className="w-4 h-4 text-neutral-500" />
              Как получать уведомления в Telegram:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href={`${TELEGRAM_BOT_URL}?start=subscribe`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border font-medium transition-colors bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200/80 shadow-xs"
              >
                <span>1. Написать /start боту</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={isDetecting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border font-medium transition-colors disabled:opacity-50 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200/80 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />
                <span>2. Определить мой Chat ID</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveSubscription} className="space-y-4">
          {/* Chat ID & User Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-neutral-700">
                {platform === 'vk' ? 'Ваш VK ID' : 'Ваш Telegram Chat ID'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder={platform === 'vk' ? 'например 482655491' : 'например 123456789'}
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm transition-colors focus:outline-none bg-neutral-50 border border-neutral-200/80 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-neutral-700">
                {platform === 'vk' ? 'Имя в профиле ВКонтакте' : 'Username в Telegram'}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={platform === 'vk' ? 'Имя Фамилия' : '@username (необязательно)'}
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm transition-colors focus:outline-none bg-neutral-50 border border-neutral-200/80 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </div>
          </div>

          {/* Directions selector */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-neutral-800">
              Интересующие направления ({selectedDirections.length}):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DIRECTIONS.map((dir) => {
                const isSelected = selectedDirections.includes(dir.id);
                return (
                  <button
                    key={dir.id}
                    type="button"
                    onClick={() => toggleDirection(dir.id)}
                    className={`flex items-center justify-between p-2.5 sm:p-3 min-h-[44px] rounded-xl text-left text-xs font-semibold transition-transform duration-150 active:scale-95 cursor-pointer ${
                      isSelected
                        ? platform === 'vk'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-neutral-900 text-white shadow-xs'
                        : 'liquid-glass-pill text-neutral-700 hover:bg-white/50'
                    }`}
                  >
                    <span className="truncate">{dir.title.split('-')[0]}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-tracks selector */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-neutral-800">
              Конкретные специализации и ветки ({selectedSubTracks.length}):
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 rounded-2xl liquid-glass-subtle touch-pan-y overscroll-contain">
              {DIRECTIONS.filter((d) => selectedDirections.includes(d.id)).flatMap((d) =>
                d.subTracks.map((st) => {
                  const isSelected = selectedSubTracks.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleSubTrack(st.id)}
                      className={`px-3 py-1.5 min-h-[34px] flex items-center rounded-full text-xs font-semibold transition-transform duration-150 active:scale-95 cursor-pointer ${
                        isSelected
                          ? platform === 'vk'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-neutral-900 text-white shadow-xs'
                          : 'liquid-glass-pill text-neutral-700 hover:bg-white/50'
                      }`}
                    >
                      {st.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Bot Token Configuration Block or VK Bot Direct Link */}
          {platform === 'vk' ? (
            <div className="p-3.5 rounded-2xl liquid-glass-subtle text-xs space-y-2 border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-blue-600" />
                  Официальный VK-бот IT-Старт:
                </span>
              </div>
              <p className="text-[11px] text-neutral-600">
                Бот автоматически рассылает уведомления о новых стажировках по выбранным направлениям прямо в VK.
                Для активации личных сообщений откройте диалог с ботом и отправьте /start или /subscribe:
              </p>
              <a
                href={getVkBotDialogUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors"
              >
                <span>💬 Открыть диалог с VK-ботом</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="p-3 rounded-2xl liquid-glass-subtle text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">
                  Bot Token для пушей в Telegram (@BotFather):
                </span>
                <button
                  type="button"
                  onClick={() => setShowTokenInput((v) => !v)}
                  className="text-[11px] font-semibold text-neutral-600 hover:text-black underline cursor-pointer"
                >
                  {showTokenInput ? 'Скрыть поле' : 'Настроить токен'}
                </button>
              </div>
              {showTokenInput && (
                <div className="space-y-1 pt-1">
                  <input
                    type="password"
                    value={botTokenInput}
                    onChange={(e) => {
                      setBotTokenInput(e.target.value);
                      saveBotToken(e.target.value.trim());
                    }}
                    placeholder="Токен от @BotFather (сохраняется в браузере)"
                    className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm transition-colors focus:outline-none liquid-glass-pill focus:bg-white/50 text-neutral-900 placeholder:text-neutral-500"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Токен хранится локально в вашем браузере для прямых вызовов Telegram Bot API.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-900'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-900'
                  : 'liquid-glass-pill text-neutral-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isLoading || !chatId}
              className="w-full sm:w-1/2 min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-transform duration-150 active:scale-95 disabled:opacity-50 liquid-glass-pill hover:bg-white/50 text-neutral-800 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-neutral-600" />
              <span>{platform === 'vk' ? 'Проверить в VK' : 'Проверить в TG'}</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full sm:w-1/2 min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-white text-xs sm:text-sm font-semibold shadow-xs transition-transform duration-150 active:scale-95 disabled:opacity-50 cursor-pointer ${
                platform === 'vk' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-neutral-900 hover:bg-black'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'Сохранение...' : 'Сохранить подписку'}</span>
            </button>
          </div>

          {platform === 'telegram' && !telegramUser && !botToken && (
            <p className="text-[11px] text-center text-neutral-500 font-medium">
              * Для прямой отправки сообщений укажите Bot Token или напишите /start боту @{TELEGRAM_BOT_USERNAME}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
