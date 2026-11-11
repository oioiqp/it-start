import fs from 'node:fs';
const badPatterns = [
  '20805',
  '20808',
  'backend-csharp',
  'qa-engineer',
  'web-developer',
  'devops-engineer',
  'java-developer',
  'qa-automation'
];
const files = [
  'src/data/internships.ts',
  'src/data/channels.ts',
  'src/lib/vacancyUrl.ts',
  'bot/bot.mjs',
  'src/__tests__/app.test.ts',
  'src/__tests__/bot_parity.test.ts',
  'src/__tests__/vacancy_quality.test.ts'
];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const b of badPatterns) {
    if (text.includes(b)) {
      console.log('Found pattern ' + b + ' in ' + f);
    }
  }
}
