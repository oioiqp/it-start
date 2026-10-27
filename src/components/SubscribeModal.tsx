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
import { isVkMiniApp, requestVkNotificationsPermission, type VkUser } from '../lib/vkBridge';
import { DIRECTIONS } from '../data/directions';
import { saveSubscriptionToSupabase, TELEGRAM_BOT_USERNAME, TELEGRAM_BOT_URL } from '../lib/supabase';
import {
  autoDetectChatIdFromUpdates,
  getSavedBotToken,
  saveBotToken,
  sendTelegramMessage,
  triggerHaptic,
  isTelegramWebApp,
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
  const isInsideVk = Boolean(vkUser || isVk || isVkMiniApp());
  const initialPlatform: NotificationPlatform = isInsideVk ? 'vk' : 'telegram';

  const [platform, setPlatform] = useState<NotificationPlatform>(initialPlatform);

  // Dedicated separate states for Telegram and VK to eliminate cross-contamination
  const [tgChatId, setTgChatId] = useState<string>(() => {
    if (telegramUser) return String(telegramUser.id);
    if (currentSubscription && !isInsideVk) return String(currentSubscription.chat_id);
    return '';
  });

  const [tgUsername, setTgUsername] = useState<string>(() => {
    if (telegramUser?.username) return telegramUser.username;
    if (currentSubscription?.username && !isInsideVk) return currentSubscription.username;
    return '';
  });

  const [tgFirstName, setTgFirstName] = useState<string>(() => {
    if (telegramUser?.first_name) return telegramUser.first_name;
    if (currentSubscription?.first_name && !isInsideVk) return currentSubscription.first_name;
    return '';
  });

  const [vkPeerId, setVkPeerId] = useState<string>(() => {
    if (vkUser) return String(vkUser.id);
    return getSavedVkPeerId() || '';
  });

  const [vkFullName, setVkFullName] = useState<string>(() => {
    if (vkUser) return `${vkUser.first_name || ''} ${vkUser.last_name || ''}`.trim();
    return '';
  });

  const [botTokenInput, setBotTokenInput] = useState<string>(getSavedBotToken());
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);
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

  // Synchronize platform and user credentials whenever modal opens or environment changes
  useEffect(() => {
    if (!isOpen) return;

    const inVk = Boolean(vkUser || isVk || isVkMiniApp());
    const inTg = Boolean(telegramUser || isTelegramWebApp());

    if (inVk) {
      setPlatform('vk');
      if (vkUser) {
        setVkPeerId(String(vkUser.id));
        setVkFullName(`${vkUser.first_name || ''} ${vkUser.last_name || ''}`.trim());
      } else {
        const savedPeer = getSavedVkPeerId();
        if (savedPeer) setVkPeerId(savedPeer);
      }
    } else if (inTg) {
      setPlatform('telegram');
      if (telegramUser) {
        setTgChatId(String(telegramUser.id));
        if (telegramUser.username) setTgUsername(telegramUser.username);
        if (telegramUser.first_name) setTgFirstName(telegramUser.first_name);
      } else if (currentSubscription) {
        setTgChatId(String(currentSubscription.chat_id));
        if (currentSubscription.username) setTgUsername(currentSubscription.username);
        if (currentSubscription.first_name) setTgFirstName(currentSubscription.first_name);
      }
    } else {
      // Standalone web mode
      if (currentSubscription && String(currentSubscription.chat_id).length > 0) {
        setTgChatId(String(currentSubscription.chat_id));
        if (currentSubscription.username) setTgUsername(currentSubscription.username);
        if (currentSubscription.first_name) setTgFirstName(currentSubscription.first_name);
      }
      const savedVk = getSavedVkPeerId();
      if (savedVk) setVkPeerId(savedVk);
    }
    setStatusMessage(null);
  }, [isOpen, vkUser, isVk, telegramUser, currentSubscription]);

  // Switch between Telegram and VK notification channels without losing input or cross-contaminating
  const handleSwitchPlatform = (targetPlatform: NotificationPlatform) => {
    triggerHaptic('selection');
    setPlatform(targetPlatform);
    setStatusMessage(null);
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
      setTgChatId(String(result.chatId));
      if (result.username) setTgUsername(result.username);
      if (result.firstName) setTgFirstName(result.firstName);
      setStatusMessage({
        type: 'success',
        text: `Chat ID успешно определен: ${result.chatId} (${result.username ? '@' + result.username : result.firstName || 'Пользователь'})! Подписка синхронизирована.`,
      });
      triggerHaptic('success');

      const subData: TelegramSubscription = {
        chat_id: String(result.chatId),
        username: (result.username || tgUsername).trim(),
        first_name: (result.firstName || tgFirstName).trim(),
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
    const currentId = platform === 'vk' ? vkPeerId.trim() : tgChatId.trim();
    if (!currentId) {
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
        const res = await sendVkMessage(currentId, testText, vkToken);
        setIsLoading(false);
        if (res.success) {
          setStatusMessage({
            type: 'success',
            text: 'Тестовое уведомление отправлено в VK! Проверьте диалог с сообществом.',
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
          text: 'Уведомления ВКонтакте активны! Чтобы бот мог писать вам в личные сообщения, откройте диалог с ботом и отправьте /subscribe.',
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
    const res = await sendTelegramMessage(currentId, testText, botTokenInput.trim() || undefined);
    setIsLoading(false);

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: 'Тестовое уведомление отправлено! Проверьте диалог с ботом @' + TELEGRAM_BOT_USERNAME + '.',
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
    const currentId = platform === 'vk' ? vkPeerId.trim() : tgChatId.trim();
    const currentUsername = platform === 'vk' ? vkFullName.trim() : tgUsername.trim();
    const currentFirstName = platform === 'vk' ? (vkUser?.first_name || vkFullName.trim()) : tgFirstName.trim();

    if (!currentId) {
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

    // If inside VK Mini App, request native community messages permission
    if (platform === 'vk' && (isVk || vkUser)) {
      try {
        await requestVkNotificationsPermission(242573933);
      } catch {}
    }

    const subData: TelegramSubscription = {
      chat_id: currentId,
      username: currentUsername,
      first_name: currentFirstName,
      directions: selectedDirections,
      sub_tracks: selectedSubTracks,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    if (platform === 'vk') {
      saveVkPeerId(currentId);
    } else {
      saveLocalSubscription(subData);
      saveSubscriptionToSupabase(subData);
    }

    setIsLoading(false);
    triggerHaptic('success');
    confetti({ particleCount: 90, spread: 70 });

    onSubscriptionSaved(subData);
    setStatusMessage({
      type: 'success',
      text: `Подписка успешно сохранена! Уведомления ${platform === 'vk' ? 'ВКонтакте' : 'в Telegram'} активированы.`,
    });

    setTimeout(() => {
      onClose();
    }, 1800);
  };

  const isClientInVk = Boolean(vkUser || isVk);
  const isClientInTg = Boolean(telegramUser);
  const isStandaloneWeb = !isClientInVk && !isClientInTg;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] liquid-modal-overlay overflow-y-auto overscroll-contain touch-pan-y modal-overlay-animation"
    >
      <div
        className="relative w-full max-w-xl rounded-[24px] sm:rounded-[32px] shadow-2xl p-4 sm:p-6 my-auto sm:my-8 modal-enter-animation liquid-glass-modal text-neutral-900 dark:text-neutral-100 flex flex-col h-[610px] sm:h-[620px] min-h-[580px] max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
        style={{ height: 'min(620px, 90vh)' }}
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

        {/* Fixed Header */}
        <div className="shrink-0 flex items-center gap-3.5 mb-3 pb-3 border-b border-black/5 dark:border-white/5 pr-10">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 transition-colors ${
              platform === 'vk' ? 'bg-blue-600' : 'bg-neutral-900'
            }`}
          >
            {platform === 'vk' ? <Bot className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
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

        {/* Fixed Channel Selector / Switch Bar */}
        <div className="shrink-0 mb-3">
          {isStandaloneWeb ? (
            <div className="flex items-center gap-1.5 p-1 rounded-2xl liquid-glass-subtle">
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
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[11px] text-neutral-500 font-medium">
                Канал: <strong className="text-neutral-800">{platform === 'vk' ? 'ВКонтакте' : 'Telegram'}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleSwitchPlatform(platform === 'vk' ? 'telegram' : 'vk')}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold liquid-glass-pill hover:bg-white/60 text-neutral-700 active:scale-95 transition-all cursor-pointer"
              >
                <Repeat className="w-3 h-3 text-neutral-500" />
                <span>{platform === 'vk' ? 'Настроить через Telegram' : 'Настроить через ВКонтакте'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Body with Fixed Footer */}
        <form onSubmit={handleSaveSubscription} className="flex-1 flex flex-col min-h-0 justify-between overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3.5 pr-0.5">
            {/* Top User Profile or Detection Block */}
            {platform === 'vk' ? (
              vkUser ? (
                /* VK User Connected Card (Inside VK Mini App) */
                <div className="flex items-center justify-between p-3.5 rounded-2xl liquid-glass-subtle border border-blue-500/25 bg-blue-500/5">
                  <div className="flex items-center gap-3 min-w-0">
                    {vkUser.photo_100 || vkUser.photo_200 ? (
                      <img
                        src={vkUser.photo_100 || vkUser.photo_200}
                        alt={vkUser.first_name || 'VK'}
                        className="w-10 h-10 rounded-full object-cover border border-blue-500/30 shrink-0 shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        VK
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-neutral-900 truncate">
                        {`${vkUser.first_name || ''} ${vkUser.last_name || ''}`.trim()}
                      </div>
                      <div className="text-[11px] text-blue-600 font-medium truncate">
                        Ваш VK ID: <span className="font-mono font-bold">{vkUser.id}</span> • Личные сообщения
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-blue-500/10 text-blue-600 border border-blue-500/25 shrink-0 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Подключен</span>
                  </span>
                </div>
              ) : (
                /* VK Standalone Web Form */
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl border text-xs space-y-2 bg-blue-500/5 border-blue-500/15">
                    <div className="font-semibold text-neutral-800 flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-blue-600" />
                        <span>Официальный VK-бот IT-Старт:</span>
                      </span>
                      <a
                        href={getVkBotDialogUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] shadow-xs transition-colors"
                      >
                        <span>💬 Открыть диалог с ботом</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-[11px] text-neutral-600">
                      Откройте диалог с официальным ботом IT-Старт и отправьте команду /start или /subscribe для активации сообщений.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-neutral-700">
                        Ваш VK ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={vkPeerId}
                        onChange={(e) => setVkPeerId(e.target.value)}
                        placeholder="например 482655491"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm transition-colors focus:outline-none liquid-glass-pill focus:bg-white/60 text-neutral-900 placeholder:text-neutral-400 border border-neutral-200/80"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-neutral-700">
                        Имя в профиле ВКонтакте
                      </label>
                      <input
                        type="text"
                        value={vkFullName}
                        onChange={(e) => setVkFullName(e.target.value)}
                        placeholder="Имя Фамилия"
                        className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm transition-colors focus:outline-none liquid-glass-pill focus:bg-white/60 text-neutral-900 placeholder:text-neutral-400 border border-neutral-200/80"
                      />
                    </div>
                  </div>
                </div>
              )
            ) : (
              telegramUser ? (
                /* Telegram User Connected Card (Inside Telegram WebApp) */
                <div className="flex items-center justify-between p-3.5 rounded-2xl liquid-glass-subtle border border-sky-500/25 bg-sky-500/5">
                  <div className="flex items-center gap-3 min-w-0">
                    {telegramUser.photo_url ? (
                      <img
                        src={telegramUser.photo_url}
                        alt={telegramUser.first_name || 'TG'}
                        className="w-10 h-10 rounded-full object-cover border border-sky-500/30 shrink-0 shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {telegramUser.first_name ? telegramUser.first_name.slice(0, 2).toUpperCase() : 'TG'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-neutral-900 truncate">
                        {`${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim()}
                        {telegramUser.username && (
                          <span className="ml-1 text-xs font-normal text-neutral-500">(@{telegramUser.username})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-sky-700 font-medium truncate">
                        Chat ID: <span className="font-mono font-bold">{telegramUser.id}</span> • Telegram Mini App
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 shrink-0 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Подключен</span>
                  </span>
                </div>
              ) : (
                /* Telegram Standalone Web Form */
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl border text-xs space-y-2 bg-neutral-50 border-neutral-200/80">
                    <div className="font-semibold flex items-center gap-1.5 text-neutral-800">
                      <Bot className="w-4 h-4 text-neutral-500" />
                      Как получать уведомления в Telegram:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-neutral-700">
                        Ваш Telegram Chat ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tgChatId}
                        onChange={(e) => setTgChatId(e.target.value)}
                        placeholder="например 123456789"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm transition-colors focus:outline-none liquid-glass-pill focus:bg-white/60 text-neutral-900 placeholder:text-neutral-400 border border-neutral-200/80"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-neutral-700">
                        Username в Telegram
                      </label>
                      <input
                        type="text"
                        value={tgUsername}
                        onChange={(e) => setTgUsername(e.target.value)}
                        placeholder="@username (необязательно)"
                        className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm transition-colors focus:outline-none liquid-glass-pill focus:bg-white/60 text-neutral-900 placeholder:text-neutral-400 border border-neutral-200/80"
                      />
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Directions selector */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-neutral-800">
                Интересующие направления ({selectedDirections.length}):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {DIRECTIONS.map((dir) => {
                  const isSelected = selectedDirections.includes(dir.id);
                  return (
                    <button
                      key={dir.id}
                      type="button"
                      onClick={() => toggleDirection(dir.id)}
                      className={`flex items-center justify-between p-2.5 min-h-[40px] rounded-xl text-left text-xs font-semibold transition-transform duration-150 active:scale-95 cursor-pointer ${
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
              <label className="block text-xs font-semibold mb-1.5 text-neutral-800">
                Конкретные специализации и ветки ({selectedSubTracks.length}):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-2xl liquid-glass-subtle touch-pan-y overscroll-contain">
                {DIRECTIONS.filter((d) => selectedDirections.includes(d.id)).flatMap((d) =>
                  d.subTracks.map((st) => {
                    const isSelected = selectedSubTracks.includes(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleSubTrack(st.id)}
                        className={`px-2.5 py-1 min-h-[30px] flex items-center rounded-full text-xs font-semibold transition-transform duration-150 active:scale-95 cursor-pointer ${
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

            {/* Platform Helper Note / Bot Token Box */}
            {platform === 'vk' ? (
              <div className="p-3 rounded-2xl liquid-glass-subtle text-xs space-y-1.5 border border-blue-500/15 bg-blue-500/5">
                <div className="flex items-center justify-between text-neutral-800 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                    <span>Официальный VK-бот IT-Старт</span>
                  </span>
                  <a
                    href={getVkBotDialogUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>Открыть диалог с VK-ботом</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Пуш-уведомления о новых вакансиях приходят от официального сообщества ВКонтакте сразу после публикации.
                </p>
              </div>
            ) : telegramUser ? (
              <div className="p-3 rounded-2xl liquid-glass-subtle text-xs space-y-1 border border-sky-500/15 bg-sky-500/5">
                <div className="flex items-center justify-between text-neutral-800 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-600" />
                    <span>Telegram Bot API подключен</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    24/7 Сервер
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Уведомления рассылаются ботом @{TELEGRAM_BOT_USERNAME}. Подписка сохраняется в облачную базу Supabase.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl liquid-glass-subtle text-xs space-y-1.5 border border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-800">
                    Bot Token (@BotFather, опционально):
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
                      Токен используется для прямых вызовов Telegram Bot API из браузера.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed Footer: Status & Action Buttons */}
          <div className="shrink-0 pt-3 border-t border-black/5 dark:border-white/5 space-y-2 mt-2">
            {statusMessage && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
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

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={isLoading || !(platform === 'vk' ? vkPeerId.trim() : tgChatId.trim())}
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
                <span>{isLoading ? 'Сохранение...' : platform === 'vk' ? 'Подключить в VK' : 'Подключить в TG'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
