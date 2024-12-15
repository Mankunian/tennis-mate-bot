const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const jwt = require("jsonwebtoken");


// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with the token you received from BotFather
const token = '7323849851:AAFV3onhUFo8esiB-e8r4YVgwnYKldw-D5U';
const bot = new TelegramBot(token, {polling: true});
const MY_CHAT_ID = 289282054;
// File path for JSON data
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
        const profileDto = await getUser(chatId);
        console.log('Token:', profileDto);
        if (profileDto) {
            await bot.sendMessage(chatId, `token=${profileDto}`);
        } else {
            await bot.sendMessage(chatId, "Could not retrieve profile information.");
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

            const response = await fetch(`${API_URI}/get-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ chatId: chatId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Unknown error');
            }

            const data = await response.json();
            console.log('Profile data:', data);
            return data.chatId;  // or any other part of the response you need

        } catch (e) {
            console.error('Error in getUser:', e.message);
            return null;  // Ensure we return null or a default value in case of an error
        }
    }

    async function replyToken(bot, chatId, authToken, userName) {
        const message = `Приветствую, ${userName}! Мы нашли вас в базе данных. Вот ваш токен: ${authToken}`;

        try {
            // Отправка сообщения через Telegram-бота
            await bot.sendMessage(chatId, message);
            console.log('Сообщение успешно отправлено:', message);
        } catch (e) {
            console.error('Ошибка при отправке сообщения:', e.message);
        }
    }






    function objectToBase64(user) {
        const jsonString = JSON.stringify(user); // Преобразование объекта в строку JSON
        return Buffer.from(jsonString).toString('base64'); // Кодирование строки в Base64
    }

    // Функция для отправки профиля пользователя
    async function sendUserProfile(bot, chatId, existingUser, userName, firstName) {
        const {phone, firstName: storedFirstName, ntrp_level, gender, region, birthday} = existingUser;
        const message = `Ваш профиль:\n
            Имя пользователя: ${userName}
            Номер телефона: ${phone}
            Ntrp уровень: ${ntrp_level ? ntrp_level : `Не установлено`}
            Пол: ${gender ? gender : `Не установлено`}
            Регион: ${region ? region : `Не установлено`}
            Дата рождения: ${birthday ? birthday : `Не установлено`}
            Ваше имя: ${storedFirstName || firstName}
            Токен: ${objectToBase64(existingUser)}
            Url: {\`https://tennismate.netlify.app/profile?token=${objectToBase64(existingUser)}\`}
            `
        await bot.sendMessage(chatId, message, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "Просмотр",
                            web_app: {url: `https://tennismate.netlify.app/profile?token=${objectToBase64(existingUser)}`}
                        },
                    ],
                ],
            },
        });
    }

    async function requestPhoneNumber(bot, chatId) {
        await bot.sendMessage(chatId, "Please share your phone number using the button below.", {
            reply_markup: {
                keyboard: [
                    [{text: "Share Phone Number", request_contact: true}]
                ],
                one_time_keyboard: true,
            },
        });
    }



});

// Telegram bot handler
bot.on("contact", (contactMsg) => {
    const chatId = contactMsg.chat.id;
    const userPhone = contactMsg.contact.phone_number;
    const firstName = contactMsg.contact.first_name;

    // Load existing user datas
    // TODO в будущем проверять номер телефона или chatId через бэк запрос
    //  если существует юзер тогда бэк возвращает мне токен для дальнейших действий
    const userData = loadUserData();


    // Check if the phone number exists
    const existingUser = userData.find((user) => user.phone === userPhone);

    if (existingUser) {
        // Return existing user data
        bot.sendMessage(chatId, `Welcome back! Here is your profile data:\n\n
Phone: ${existingUser.phone}
First name: ${existingUser.first_name}
NTRP level: ${existingUser.ntrp_level || 'Not set'}
Gender: ${existingUser.gender || 'Not set'}
Birthday: ${existingUser.birthday || 'Not set'}
Region: ${existingUser.region || 'Not set'}
        `);
    } else {
        // Create a new user object
        const newUser = {
            chatId,
            phone: userPhone,
            first_name: firstName,
            ntrp_level: null, // Placeholder for future data
            gender: null,
            birthday: null,
            region: null
        };

        // Save new user to JSON file
        userData.push(newUser);
        saveUserData(userData);

        // Acknowledge and return profile
        bot.sendMessage(chatId, `Your phone number has been saved. Welcome!\n\n
Phone: ${userPhone}
First name: ${firstName}
NTRP level: null
        `);
    }
});

