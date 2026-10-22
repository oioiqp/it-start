import dns from 'node:dns';
import fs from 'node:fs';

// Configure DNS and TLS for Russian employer networks & Russian CA certs
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { SEED_INTERNSHIPS } from '../src/data/internships.ts';
import { INITIAL_PARSED_POSTS } from '../src/data/channels.ts';
import { ALL_INTERNSHIPS, PORTAL_FALLBACK_VACANCIES, COMPANY_OFFICIAL_PORTALS } from '../bot/bot.mjs';

async function checkUrl(url) {
  const browserHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: browserHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    return {
      status: res.status,
      finalUrl: res.url,
      ok: res.status >= 200 && res.status < 400,
    };
  } catch (err) {
    // Retry once with 8s timeout
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: browserHeaders,
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
      return {
        status: res.status,
        finalUrl: res.url,
        ok: res.status >= 200 && res.status < 400,
      };
    } catch (err2) {
      return {
        status: 'ERR',
        finalUrl: err2.message || 'Timeout / Network Error',
        ok: false,
      };
    }
  }
}

async function main() {
  console.log('======================================================================');
  console.log('🔍 IT-Старт — Комплексная валидация ссылок на стажировки и вакансии');
  console.log('======================================================================');

  // Collect unique URLs from all data sources
  const urlMap = new Map(); // url -> Array of sources/companies

  const add = (url, source) => {
    if (!url) return;
    if (!urlMap.has(url)) {
      urlMap.set(url, []);
    }
    urlMap.get(url).push(source);
  };

  // 1. Official portals
  for (const [comp, portal] of Object.entries(COMPANY_OFFICIAL_PORTALS)) {
    add(portal, `Официальный портал (${comp})`);
  }
  add('https://kontur.ru/career', 'Официальный портал (kontur main)');
  add('https://www.tbank.ru/career/it/', 'Официальный портал (tbank it)');
  add('https://t1.ru/school/', 'Официальный портал (t1 school)');

  // 2. SEED_INTERNSHIPS
  for (const item of SEED_INTERNSHIPS) {
    add(item.applyUrl, `SEED: ${item.id} (${item.company})`);
  }

  // 3. ALL_INTERNSHIPS
  for (const item of ALL_INTERNSHIPS) {
    add(item.url, `BOT_ALL: ${item.id} (${item.company})`);
  }

  // 4. PORTAL_FALLBACK_VACANCIES
  for (const item of PORTAL_FALLBACK_VACANCIES) {
    add(item.url, `BOT_FALLBACK: ${item.id} (${item.company})`);
  }

  // 5. INITIAL_PARSED_POSTS
  for (const item of INITIAL_PARSED_POSTS) {
    add(item.url, `CHANNELS_POST: ${item.id} (${item.company})`);
  }

  console.log(`Всего уникальных URL для проверки: ${urlMap.size}`);
  console.log('----------------------------------------------------------------------');

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const [url, sources] of urlMap.entries()) {
    process.stdout.write(`Проверка: ${url.padEnd(45)} `);
    const res = await checkUrl(url);
    const isSuccess = res.ok;

    if (isSuccess) {
      successCount++;
      console.log(`✅ [${res.status}] -> ${res.finalUrl}`);
    } else {
      failCount++;
      console.log(`❌ [${res.status}] ${res.finalUrl}`);
    }

    results.push({
      url,
      sources,
      status: res.status,
      finalUrl: res.finalUrl,
      ok: isSuccess,
    });
  }

  console.log('======================================================================');
  console.log(`Результаты проверки: ${successCount} успешно / ${failCount} ошибок`);
  console.log('======================================================================');

  // Save full log to artifact
  fs.writeFileSync(
    'scripts/links_verification_report.json',
    JSON.stringify(results, null, 2),
    'utf8'
  );
  console.log('Полный отчет сохранен в scripts/links_verification_report.json');
}

main();
