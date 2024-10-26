const TelegramBot = require('node-telegram-bot-api');

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with the token you received from BotFather
const token = '7323849851:AAFV3onhUFo8esiB-e8r4YVgwnYKldw-D5U';
const bot = new TelegramBot(token, {polling: true});

// Массив с номерами телефонов, зарегистрированных в системе
const registeredPhoneNumbers = ['+77471117328', '+0987654321']; // добавьте сюда номера в формате +КОД_СТРАНЫ
const regions = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Нижний Новгород'];
const roles = ['Тренер', 'Игрок'];
const genders = ['Мужской', 'Женский'];
const ntrpLevels = [
    "1.0 - Начинающий: совсем новый игрок",
    "1.5 - Новичок: знает основные правила, но не имеет опыта игры",
    "2.0 - Новичок-средний: может отбивать мяч, но ещё с трудом попадает в цель",
    "2.5 - Начинающий-средний: есть контроль удара, но мало стабильности",
    "3.0 - Средний: уверенные удары, но частые ошибки при игре под давлением",
    "3.5 - Средний-сильный: больше контроля и точности, но слабый темп",
    "4.0 - Уверенный: стабильные удары и контроль скорости, но ошибки при сложных ситуациях",
    "4.5 - Уверенный-сильный: хорошая техника и тактика, умеет играть под давлением",
    "5.0 - Полу-профессионал: высокий уровень игры, много опыта на турнирах",
    "5.5 - Профессионал: конкурентный уровень с отличными навыками",
    "6.0 - Высокий профессиональный уровень: участвует в национальных турнирах",
    "6.5 - Национальный профессионал: имеет рейтинг и участвует в международных турнирах",
    "7.0 - Мировой класс: игрок профессионального тура"
];


// Устанавливаем описание бота
bot.setMyDescription("Этот бот поможет вам найти теннисного партнёра или тренера, купить или продать теннисное оборудование.")
    .then(() => console.log('Описание бота установлено'))
    .catch(err => console.error('Ошибка при установке описания:', err));

// Set the list of commands
bot.setMyCommands([
    {command: '/start', description: 'Start interacting with the bot'},
    {command: '/findpartner', description: 'Find a tennis partner'},
    {command: '/findcoach', description: 'Find a tennis coach'},
    {command: '/creategame', description: 'Create a tennis game'},
    {command: '/info', description: 'Info about me'},
]).then(() => {
    console.log('Commands set successfully');
}).catch(err => {
    console.error('Error setting commands:', err);
});

const userStates = {}; // Store user states

// Define command handlers
// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Привет! Я помогу вам найти партнёров и тренеров по теннису, а также помочь с покупкой и продажей оборудования. Вот что я могу сделать:\n\n" +
        "/findpartner - найти партнёра по теннису\n" +
        "/findcoach - найти тренера по теннису\n" +
        "/buyequipment - купить теннисное оборудование\n" +
        "/sellequipment - продать теннисное оборудование\n" +
        "/info - информация о вашем номере\n\n" +
        "Начните с одной из команд или просто спросите, если нужна помощь!");
});


bot.onText(/\/findpartner/, (msg) => {
    if (msg && msg.chat && msg.chat.id) {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, "Пожалуйста, поделитесь вашим номером:", {
            reply_markup: {
                keyboard: [
                    [{text: "Поделитесь моим номером телефона", request_contact: true}],
                ],
                one_time_keyboard: true,
            },
        });
    } else {
        console.error('Received a message without chat information');
    }
});

