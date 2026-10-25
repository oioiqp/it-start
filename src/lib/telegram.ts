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

export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initDataUnsafe?.user;
}

export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function initTelegramWebApp(): TelegramUser | null {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;

  try {
    webApp.ready();
    webApp.expand();
  } catch (e) {
    console.warn('Error expanding Telegram WebApp:', e);
  }

  return webApp.initDataUnsafe?.user || null;
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
  buttonUrl = GITHUB_PAGES_URL
): Promise<{ success: boolean; error?: string; messageId?: number }> {
  const token = botToken || getSavedBotToken();

  if (!token) {
    return {
      success: false,
      error: 'Bot Token не настроен. Укажите токен бота во вкладке "Telegram & Парсер", чтобы отправлять реальные уведомления.',
    };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: buttonText,
            web_app: {
              url: buttonUrl,
            },
          },
        ],
        [
          {
            text: '💬 Бот @' + TELEGRAM_BOT_USERNAME,
            url: `https://t.me/${TELEGRAM_BOT_USERNAME}`,
          },
        ],
      ],
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
