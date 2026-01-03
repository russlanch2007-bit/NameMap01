const express = require('express');
const Datastore = require('nedb');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===== NEDB БАЗА ДАННЫХ =====
const db = new Datastore({ 
    filename: path.join(__dirname, 'data', 'messages.db'),
    autoload: true,
    timestampData: true 
});

// Создаём папку data если её нет
const fs = require('fs');
if (!fs.existsSync('data')) fs.mkdirSync('data');

// ===== API =====

// 1. Сохранить сообщение
app.post('/api/save-nick', (req, res) => {
    const { id, text, x, y, type = 'text' } = req.body;
    
    db.insert({ 
        _id: id,  // Используем твой NICK_... как ID
        text, x, y, type 
    }, (err, doc) => {
        if (err) {
            console.error('❌ Ошибка сохранения:', err);
            res.status(500).json({ error: err.message });
        } else {
            console.log(`✅ Сохранено: ${id}`);
            res.json({ success: true, id: doc._id });
        }
    });
});

// 2. Получить все сообщения
app.get('/api/get-all-nicks', (req, res) => {
    db.find({})
        .sort({ createdAt: 1 })
        .exec((err, docs) => {
            if (err) {
                console.error('❌ Ошибка загрузки:', err);
                res.status(500).json({ error: err.message });
            } else {
                console.log(`📥 Отправляю ${docs.length} сообщений`);
                res.json(docs);
            }
        });
});

// 3. Тестовый endpoint
app.get('/api/health', (req, res) => {
    db.count({}, (err, count) => {
        res.json({ 
            status: 'ok', 
            database: 'NeDB',
            totalMessages: count || 0,
            uptime: process.uptime()
        });
    });
});

// 4. Главная страница
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📁 База данных: NeDB (сохраняется в data/messages.db)`);
    console.log(`🌐 Сайт: https://namemap.onrender.com`);
});
