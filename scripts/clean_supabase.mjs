import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pmgsymacvhzsixbpndsn.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ3N5bWFjdmh6c2l4YnBuZHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDA1OTEsImV4cCI6MjEwNzYxNjU5MX0.J3LSRV4pYTogH52y1maMV8NZ1J9s72WU2ydtyQhWWr4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isStrictVacancyPost(title = '', text = '') {
  const combined = (title + ' ' + text).toLowerCase();

  const stopWords = [
    'девушки в', 'девушек в',
    'подкаст', 'podcast',
    'опрос', 'голосован', 'голосуйте',
    'вебинар', 'митап', 'meetup', 'круглый стол',
    'поздравл', 'с 8 марта', 'с новым годом', 'с праздником',
    'итоги года', 'розыгрыш', 'дарим', 'мерч', 'футболк',
    'статья на хабр', 'vc.ru', 'habr.com',
    'какая ide', 'какую ide',
    'сегодня важный день', 'нужно только рассказать',
    'где-то ходит один', 'отменяет плату',
    'видеокреатор', 'crm-маркетолог', 'менеджер по продажам',
    'smm', 'смм', 'конкурс школьниц', 'школьниц', 'авиация начинается'
  ];

  for (const stop of stopWords) {
    if (combined.includes(stop)) {
      return false;
    }
  }

  const roleKeywords = [
    'стаж', 'стажировк', 'intern', 'trainee',
    'junior', 'джуниор', 'джун',
    'открытая школа', 'школа разработк', 'контур.старт', 'ozon camp', 'sberseasons', 'авито старт'
  ];
  if (!roleKeywords.some(k => combined.includes(k))) return false;

  const jobStructureKeywords = [
    'ищем', 'ваканси', 'отклик', 'подать заявку', 'резюме',
    'требования', 'требован', 'задачи', 'обязанности', 'мы ждем',
    'опыт', 'стек', 'стек:', 'локация', 'формат'
  ];
  if (!jobStructureKeywords.some(k => combined.includes(k))) return false;

  const techKeywords = [
    'разработчик', 'developer', 'инженер', 'engineer',
    'программист', 'тестиров', 'qa', 'devops', 'sre',
    'frontend', 'backend', 'fullstack',
    'python', 'java', 'c#', '.net', 'golang', 'go', 'react', 'vue', 'angular',
    'javascript', 'typescript', 'sql', 'postgresql', 'docker', 'kubernetes',
    'android', 'ios', 'kotlin', 'swift', 'data science', 'ml', 'machine learning'
  ];
  if (!techKeywords.some(k => combined.includes(k))) return false;

  return true;
}

