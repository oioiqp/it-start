import { createClient } from '@supabase/supabase-js';
import { SEED_INTERNSHIPS } from '../src/data/internships.ts';
import {
  formatSalary,
  resolveApplyUrl,
  resolveChannelHandle,
  isStrictVacancyPost,
  isVacancyActive,
} from '../src/lib/vacancyUrl.ts';
import { PORTAL_FALLBACK_VACANCIES } from '../bot/bot.mjs';

const SUPABASE_URL = 'https://pmgsymacvhzsixbpndsn.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ3N5bWFjdmh6c2l4YnBuZHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDA1OTEsImV4cCI6MjEwNzYxNjU5MX0.J3LSRV4pYTogH52y1maMV8NZ1J9s72WU2ydtyQhWWr4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('======================================================================');
  console.log('⚡ Запуск комплексной очистки и валидации базы Supabase internships...');
  console.log('======================================================================');

  const { data: rows, error } = await supabase.from('internships').select('*');
  if (error) {
    console.error('Ошибка получения данных из Supabase:', error.message);
    process.exit(1);
  }

  console.log(`Текущее количество записей в базе Supabase: ${rows.length}`);

  const toDelete = [];
  const validRowsToUpdate = [];

  for (const row of rows) {
    // 1. Check test artifacts
    if (row.id.startsWith('test-') || (row.company || '').includes('Тестов')) {
      toDelete.push(row.id);
      continue;
    }

    // 2. Validate strict IT vacancy requirements
    const isStrictIT = isStrictVacancyPost(row.title || '', row.description || '');
    if (!isStrictIT) {
      console.log(`❌ Нецелевая / спам / не-IT вакансия к удалению: [${row.id}] ${row.company} — ${row.title}`);
      toDelete.push(row.id);
      continue;
    }

    // 3. Remove inactive Directum vacancies (recruitment closed, target page has no internships)
    if (
      (row.company || '').toLowerCase().includes('directum') ||
      (row.company || '').toLowerCase().includes('директ') ||
      row.id.includes('directum')
    ) {
      console.log(`❌ Directum вакансия к удалению (набор завершён): [${row.id}] ${row.title}`);
      toDelete.push(row.id);
      continue;
    }

    // 4. Remove all expired/closed HeadHunter aggregator vacancies
    if (row.id.startsWith('hh-') || (row.source_url || '').includes('hh.ru')) {
      console.log(`❌ Устаревшая / закрытая hh.ru вакансия к удалению: [${row.id}] ${row.company} — ${row.title}`);
      toDelete.push(row.id);
      continue;
    }

    // 5. Remove closed/stale Avito vacancies
    if (
      row.id.includes('site-avito-20706') ||
      row.id.includes('site-avito-20946') ||
      (row.source_url || '').includes('20803') ||
      (row.source_url || '').includes('20812') ||
      (row.source_url || '').includes('20816')
    ) {
      console.log(`❌ Устаревшая Avito ссылка к удалению: [${row.id}] ${row.source_url}`);
      toDelete.push(row.id);
      continue;
    }

    // 6. Check general active & freshness rules
    const active = isVacancyActive({
      id: row.id,
      title: row.title,
      company: row.company,
      applyUrl: row.source_url || row.url,
      description: row.description,
      publishedAt: row.published_at,
      isActive: row.is_active,
      status: row.status,
    });
    if (!active) {
      console.log(`❌ Неактуальная / архивная вакансия к удалению: [${row.id}] ${row.company} — ${row.title}`);
      toDelete.push(row.id);
      continue;
    }

    // 7. Normalize salary & URLs
    const formattedSalary = formatSalary(row.salary);
    let title = row.title;
    let resolvedUrl = resolveApplyUrl(
      row.source_url || row.url,
      row.company,
      row.source_name,
      row.direction,
      row.sub_track
    );

    if (
      row.id === 'bot-t1-3' ||
      row.id === 'bot-t1-1' ||
      row.source_url?.includes('career.t1.ru/vacancies')
    ) {
      resolvedUrl = 'https://career.t1.ru/vacancies/';
    } else if (row.id === 'bot-vk-1' || row.source_url?.includes('internship.vk.company')) {
      resolvedUrl = 'https://internship.vk.company/internship/';
    }

    const format = row.format || 'Удаленно';
    const city = row.city || row.location || 'Москва / Удаленно';

    const verifiedChannel = resolveChannelHandle(row.source_name, row.company);
    const isTgPost = resolvedUrl.startsWith('https://t.me/') || resolvedUrl.startsWith('http://t.me/');
    const sourceType = isTgPost ? 'telegram' : 'portal';
    const sourceName = isTgPost ? verifiedChannel : row.company;

    validRowsToUpdate.push({
      id: row.id,
      title,
      company: row.company,
      direction: row.direction || 'backend',
      sub_track: row.sub_track || 'python',
      format,
      city,
      salary: formattedSalary,
      source_type: sourceType,
      source_name: sourceName,
      source_url: resolvedUrl,
      description: row.description || '',
      tags: Array.isArray(row.tags) ? row.tags : [row.company, 'Стажировка'],
      published_at: row.published_at || new Date().toISOString(),
    });
  }

  console.log(`\nУдаление ${toDelete.length} нецелевых записей...`);
  if (toDelete.length > 0) {
    // Delete in batches of 20
    for (let i = 0; i < toDelete.length; i += 20) {
      const chunk = toDelete.slice(i, i + 20);
      const { error: delErr } = await supabase.from('internships').delete().in('id', chunk);
      if (delErr) {
        console.error(`Ошибка удаления пачки записей:`, delErr.message);
      } else {
        console.log(`Удалена пачка из ${chunk.length} записей`);
      }
    }
  }

  console.log(`\nОбновление ${validRowsToUpdate.length} валидированных существующих записей...`);
  if (validRowsToUpdate.length > 0) {
    for (let i = 0; i < validRowsToUpdate.length; i += 20) {
      const chunk = validRowsToUpdate.slice(i, i + 20);
      const { error: updErr } = await supabase.from('internships').upsert(chunk, { onConflict: 'id' });
      if (updErr) {
        console.error(`Ошибка обновления пачки:`, updErr.message);
      }
    }
  }

  // 4. Upsert canonical SEED_INTERNSHIPS & PORTAL_FALLBACK_VACANCIES
  const activeSeeds = SEED_INTERNSHIPS.filter((i) => isVacancyActive(i));
  const activePortals = PORTAL_FALLBACK_VACANCIES.filter((i) => isVacancyActive(i));

  console.log(`\nСинхронизация эталонных активных SEED (${activeSeeds.length}) и PORTAL_FALLBACK (${activePortals.length}) вакансий...`);
  const canonicalRows = [];

  for (const item of activeSeeds) {
    const directUrl = resolveApplyUrl(item.applyUrl, item.company, item.sourceChannel, item.directionId, item.subTrackId);
    const isTg = directUrl.startsWith('https://t.me/') || directUrl.startsWith('http://t.me/');
    canonicalRows.push({
      id: item.id,
      title: item.title,
      company: item.company,
      direction: item.directionId,
      sub_track: item.subTrackId,
      format: item.format || 'Удаленно',
      city: item.location || 'Москва / Удаленно',
      salary: formatSalary(item.salary),
      source_type: isTg ? 'telegram' : 'portal',
      source_name: isTg ? resolveChannelHandle(item.sourceChannel, item.company) : item.company,
      source_url: directUrl,
      description: item.description,
      tags: item.tags,
      published_at: item.publishedAt || new Date().toISOString(),
    });
  }

  for (const item of activePortals) {
    const directUrl = resolveApplyUrl(item.url, item.company, item.channel, item.directionId, item.subTrackId);
    const isTg = directUrl.startsWith('https://t.me/') || directUrl.startsWith('http://t.me/');
    canonicalRows.push({
      id: item.id,
      title: item.title,
      company: item.company,
      direction: item.directionId,
      sub_track: item.subTrackId,
      format: item.format || 'Удаленно',
      city: item.location || 'Москва / Удаленно',
      salary: formatSalary(item.salary),
      source_type: isTg ? 'telegram' : 'portal',
      source_name: isTg ? resolveChannelHandle(item.channel || item.sourceChannel, item.company) : item.company,
      source_url: directUrl,
      description: item.description,
      tags: item.tags,
      published_at: new Date().toISOString(),
    });
  }

  for (let i = 0; i < canonicalRows.length; i += 20) {
    const chunk = canonicalRows.slice(i, i + 20);
    const { error: upsertErr } = await supabase.from('internships').upsert(chunk, { onConflict: 'id' });
    if (upsertErr) {
      console.error(`Ошибка вставки эталонных записей:`, upsertErr.message);
    }
  }

  // 5. Final audit & verification
  const { data: finalRows } = await supabase.from('internships').select('*');
  console.log('======================================================================');
  console.log(`ИТОГИ ОЧИСТКИ:`);
  console.log(`Всего актуальных вакансий в базе: ${finalRows?.length || 0}`);

  let badSalaries = 0;
  let badUrls = 0;
  let nonIT = 0;

  for (const r of finalRows || []) {
    if (!r.salary || r.salary.includes('По договоренности') || r.salary.includes('Оплачиваемая')) {
      badSalaries++;
      console.log(`[Bad salary] ${r.id}: ${r.salary}`);
    }
    if (
      !r.source_url ||
      r.source_url.includes('?search=') ||
      r.source_url.includes('?direction=') ||
      r.source_url.includes('lead_product_owner') ||
      r.source_url === 'https://career.avito.com/' ||
      r.source_url === 'https://career.avito.com' ||
      r.source_url === 'https://avito.ru/' ||
      r.source_url === 'https://avito.ru' ||
      r.source_url === 'https://www.avito.ru/' ||
      r.source_url === 'https://www.avito.ru' ||
      r.source_url === 'https://hh.ru' ||
      r.source_url === 'https://hh.ru/' ||
      r.source_url === 'https://career.directum.ru/' ||
      r.source_url === 'https://career.directum.ru'
    ) {
      badUrls++;
      console.log(`[Bad url] ${r.id}: ${r.source_url}`);
    }
    if (!isStrictVacancyPost(r.title, r.description || '')) {
      nonIT++;
      console.log(`[Non-IT remaining] ${r.id}: ${r.title}`);
    }
    if (!isVacancyActive(r)) {
      badUrls++;
      console.log(`[Inactive remaining] ${r.id}: ${r.title} (${r.source_url})`);
    }
  }

  console.log(`Вакансий с некорректным форматом зарплаты: ${badSalaries}`);
  console.log(`Вакансий со сломанными / generic поисковыми URL: ${badUrls}`);
  console.log(`Не-IT / нецелевых вакансий: ${nonIT}`);
  console.log('======================================================================');

  if (badSalaries === 0 && badUrls === 0 && nonIT === 0) {
    console.log('✅ БАЗА ДАННЫХ SUPABASE ПОЛНОСТЬЮ ЧИСТА И СООТВЕТСТВУЕТ ВСЕМ ТРЕБОВАНИЯМ!');
  } else {
    console.error('❌ ОБНАРУЖЕНЫ ДЕФЕКТЫ В БАЗЕ ДАННЫХ!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Непредвиденная ошибка скрипта:', err);
  process.exit(1);
});
