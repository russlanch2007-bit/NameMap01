const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();

// Логирование всех запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json());

// Раздаём статические файлы
app.use(express.static(__dirname));

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

// 1. Сохранить ник в файл
app.post('/api/save-nick', async (req, res) => {
    console.log('📤 Получен запрос на сохранение ника');
    
    try {
        const { id, text, x, y } = req.body;
        
        if (!id || !text) {
            return res.status(400).json({ error: 'Нет id или текста' });
        }
        
        const nickData = {
            id: id,
            text: text,
            x: x || 0,
            y: y || 0,
            timestamp: new Date().toISOString(),
            savedAt: new Date().toLocaleString('ru-RU')
        };
        
        const filename = path.join(DB_FOLDER, `${id}.json`);
        await fs.writeFile(filename, JSON.stringify(nickData, null, 2));
        
        console.log(`✅ Файл сохранён: ${id}.json`);
        res.json({ success: true, message: `Файл ${id}.json создан` });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Получить все ники
app.get('/api/get-all-nicks', async (req, res) => {
    console.log('📥 Запрос на получение всех ников');
    
    try {
        try {
            await fs.access(DB_FOLDER);
        } catch {
            await fs.mkdir(DB_FOLDER, { recursive: true });
            return res.json([]);
        }
        
        const files = await fs.readdir(DB_FOLDER);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        console.log(`Найдено ${jsonFiles.length} .json файлов`);
        
        const allNicks = [];
        
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

// 3. Обновить позицию ника
app.post('/api/update-nick-position', async (req, res) => {
    console.log('📝 Обновление позиции ника');
    
    try {
        const { id, x, y } = req.body;
        
        if (!id) {
            return res.status(400).json({ error: 'Нет ID' });
        }
        
        const filename = path.join(DB_FOLDER, `${id}.json`);
        
        try {
            await fs.access(filename);
        } catch {
            return res.status(404).json({ error: 'Файл не найден' });
        }
        
        const content = await fs.readFile(filename, 'utf8');
        const data = JSON.parse(content);
        
        data.x = x || data.x;
        data.y = y || data.y;
        data.updatedAt = new Date().toISOString();
        
        await fs.writeFile(filename, JSON.stringify(data, null, 2));
        
        console.log(`✅ Позиция обновлена: ${id}`);
        res.json({ success: true, message: 'Позиция обновлена' });
        
    } catch (error) {
        console.error('❌ Ошибка обновления:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Тестовый endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Сервер работает!', 
        time: new Date().toISOString(),
        project: 'Name Map'
    });
});

// 5. Проверка здоровья сервера
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// 6. Главная страница
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`🚀 СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`);
    console.log(`📁 База данных: ${DB_FOLDER}`);
    console.log(`🌍 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(50));
});

// Обработка ошибок
process.on('uncaughtException', (err) => {
    console.error('❌ НЕОБРАБОТАННАЯ ОШИБКА:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ НЕОБРАБОТАННЫЙ REJECTION:', reason);
});
