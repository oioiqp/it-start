/**
 * Standalone one-shot vacancy scraper, live URL verifier & Supabase cleaner.
 * Run manually via `npm run sync` or automatically on schedule via GitHub Actions.
 */
import { scanChannelsAndSyncSupabase, invalidateInternshipsCache } from './bot.mjs';

async function main() {
  console.log('======================================================================');
  console.log('⚡ IT-Старт: Запуск парсера Telegram-каналов и сайтов + HTTP-проверки');
  console.log('======================================================================');

  invalidateInternshipsCache();
  const res = await scanChannelsAndSyncSupabase(false);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Проверено Telegram-каналов: ${res.channelsChecked}`);
  console.log(`✅ Проверено карьерных сайтов/API: ${res.websitesChecked}`);
  console.log(`✅ Спарсено кандидатов до проверки: ${res.parsedCount}`);
  console.log(`✅ Прошли живую HTTP-проверку и сохранены в Supabase: ${res.savedCount}`);
  console.log('======================================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Ошибка при синхронизации вакансий:', err);
  process.exit(1);
});
