import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const outputFile = path.join(projectRoot, 'FULL_PROJECT_CODEBASE.md');

// Directories and files to exclude
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', '.system_generated', 'coverage']);
const EXCLUDE_FILES = new Set([
  'package-lock.json',
  'FULL_PROJECT_CODEBASE.md',
  'scripts/generate_full_codebase_md.mjs',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.zip', '.pdf', '.woff', '.woff2', '.ttf', '.eot'
]);

function getLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.css':
      return 'css';
    case '.html':
      return 'html';
    case '.json':
      return 'json';
    case '.md':
      return 'markdown';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.env':
    case '.example':
      return 'env';
    default:
      return 'text';
  }
}

function scanDir(dir, baseDir = '') {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(baseDir, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      results = results.concat(scanDir(fullPath, relPath));
    } else if (entry.isFile()) {
      if (EXCLUDE_FILES.has(relPath) || EXCLUDE_FILES.has(entry.name)) continue;
      // Exclude raw .env with private tokens, keep .env.example
      if (entry.name === '.env') continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) continue;
      results.push({ fullPath, relPath, name: entry.name });
    }
  }

  return results;
}

console.log('Сканирование файлов проекта...');
const files = scanDir(projectRoot);
files.sort((a, b) => a.relPath.localeCompare(b.relPath));

console.log(`Найдено ${files.length} исходных файлов.`);

let md = `# 📘 IT-Старт — Полная документация и исходный код проекта

> Документ сформирован автоматически: ${new Date().toLocaleString('ru-RU')}
> Проект: **IT-Старт (IT Start)** — Единая экосистема агрегации IT-стажировок, дорожных карт и подготовки к техническим собеседованиям.

---

## 🧭 Оглавление и карта файлов проекта

| № | Файл | Строк | Размер | Описание |
|---|---|---|---|---|
`;

// First pass: generate TOC
const fileDataList = [];
let totalLines = 0;
let totalBytes = 0;

for (let i = 0; i < files.length; i++) {
  const f = files[i];
  const content = fs.readFileSync(f.fullPath, 'utf-8');
  const lines = content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf-8');
  totalLines += lines;
  totalBytes += bytes;

  let description = '';
  if (f.relPath.startsWith('src/components/')) description = 'React-компонент пользовательского интерфейса';
  else if (f.relPath.startsWith('src/data/')) description = 'Статическая база знаний (вакансии, роадмапы, вопросы)';
  else if (f.relPath.startsWith('src/lib/')) description = 'Утилиты интеграции (Supabase, Telegram, VK, URL)';
  else if (f.relPath.startsWith('src/services/')) description = 'Сервисный слой работы с подписками и пушами';
  else if (f.relPath.startsWith('src/__tests__/')) description = 'Автоматизированные тесты Vitest';
  else if (f.relPath.startsWith('bot/')) description = 'Сервер ботов Telegram и ВКонтакте + парсер';
  else if (f.relPath.startsWith('scripts/')) description = 'Скрипты сборки, очистки базы и верификации ссылок';
  else if (f.relPath === 'src/App.tsx') description = 'Главный компонент приложения (роутинг вкладок, состояние)';
  else if (f.relPath === 'src/index.css') description = 'Глобальные стили, темы и эффект Liquid Glass';
  else if (f.relPath === 'package.json') description = 'Зависимости и npm-скрипты проекта';
  else if (f.relPath === 'vite.config.ts') description = 'Конфигурация сборщика Vite и чанков';
  else description = 'Конфигурационный или инфраструктурный файл';

  const anchor = f.relPath.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  md += `| ${i + 1} | [${f.relPath}](#${anchor}) | ${lines} | ${(bytes / 1024).toFixed(1)} КБ | ${description} |\n`;

  fileDataList.push({ ...f, content, lines, bytes, description, anchor });
}

md += `\n**Итого исходного кода:** ${files.length} файлов, ${totalLines.toLocaleString('ru-RU')} строк, ${(totalBytes / 1024 / 1024).toFixed(2)} МБ.\n\n---\n\n`;

// Second pass: append each file with full code
for (let i = 0; i < fileDataList.length; i++) {
  const f = fileDataList[i];
  const lang = getLanguage(f.name);
  md += `## <a id="${f.anchor}"></a>${i + 1}. \`${f.relPath}\`\n\n`;
  md += `- **Путь:** \`${f.relPath}\`\n`;
  md += `- **Назначение:** ${f.description}\n`;
  md += `- **Объем:** ${f.lines} строк (${(f.bytes / 1024).toFixed(1)} КБ)\n\n`;
  md += `\`\`\`${lang}\n`;
  md += f.content;
  if (!f.content.endsWith('\n')) md += '\n';
  md += `\`\`\`\n\n---\n\n`;
}

console.log('Запись файла FULL_PROJECT_CODEBASE.md...');
fs.writeFileSync(outputFile, md, 'utf-8');
console.log(`Успешно создан файл ${outputFile} объемом ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} МБ.`);
