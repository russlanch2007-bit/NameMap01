const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===== 1. ПОДКЛЮЧЕНИЕ К SUPABASE =====
// ВСТАВЬ СВОЮ СТРОКУ ПОДКЛЮЧЕНИЯ И API КЛЮЧ СЮДА
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ===== 2. API ДЛЯ СООБЩЕНИЙ =====

// 2.1. Сохранить новое сообщение (текст или арт)
app.post('/api/save-nick', async (req, res) => {
    try {
        const { id, text, x, y, type = 'text' } = req.body;
        
        // Вставляем данные в таблицу messages
        const { data, error } = await supabase
            .from('messages')
            .insert([
                {
                    nick_id: id,        // наш сгенерированный NICK_...
                    content: text,      // сам текст или URL картинки
                    x: x || 0,
                    y: y || 0,
                    type: type          // 'text', 'art', 'miku'
                }
            ])
            .select(); // Возвращаем созданную запись
        
        if (error) throw error;
        
        console.log(`✅ Сохранено в Supabase: ${id}`);
        res.json({ success: true, data: data[0] });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// 2.2. Получить ВСЕ сообщения
app.get('/api/get-all-nicks', async (req, res) => {
    try {
        // Получаем все записи, отсортированные по времени создания
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        console.log(`📥 Загружено из Supabase: ${data.length} сообщений`);
        res.json(data);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// 2.3. Удалить сообщение (для модерации)
app.post('/api/delete-nick', async (req, res) => {
    try {
        const { id } = req.body;
        
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('nick_id', id); // Ищем по нашему nick_id
        
        if (error) throw error;
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2.4. Обновить позицию сообщения
app.post('/api/update-position', async (req, res) => {
    try {
        const { id, x, y } = req.body;
        
        const { error } = await supabase
            .from('messages')
            .update({ x, y })
            .eq('nick_id', id);
        
        if (error) throw error;
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== 3. ТЕСТОВЫЙ ENDPOINT =====
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        database: 'Supabase PostgreSQL',
        timestamp: new Date().toISOString()
    });
});

// ===== 4. ВСЕ ОСТАЛЬНЫЕ ЗАПРОСЫ = HTML =====
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== 5. ЗАПУСК СЕРВЕРА =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 База данных: Supabase PostgreSQL`);

});
