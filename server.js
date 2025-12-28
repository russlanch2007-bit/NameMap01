// ===== СЕРВЕРНЫЙ КОД (работает в Node.js) ====
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();

// Разрешаем запросы от всех источников в production
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// В production используем порт из переменной окружения
const PORT = process.env.PORT || 3000;

// Раздаём статические файлы из текущей директории
app.use(express.static(__dirname));

// Папка для базы данных
const DB_FOLDER = path.join(__dirname, 'database');

// Создаем папку database если её нет
(async () => {
  try {
    await fs.mkdir(DB_FOLDER, { recursive: true });
    console.log('✅ Папка database создана');
  } catch (err) {
    console.log('ℹ️ Папка database уже существует');
  }
})();

// ... остальной код server.js без изменений ...

// Важно: добавь в конце перед app.listen
// Отдавай index.html для всех маршрутов
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`);
  console.log(`📁 База данных: ${DB_FOLDER}`);
  console.log(`🌍 Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});
// Отладка: проверяем все элементы
setTimeout(() => {
    const allNicks = document.querySelectorAll('.nickname');
    console.log('=== ОТЛАДКА ===');
    console.log('Всего ников на странице:', allNicks.length);
    allNicks.forEach((nick, i) => {
        console.log(`${i}: ${nick.textContent} at ${nick.style.left}, ${nick.style.top}`);
    });
}, 2000);
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();

// Разрешаем запросы от браузера
app.use(cors());

// Чтение JSON из запросов
app.use(express.json());

// Раздаём файлы из текущей папки
app.use(express.static('.'));

// Папка для базы данных
const DB_FOLDER = path.join(__dirname, 'database');

// 1. Сохранить ник в файл
app.post('/api/save-nick', async (req, res) => {
    console.log('📤 Получен запрос на сохранение ника');
    
    try {
        const { id, text, x, y } = req.body;
        
        // Проверяем данные
        if (!id || !text) {
            return res.status(400).json({ error: 'Нет id или текста' });
        }
        
        // Создаём объект для сохранения
        const nickData = {
            id: id,
            text: text,
            x: x || 0,
            y: y || 0,
            timestamp: new Date().toISOString(),
            savedAt: new Date().toLocaleString('ru-RU')
        };
        
        // Создаём папку если её нет
        await fs.mkdir(DB_FOLDER, { recursive: true });
        
        // Имя файла: ID.json
        const filename = path.join(DB_FOLDER, `${id}.json`);
        
        // Записываем в файл
        await fs.writeFile(filename, JSON.stringify(nickData, null, 2));
        
        console.log(`✅ Файл сохранён: ${id}.json`);
        
        res.json({ 
            success: true, 
            message: `Файл ${id}.json создан`,
            path: filename 
        });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Получить все ники
app.get('/api/get-all-nicks', async (req, res) => {
    console.log('📥 Запрос на получение всех ников');
    
    try {
        // Проверяем существует ли папка
        try {
            await fs.access(DB_FOLDER);
        } catch {
            // Папки нет - создаём пустой массив
            console.log('Папки database нет, создаём...');
            await fs.mkdir(DB_FOLDER, { recursive: true });
            return res.json([]);
        }
        
        // Читаем файлы из папки
        const files = await fs.readdir(DB_FOLDER);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        console.log(`Найдено ${jsonFiles.length} .json файлов`);
        
        const allNicks = [];
        
        // Читаем каждый файл
        for (const file of jsonFiles) {
            try {
                const content = await fs.readFile(path.join(DB_FOLDER, file), 'utf8');
                const data = JSON.parse(content);
                allNicks.push(data);
            } catch (err) {
                console.error(`Ошибка чтения файла ${file}:`, err.message);
            }
        }
        
        console.log(`Отправляю ${allNicks.length} ников`);
        res.json(allNicks);
        
    } catch (error) {
        console.error('❌ Ошибка получения ников:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Тестовый endpoint
// Добавьте ПЕРЕД app.listen в server.js:

// 5. Обновить позицию ника
app.post('/api/update-nick-position', async (req, res) => {
    console.log('📝 Обновление позиции ника');
    
    try {
        const { id, x, y } = req.body;
        
        if (!id) {
            return res.status(400).json({ error: 'Нет ID' });
        }
        
        const filename = path.join(DB_FOLDER, `${id}.json`);
        
        // Проверяем существует ли файл
        try {
            await fs.access(filename);
        } catch {
            return res.status(404).json({ error: 'Файл не найден' });
        }
        
        // Читаем текущие данные
        const content = await fs.readFile(filename, 'utf8');
        const data = JSON.parse(content);
        
        // Обновляем позицию
        data.x = x || data.x;
        data.y = y || data.y;
        data.updatedAt = new Date().toISOString();
        
        // Сохраняем обратно
        await fs.writeFile(filename, JSON.stringify(data, null, 2));
        
        console.log(`✅ Позиция обновлена: ${id}`);
        res.json({ success: true, message: 'Позиция обновлена' });
        
    } catch (error) {
        console.error('❌ Ошибка обновления:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 СЕРВЕР ЗАПУЩЕН`);
    console.log(`👉 Сайт: http://localhost:${PORT}`);
    console.log(`📁 База данных: ${DB_FOLDER}`);
    console.log('');
    console.log(`📡 Доступные API:`);
    console.log(`   GET  http://localhost:${PORT}/api/test`);
    console.log(`   GET  http://localhost:${PORT}/api/get-all-nicks`);
    console.log(`   POST http://localhost:${PORT}/api/save-nick`);
    console.log('='.repeat(50));
});