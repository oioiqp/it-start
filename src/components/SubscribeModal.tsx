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
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { AuthProfile, DirectionId, SubTrackId, TelegramSubscription, TelegramUser } from '../types';
import { isVkMiniApp, type VkUser } from '../lib/vkBridge';
import { saveSubscriptionToSupabase, fetchSubscriptionByChatIdFromSupabase, TELEGRAM_BOT_URL } from '../lib/supabase';
import {
  autoDetectChatIdFromUpdates,
  getSavedBotToken,
  saveBotToken,
  triggerHaptic,
  isTelegramWebApp,
} from '../lib/telegram';
import {
  saveLocalAuthProfile,
  saveLocalSubscription,
} from '../lib/storage';
import { getVkBotDialogUrl, getSavedVkPeerId, autoDetectVkPeerId } from '../lib/vk';
import { useScrollLock } from '../lib/useScrollLock';
import {
  saveUnifiedSubscription,
  extractVkUserId,
} from '../services/subscriptionService';

export type NotificationPlatform = 'vk' | 'telegram';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramUser: TelegramUser | null;
  vkUser?: VkUser | null;
  isVk?: boolean;
  authProfile?: AuthProfile | null;
  currentSubscription: TelegramSubscription | null;
  onSubscriptionSaved: (sub: TelegramSubscription) => void;
  onAuthSuccess?: (profile: AuthProfile, sub: TelegramSubscription) => void;
  onLogout?: () => void;
}

const DEFAULT_DIRECTIONS: DirectionId[] = ['frontend', 'backend', 'mobile', 'data_science', 'qa', 'devops'];
const DEFAULT_SUB_TRACKS: SubTrackId[] = ['react', 'python', 'nodejs', 'golang', 'auto_qa', 'cicd_docker'];

