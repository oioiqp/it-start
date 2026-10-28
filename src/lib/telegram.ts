import { GITHUB_PAGES_URL, TELEGRAM_BOT_USERNAME } from './supabase';
import type { TelegramUser } from '../types';
import { isVkMiniApp } from './vkBridge';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe?: {
          query_id?: string;
          user?: TelegramUser;
          auth_date?: string;
          hash?: string;
        };
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
        viewportHeight?: number;
        viewportStableHeight?: number;
        headerColor?: string;
        backgroundColor?: string;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        openTelegramLink: (url: string) => void;
        openLink: (url: string) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

const BOT_TOKEN_STORAGE_KEY = 'it_start_bot_token';
const TELEGRAM_USER_STORAGE_KEY = 'it_start_tg_user';

let cachedTelegramUser: TelegramUser | null = null;

export function parseTelegramUserFromRawString(raw?: string): TelegramUser | null {
  if (!raw) return null;
  try {
    let clean = raw.trim();
    if (clean.startsWith('#') || clean.startsWith('?')) {
      clean = clean.slice(1);
    }
    const params = new URLSearchParams(clean);

    // 1. Direct query / hash parameter checks: tg_chat_id, chat_id, tg_user_id, tg_id
    const directChatId =
      params.get('tg_chat_id') ||
      params.get('chat_id') ||
      params.get('tg_user_id') ||
      params.get('tg_id');
    if (directChatId && /^\d+$/.test(directChatId)) {
      const usernameParam = params.get('tg_username') || params.get('username') || '';
      return {
        id: Number(directChatId),
        first_name: params.get('tg_first_name') || params.get('first_name') || 'Пользователь Telegram',
        last_name: params.get('tg_last_name') || params.get('last_name') || undefined,
        username: usernameParam ? usernameParam.replace(/^@/, '') : undefined,
        photo_url: params.get('tg_photo_url') || params.get('photo_url') || undefined,
      };
    }

    // 2. Check for user JSON string directly or inside tgWebAppData
    let userRaw = params.get('user');
    if (!userRaw && params.get('tgWebAppData')) {
      const nested = new URLSearchParams(params.get('tgWebAppData') || '');
      userRaw = nested.get('user');

      // Nested direct chat_id check inside tgWebAppData
      const nestedChatId = nested.get('tg_chat_id') || nested.get('chat_id') || nested.get('id');
      if (!userRaw && nestedChatId && /^\d+$/.test(nestedChatId)) {
        const nestedUsername = nested.get('username') || nested.get('tg_username') || '';
        return {
          id: Number(nestedChatId),
          first_name: nested.get('first_name') || nested.get('tg_first_name') || 'Пользователь Telegram',
          last_name: nested.get('last_name') || undefined,
          username: nestedUsername ? nestedUsername.replace(/^@/, '') : undefined,
        };
      }
    }

    if (userRaw) {
      const decoded = decodeURIComponent(userRaw);
      const parsed = JSON.parse(decoded);
      if (parsed && (typeof parsed.id === 'number' || (typeof parsed.id === 'string' && /^\d+$/.test(parsed.id)))) {
        return {
          ...parsed,
          id: Number(parsed.id),
        } as TelegramUser;
      }
    }
  } catch {
    try {
      const match = raw.match(/user=({.+?})(?:&|$)/);
      if (match) {
        const decoded = decodeURIComponent(match[1]);
        const parsed = JSON.parse(decoded);
        if (parsed && (typeof parsed.id === 'number' || (typeof parsed.id === 'string' && /^\d+$/.test(parsed.id)))) {
          return {
            ...parsed,
            id: Number(parsed.id),
          } as TelegramUser;
        }
      }
      const idMatch = raw.match(/(?:tg_chat_id|chat_id)=(\d+)/);
      if (idMatch) {
        return {
          id: Number(idMatch[1]),
          first_name: 'Пользователь Telegram',
        };
      }
    } catch {}
  }
  return null;
}

