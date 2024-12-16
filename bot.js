const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const jwt = require("jsonwebtoken");
const axios = require('axios');


const token = '7323849851:AAFV3onhUFo8esiB-e8r4YVgwnYKldw-D5U';
const bot = new TelegramBot(token, {polling: true});
const MY_CHAT_ID = 289282054;
const dataFilePath = path.resolve(__dirname, './database/user_data.json');

const tennisTerms = require('./helper/tennisTerms');
const API_URI = `http://localhost:3000`;


function loadUserData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = fs.readFileSync(dataFilePath, 'utf-8');
            return JSON.parse(data);
        } else {
            return [];
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        return [];
    }
}


function saveUserData(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error saving user data:", error);
    }
}


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
    {command: '/get_avatar', description: 'Get profile avatar'},
])

bot.onText(/\/learn_terms/, async (msg) => {
    const chatId = msg.chat.id;

    const termsMessage = tennisTerms
        .slice(0, 3)
        .map(term => `*${term.term}*: ${term.definition}`)
        .join("\n\n");

    const message = `
📖 *Теннисные термины*
${termsMessage}

Чтобы увидеть больше терминов, нажмите кнопку ниже.
    `;

    await bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Просмотреть больше",
                        web_app: {url: "https://tennismate.netlify.app/terms"}
                    },
                ],
            ],
        },
    });
});

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "друг";

    const welcomeMessage = `
Добро пожаловать, ${userName}! 🎾
Наш бот поможет вам:  
- Найти партнера для игры в теннис;  
- Подобрать тренера для тренировок;  
- Найти место для игры;  
- Купить или продать теннисное оборудование.  
- Изучить теннисную терминологию.


Доступные команды:  
- /find_partner — Найти партнера  
- /find_coach — Найти тренера  
- /find_court — Найти корт  
- /buy_sell — Купить/продать оборудование  
- /learn_terms — Изучить теннисные термины
- /help — Справка по командам  
- /my_profile - Информация о профиле

Начнем? 😊
    `;

    await bot.sendMessage(chatId, welcomeMessage);
});

bot.onText(/\/my_profile/, async (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.chat.username || msg.chat.first_name || "Unknown User";

    try {
        const userData = await getUser(chatId);
        if (userData) {
            // await bot.sendMessage(chatId, );
            const message = `Ваш профиль: \n
            ChatId: ${userData.chatId}  \n
            Phone: ${userData.phone} \n
            First name: ${userData.first_name}
            Url: https://tennismate.netlify.app/profile/${chatId}
            `;

            await bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Просмотр",
                                web_app: {url: `https://tennismate.netlify.app/profile/${chatId}`}
                            },
                        ],
                    ],
                },
            });
        } else {
            await requestPhoneNumber(bot, chatId);
        }
    } catch (e) {
        // Error handling
        console.error('Error:', e.message);
        await bot.sendMessage(chatId, "An error occurred while fetching your profile.");
    }


    async function getUser(chatId) {
        try {
            if (!chatId) {
                throw new Error('Invalid chatId');
            }

            // HTTP POST-запрос с помощью axios
            const response = await axios.post(`${API_URI}/get-user`, {
                chatId: chatId // Передача данных в теле запроса
            });

            // Получение данных из ответа
            const data = response.data;
            console.log('Profile data:', data);
            return data; // Возвращаем данные

        } catch (e) {
            console.error('Error in getUser:', e.message);
            console.error(e.status)
            if (e.status === 404) return null;
        }
    }


    // Функция для запроса номера телефона у пользователя
    async function requestPhoneNumber(bot, chatId) {
        await bot.sendMessage(
            chatId,
            `🔍 *Вы не зарегистрированы в нашей системе.*\n\n` +
            `📱 Чтобы продолжить пользоваться нашим сервисом, пожалуйста, отправьте ваш номер телефона, нажав на кнопку ниже.`
            , {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        [{text: '📞 Поделиться номером телефона', request_contact: true}]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            }
        );
    }


});

// Telegram bot handler
bot.on("contact", async (contactMsg) => {
    const chatId = contactMsg.chat.id;
    const userPhone = contactMsg.contact.phone_number;
    const firstName = contactMsg.contact.first_name;

    const newUser = {
        chatId,
        phone: userPhone,
        first_name: firstName,
        ntrp_level: null,
        gender: null,
        birthday: null,
        region: null
    };

    createUser(newUser)
        .then(async (response) => {
            const {first_name, phone, ntrp_level, gender, region, birthday} = response.user;
            const message = `Ваш профиль:\n
            Имя пользователя: ${first_name}
            Номер телефона: ${phone}
            Ntrp уровень: ${ntrp_level ? ntrp_level : `Не установлено`}
            Пол: ${gender ? gender : `Не установлено`}
            Регион: ${region ? region : `Не установлено`}
            Дата рождения: ${birthday ? birthday : `Не установлено`}`;


            await bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Просмотр",
                                web_app: {url: `https://tennismate.netlify.app/profile/${chatId}`}
                            },
                        ],
                    ],
                },
            });

        })
        .catch(e => {
            console.log(e)
        })


    async function createUser(newUser) {
        try {
            const response = await axios.post(`${API_URI}/create-user`, newUser);
            console.log('Пользователь успешно создан:', response.data);
            return response.data; // Возвращаем данные из ответа
        } catch (error) {
            console.error('Ошибка при регистрации пользователя:', error.response?.data?.error || error.message);
            throw error;
        }
    }


});

