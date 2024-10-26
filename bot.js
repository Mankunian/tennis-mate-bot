const TelegramBot = require('node-telegram-bot-api');

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with the token you received from BotFather
const token = '7323849851:AAFV3onhUFo8esiB-e8r4YVgwnYKldw-D5U';
const bot = new TelegramBot(token, {polling: true});

// Массив с номерами телефонов, зарегистрированных в системе
const registeredPhoneNumbers = ['+77471117328', '+0987654321']; // добавьте сюда номера в формате +КОД_СТРАНЫ
const regions = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Нижний Новгород'];
const roles = ['Coach', 'Player'];

// Set the list of commands
bot.setMyCommands([
    {command: '/start', description: 'Start interacting with the bot'},
    {command: '/findpartner', description: 'Find a tennis partner'},
    {command: '/findcoach', description: 'Find a tennis coach'},
    {command: '/creategame', description: 'Create a tennis game'},
]).then(() => {
    console.log('Commands set successfully');
}).catch(err => {
    console.error('Error setting commands:', err);
});

const userStates = {}; // Store user states

// Define command handlers
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg?.chat.id, "Welcome! Use /findpartner or /findcoach to search for a tennis partner or coach.");
});


bot.onText(/\/findpartner/, (msg) => {
    if (msg && msg.chat && msg.chat.id) {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, "Пожалуйста, поделитесь вашим номером:", {
            reply_markup: {
                keyboard: [
                    [{ text: "Share my phone number", request_contact: true }],
                ],
                one_time_keyboard: true,
            },
        });
    } else {
        console.error('Received a message without chat information');
    }
});


bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    if (!message || !message.chat || !message.chat.id) {
        console.error('Callback query message is missing chat information');
        return;
    }

    const chatId = message.chat.id;
    const city = callbackQuery.data;
    userStates.city = city;
    // Acknowledge the callback query
    bot.answerCallbackQuery(callbackQuery.id)
        .then(() => {
            bot.sendMessage(chatId, `You selected ${city} city.`);

            if (userStates[chatId] === 'finding_partner') {
                bot.sendMessage(chatId, `Searching for tennis partners in ${city}...`);
                bot.sendMessage(chatId, "Please share your phone number:", {
                    reply_markup: {
                        keyboard: [
                            [{ text: "Share my phone number", request_contact: true }],
                        ],
                        one_time_keyboard: true
                    }
                });
            }
            else if (userStates[chatId] === 'finding_coach') {
                bot.sendMessage(chatId, `Searching for tennis coaches in ${city}...`);
                bot.sendMessage(chatId, "Please share your phone number:", {
                    reply_markup: {
                        keyboard: [
                            [{text: "Share my phone number", request_contact: true}]
                        ],
                        one_time_keyboard: true
                    }
                });
            }
            // Set user state to 'awaiting_phone'
            userStates[chatId] = 'awaiting_phone';
        })
        .catch(err => {
            console.error('Error in callback query handler:', err);
        });
})



// Обработка контактов, отправленных пользователем
bot.on('contact', (msg) => {
    const chatId = msg.chat.id;
    const phoneNumber = msg.contact.phone_number;

    // Сохраняем номер телефона в состоянии пользователя
    userStates[chatId] = { state: 'awaiting_phone', phoneNumber: phoneNumber };

    // Проверяем, есть ли номер в массиве
    if (registeredPhoneNumbers.includes(phoneNumber)) {
        bot.sendMessage(chatId, "Ваш номер найден в системе. Поиск партнера начат.");
        // Здесь можно добавить дальнейшую логику для поиска партнера
    } else {
        bot.sendMessage(chatId, "Ваш номер не был найден в нашей системе, пожалуйста, пройдите небольшую регистрацию.");
        bot.sendMessage(chatId, `Ваш номер: ${phoneNumber}`);

        // Устанавливаем состояние выбора региона
        userStates[chatId].state = 'choosing_region';

        // Отправка списка регионов на выбор
        bot.sendMessage(chatId, "Пожалуйста, выберите свой регион:", {
            reply_markup: {
                keyboard: regions.map(region => [{ text: region }]),
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    }
});

// Обработка выбранного региона
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userState = userStates[chatId];

    // Если пользователь находится на этапе выбора региона
    if (userState && userState.state === 'choosing_region' && regions.includes(text)) {
        const phoneNumber = userState.phoneNumber; // Получаем номер телефона
        bot.sendMessage(chatId, `Вы выбрали регион: ${text}. Ваш номер: ${phoneNumber}.`);

        // Запрашиваем выбор роли
        bot.sendMessage(chatId, "Пожалуйста, выберите вашу роль:", {
            reply_markup: {
                keyboard: [
                    [{ text: 'Тренер' }],
                    [{ text: 'Игрок' }]
                ],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });

        // Устанавливаем состояние для выбора роли
        userStates[chatId].state = 'choosing_role';
    } else if (userState && userState.state === 'choosing_role' && (text === 'Тренер' || text === 'Игрок')) {
        // Обработка выбора роли
        const role = text; // Получаем роль
        bot.sendMessage(chatId, `Вы выбрали роль: ${role}. Спасибо за регистрацию!`);

        // Сбрасываем состояние пользователя после завершения регистрации
        userStates[chatId] = null;
    }
});