bot.onText(/\/info/, async (msg) => {
    if (msg && msg.chat && msg.chat.id) {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, `Ваш номер ${userStates.phoneNumber}`)
        await bot.sendMessage(chatId, `Ваш регион ${userStates.region}`)
        await bot.sendMessage(chatId, `Ваша роль ${userStates.role}`)
        await bot.sendMessage(chatId, `Ваш пол ${userStates.gender}`)
    }
})

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
                bot.sendMessage(chatId, "Пожалуйста, поделитесь своим номером телефона:", {
                    reply_markup: {
                        keyboard: [
                            [{text: "Поделитесь моим номером телефона", request_contact: true}],
                        ],
                        one_time_keyboard: true
                    }
                });
            } else if (userStates[chatId] === 'finding_coach') {
                bot.sendMessage(chatId, `Searching for tennis coaches in ${city}...`);
                bot.sendMessage(chatId, "Пожалуйста, поделитесь своим номером телефона:", {
                    reply_markup: {
                        keyboard: [
                            [{text: "Поделитесь моим номером телефона", request_contact: true}]
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
bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const phoneNumber = msg.contact.phone_number;
    userStates.phoneNumber = phoneNumber;
    // Сохраняем номер телефона в состоянии пользователя
    userStates[chatId] = {state: 'awaiting_phone', phoneNumber: phoneNumber};

    // Проверяем, есть ли номер в массиве
    if (registeredPhoneNumbers.includes(phoneNumber)) {
        await bot.sendMessage(chatId, "Ваш номер найден в системе. Поиск партнера начат.");
        // Здесь можно добавить дальнейшую логику для поиска партнера
    } else {
        await bot.sendMessage(chatId, "Ваш номер не был найден в нашей системе, пожалуйста, пройдите небольшую регистрацию.");
        // await bot.sendMessage(chatId, `Ваш номер: ${phoneNumber}`);

        // Устанавливаем состояние выбора региона
        userStates[chatId].state = 'choosing_region';

        // Отправка списка регионов на выбор
        await bot.sendMessage(chatId, "Пожалуйста, выберите свой регион:", {
            reply_markup: {
                keyboard: regions.map(region => [{text: region}]),
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    }
});

// Обработка выбранного региона
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userState = userStates[chatId];

    // Если пользователь находится на этапе выбора региона
    if (userState && userState.state === 'choosing_region' && regions.includes(text)) {
        const phoneNumber = userState.phoneNumber; // Получаем номер телефона
        await bot.sendMessage(chatId, `Вы выбрали регион: ${text}`);
        userStates.region = text;
        // Запрашиваем выбор роли
        await bot.sendMessage(chatId, "Пожалуйста, выберите вашу роль:", {
            reply_markup: {
                keyboard: roles.map(region => [{text: region}]),
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });

        // Устанавливаем состояние для выбора роли
        userStates[chatId].state = 'choosing_role';
    } else if (userState && userState.state === 'choosing_role' && (text === 'Тренер' || text === 'Игрок')) {
        // Обработка выбора роли
        await bot.sendMessage(chatId, `Вы выбрали роль: ${text}.`);
        userStates.role = text;

        // Запрашиваем выбор пола
        await bot.sendMessage(chatId, `Пожалуйста, выберите ваш пол:`, {
            reply_markup: {
                keyboard: genders.map(region => [{text: region}]),
                one_time_keyboard: true,
                resize_keyboard: true
            }
        })
        userStates[chatId].state = 'choosing_gender';
    } else if (userState && userState.state === 'choosing_gender' && (text === 'Мужской' || text === 'Женский')) {
        await bot.sendMessage(chatId, `Вы выбрали пол: ${text}.`);
        userStates.gender = text;
        // Сбрасываем состояние пользователя после завершения регистрации
        // userStates[chatId] = null;
        await bot.sendMessage(chatId, "Пожалуйста, выберите ваш уровень:", {
            reply_markup: {
                keyboard: ntrpLevels.map(level => [{text: level}]),
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });

        // Устанавливаем состояние для выбора роли
        userStates[chatId].state = 'choosing_level';
    } else if (userState && userState.state === 'choosing_level' && ntrpLevels.includes(text)) {
        await bot.sendMessage(chatId, `Вы выбрали уровень: ${text}. Спасибо за регистрацию!`);
        userStates.level = text;
        // Сбрасываем состояние пользователя после завершения регистрации
        userStates[chatId] = null;
    }
});