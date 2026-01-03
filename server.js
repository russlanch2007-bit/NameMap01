const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' })); // Для картинок
app.use(express.static('public'));

// Папки для файлов
const UPLOADS_DIR = 'uploads';
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(`${UPLOADS_DIR}/images`)) fs.mkdirSync(`${UPLOADS_DIR}/images`);
if (!fs.existsSync(`${UPLOADS_DIR}/texts`)) fs.mkdirSync(`${UPLOADS_DIR}/texts`);

// Файл базы данных (просто JSON)
const DB_FILE = 'messages.json';

// ========== ВСЕГО 4 МЕТОДА ==========

// 1. Сохранить сообщение
app.post('/api/save', (req, res) => {
    try {
        const msg = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            text: req.body.text || '',
            x: Math.floor(Math.random() * 80) + 10, // Случайные координаты
            y: Math.floor(Math.random() * 80) + 10,
            color: req.body.color || `hsl(${Math.random() * 360}, 70%, 60%)`,
            size: req.body.size || Math.floor(Math.random() * 20) + 14,
            type: req.body.type || 'text',
            time: new Date().toLocaleString(),
            secret: Math.random().toString(36).substr(2, 9) // Секретный код для редактирования
        };

        // Если есть картинка
        if (req.body.image) {
            const imageName = `img_${msg.id}.png`;
            const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(`${UPLOADS_DIR}/images/${imageName}`, base64Data, 'base64');
            msg.image = `/uploads/images/${imageName}`;
        }

        // Если есть текстовый файл
        if (req.body.fileText) {
            const fileName = `file_${msg.id}.txt`;
            fs.writeFileSync(`${UPLOADS_DIR}/texts/${fileName}`, req.body.fileText);
            msg.file = `/uploads/texts/${fileName}`;
            msg.fileName = req.body.fileName || 'file.txt';
        }

        // Сохраняем в JSON
        let messages = [];
        if (fs.existsSync(DB_FILE)) {
            messages = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
        messages.push(msg);
        fs.writeFileSync(DB_FILE, JSON.stringify(messages, null, 2));

        console.log(`🎨 Новое сообщение: ${msg.id}`);
        res.json({ success: true, id: msg.id, secret: msg.secret });
    } catch (err) {
        console.error('❌ Ошибка:', err);
        res.json({ success: false, error: err.message });
    }
});

// 2. Найти сообщение по ID
app.get('/api/find/:id', (req, res) => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return res.json({ success: false, error: 'База пуста' });
        }
        
        const messages = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const msg = messages.find(m => m.id === req.params.id);
        
        if (msg) {
            res.json({ success: true, message: msg });
        } else {
            res.json({ success: false, error: 'Сообщение не найдено' });
        }
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// 3. Получить все сообщения (для карты)
app.get('/api/all', (req, res) => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return res.json([]);
        }
        
        const messages = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        // Отправляем только публичные данные
        const publicMessages = messages.map(m => ({
            id: m.id,
            x: m.x,
            y: m.y,
            color: m.color,
            size: m.size,
            type: m.type,
            time: m.time
        }));
        
        res.json(publicMessages);
    } catch (err) {
        res.json([]);
    }
});

// 4. Поиск по координатам (ближайшие сообщения)
app.get('/api/nearby', (req, res) => {
    try {
        const x = parseFloat(req.query.x);
        const y = parseFloat(req.query.y);
        const radius = parseFloat(req.query.radius) || 5;
        
        if (!fs.existsSync(DB_FILE)) {
            return res.json([]);
        }
        
        const messages = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const nearby = messages.filter(m => {
            const distance = Math.sqrt(Math.pow(m.x - x, 2) + Math.pow(m.y - y, 2));
            return distance < radius;
        });
        
        res.json(nearby.slice(0, 10)); // Ограничиваем результат
    } catch (err) {
        res.json([]);
    }
});

// Раздача файлов из uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Запуск
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('====================================');
    console.log(`🌌 Сервер запущен: http://localhost:${PORT}`);
    console.log(`📁 Хранилище: ${UPLOADS_DIR}/`);
    console.log('====================================');
});
