const TelegramBot = require('node-telegram-bot-api');

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with the token you received from BotFather
const token = '7323849851:AAFV3onhUFo8esiB-e8r4YVgwnYKldw-D5U';
const bot = new TelegramBot(token, {polling: true});

const userStates = {}; // Store user states

// Define command handlers
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg?.chat.id, "Welcome! Use /findpartner or /findcoach to search for a tennis partner or coach.");
});

bot.onText(/\/findpartners/, (msg) => {
    userStates[msg.chat.id] = 'finding_partners';
    const cities = [
        [{text: 'Астана', callback_data: 'Астана'}],
        [{text: 'Алматы', callback_data: 'Алматы'}],
    ];
    bot.sendMessage(msg.chat.id, "Please select your location:", {
        reply_markup: {
            inline_keyboard: cities
        }
    });
});

bot.onText(/\/findcoaches/, (msg) => {
    userStates[msg.chat.id] = 'finding_coaches';
    const cities = [
        [{text: 'New York', callback_data: 'New York'}],
        [{text: 'Los Angeles', callback_data: 'Los Angeles'}],
        [{text: 'Chicago', callback_data: 'Chicago'}],
        [{text: 'Houston', callback_data: 'Houston'}],
        [{text: 'Phoenix', callback_data: 'Phoenix'}],
    ];
    bot.sendMessage(msg.chat.id, "Please select your location:", {
        reply_markup: {
            inline_keyboard: cities
        }
    });
});

// Handle callback queries
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

            if (userStates[chatId] === 'finding_partners') {
                bot.sendMessage(chatId, `Searching for tennis partners in ${city}...`);
                bot.sendMessage(chatId, "Please share your phone number:", {
                    reply_markup: {
                        keyboard: [
                            [{text: "Share my phone number", request_contact: true}]
                        ],
                        one_time_keyboard: true
                    }
                });
            } else if (userStates[chatId] === 'finding_coaches') {
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
});


bot.on('contact', (msg) => {
    const chatId = msg.chat.id;
    const phoneNumber = msg.contact.phone_number;

    console.log(msg);
    return bot.sendMessage(chatId, `You sharing your number ${phoneNumber}`)

    // if (userStates[chatId] === 'awaiting_phone') {
    //     const url = `https://www.google.com?phone=${phoneNumber}`;
    //
    //     bot.sendMessage(chatId, `Thank you for sharing your phone number: ${phoneNumber}`);
    //     bot.sendMessage(chatId, `You can find more information here: [Your Web Page Link](${url})`, {
    //         parse_mode: 'Markdown'
    //     });
    //
    //     // Reset user state
    //     delete userStates[chatId];
    // }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore the commands we've already handled
    if (text.startsWith('/findpartners') || text.startsWith('/findcoaches') || text.startsWith('/start' || text.startsWith('/contact'))) {
        return;
    }

    // Check user state
    if (userStates[chatId] === 'finding_partners') {
        bot.sendMessage(chatId, `Searching for tennis partners near ${text}...`);
        delete userStates[chatId]; // Reset user state
    } else if (userStates[chatId] === 'finding_coaches') {
        bot.sendMessage(chatId, `Searching for tennis coaches near ${text}...`);
        delete userStates[chatId]; // Reset user state
    } else {
        // Default response for random typing
        bot.sendMessage(chatId, 'I did not understand that command. Please use /findpartners or /findcoaches.');
    }
});