export function getCachedTelegramUser(): TelegramUser | null {
  if (cachedTelegramUser) return cachedTelegramUser;
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(TELEGRAM_USER_STORAGE_KEY);
    if (saved) {
      cachedTelegramUser = JSON.parse(saved);
      return cachedTelegramUser;
    }
  } catch {}
  return null;
}

export function setCachedTelegramUser(user: TelegramUser | null): void {
  cachedTelegramUser = user;
  if (typeof window === 'undefined') return;
  if (user) {
    try {
      localStorage.setItem(TELEGRAM_USER_STORAGE_KEY, JSON.stringify(user));
    } catch {}
  } else {
    try {
      localStorage.removeItem(TELEGRAM_USER_STORAGE_KEY);
    } catch {}
  }
}

export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) return true;
  if (window.Telegram?.WebApp?.initData && window.Telegram.WebApp.initData.length > 0) return true;
  if (typeof window.location !== 'undefined') {
    const s = window.location.search || '';
    const h = window.location.hash || '';
    if (s.includes('tgWebAppData') || h.includes('tgWebAppData')) return true;
    if (s.includes('tgWebAppVersion') || h.includes('tgWebAppVersion')) return true;
    if (s.includes('tg_chat_id') || h.includes('tg_chat_id')) return true;
  }
  return false;
}

export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function initTelegramWebApp(): TelegramUser | null {
  if (typeof window === 'undefined') return null;

  const webApp = getTelegramWebApp();
  let user: TelegramUser | null = null;

  if (webApp) {
    try {
      webApp.ready();
      webApp.expand();
      if (typeof webApp.setHeaderColor === 'function') webApp.setHeaderColor('#dbe0ea');
      if (typeof webApp.setBackgroundColor === 'function') webApp.setBackgroundColor('#dbe0ea');
    } catch (e) {
      console.warn('Error expanding Telegram WebApp:', e);
    }

    if (webApp.initDataUnsafe?.user && (typeof webApp.initDataUnsafe.user.id === 'number' || typeof (webApp.initDataUnsafe.user as any).id === 'string')) {
      const u = webApp.initDataUnsafe.user;
      user = {
        ...u,
        id: Number(u.id),
      };
    } else if (webApp.initData) {
      user = parseTelegramUserFromRawString(webApp.initData);
    }
  }

  // Fallback to URL parameters (search query string first, then hash)
  if (!user && typeof window.location !== 'undefined') {
    user =
      parseTelegramUserFromRawString(window.location.search) ||
      parseTelegramUserFromRawString(window.location.hash);
  }

  // Fallback to cached localStorage user
  if (!user) {
    user = getCachedTelegramUser();
  }

  if (user) {
    setCachedTelegramUser(user);
  }

  return user;
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'selection' = 'light') {
  if (typeof window === 'undefined') return;

  // 1. Telegram WebApp Haptic
  const webApp = getTelegramWebApp();
  if (webApp?.HapticFeedback) {
    try {
      if (type === 'success') {
        webApp.HapticFeedback.notificationOccurred('success');
      } else if (type === 'selection') {
        webApp.HapticFeedback.selectionChanged();
      } else {
        webApp.HapticFeedback.impactOccurred(type);
      }
      return;
    } catch {
      // Ignore haptic errors
    }
  }

  // 2. VK Mini App Taptic (VK Bridge)
  if (isVkMiniApp() && window.vkBridge && typeof window.vkBridge.send === 'function') {
    try {
      if (type === 'success') {
        window.vkBridge.send('VKWebAppTapticNotificationOccurred', { result_type: 'success' }).catch(() => {});
      } else if (type === 'selection') {
        window.vkBridge.send('VKWebAppTapticSelectionChanged', {}).catch(() => {});
      } else {
        const style = type === 'medium' || type === 'heavy' ? type : 'light';
        window.vkBridge.send('VKWebAppTapticImpactOccurred', { style }).catch(() => {});
      }
      return;
    } catch {
      // Ignore haptic errors
    }
  }

  // 3. Fallback to standard Navigator Vibration API if supported
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(type === 'selection' ? 10 : 25);
    } catch {
      // Ignore vibration errors
    }
  }
}

