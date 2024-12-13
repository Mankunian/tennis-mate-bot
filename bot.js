const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');


// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with the token you received from BotFather
const token = '7323849851:AAFV3onhUFo8esiB-e8r4YVgwnYKldw-D5U';
const bot = new TelegramBot(token, {polling: true});
// In-memory session store
const session = {};
// File path for JSON data
const dataFilePath = path.resolve(__dirname, './database/user_data.json');

const tennisTerms = require('./helper/tennisTerms');


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

// Handler for /my_profile command
bot.onText(/\/my_profile/, async (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.chat.username || msg.chat.first_name || "Unknown User";
    const firstName = msg.chat.first_name;

    // Check if the user's profile exists in the session
    if (session[chatId] && session[chatId].userPhone) {
        const userPhone = session[chatId].userPhone;
        bot.sendMessage(chatId,
            `Your Profile:\n\n
Username: ${userName}
Phone: ${userPhone}
First Name: ${firstName}`);
    } else {
        // Prompt the user to share their phone number
        await bot.sendMessage(chatId, "Please share your phone number using the button below.", {
            reply_markup: {
                keyboard: [
                    [{ text: "Share Phone Number", request_contact: true }]
                ],
                one_time_keyboard: true,
            },
        });
    }
});


bot.on("contact", (contactMsg) => {
    const chatId = contactMsg.chat.id;
    const userPhone = contactMsg.contact.phone_number;
    const firstName = contactMsg.contact.first_name;

    // Save the data in the session
    session[chatId] = {
        userPhone,
        firstName,
    };

    // Acknowledge the phone number and save the profile
    bot.sendMessage(chatId,
        `Thank you! Your phone number has been saved.\n\n
Your Profile:\n\n
Phone: ${userPhone}
First Name: ${firstName}`);
});

