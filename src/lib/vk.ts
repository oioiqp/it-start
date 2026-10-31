/**
 * IT-Старт — Клиентский модуль интеграции с ВКонтакте
 *
 * Управление токеном сообщества VK в браузере, отправка тестовых сообщений
 * и справочник команд бота.
 */


export const VK_BOT_NAME = 'IT-Старт VK Бот';
export const VK_COMMUNITY_URL = 'https://vk.com/club242573933';
export const VK_BOT_DIALOG_URL = 'https://vk.com/im?sel=-242573933';
export const VK_APP_ID = '54857681';
export const VK_MINI_APP_URL = 'https://vk.com/app54857681';

const VK_BOT_TOKEN_STORAGE_KEY = 'it_start_vk_bot_token';
const VK_PEER_ID_STORAGE_KEY = 'it_start_vk_peer_id';
const VK_GROUP_ID_STORAGE_KEY = 'it_start_vk_group_id';

export function getSavedVkGroupId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(VK_GROUP_ID_STORAGE_KEY) || '';
}

export function saveVkGroupId(groupId: string): void {
  if (typeof window === 'undefined') return;
  const clean = groupId.trim();
  if (clean) {
    localStorage.setItem(VK_GROUP_ID_STORAGE_KEY, clean);
  } else {
    localStorage.removeItem(VK_GROUP_ID_STORAGE_KEY);
  }
}

export function getVkBotDialogUrl(): string {
  const saved = getSavedVkGroupId();
  if (saved) {
    const num = saved.replace(/[^0-9]/g, '');
    if (num) {
      return `https://vk.com/im?sel=-${num}`;
    }
  }
  return VK_BOT_DIALOG_URL;
}

export function getVkCommunityUrl(): string {
  const saved = getSavedVkGroupId();
  if (saved) {
    if (/^\d+$/.test(saved)) {
      return `https://vk.com/club${saved}`;
    }
    if (!saved.startsWith('http')) {
      return `https://vk.com/${saved}`;
    }
    return saved;
  }
  return VK_COMMUNITY_URL;
}

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

  const rawStr = String(peerId).trim().replace(/^vk_/i, '');
  const idMatch = rawStr.match(/(?:(?:https?:\/\/)?(?:m\.)?vk\.com\/(?:id)?)?(\d+)/i);
  const cleanPeerId = idMatch && idMatch[1] ? idMatch[1] : rawStr.replace(/^id/i, '');
  if (!cleanPeerId) {
    return {
      success: false,
      error: 'Укажите корректный Peer ID (числовой ID пользователя или беседы ВКонтакте).',
    };
  }

  // VK Keyboard for messages
  const keyboard = JSON.stringify({
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'open_app',
            app_id: Number(VK_APP_ID),
            label: '🚀 Запустить IT-Старт',
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
    // In browser with CORS restrictions on direct api.vk.com, proxy through Render server
    try {
      const renderRes = await fetch('https://it-start-bot.onrender.com/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `vk_${cleanPeerId}`,
          text,
          platform: 'vk',
        }),
      });
      if (renderRes.ok) {
        const renderData = await renderRes.json();
        if (renderData.success) {
          return {
            success: true,
            messageId: renderData.messageId,
          };
        }
        return {
          success: false,
          error: renderData.error || 'Ошибка отправки через сервер уведомлений',
        };
      }
    } catch {}

    return {
      success: false,
      error: err.message || 'Сетевая ошибка при обращении к api.vk.com',
    };
  }
}

/**
 * Auto-detect VK Peer ID from recent bot conversations on Render
 */
export async function autoDetectVkPeerId(): Promise<{
  success: boolean;
  peerId?: string | number;
  firstName?: string;
  fullName?: string;
  error?: string;
}> {
  try {
    const serverUrl = 'https://it-start-bot.onrender.com';
    const res = await fetch(`${serverUrl}/vk/latest-user`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.peerId) {
        saveVkPeerId(String(data.peerId));
        return {
          success: true,
          peerId: data.peerId,
          firstName: data.firstName,
          fullName: data.fullName,
        };
      }
    }
  } catch {}

  const saved = getSavedVkPeerId();
  if (saved) {
    return {
      success: true,
      peerId: saved,
      firstName: 'Пользователь VK',
    };
  }

  return {
    success: false,
    error: 'Не удалось определить VK ID автоматически. Откройте диалог с сообществом ВКонтакте (vk.com/im?sel=-242573933), отправьте любое сообщение и повторите попытку!',
  };
}
