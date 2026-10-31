import { createClient } from '@supabase/supabase-js';
import { SEED_INTERNSHIPS } from '../src/data/internships.ts';
import {
  PORTAL_FALLBACK_VACANCIES,
  formatSalary,
  resolveApplyUrl,
  isStrictVacancyPost,
} from '../bot/bot.mjs';

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
    if (!isStrictIT && row.id !== 'int-38') {
      console.log(`❌ Нецелевая / спам / не-IT вакансия к удалению: [${row.id}] ${row.company} — ${row.title}`);
      toDelete.push(row.id);
      continue;
    }

    // 3. Normalize salary & URLs
    const formattedSalary = formatSalary(row.salary);
    let title = row.title;
    let resolvedUrl = resolveApplyUrl(
      row.source_url || row.url,
      row.company,
      row.source_name,
      row.direction
    );

    // Specific corrections for historical rows
    if (row.id === 'int-38') {
      title = 'Стажёр Backend C# / .NET Developer (Directum RX)';
      resolvedUrl = 'https://career.directum.ru/vacancy/backend-csharp';
    } else if (row.id === 'bot-t1-3') {
      resolvedUrl = 'https://career.t1.ru/vacancies/qa-automation';
    } else if (row.id === 'hh-3529-138722040') {
      resolvedUrl = 'https://hh.ru/vacancy/138722040';
    }

    const format = row.format || 'Удаленно';
    const city = row.city || row.location || 'Москва / Удаленно';

    validRowsToUpdate.push({
      id: row.id,
      title,
      company: row.company,
      direction: row.direction || 'backend',
      sub_track: row.sub_track || 'python',
      format,
      city,
      salary: formattedSalary,
      source_type: row.source_type || 'portal',
      source_name: row.source_name || '@IT_start_izh_bot',
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
  console.log(`\nСинхронизация эталонных SEED (${SEED_INTERNSHIPS.length}) и PORTAL_FALLBACK (${PORTAL_FALLBACK_VACANCIES.length}) вакансий...`);
  const canonicalRows = [];

  for (const item of SEED_INTERNSHIPS) {
    canonicalRows.push({
      id: item.id,
      title: item.title,
      company: item.company,
      direction: item.directionId,
      sub_track: item.subTrackId,
      format: item.format || 'Удаленно',
      city: item.location || 'Москва / Удаленно',
      salary: formatSalary(item.salary),
      source_type: item.sourceType || 'portal',
      source_name: item.sourceChannel || '@IT_start_izh_bot',
      source_url: resolveApplyUrl(item.applyUrl, item.company, item.sourceChannel, item.directionId),
      description: item.description,
      tags: item.tags,
      published_at: item.publishedAt || new Date().toISOString(),
    });
  }

  for (const item of PORTAL_FALLBACK_VACANCIES) {
    canonicalRows.push({
      id: item.id,
      title: item.title,
      company: item.company,
      direction: item.directionId,
      sub_track: item.subTrackId,
      format: item.format || 'Удаленно',
      city: item.location || 'Москва / Удаленно',
      salary: formatSalary(item.salary),
      source_type: item.sourceType || 'portal',
      source_name: item.channel || '@IT_start_izh_bot',
      source_url: resolveApplyUrl(item.url, item.company, item.channel, item.directionId),
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
