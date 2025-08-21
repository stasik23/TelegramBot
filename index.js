const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const app = express();

// Manual CORS configuration (no additional package needed)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ЧТОБЫ ЗАПУСТИТЬ БОТА, ВЫПОЛНИТЕ КОМАНДУ: node index.js

// Конфигурация Telegram бота - ИСПРАВЛЕНО!
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8197277279:AAEDKvDGgvREqF73VKBKnIOGUM8BAUaRPxg";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "1053198981"; // Ваш chat ID для получения сообщений

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const chats = {};

// Настройки игры
const gameOptions = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{ text: '1', callback_data: '1' }, { text: '2', callback_data: '2' }, { text: '3', callback_data: '3' }],
            [{ text: '4', callback_data: '4' }, { text: '5', callback_data: '5' }, { text: '6', callback_data: '6' }],
            [{ text: '7', callback_data: '7' }, { text: '8', callback_data: '8' }, { text: '9', callback_data: '9' }],
            [{ text: '0', callback_data: '0' }],
        ],
    }),
};

// Запуск бота
const startBot = async () => {
    console.log('Starting Telegram bot...');
    
    // Установка команд бота
    bot.setMyCommands([
        { command: '/start', description: 'Start the bot' },
        { command: '/help', description: 'Show help message' },
        { command: '/aboutme', description: 'About you' },
        { command: '/rules', description: 'Show rules' },
        { command: '/game', description: 'Play a game' },
    ]).then(() => console.log('Commands set successfully!'))
        .catch(error => console.error('Error setting commands:', error));

    // Обработка сообщений
    bot.on('message', async (msg) => {
        const text = msg.text;
        const chatId = msg.chat.id;
        const welcomeMessage = `Welcome to the bot! Use /help to see available commands.`;

        if (text === "/myid") {
            const chatId = msg.chat.id;
            bot.sendMessage(chatId, `Ваш chatId: ${chatId}`);
        }

        if (msg.sticker) {
            console.log('Sticker Info:', msg.sticker);
            bot.sendMessage(chatId, `file_id: ${msg.sticker.file_id}`);
        }

        if (text === '/start') {
            await bot.sendSticker(chatId, 'CAACAgIAAxkBAAOGaAJ7JHtON8EWmbzInaAsnPo-h2IAAutSAAIU7OBJ--rZqtZ7UTs2BA');
            return bot.sendMessage(chatId, welcomeMessage);
        }

        if (text === '/help') {
            const helpMessage = `Available commands:
                \n/start - Start the bot
                \n/help - Show this help message
                \n/aboutme - About the bot
                \n/rules - Show rules
                \n/game - Play a game`;
            await bot.sendSticker(chatId, 'CAACAgIAAxkBAAN9aAJ6yZy2KO-f-rO1pGJyLXov-V8AAodLAAKvwNhJDEzeHqBLIlQ2BA');
            return bot.sendMessage(chatId, helpMessage);
        }

        if (text === '/aboutme') {
            return bot.getUserProfilePhotos(chatId).then((photos) => {
                if (photos.total_count > 0) {
                    const photoId = photos.photos[0][0].file_id;
                    bot.sendPhoto(chatId, photoId, { caption: 'Here is your profile photo!' });
                } else {
                    console.log('No profile photos found.');
                }
            });
        }

        if (text === '/rules') {
            const rulesMessage = `
                1. Be respectful to others.
                \n2. No spamming.
                \n3. Follow the bot's commands.`;
            await bot.sendSticker(chatId, 'CAACAgIAAxkBAAOAaAJ63fg4atpXiNg_Sr7O8AyAeW4AAtxMAAK5T9hJjFB3jR_Lc8c2BA');
            return bot.sendMessage(chatId, rulesMessage);
        }

        if (text === "/game") {
            await bot.sendMessage(chatId, "Yeah! Let's play a game!");
            await bot.sendSticker(chatId, 'CAACAgIAAxkBAANuaAJ4Rg89QCWxauJNsiK5Tr9GZ9sAAi5gAAJt9tlJxDA6B1NeRVU2BA');

            const secretNumber = Math.floor(Math.random() * 10);
            chats[chatId] = secretNumber;

            return bot.sendMessage(chatId, "🤫I've picked a number between 1 and 10! Try to guess it.", gameOptions);
        }
    });

    // Обработка callback-ов от игры
    bot.on('callback_query', async msg => {
        const data = msg.data;
        const chatId = msg.message.chat.id;

        if (data === chats[chatId].toString()) {
            return await bot.sendMessage(chatId, `🎉 Congratulations! You guessed the number ${data}!`);
        } else {
            return await bot.sendMessage(chatId, `❌ Wrong guess! Try again.\nThe secret number was: ${chats[chatId]}`);
        }
    });
};

// Обработка веб-форм - УЛУЧШЕНО!
app.post('/process-form', async (req, res) => {
    console.log('Received form data:', req.body);
    
    try {
        const formData = req.body;
        let messageContent = '';

        // Delaem soobshenie iz polya formy
        for (const [key, value] of Object.entries(formData)) {
            if (value !== undefined && value !== null) {
                const stringValue = String(value).trim();
                if (stringValue !== '' && stringValue !== 'Не вказано' && stringValue !== 'Не обрано') {
                    messageContent += `<b>${key}</b>: ${stringValue}\n`;
                }
            }
        }

        if (messageContent) {
            const fullMessage = `🔔 <b>Нова заявка з сайту!</b>\n\n${messageContent}`;

            await bot.sendMessage(TELEGRAM_CHAT_ID, fullMessage, {
                parse_mode: 'HTML'
            });

            console.log('Message sent to Telegram successfully');

            return res.status(200).json({
                success: true,
                message: 'Form submitted successfully'
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'No valid form data received'
            });
        }
    } catch (error) {
        console.error('Error processing form:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startBot();
});