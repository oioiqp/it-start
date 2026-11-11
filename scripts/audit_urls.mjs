import fs from 'node:fs';

const files = [
  'src/data/internships.ts',
  'src/data/channels.ts',
  'bot/bot.mjs',
  'src/lib/vacancyUrl.ts'
];

const urlRegex = /https?:\/\/[^\s'"`,<>]+/g;
const allUrls = new Set();

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const matches = text.match(urlRegex) || [];
  for (let u of matches) {
    u = u.replace(/[);,'"]+$/, '');
    if (
      u.includes('localhost') ||
      u.includes('schemas') ||
      u.includes('w3.org') ||
      u.includes('unsplash.com') ||
      u.includes('telegram.org') ||
      u.includes('onrender.com') ||
      u.includes('supabase.co') ||
      u.includes('api.telegram.org') ||
      u.includes('vk.com/api') ||
      u.includes('api.vk.com')
    ) {
      continue;
    }
    allUrls.add(u);
  }
}

console.log(`Total URLs found: ${allUrls.size}`);
for (const u of Array.from(allUrls).sort()) {
  console.log(u);
}
