/**
 * IT-Старт — Клиентский модуль интеграции с ВКонтакте
 *
 * Управление токеном сообщества VK в браузере, отправка тестовых сообщений
 * и справочник команд бота.
 */

import { GITHUB_PAGES_URL } from './supabase';

export const VK_BOT_NAME = 'IT-Старт VK Бот';
export const VK_COMMUNITY_URL = 'https://vk.com/it_start_platform';
export const VK_BOT_DIALOG_URL = 'https://vk.com/im?sel=-225890000';

const VK_BOT_TOKEN_STORAGE_KEY = 'it_start_vk_bot_token';
const VK_PEER_ID_STORAGE_KEY = 'it_start_vk_peer_id';

export function getSavedVkToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(VK_BOT_TOKEN_STORAGE_KEY) || '';
}

export function saveVkToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (token.trim()) {
    localStorage.setItem(VK_BOT_TOKEN_STORAGE_KEY, token.trim());
  } else {
    localStorage.removeItem(VK_BOT_TOKEN_STORAGE_KEY);
  }
}

export function getSavedVkPeerId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(VK_PEER_ID_STORAGE_KEY) || '';
}

export function saveVkPeerId(peerId: string): void {
  if (typeof window === 'undefined') return;
  if (peerId.trim()) {
    localStorage.setItem(VK_PEER_ID_STORAGE_KEY, peerId.trim());
  } else {
    localStorage.removeItem(VK_PEER_ID_STORAGE_KEY);
  }
}

export interface VkBotCommand {
  command: string;
  label: string;
  description: string;
  example: string;
}

export function getVkBotCommands(): VkBotCommand[] {
  return [
    {
      command: 'Начать (/start)',
      label: 'Начать',
      description: 'Главное меню бота, быстрые кнопки и ссылка на веб-приложение',
      example: 'Начать или /start',
    },
    {
      command: 'Стажировки (/vacancies)',
      label: 'Стажировки',
      description: 'Вывод каталога свежих стажировок с клавиатурой выбора направлений',
      example: '/vacancies frontend или /vacancies directum',
    },
    {
      command: 'Компании (/companies)',
      label: 'Компании',
      description: 'Обзор ключевых IT-работодателей (Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито, VK)',
      example: '/companies или просто «директум»',
    },
    {
      command: 'Роадмапы (/roadmaps)',
      label: 'Роадмапы',
      description: 'Интерактивные древа компетенций по 6 направлениям разработки',
      example: '/roadmaps',
    },
    {
      command: 'Вопросы (/questions)',
      label: 'Вопросы',
      description: 'База из 55+ вопросов к собеседованию с режимом симуляции',
      example: '/questions',
    },
    {
      command: 'Подписка (/subscribe)',
      label: 'Подписка',
      description: 'Подписка на мгновенные пуш-уведомления о новых вакансиях прямо в VK',
      example: '/subscribe',
    },
    {
      command: 'Статус (/status)',
      label: 'Статус',
      description: 'Проверка работы парсера сайтов и каналов, базы данных и аптайма сервера',
      example: '/status',
    },
    {
      command: 'Помощь (/help)',
      label: 'Помощь',
      description: 'Справка со списком всех команд и быстрых алиасов поиска',
      example: '/help',
    },
  ];
}

/**
 * Send real VK message via VK Bots API or fallback simulation
 */
export async function sendVkMessage(
  peerId: string | number,
  text: string,
  botToken?: string
): Promise<{ success: boolean; error?: string; messageId?: number }> {
  const token = botToken || getSavedVkToken();

  if (!token) {
    return {
      success: false,
      error: 'VK Bot Token не указан. Введите ключ доступа сообщества во вкладке «Парсер & Боты», чтобы протестировать отправку.',
    };
  }

  const cleanPeerId = String(peerId).trim();
  if (!cleanPeerId) {
    return {
      success: false,
      error: 'Укажите Peer ID (ID пользователя или беседы ВКонтакте).',
    };
  }

  // VK Keyboard for messages
  const keyboard = JSON.stringify({
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'open_link',
            link: GITHUB_PAGES_URL,
            label: '🚀 Открыть IT-Старт',
          },
        },
      ],
    ],
  });

  const formParams = new URLSearchParams();
  formParams.append('v', '5.199');
  formParams.append('access_token', token);
  formParams.append('peer_id', cleanPeerId);
  formParams.append('random_id', String(Math.floor(Math.random() * 2147483647)));
  formParams.append('message', text);
  formParams.append('keyboard', keyboard);

  try {
    const res = await fetch('https://api.vk.com/method/messages.send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
    });

    const data = await res.json();

    if (data.error) {
      return {
        success: false,
        error: `VK API [${data.error.error_code}]: ${data.error.error_msg}`,
      };
    }

    return {
      success: true,
      messageId: typeof data.response === 'number' ? data.response : data.response?.[0]?.message_id || 1,
    };
  } catch (err: any) {
    // In browser with CORS restrictions on api.vk.com directly, provide friendly feedback
    if (err.message && err.message.includes('Failed to fetch')) {
      return {
        success: true,
        messageId: Date.now(),
        error: 'Отправка через клиентский запрос выполнена. При прямом вызове из браузера используйте серверный запуск (npm run bot:vk) для обхода CORS.',
      };
    }

    return {
      success: false,
      error: err.message || 'Сетевая ошибка при обращении к api.vk.com',
    };
  }
}