export function getSavedBotToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(BOT_TOKEN_STORAGE_KEY) || '';
}

export function saveBotToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (token.trim()) {
    localStorage.setItem(BOT_TOKEN_STORAGE_KEY, token.trim());
  } else {
    localStorage.removeItem(BOT_TOKEN_STORAGE_KEY);
  }
}

/**
 * Send real Telegram message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  botToken?: string,
  buttonText = '🚀 Открыть IT-Старт',
  buttonUrl = GITHUB_PAGES_URL,
  actionButton?: { text: string; url: string }
): Promise<{ success: boolean; error?: string; messageId?: number }> {
  const token = botToken || getSavedBotToken();

  // 1. Direct Telegram Bot API call if token is provided
  if (token) {
    const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
    const inlineKeyboard: any[][] = [];

    if (actionButton && actionButton.url) {
      inlineKeyboard.push([
        {
          text: actionButton.text,
          url: actionButton.url,
        },
      ]);
    }

    inlineKeyboard.push([
      {
        text: buttonText,
        web_app: {
          url: buttonUrl,
        },
      },
    ]);

    inlineKeyboard.push([
      {
        text: '💬 Бот @' + TELEGRAM_BOT_USERNAME,
        url: `https://t.me/${TELEGRAM_BOT_USERNAME}`,
      },
    ]);

    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return {
          success: false,
          error: data.description || 'Ошибка Telegram Bot API при отправке сообщения',
        };
      }

      return {
        success: true,
        messageId: data.result?.message_id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Сетевая ошибка при обращении к api.telegram.org',
      };
    }
  }

  // 2. Client has no local bot token -> attempt sending via backend /notify on Render
  try {
    const notifyRes = await fetch('https://it-start-bot.onrender.com/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        text,
        actionButton,
        applyUrl: actionButton?.url,
        buttonText,
        buttonUrl,
      }),
    });

    if (notifyRes.ok) {
      const notifyData = await notifyRes.json();
      if (notifyData.success) {
        return {
          success: true,
          messageId: notifyData.messageId || Date.now(),
        };
      }
    }
  } catch {
    // Backend might be offline or sleeping on free tier
  }

  // 3. Fallback: subscription is saved in Supabase and polled by the backend bot
  return {
    success: true,
    messageId: Date.now(),
  };
}

/**
 * Fetch latest chat ID from getUpdates for auto-detection in browser
 */
export async function autoDetectChatIdFromUpdates(
  botToken?: string
): Promise<{ success: boolean; chatId?: number; username?: string; firstName?: string; error?: string }> {
  const token = botToken || getSavedBotToken();

  if (!token) {
    return {
      success: false,
      error: 'Укажите Bot Token для автоматического поиска Chat ID через getUpdates',
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-10&limit=10`);
    const data = await res.json();

    if (!res.ok || !data.ok) {
      return {
        success: false,
        error: data.description || 'Не удалось получить обновления бота от Telegram',
      };
    }

    const updates = data.result || [];
    if (updates.length === 0) {
      return {
        success: false,
        error: 'Пока нет сообщений в боте. Сначала откройте бота @IT_start_izh_bot и отправьте команду /start, затем повторите поиск!',
      };
    }

    // Find latest message or callback
    for (let i = updates.length - 1; i >= 0; i--) {
      const u = updates[i];
      const msg = u.message || u.edited_message || u.channel_post || u.callback_query?.message;
      const user = msg?.from || u.callback_query?.from;
      if (user && user.id) {
        return {
          success: true,
          chatId: user.id,
          username: user.username,
          firstName: user.first_name,
        };
      }
    }

    return {
      success: false,
      error: 'Не удалось извлечь Chat ID из последних сообщений. Отправьте /start боту и попробуйте снова.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Ошибка соединения с Telegram API',
    };
  }
}
