const express = require('express');
const Datastore = require('@seald-io/nedb'); // ← ИМЕННО ЭТА БИБЛИОТЕКА
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===== ИСПРАВЛЕННАЯ NEDB =====
const db = new Datastore({ 
    filename: 'messages.db',
    autoload: true
});

// ===== ПРОСТЫЕ API =====
app.post('/api/save-nick', async (req, res) => {
    try {
        const { id, text, x, y } = req.body;
        
        // Удаляем старую запись с таким же ID
        await db.removeAsync({ _id: id }, { multi: true });
        
        // Вставляем новую
        const newDoc = await db.insertAsync({ 
            _id: id,  // Используем твой NICK_... как ID
            text, 
            x: x || 0, 
            y: y || 0,
            createdAt: new Date()
        });
        
        console.log(`✅ Сохранено: ${id}`);
        res.json({ success: true, id: newDoc._id });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/get-all-nicks', async (req, res) => {
    try {
        const docs = await db.findAsync({}).sort({ createdAt: 1 });
        console.log(`📥 Отправляю ${docs.length} сообщений`);
        res.json(docs);
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const count = await db.countAsync({});
        res.json({ 
            status: 'ok', 
            database: 'NeDB (fixed)',
            totalMessages: count,
            uptime: process.uptime()
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📁 База: messages.db (исправленная версия)`);
});
