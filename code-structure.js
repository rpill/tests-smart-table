const fs = require('fs');
const path = require('path');

// Конфигурация исключений
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.nyc_output',
  '.vscode',
  '.idea',
  '.DS_Store',
  'tmp'
];

const EXCLUDE_FILES = [
  '.gitignore',
  '.env',
  '.env.local',
  '*.log',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'code-structure.js'
];

// Функция проверки, нужно ли исключить файл/директорию
function shouldExclude(name, isDirectory) {
  if (isDirectory) {
    return EXCLUDE_DIRS.includes(name);
  }

  // Проверка по шаблонам
  for (const pattern of EXCLUDE_FILES) {
    if (pattern.startsWith('*')) {
      const ext = pattern.slice(1);
      if (name.endsWith(ext)) return true;
    } else if (name === pattern) {
      return true;
    }
  }

  return false;
}

// Функция получения относительного пути
function getRelativePath(basePath, fullPath) {
  return path.relative(basePath, fullPath).replace(/\\/g, '/');
}

// Рекурсивное чтение директории
function readDirectory(dirPath, basePath, result) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = getRelativePath(basePath, fullPath);

      if (shouldExclude(entry.name, entry.isDirectory())) {
        continue;
      }

      if (entry.isDirectory()) {
        result.push({
          type: 'directory',
          path: relPath,
          name: entry.name
        });
        readDirectory(fullPath, basePath, result);
      } else {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          result.push({
            type: 'file',
            path: relPath,
            name: entry.name,
            content: content,
            size: content.length
          });
        } catch (error) {
          result.push({
            type: 'file',
            path: relPath,
            name: entry.name,
            error: `Ошибка чтения файла: ${error.message}`
          });
        }
      }
    }
  } catch (error) {
    console.error(`Ошибка чтения директории ${dirPath}: ${error.message}`);
  }
}

// Форматирование результата в читаемый вид
function formatOutput(data, basePath) {
  let output = `# Структура проекта: ${basePath}\n`;
  output += `# Сгенерировано: ${new Date().toISOString()}\n`;
  output += `# Всего файлов: ${data.filter(item => item.type === 'file').length}\n`;
  output += `# Всего директорий: ${data.filter(item => item.type === 'directory').length}\n\n`;

  // Структура дерева
  output += '## Структура директорий:\n';
  output += '```\n';

  const tree = buildTree(data);
  output += tree;
  output += '```\n\n';

  // Содержимое файлов
  output += '## Содержимое файлов:\n\n';

  data.filter(item => item.type === 'file').forEach((file, index) => {
    output += `### ${index + 1}. ${file.path}\n`;

    if (file.error) {
      output += `**Ошибка:** ${file.error}\n\n`;
    } else {
      output += `**Размер:** ${file.size} байт\n\n`;
      output += '```\n';
      output += file.content;
      output += '```\n\n';
    }
  });

  return output;
}

// Построение дерева директорий
function buildTree(data) {
  const tree = {};

  data.forEach(item => {
    const parts = item.path.split('/');
    let current = tree;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    });
  });

  return renderTree(tree, '');
}

// Рендеринг дерева в текст
function renderTree(node, prefix) {
  let result = '';
  const keys = Object.keys(node).sort();

  keys.forEach((key, index) => {
    const isLast = index === keys.length - 1;
    const newPrefix = prefix + (isLast ? '└── ' : '├── ');

    result += `${newPrefix}${key}\n`;

    if (Object.keys(node[key]).length > 0) {
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      result += renderTree(node[key], childPrefix);
    }
  });

  return result;
}

// Основная функция
function collectProjectStructure(outputFile = 'project_structure.md') {
  const basePath = process.cwd();

  console.log('Сбор структуры проекта...');
  console.log(`Базовая директория: ${basePath}`);

  const result = [];
  readDirectory(basePath, basePath, result);

  console.log(`Найдено файлов: ${result.filter(item => item.type === 'file').length}`);
  console.log(`Найдено директорий: ${result.filter(item => item.type === 'directory').length}`);

  const output = formatOutput(result, basePath);

  try {
    fs.writeFileSync(outputFile, output, 'utf-8');
    console.log(`✅ Результат сохранён в: ${outputFile}`);
    console.log(`📊 Размер файла: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} КБ`);
  } catch (error) {
    console.error(`❌ Ошибка записи файла: ${error.message}`);
  }
}

// Запуск скрипта
if (require.main === module) {
  const outputFile = process.argv[2] || 'project_structure.md';
  collectProjectStructure(outputFile);
}

module.exports = { collectProjectStructure };