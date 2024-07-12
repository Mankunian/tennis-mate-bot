const TelegramBot = require('node-telegram-bot-api');

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with the token you received from BotFather
const token = '7323849851:AAFV3onhUFo8esiB-e8r4YVgwnYKldw-D5U';
const bot = new TelegramBot(token, {polling: true});

// Set the list of commands
bot.setMyCommands([
    {command: '/start', description: 'Start interacting with the bot'},
    {command: '/findpartner', description: 'Find a tennis partner'},
    {command: '/findcoach', description: 'Find a tennis coach'}
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
        userStates[msg.chat.id] = 'finding_partner';
        const cities = [
            [{text: 'Астана', callback_data: 'Астана'}],
            [{text: 'Алматы', callback_data: 'Алматы'}],
        ];
        bot.sendMessage(msg.chat.id, "Выберите ваш регион:", {
            reply_markup: {
                inline_keyboard: cities
            }
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

    // Acknowledge the callback query
    bot.answerCallbackQuery(callbackQuery.id)
        .then(() => {
            bot.sendMessage(chatId, `You selected ${city} city.`);

            if (userStates[chatId] === 'finding_partner') {
                bot.sendMessage(chatId, `Searching for tennis partners in ${city}...`);
                bot.sendMessage(chatId, "Please share your phone number:", {
                    reply_markup: {
                        keyboard: [
                            [{text: "Share my phone number", request_contact: true}]
                        ],
                        one_time_keyboard: true
                    }
                });
            } else if (userStates[chatId] === 'finding_coach') {
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


bot.on('contact', (msg) => {
    if (msg && msg.chat && msg.chat.id && msg.contact && msg.contact.phone_number) {
        const chatId = msg.chat.id;
        const phoneNumber = msg.contact.phone_number;

        console.log(msg);
        const url = `https://www.google.com?phone=${phoneNumber}`;
        bot.sendMessage(chatId, `Thank you for sharing your phone number: ${phoneNumber}`);
        bot.sendMessage(chatId, `You can find more information here: [Your Web Page Link](${url})`, {
            parse_mode: 'Markdown'
        });
    } else {
        console.error('Contact message is missing required information');
    }
});