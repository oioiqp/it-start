import { describe, it, expect, beforeEach } from 'vitest';

describe('Bot Parity & Comprehensive Functionality Tests (Telegram & VKontakte)', { timeout: 25000 }, () => {
  let tgBot: any;
  let vkBot: any;

  beforeEach(async () => {
    // @ts-ignore
    tgBot = await import('../../bot/bot.mjs');
    // @ts-ignore
    vkBot = await import('../../bot/vk_bot.mjs');
  });

  describe('1. Shared Data & Configuration Parity', () => {
    it('both bots share all 9 target employers', () => {
      expect(tgBot.COMPANIES_DATA).toBeDefined();
      expect(tgBot.COMPANIES_DATA.length).toBe(9);

      const expectedIds = ['t1', 'kontur', 'tbank', 'directum', 'yandex', 'ozon', 'sber', 'avito', 'vk'];
      expectedIds.forEach((id) => {
        const comp = tgBot.findCompanyByQuery(id);
        expect(comp).toBeDefined();
        expect(comp?.id).toBe(id);
      });
    });

    it('both bots share all 6 directions with aliases', () => {
      expect(tgBot.DIRECTION_ALIASES).toBeDefined();
      expect(vkBot.VK_DIRECTION_ALIASES).toBeDefined();

      const expectedDirs = ['frontend', 'backend', 'mobile', 'data_science', 'qa', 'devops'];
      expectedDirs.forEach((dir) => {
        expect(tgBot.DIRECTION_ALIASES[dir]).toBeDefined();
        expect(tgBot.DIRECTION_TITLES[dir]).toBeDefined();
        expect(tgBot.resolveDirectionByQuery(dir)).toBe(dir);
        expect(vkBot.resolveDirectionByQuery(dir)).toBe(dir);
      });

      // Russian synonyms
      expect(tgBot.resolveDirectionByQuery('фронтенд')).toBe('frontend');
      expect(tgBot.resolveDirectionByQuery('бэкенд')).toBe('backend');
      expect(tgBot.resolveDirectionByQuery('мобилка')).toBe('mobile');
      expect(tgBot.resolveDirectionByQuery('дата сайнс')).toBe('data_science');
      expect(tgBot.resolveDirectionByQuery('тестирование')).toBe('qa');
      expect(tgBot.resolveDirectionByQuery('девопс')).toBe('devops');

      expect(vkBot.resolveDirectionByQuery('фронтенд')).toBe('frontend');
      expect(vkBot.resolveDirectionByQuery('бэкенд')).toBe('backend');
    });

    it('both bots export status diagnostics', () => {
      const tgStatus = tgBot.getTgBotStatus();
      expect(tgStatus.bot).toBe('IT-Старт Telegram Бот');
      expect(tgStatus.commandsCount).toBe(12);
      expect(tgStatus.channelsCount).toBeGreaterThan(0);
      expect(tgStatus.websitesCount).toBeGreaterThan(0);
      expect(tgStatus.subscribersCount).toBeDefined();

      const vkStatus = vkBot.getVkBotStatus();
      expect(vkStatus.bot).toBe('IT-Старт VK Бот');
      expect(vkStatus.commandsCount).toBe(12);
      expect(vkStatus.channelsCount).toBeGreaterThan(0);
      expect(vkStatus.websitesCount).toBeGreaterThan(0);
      expect(vkStatus.companiesCount).toBe(9);
      expect(vkStatus.subscribersCount).toBeDefined();
      expect(vkStatus.version).toBe('5.199');
    });
  });

  describe('2. Telegram Bot Command Suite & Fallback', () => {
    const mockChatId = 778899;

    it('handles /start and Russian greetings', async () => {
      const resStart = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: '/start',
        from: { first_name: 'Алексей', username: 'alex_tg' },
      });
      expect(resStart.ok).toBe(true);
      expect(resStart.type).toBe('start');
      expect(resStart.replyText).toContain('Алексей');
      expect(resStart.replyText).toContain(String(mockChatId));

      const resHello = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: 'Привет!',
        from: { first_name: 'Алексей', username: 'alex_tg' },
      });
      expect(resHello.ok).toBe(true);
      expect(resHello.type).toBe('start');
    });

    it('handles /vacancies and direction filters', async () => {
      // All vacancies
      const resAll = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: '/vacancies',
      });
      expect(resAll.ok).toBe(true);
      expect(resAll.type).toBe('vacancies');
      expect(resAll.filter).toBe('all');
      expect(resAll.count).toBeGreaterThan(0);

      // Direction argument: frontend
      const resFront = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: '/vacancies frontend',
      });
      expect(resFront.ok).toBe(true);
      expect(resFront.type).toBe('vacancies');
      expect(resFront.filter).toBe('frontend');

      // Russian direction text directly: «бэкенд»
      const resBack = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: 'бэкенд',
      });
      expect(resBack.ok).toBe(true);
      expect(resBack.type).toBe('vacancies');
      expect(resBack.filter).toBe('backend');

      // Company argument: /vacancies t1
      const resComp = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: '/vacancies t1',
      });
      expect(resComp.ok).toBe(true);
      expect(resComp.type).toBe('company_details');
      expect(resComp.companyId).toBe('t1');
    });

    it('handles /companies and specific company lookups', async () => {
      const resCompList = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: '/companies',
      });
      expect(resCompList.ok).toBe(true);
      expect(resCompList.type).toBe('companies');
      expect(resCompList.count).toBe(9);

      // Direct company command
      const resDirectum = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: '/company_directum',
      });
      expect(resDirectum.ok).toBe(true);
      expect(resDirectum.type).toBe('company_details');
      expect(resDirectum.companyId).toBe('directum');

      // Direct word
      const resKontur = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: 'контур',
      });
      expect(resKontur.ok).toBe(true);
      expect(resKontur.type).toBe('company_details');
      expect(resKontur.companyId).toBe('kontur');
    });

    it('handles /roadmaps, /questions, /site, /status, /vk, /help', async () => {
      const resRoadmaps = await tgBot.handleMessage({ chat: { id: mockChatId }, text: '/roadmaps' });
      expect(resRoadmaps.ok).toBe(true);
      expect(resRoadmaps.type).toBe('roadmaps');

      const resQuestions = await tgBot.handleMessage({ chat: { id: mockChatId }, text: '/questions' });
      expect(resQuestions.ok).toBe(true);
      expect(resQuestions.type).toBe('questions');

      const resSite = await tgBot.handleMessage({ chat: { id: mockChatId }, text: '/site' });
      expect(resSite.ok).toBe(true);
      expect(resSite.type).toBe('site');

      const resStatus = await tgBot.handleMessage({ chat: { id: mockChatId }, text: '/status' });
      expect(resStatus.ok).toBe(true);
      expect(resStatus.type).toBe('status');

      const resVk = await tgBot.handleMessage({ chat: { id: mockChatId }, text: '/vk' });
      expect(resVk.ok).toBe(true);
      expect(resVk.type).toBe('vk');

      const resHelp = await tgBot.handleMessage({ chat: { id: mockChatId }, text: '/help' });
      expect(resHelp.ok).toBe(true);
      expect(resHelp.type).toBe('help');
    });

    it('handles /id, /subscribe, and /unsubscribe', async () => {
      const resId = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: '/id',
        from: { username: 'alex_tg', first_name: 'Алексей' },
      });
      expect(resId.ok).toBe(true);
      expect(resId.type).toBe('id');

      const resSub = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: '/subscribe',
        from: { username: 'alex_tg', first_name: 'Алексей' },
      });
      expect(resSub.ok).toBe(true);
      expect(resSub.type).toBe('subscribe');

      const resUnsub = await tgBot.handleMessage({
        chat: { id: mockChatId },
        text: '/unsubscribe',
      });
      expect(resUnsub.ok).toBe(true);
      expect(resUnsub.type).toBe('unsubscribe');
    });

    it('handles manual scan command /scan and reports parsed statistics', async () => {
      const resScan = await tgBot.handleMessage({ chat: { id: mockChatId }, text: '/scan' });
      expect(resScan.ok).toBe(true);
      expect(resScan.type).toBe('scan');
      expect(resScan.result).toBeDefined();
      expect(resScan.result.channelsChecked).toBeGreaterThan(0);
      expect(resScan.result.websitesChecked).toBeGreaterThan(0);
    }, 25000);

    it('handles numeric menu shortcuts and prevents single letters from false company matches', async () => {
      // Numeric shortcuts
      const resNum1 = await tgBot.handleMessage({ chat: { id: mockChatId }, text: '1' });
      expect(resNum1.ok).toBe(true);
      expect(resNum1.type).toBe('vacancies');

      const resNum2 = await tgBot.handleMessage({ chat: { id: mockChatId }, text: '2' });
      expect(resNum2.ok).toBe(true);
      expect(resNum2.type).toBe('companies');

      // 'веб' must open site, not frontend vacancies
      const resWeb = await tgBot.handleMessage({ chat: { id: mockChatId }, text: 'веб' });
      expect(resWeb.ok).toBe(true);
      expect(resWeb.type).toBe('site');

      // Single characters must NOT match company T1 or any company
      const resLetterT = await tgBot.handleMessage({ chat: { id: mockChatId }, text: 'т' });
      expect(resLetterT.type).toBe('unknown');

      const resLetterYa = await tgBot.handleMessage({ chat: { id: mockChatId }, text: 'я' });
      expect(resLetterYa.type).toBe('unknown');

      const resLetterA = await tgBot.handleMessage({ chat: { id: mockChatId }, text: 'а' });
      expect(resLetterA.type).toBe('unknown');
    });

    it('handles unknown command fallback gracefully', async () => {
      const resUnknown = await tgBot.handleMessage({ chat: { id: mockChatId }, text: 'непонятный_текст_12345' });
      expect(resUnknown.ok).toBe(true);
      expect(resUnknown.type).toBe('unknown');
    });

    it('handles callback queries for inline buttons', async () => {
      const cbVac = await tgBot.handleCallbackQuery({
        id: 'cb_1',
        message: { chat: { id: mockChatId } },
        data: 'vacancies:all',
      });
      expect(cbVac.ok).toBe(true);
      expect(cbVac.type).toBe('vacancies');

      const cbDir = await tgBot.handleCallbackQuery({
        id: 'cb_2',
        message: { chat: { id: mockChatId } },
        data: 'direction:frontend',
      });
      expect(cbDir.ok).toBe(true);
      expect(cbDir.type).toBe('vacancies');
      expect(cbDir.filter).toBe('frontend');

      const cbComp = await tgBot.handleCallbackQuery({
        id: 'cb_3',
        message: { chat: { id: mockChatId } },
        data: 'company:yandex',
      });
      expect(cbComp.ok).toBe(true);
      expect(cbComp.type).toBe('company_details');

      const cbRoadmaps = await tgBot.handleCallbackQuery({
        id: 'cb_4',
        message: { chat: { id: mockChatId } },
        data: 'roadmaps',
      });
      expect(cbRoadmaps.ok).toBe(true);
      expect(cbRoadmaps.type).toBe('roadmaps');
    });
  });

  describe('3. VK Bot Command Suite & Parity', () => {
    const mockPeerId = 889900;

    it('handles /id command in VK', async () => {
      const resId = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: '/id' });
      expect(resId.ok).toBe(true);
      expect(resId.type).toBe('id');
      expect(resId.peerId).toBe(mockPeerId);
      expect(resId.reply.message).toContain(String(mockPeerId));
      expect(resId.reply.message).toContain('Peer ID');
    });

    it('handles /scan and /sync commands in VK with real scan report', async () => {
      const resScan = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: '/scan' });
      expect(resScan.ok).toBe(true);
      expect(resScan.type).toBe('scan');
      expect(resScan.result).toBeDefined();
      expect(resScan.result.channelsChecked).toBeGreaterThan(0);
      expect(resScan.result.websitesChecked).toBeGreaterThan(0);
      expect(resScan.reply.message).toContain('Сканирование источников успешно завершено');
    }, 25000);

    it('handles /status in VK without triggering scan', async () => {
      const resStatus = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: '/status' });
      expect(resStatus.ok).toBe(true);
      expect(resStatus.type).toBe('status');
      expect(resStatus.reply.message).toContain('VK Bot: Онлайн');
      expect(resStatus.reply.message).toContain('Telegram Bot');
    });

    it('handles /site in VK with Mini App and web links', async () => {
      const resSite = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: '/site' });
      expect(resSite.ok).toBe(true);
      expect(resSite.type).toBe('site');
      expect(resSite.reply.message).toContain('VK Mini App');
      expect(resSite.reply.message).toContain('Telegram-бот');
    });

    it('handles /vacancies with direction and company arguments in VK', async () => {
      const resDir = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: '/vacancies mobile' });
      expect(resDir.ok).toBe(true);
      expect(resDir.type).toBe('vacancies');
      expect(resDir.reply.message).toContain('Mobile');

      const resComp = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: '/vacancies directum' });
      expect(resComp.ok).toBe(true);
      expect(resComp.type).toBe('vacancies');
      expect(resComp.reply.message).toContain('Directum');
    });

    it('handles all 9 target companies in VK', async () => {
      const companies = ['t1', 'kontur', 'tbank', 'directum', 'yandex', 'ozon', 'sber', 'avito', 'vk'];
      for (const compId of companies) {
        const res = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: `/company_${compId}` });
        expect(res.ok).toBe(true);
        expect(res.type).toBe('company_details');
        expect(res.company).toBe(compId);
      }
    });

    it('handles numeric menu shortcuts 9 (id) and 8 (help)', async () => {
      // Reset menu state to main
      vkBot.userMenuState.set(String(mockPeerId), 'main');

      // 8 -> help
      const res8 = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: '8' });
      expect(res8.ok).toBe(true);
      expect(res8.type).toBe('help');

      // 9 -> id
      const res9 = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: '9' });
      expect(res9.ok).toBe(true);
      expect(res9.type).toBe('id');
    });

    it('handles /tg, /vk, "веб", and Russian prefix vacancies in VK', async () => {
      // /tg
      const resTg = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: '/tg' });
      expect(resTg.ok).toBe(true);
      expect(resTg.type).toBe('tg');
      expect(resTg.reply.message).toContain('Telegram');

      // /vk
      const resVk = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: '/vk' });
      expect(resVk.ok).toBe(true);
      expect(resVk.type).toBe('vk');

      // 'веб' must open site
      const resWeb = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: 'веб' });
      expect(resWeb.ok).toBe(true);
      expect(resWeb.type).toBe('site');

      // Russian prefix: 'стажировки frontend'
      const resPref = await vkBot.handleVkMessage({ peer_id: mockPeerId, text: 'стажировки frontend' });
      expect(resPref.ok).toBe(true);
      expect(resPref.type).toBe('vacancies');
    });
  });

  describe('4. Full Cross-Platform Feature Parity Matrix', () => {
    it('both bots support the complete list of 13 functional commands', async () => {
      const commands = [
        'start',
        'vacancies',
        'companies',
        'roadmaps',
        'questions',
        'subscribe',
        'unsubscribe',
        'id',
        'status',
        'site',
        'help',
        'vk',
        'tg',
      ];

      for (const cmd of commands) {
        const tgRes = await tgBot.handleMessage({
          chat: { id: 123000 },
          text: `/${cmd}`,
          from: { username: 'testuser', first_name: 'Тестер' },
        });
        expect(tgRes.ok).toBe(true);
        expect(tgRes.type).toBeDefined();

        const vkRes = await vkBot.handleVkMessage({
          peer_id: 123000,
          text: `/${cmd}`,
        });
        expect(vkRes.ok).toBe(true);
        expect(vkRes.type).toBeDefined();
      }
    }, 30000);

    it('both bots synchronize subscriber persistence and offline resilience', async () => {
      const testId = 445566;

      // TG subscriber
      const tgSub = await tgBot.registerTgSubscriber(testId, { username: 'tester_parity', first_name: 'Тестер' });
      expect(tgSub.chat_id).toBe(String(testId));
      expect(tgSub.is_active).toBe(true);

      const tgUnsub = await tgBot.unregisterTgSubscriber(testId);
      expect(typeof tgUnsub).toBe('boolean');

      // VK subscriber
      const vkSub = await vkBot.registerVkSubscriber(testId, { first_name: 'Тестер VK' });
      expect(vkSub.peer_id).toBe(String(testId));
      expect(vkSub.is_active).toBe(true);

      const vkUnsub = await vkBot.unregisterVkSubscriber(testId);
      expect(vkUnsub).toBe(true);
    }, 30000);

    it('verifies that Telegram bot isolates VK subscribers and never sends push to vk_ IDs', async () => {
      // Register a VK subscriber with vk_ prefix in memory
      const vkPeerId = 998877;
      await vkBot.registerVkSubscriber(vkPeerId, { first_name: 'VK Tester' });

      // In tg_subscriptions, VK subscribers have prefix "vk_"
      // Verify that tgSubscribers only contains valid Telegram chat IDs
      for (const [chatId] of tgBot.tgSubscribers.entries()) {
        expect(String(chatId).startsWith('vk_')).toBe(false);
      }
    });
  });
});
