const { Client, GatewayIntentBits } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');
const fs = require('fs');

if (!fs.existsSync('./config.json')) {
  console.log('Configuração não encontrada. Rode o painel.sh antes.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const openai = new OpenAIApi(new Configuration({
  apiKey: config.openaiApiKey,
}));

async function sendWebhook(message) {
  try {
    await axios.post(config.webhookUrl, { content: message });
  } catch (e) {
    console.error('Erro no webhook:', e.message);
  }
}

client.once('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase().startsWith('!ia ')) {
    const prompt = message.content.slice(4).trim();
    if (!prompt) return message.reply('Manda algo pra IA responder, chefe.');

    try {
      await message.channel.sendTyping();

      const response = await openai.createChatCompletion({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      });

      const reply = response.data.choices[0].message.content;
      await message.reply(reply);
      await sendWebhook(`[IA Reply] ${message.author.tag}: ${reply}`);
    } catch (err) {
      console.error('Erro IA:', err.message);
      message.reply('Erro na IA, tenta de novo depois.');
    }
  }

  if (message.content.toLowerCase() === '!ping') {
    message.channel.send('Pong!');
  }
});

client.login(config.botToken).catch(() => {
  console.error('Token inválido ou erro ao logar.');
  process.exit(1);
});