async function run() {
  const { data, error } = await supabase.from('internships').select('*');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }
  console.log(`Initial items in Supabase: ${data.length}`);

  const toDelete = [];
  const toUpdate = [];

  for (const row of data) {
    // 1. Delete test artifacts
    if (row.id.startsWith('test-new-') || row.company === 'Тестовая Компания') {
      toDelete.push(row.id);
      continue;
    }

    // 2. Delete posts failing strict vacancy validator if they come from tg- or have stop words
    if (row.id.startsWith('tg-')) {
      const isVac = isStrictVacancyPost(row.title, row.description || '');
      if (!isVac) {
        toDelete.push(row.id);
        continue;
      }
    }

    // 3. Delete non-IT aggregator posts like SMM / CRM / Sales
    const titleLower = (row.title || '').toLowerCase();
    if (
      titleLower.includes('crm-маркетолог') ||
      titleLower.includes('менеджер по продажам') ||
      titleLower.includes('видеокреатор') ||
      titleLower.includes('smm') ||
      titleLower.includes('девушки в ит') ||
      titleLower.includes('какая ide') ||
      titleLower.includes('сегодня важный день') ||
      titleLower.includes('нужно только рассказать') ||
      titleLower.includes('авиация начинается')
    ) {
      toDelete.push(row.id);
      continue;
    }

    // 4. Update broken / generic URLs to official company portals
    let needsUpdate = false;
    let newSourceUrl = row.source_url;
    let newSourceName = row.source_name;

    const companyLower = (row.company || '').toLowerCase();

    // Check Directum
    if (companyLower.includes('directum') || companyLower.includes('директ')) {
      if (!newSourceUrl || newSourceUrl === 'https://career.directum.ru/' || newSourceUrl === 'https://career.directum.ru' || newSourceUrl.includes('clck.ru') || newSourceUrl.includes('vc.ru')) {
        newSourceUrl = 'https://career.directum.ru/vacancy';
        needsUpdate = true;
      }
      if (newSourceName === '@directum_careers' || newSourceName === '@directum_career') {
        newSourceName = '@Life_in_Directum';
        needsUpdate = true;
      }
    }

    // Check Kontur
    if (companyLower.includes('контур') || companyLower.includes('kontur')) {
      if (!newSourceUrl || newSourceUrl.includes('bit.ly') || newSourceUrl.includes('timepad') || newSourceUrl === 'https://kontur.ru' || newSourceUrl === 'https://kontur.ru/') {
        newSourceUrl = 'https://kontur.ru/career/vacancies';
        needsUpdate = true;
      }
      if (newSourceName === '@kontur_career') {
        newSourceName = '@KonturTech';
        needsUpdate = true;
      }
    }

    // Check T1
    if (companyLower.includes('т1') || companyLower.includes('t1')) {
      if (!newSourceUrl || newSourceUrl.includes('bit.ly') || newSourceUrl.includes('vk.cc') || newSourceUrl.includes('digital') || newSourceUrl === 'https://career.t1.ru' || newSourceUrl === 'https://career.t1.ru/') {
        newSourceUrl = 'https://career.t1.ru/vacancies?search=стажер';
        needsUpdate = true;
      }
      if (newSourceName === '@t1_holding') {
        newSourceName = '@t1career';
        needsUpdate = true;
      }
    }

    // Check Yandex
    if (companyLower.includes('яндекс') || companyLower.includes('yandex')) {
      if (!newSourceUrl || newSourceUrl === 'https://yandex.ru/yabackend/' || newSourceUrl === 'https://yandex.ru' || newSourceUrl === 'https://yandex.ru/') {
        newSourceUrl = 'https://yandex.ru/jobs/pages/internship';
        needsUpdate = true;
      }
    }

    // Check Avito
    if (companyLower.includes('авито') || companyLower.includes('avito')) {
      if (!newSourceUrl || newSourceUrl === 'https://career.avito.com/' || newSourceUrl === 'https://career.avito.com') {
        newSourceUrl = 'https://career.avito.com/vacancies/?search=стажер';
        needsUpdate = true;
      }
    }

    // Check T-Bank
    if (companyLower.includes('т-банк') || companyLower.includes('тинькофф') || companyLower.includes('tbank')) {
      if (!newSourceUrl || newSourceUrl.includes('2w.ru') || newSourceUrl === 'https://tbank.ru' || newSourceUrl === 'https://tbank.ru/') {
        newSourceUrl = 'https://fintech.tbank.ru/start/';
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      toUpdate.push({ id: row.id, source_url: newSourceUrl, source_name: newSourceName });
    }
  }

  console.log(`Items to delete: ${toDelete.length}`);
  for (const id of toDelete) {
    const { error: delErr } = await supabase.from('internships').delete().eq('id', id);
    if (delErr) {
      console.error(`Failed to delete ${id}:`, delErr.message);
    } else {
      console.log(`Deleted: ${id}`);
    }
  }

  console.log(`Items to update: ${toUpdate.length}`);
  for (const item of toUpdate) {
    const { error: updErr } = await supabase
      .from('internships')
      .update({ source_url: item.source_url, source_name: item.source_name })
      .eq('id', item.id);
    if (updErr) {
      console.error(`Failed to update ${item.id}:`, updErr.message);
    } else {
      console.log(`Updated: ${item.id} -> ${item.source_url}`);
    }
  }

  const { data: finalData } = await supabase.from('internships').select('*');
  console.log(`Final clean items in Supabase: ${finalData.length}`);
}

run();