export const SubscribeModal: React.FC<SubscribeModalProps> = ({
  isOpen,
  onClose,
  telegramUser,
  vkUser,
  isVk,
  authProfile,
  currentSubscription,
  onSubscriptionSaved,
  onAuthSuccess,
  onLogout,
}) => {
  const isInsideVk = Boolean(vkUser || isVk || isVkMiniApp());
  const initialPlatform: NotificationPlatform = isInsideVk
    ? 'vk'
    : !telegramUser && authProfile?.platform
    ? authProfile.platform
    : 'telegram';

  const [platform, setPlatform] = useState<NotificationPlatform>(initialPlatform);

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
    const saved = getSavedVkPeerId();
    if (saved) return saved;
    if (currentSubscription && String(currentSubscription.chat_id).startsWith('vk_')) {
      return String(currentSubscription.chat_id).replace(/^vk_/, '');
    }
    return '';
  });

  const [vkFullName, setVkFullName] = useState<string>(() => {
    if (vkUser) return `${vkUser.first_name || ''} ${vkUser.last_name || ''}`.trim();
    if (currentSubscription && String(currentSubscription.chat_id).startsWith('vk_')) {
      return currentSubscription.username || currentSubscription.first_name || '';
    }
    return '';
  });

  const [botTokenInput, setBotTokenInput] = useState<string>(getSavedBotToken());
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [isDetectingVk, setIsDetectingVk] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
        if (savedPeer) {
          setVkPeerId(savedPeer);
        } else if (currentSubscription && String(currentSubscription.chat_id).startsWith('vk_')) {
          setVkPeerId(String(currentSubscription.chat_id).replace(/^vk_/, ''));
          setVkFullName(currentSubscription.username || currentSubscription.first_name || '');
        }
      }
    } else if (inTg) {
      setPlatform('telegram');
      if (telegramUser) {
        setTgChatId(String(telegramUser.id));
        if (telegramUser.username) setTgUsername(telegramUser.username);
        if (telegramUser.first_name) setTgFirstName(telegramUser.first_name);
      } else if (currentSubscription && !String(currentSubscription.chat_id).startsWith('vk_')) {
        setTgChatId(String(currentSubscription.chat_id));
        if (currentSubscription.username) setTgUsername(currentSubscription.username);
        if (currentSubscription.first_name) setTgFirstName(currentSubscription.first_name);
      }
    } else {
      if (authProfile) {
        setPlatform(authProfile.platform);
        if (authProfile.platform === 'telegram') {
          setTgChatId(authProfile.id);
          if (authProfile.username) setTgUsername(authProfile.username);
          if (authProfile.firstName) setTgFirstName(authProfile.firstName);
        } else {
          setVkPeerId(authProfile.id);
          const name = [authProfile.firstName, authProfile.lastName].filter(Boolean).join(' ').trim();
          if (name) setVkFullName(name);
        }
      }
      if (currentSubscription && !String(currentSubscription.chat_id).startsWith('vk_')) {
        setTgChatId((prev) => prev || String(currentSubscription.chat_id));
        if (currentSubscription.username) setTgUsername((prev) => prev || currentSubscription.username || '');
        if (currentSubscription.first_name) setTgFirstName((prev) => prev || currentSubscription.first_name || '');
      } else if (currentSubscription && String(currentSubscription.chat_id).startsWith('vk_')) {
        setVkPeerId((prev) => prev || String(currentSubscription.chat_id).replace(/^vk_/, ''));
        setVkFullName((prev) => prev || currentSubscription.username || currentSubscription.first_name || '');
      }
      const savedVk = getSavedVkPeerId();
      if (savedVk) setVkPeerId((prev) => prev || savedVk);
    }
    setStatusMessage(null);
  }, [isOpen, vkUser, isVk, telegramUser, currentSubscription, authProfile]);

  const handleSwitchPlatform = (targetPlatform: NotificationPlatform) => {
    triggerHaptic('selection');
    setPlatform(targetPlatform);
    setStatusMessage(null);
  };

  if (!isOpen) return null;

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
      const detectedId = String(result.chatId);
      const detectedUsername = (result.username || tgUsername).trim();
      const detectedFirstName = (result.firstName || tgFirstName).trim();
      setTgChatId(detectedId);
      if (result.username) setTgUsername(result.username);
      if (result.firstName) setTgFirstName(result.firstName);

      // Preserve existing bot notification preferences if user configured them inside Telegram bot
      const existingRemote = await fetchSubscriptionByChatIdFromSupabase(detectedId).catch(() => null);
      const subData: TelegramSubscription = {
        chat_id: detectedId,
        username: detectedUsername || existingRemote?.username || '',
        first_name: detectedFirstName || existingRemote?.first_name || 'Пользователь Telegram',
        directions: existingRemote?.directions?.length ? existingRemote.directions : DEFAULT_DIRECTIONS,
        sub_tracks: existingRemote?.sub_tracks?.length ? existingRemote.sub_tracks : DEFAULT_SUB_TRACKS,
        is_active: existingRemote ? Boolean(existingRemote.is_active) : false,
        created_at: existingRemote?.created_at || new Date().toISOString(),
      };
      const profile: AuthProfile = {
        platform: 'telegram',
        id: detectedId,
        username: subData.username || undefined,
        firstName: subData.first_name || undefined,
        notificationsEnabled: Boolean(subData.is_active),
        authorizedAt: authProfile?.authorizedAt || new Date().toISOString(),
      };
      saveLocalAuthProfile(profile);
      saveLocalSubscription(subData);
      onAuthSuccess?.(profile, subData);
      onSubscriptionSaved(subData);
      saveSubscriptionToSupabase(subData);

      setStatusMessage({
        type: 'success',
        text: `Профиль Telegram подключён (ID: ${detectedId})! История и прогресс синхронизируются с облаком.`,
      });
      triggerHaptic('success');
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Не удалось найти Chat ID автоматически. Откройте диалог с ботом выше, отправьте /start и повторите!',
      });
    }
  };

  const handleAutoDetectVk = async () => {
    setIsDetectingVk(true);
    setStatusMessage(null);
    triggerHaptic('medium');

    const result = await autoDetectVkPeerId();
    setIsDetectingVk(false);

    if (result.success && result.peerId) {
      setVkPeerId(String(result.peerId));
      if (result.fullName) setVkFullName(result.fullName);
      setStatusMessage({
        type: 'success',
        text: `VK ID успешно определен: ${result.peerId}${result.fullName ? ` (${result.fullName})` : ''}! Нажмите «Войти через VK» ниже.`,
      });
      triggerHaptic('success');
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Не удалось определить VK ID автоматически. Откройте диалог с сообществом ВКонтакте, отправьте любое сообщение и повторите!',
      });
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawId = platform === 'vk' ? vkPeerId.trim() : tgChatId.trim();
    const currentId = platform === 'vk' ? extractVkUserId(rawId) : rawId;
    if (platform === 'vk' && currentId !== vkPeerId) {
      setVkPeerId(currentId);
    }
    const currentUsername = platform === 'vk' ? vkFullName.trim() : tgUsername.trim();
    const currentFirstName = platform === 'vk' ? (vkUser?.first_name || vkFullName.trim()) : tgFirstName.trim();

    if (!currentId) {
      setStatusMessage({
        type: 'error',
        text: platform === 'vk'
          ? 'Откройте VK-бота, отправьте сообщение и определите VK ID или введите его вручную'
          : 'Откройте TG-бота, отправьте /start и определите Chat ID или введите его вручную',
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const saveRes = await saveUnifiedSubscription({
      platform,
      id: currentId,
      username: currentUsername,
      firstName: currentFirstName,
      directions: currentSubscription?.directions?.length ? currentSubscription.directions : DEFAULT_DIRECTIONS,
      subTracks: currentSubscription?.sub_tracks?.length ? currentSubscription.sub_tracks : DEFAULT_SUB_TRACKS,
      notificationsEnabled: currentSubscription ? Boolean(currentSubscription.is_active) : !isStandaloneWeb,
      preserveBotPreferences: true,
    });

    setIsLoading(false);

    if (saveRes.success) {
      triggerHaptic('success');
      confetti({ particleCount: 55, spread: 65 });

      const profile: AuthProfile = {
        platform,
        id: currentId,
        username: saveRes.subscription.username || currentUsername || undefined,
        firstName: saveRes.subscription.first_name || currentFirstName || undefined,
        notificationsEnabled: Boolean(saveRes.subscription.is_active),
        authorizedAt: authProfile?.authorizedAt || new Date().toISOString(),
      };
      saveLocalAuthProfile(profile);
      onAuthSuccess?.(profile, saveRes.subscription);
      onSubscriptionSaved(saveRes.subscription);

      setStatusMessage({
        type: 'success',
        text: `Авторизация через ${platform === 'vk' ? 'ВКонтакте' : 'Telegram'} выполнена! История и прогресс сохраняются в облаке.`,
      });

      setTimeout(() => {
        onClose();
      }, 1300);
    } else {
      setStatusMessage({
        type: 'error',
        text: saveRes.error || 'Ошибка при сохранении профиля.',
      });
    }
  };

  const isClientInVk = Boolean(vkUser || isVk);
  const isClientInTg = Boolean(telegramUser);
  const isStandaloneWeb = !isClientInVk && !isClientInTg;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain touch-pan-y modal-overlay-animation"
      style={{
        paddingTop: 'max(0.75rem, max(env(safe-area-inset-top, 0px), var(--vk-safe-area-top, 0px)))',
        paddingBottom: 'max(0.75rem, max(env(safe-area-inset-bottom, 0px), var(--vk-safe-area-bottom, 0px)))',
      }}
    >
      {/* Apple Liquid Glass Frosted Backdrop Layer */}
      <div
        className="fixed inset-0 liquid-modal-overlay pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 my-auto sm:my-8 modal-enter-animation liquid-glass-modal text-neutral-900 dark:text-neutral-100 flex flex-col max-h-[90vh] overflow-hidden"
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
            {isStandaloneWeb ? (
              <LogIn className="w-5 h-5" />
            ) : platform === 'vk' ? (
              <Bot className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold font-sans text-neutral-950 dark:text-white truncate leading-snug">
              {platform === 'vk' ? 'Авторизация через ВКонтакте' : 'Авторизация через Telegram'}
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate leading-relaxed">
              Сохранение истории просмотров, откликов, избранного и прогресса в облаке
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
            <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
              <span className="text-[11px] text-neutral-500 font-medium">
                Аккаунт: <strong className="text-neutral-800">{platform === 'vk' ? 'ВКонтакте' : 'Telegram'}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleSwitchPlatform(platform === 'vk' ? 'telegram' : 'vk')}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold liquid-glass-pill hover:bg-white/60 text-neutral-700 active:scale-95 transition-all cursor-pointer"
              >
                <Repeat className="w-3 h-3 text-neutral-500" />
                <span>{platform === 'vk' ? 'Переключить на Telegram' : 'Переключить на ВКонтакте'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Body with Fixed Footer */}
        <form onSubmit={handleSaveSubscription} className="flex-1 flex flex-col min-h-0 justify-between overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 pr-0.5">
            {/* Explicit Cloud Sync / Authorization Info Banner */}
            <div className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-[11px] text-neutral-700 dark:text-neutral-200 leading-relaxed">
                <div className="font-bold text-neutral-900 dark:text-white">
                  Авторизация для сохранения вашего состояния и истории
                </div>
                <p>
                  Вход через Telegram или ВКонтакте привязывает к вашему ID историю просмотров и откликов, прогресс роадмапов, вопросы тренажёра и избранное.
                </p>
              </div>
            </div>

            {/* Official Bot Card & Profile Status */}
            {platform === 'vk' ? (
              <div className="p-3.5 rounded-2xl border text-xs space-y-2.5 bg-blue-500/5 border-blue-500/20 liquid-glass-subtle">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-neutral-900">Официальный VK-бот IT-Старт</span>
                    </div>
                  </div>
                  <a
                    href={getVkBotDialogUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <span>Открыть диалог с VK-ботом</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Откройте диалог с VK-ботом и отправьте любое сообщение, чтобы определить ID автоматически, либо введите ваш числовой VK ID ниже.
                </p>

                {vkUser ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-blue-500/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {vkUser.photo_100 || vkUser.photo_200 ? (
                        <img
                          src={vkUser.photo_100 || vkUser.photo_200}
                          alt={vkUser.first_name || 'VK'}
                          className="w-8 h-8 rounded-full object-cover border border-blue-500/30 shrink-0 shadow-xs"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          VK
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 truncate">
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
                ) : vkPeerId ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-blue-500/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        VK
                      </div>
                      <div className="min-w-0">
                        {vkFullName && (
                          <div className="text-xs font-bold text-neutral-900 truncate">{vkFullName}</div>
                        )}
                        <div className="text-[11px] text-blue-600 font-medium truncate">
                          Ваш VK ID: <span className="font-mono font-bold">{vkPeerId}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-blue-500/10 text-blue-600 border border-blue-500/25 shrink-0 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Подключен</span>
                    </span>
                  </div>
                ) : null}

                {!vkUser && (
                  <details className="text-xs pt-0.5" open={!vkPeerId ? true : undefined}>
                    <summary className="text-[11px] text-neutral-500 hover:text-neutral-700 cursor-pointer select-none inline-flex items-center gap-1">
                      <span>Настроить ID вручную</span>
                    </summary>
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleAutoDetectVk}
                          disabled={isDetectingVk}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isDetectingVk ? 'animate-spin' : ''}`} />
                          <span>Определить VK ID автоматически</span>
                        </button>
                        <span className="text-[10px] text-neutral-400">
                          {vkPeerId ? 'ID определен' : 'После отправки сообщения боту'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium mb-1 text-neutral-600">
                            Ваш VK ID
                          </label>
                          <input
                            type="text"
                            value={vkPeerId}
                            onChange={(e) => setVkPeerId(e.target.value)}
                            placeholder="например 482655491"
                            className="w-full px-3 py-2 rounded-xl text-xs transition-colors focus:outline-none liquid-glass-pill focus:bg-white/60 text-neutral-900 placeholder:text-neutral-400 border border-neutral-200/80"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1 text-neutral-600">
                            Имя в профиле ВКонтакте
                          </label>
                          <input
                            type="text"
                            value={vkFullName}
                            onChange={(e) => setVkFullName(e.target.value)}
                            placeholder="Имя Фамилия"
                            className="w-full px-3 py-2 rounded-xl text-xs transition-colors focus:outline-none liquid-glass-pill focus:bg-white/60 text-neutral-900 placeholder:text-neutral-400 border border-neutral-200/80"
                          />
                        </div>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl border text-xs space-y-2.5 bg-neutral-500/5 border-neutral-500/20 liquid-glass-subtle">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-neutral-900">Официальный Telegram-бот IT-Старт</span>
                    </div>
                  </div>
                  <a
                    href={`${TELEGRAM_BOT_URL}?start=auth`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-black text-white font-medium text-[11px] shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <span>Открыть диалог с TG-ботом</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Откройте бота и отправьте /start (или команду /id), затем нажмите кнопку определения Chat ID либо введите ваш ID вручную.
                </p>

                {telegramUser ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-sky-500/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {telegramUser.photo_url ? (
                        <img
                          src={telegramUser.photo_url}
                          alt={telegramUser.first_name || 'TG'}
                          className="w-8 h-8 rounded-full object-cover border border-sky-500/30 shrink-0 shadow-xs"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {telegramUser.first_name ? telegramUser.first_name.slice(0, 2).toUpperCase() : 'TG'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 truncate">
                          {`${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim()}
                          {telegramUser.username && (
                            <span className="ml-1 text-[11px] font-normal text-neutral-500">(@{telegramUser.username})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-sky-700 font-medium truncate">
                          Chat ID: <span className="font-mono font-bold">{telegramUser.id}</span> • Telegram Bot API подключен
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 shrink-0 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Подключен</span>
                    </span>
                  </div>
                ) : tgChatId ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-neutral-200/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        TG
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 truncate">
                          {tgFirstName || tgUsername || 'Пользователь Telegram'}
                          {tgUsername && !tgFirstName && (
                            <span className="ml-1 text-[11px] font-normal text-neutral-500">(@{tgUsername})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-600 font-medium truncate">
                          Chat ID: <span className="font-mono font-bold">{tgChatId}</span> • Telegram Bot API подключен
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 shrink-0 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Подключен</span>
                    </span>
                  </div>
                ) : null}

                {!telegramUser && (
                  <details className="text-xs pt-0.5" open={!tgChatId ? true : undefined}>
                    <summary className="text-[11px] text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 cursor-pointer select-none inline-flex items-center gap-1">
                      <span>Настроить ID вручную</span>
                    </summary>
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleAutoDetect}
                          disabled={isDetecting}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isDetecting ? 'animate-spin' : ''}`} />
                          <span>Определить Chat ID автоматически</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTokenInput((v) => !v)}
                          className="text-[11px] text-neutral-500 hover:underline cursor-pointer"
                        >
                          {showTokenInput ? 'Скрыть токен' : 'Bot Token'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium mb-1 text-neutral-600">
                            Ваш Telegram Chat ID
                          </label>
                          <input
                            type="text"
                            value={tgChatId}
                            onChange={(e) => setTgChatId(e.target.value)}
                            placeholder="например 123456789"
                            className="w-full px-3 py-2 rounded-xl text-xs transition-colors focus:outline-none liquid-glass-pill focus:bg-white/60 text-neutral-900 placeholder:text-neutral-400 border border-neutral-200/80"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1 text-neutral-600">
                            Username в Telegram
                          </label>
                          <input
                            type="text"
                            value={tgUsername}
                            onChange={(e) => setTgUsername(e.target.value)}
                            placeholder="@username"
                            className="w-full px-3 py-2 rounded-xl text-xs transition-colors focus:outline-none liquid-glass-pill focus:bg-white/60 text-neutral-900 placeholder:text-neutral-400 border border-neutral-200/80"
                          />
                        </div>
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
                            placeholder="Токен бота (сохраняется в браузере)"
                            className="w-full px-3 py-2 rounded-xl text-xs transition-colors focus:outline-none liquid-glass-pill focus:bg-white/50 text-neutral-900 placeholder:text-neutral-500 border border-neutral-200/80"
                          />
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Notification Settings Link Notice (Configured directly inside TG / VK bots) */}
            <div className="p-3 rounded-2xl border border-black/10 dark:border-white/10 liquid-glass-subtle flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">
                    Уведомления настраиваются в боте
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                    Выберите нужные направления или отключите пуши прямо в чате с ботом
                  </div>
                </div>
              </div>
              <a
                href={platform === 'vk' ? getVkBotDialogUrl() : `${TELEGRAM_BOT_URL}?start=notifications`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors shrink-0 ${
                  platform === 'vk'
                    ? 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20'
                    : 'bg-neutral-900/10 text-neutral-800 hover:bg-neutral-900/15'
                }`}
              >
                <span>Открыть настройки</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Fixed Footer: Status & Action Buttons */}
          <div className="shrink-0 pt-3 border-t border-black/5 dark:border-white/5 space-y-2 mt-3">
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
              {isStandaloneWeb && authProfile && onLogout ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onLogout();
                    onClose();
                  }}
                  className="w-full sm:w-1/2 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-transform duration-150 active:scale-95 liquid-glass-pill hover:bg-rose-500/10 text-rose-700 dark:text-rose-300 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Выйти из аккаунта</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-1/2 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-transform duration-150 active:scale-95 liquid-glass-pill hover:bg-white/50 text-neutral-700 cursor-pointer"
                >
                  <span>Отмена</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full sm:w-1/2 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-white text-xs sm:text-sm font-semibold shadow-xs transition-transform duration-150 active:scale-95 disabled:opacity-50 cursor-pointer ${
                  platform === 'vk' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-neutral-900 hover:bg-black'
                }`}
              >
                {isStandaloneWeb && !authProfile ? <LogIn className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                <span>
                  {isLoading
                    ? 'Сохранение...'
                    : !isStandaloneWeb
                    ? platform === 'vk'
                      ? 'Подключить в VK'
                      : 'Подключить в TG'
                    : authProfile
                    ? 'Сохранить профиль'
                    : platform === 'vk'
                    ? 'Войти через VK'
                    : 'Войти через Telegram'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
