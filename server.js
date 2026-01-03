const express = require('express');
const Datastore = require('@seald-io/nedb'); // ИЛИ используйте 'nedb' если не нужна Promise-версия
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===== CORRECT NeDB INITIALIZATION =====
const db = new Datastore({ 
    filename: process.env.NODE_ENV === 'production' 
        ? '/tmp/messages.db' // Для Render.com используем /tmp
        : 'messages.db',
    autoload: true,
    timestampData: true // Автоматически добавляет createdAt и updatedAt
});

// ===== PROMISE WRAPPERS (если библиотека не поддерживает промисы) =====
const dbAsync = {
    insert: (doc) => new Promise((resolve, reject) => {
        db.insert(doc, (err, newDoc) => {
            if (err) reject(err);
            else resolve(newDoc);
        });
    }),
    
    find: (query = {}, sort = {}) => new Promise((resolve, reject) => {
        let cursor = db.find(query);
        if (sort) cursor = cursor.sort(sort);
        cursor.exec((err, docs) => {
            if (err) reject(err);
            else resolve(docs);
        });
    }),
    
    findOne: (query) => new Promise((resolve, reject) => {
        db.findOne(query, (err, doc) => {
            if (err) reject(err);
            else resolve(doc);
        });
    }),
    
    update: (query, update, options = {}) => new Promise((resolve, reject) => {
        db.update(query, update, options, (err, numReplaced) => {
            if (err) reject(err);
            else resolve(numReplaced);
        });
    }),
    
    remove: (query, options = {}) => new Promise((resolve, reject) => {
        db.remove(query, options, (err, numRemoved) => {
            if (err) reject(err);
            else resolve(numRemoved);
        });
    }),
    
    count: (query = {}) => new Promise((resolve, reject) => {
        db.count(query, (err, count) => {
            if (err) reject(err);
            else resolve(count);
        });
    })
};

// ===== API ENDPOINTS =====
app.post('/api/save-nick', async (req, res) => {
    try {
        const { id, text, x, y } = req.body;
        
        if (!id || !text) {
            return res.status(400).json({ 
                error: 'ID и текст обязательны' 
            });
        }
        
        // Создаем или обновляем запись
        const existing = await dbAsync.findOne({ _id: id });
        
        if (existing) {
            // Обновляем существующую запись
            await dbAsync.update(
                { _id: id },
                { 
                    $set: { 
                        text, 
                        x: x || existing.x || 0, 
                        y: y || existing.y || 0,
                        updatedAt: new Date()
                    }
                },
                { returnUpdatedDocs: false }
            );
            console.log(`✏️ Обновлено: ${id}`);
        } else {
            // Создаем новую запись
            await dbAsync.insert({ 
                _id: id,
                text, 
                x: x || 0, 
                y: y || 0
            });
            console.log(`✅ Создано: ${id}`);
        }
        
        res.json({ 
            success: true, 
            id,
            message: existing ? 'Обновлено' : 'Создано'
        });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера: ' + error.message 
        });
    }
});

app.get('/api/get-all-nicks', async (req, res) => {
    try {
        const docs = await dbAsync.find({});
        
        // Преобразуем документы для клиента
        const formatted = docs.map(doc => ({
            id: doc._id,
            text: doc.text,
            x: doc.x || 0,
            y: doc.y || 0,
            createdAt: doc.createdAt || doc.timestamp,
            updatedAt: doc.updatedAt
        }));
        
        console.log(`📥 Отправляю ${formatted.length} сообщений`);
        res.json({
            success: true,
            count: formatted.length,
            data: formatted
        });
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка загрузки данных' 
        });
    }
});

// Удалить конкретный ник
app.delete('/api/delete-nick/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await dbAsync.remove({ _id: id }, {});
        
        if (result === 0) {
            return res.status(404).json({
                success: false,
                error: 'Запись не найдена'
            });
        }
        
        console.log(`🗑️ Удалено: ${id}`);
        res.json({
            success: true,
            message: 'Запись удалена'
        });
        
    } catch (error) {
        console.error('❌ Ошибка удаления:', error.message);
        res.status(500).json({
            success: false,
            error: 'Ошибка удаления'
        });
    }
});

// Очистить все записи
app.delete('/api/clear-all', async (req, res) => {
    try {
        const result = await dbAsync.remove({}, { multi: true });
        console.log(`🧹 Очищено ${result} записей`);
        
        res.json({
            success: true,
            count: result,
            message: 'Все записи удалены'
        });
        
    } catch (error) {
        console.error('❌ Ошибка очистки:', error.message);
        res.status(500).json({
            success: false,
            error: 'Ошибка очистки'
        });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const count = await dbAsync.count({});
        const sample = await dbAsync.find({}).limit(1);
        
        res.json({ 
            status: 'ok', 
            database: 'NeDB',
            totalMessages: count,
            sample: sample.length > 0 ? sample[0]._id : 'none',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error',
            error: error.message 
        });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const allData = await dbAsync.find({});
        
        const stats = {
            total: allData.length,
            byDate: {},
            latest: allData
                .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
                .slice(0, 5)
                .map(doc => ({
                    id: doc._id,
                    text: doc.text?.substring(0, 50) + (doc.text?.length > 50 ? '...' : ''),
                    date: doc.createdAt || doc.timestamp
                }))
        };
        
        // Группировка по дате
        allData.forEach(doc => {
            const date = new Date(doc.createdAt || doc.timestamp).toLocaleDateString();
            stats.byDate[date] = (stats.byDate[date] || 0) + 1;
        });
        
        res.json({
            success: true,
            ...stats
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Необработанная ошибка:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📁 База: ${process.env.NODE_ENV === 'production' ? '/tmp/messages.db' : 'messages.db'}`);
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Получен сигнал завершения');
    db.persistence.compactDatafile();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Прерывание сервера');
    db.persistence.compactDatafile();
    process.exit(0);
});
