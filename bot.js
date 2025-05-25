const readline = require('readline');
const figlet = require('figlet');
const chalk = require('chalk');
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Mostrar título estiloso
figlet('DK BOT', (err, data) => {
  if (err) {
    console.log('Erro no Figlet');
    return startPrompt();
  }
  console.log(chalk.red.bold(data));
  startPrompt();
});

function startPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(chalk.yellow('Token do bot: '), (botToken) => {
    rl.close();
    startBot(botToken.trim());
  });
}

function startBot(token) {
  console.clear();
  console.log(chalk.green('Iniciando bot...'));

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: ['CHANNEL']
  });

  client.once('ready', () => {
    console.log(chalk.green.bold(`Bot online como: ${client.user.tag}`));
  });

  client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.channel.type !== 1) return; // Só DM

    if (message.attachments.size > 0) {
      console.log(chalk.cyan(`Recebido arquivo de: ${message.author.tag}`));
      try {
        await processAttachments(message);
      } catch (err) {
        console.log(chalk.red('Erro ao processar arquivo:'), err);
        message.channel.send('Erro ao processar o arquivo.');
      }
    } else {
      message.channel.send('Manda arquivo, mano.');
    }
  });

  client.login(token);

  async function processAttachments(message) {
    for (const attachment of message.attachments.values()) {
      const url = attachment.url;
      const name = attachment.name || 'file';

      if (!fs.existsSync(path.join(__dirname, 'temp'))) {
        fs.mkdirSync(path.join(__dirname, 'temp'));
      }

      const filePath = path.join(__dirname, 'temp', `${Date.now()}_${name}`);
      await downloadFile(url, filePath);

      const sizeMB = attachment.size / (1024 * 1024);
      if (sizeMB > 200) {
        await message.channel.send('Arquivo muito pesado (>200MB), não rola processar.');
        fs.unlinkSync(filePath);
        return;
      }

      if (attachment.contentType?.startsWith('audio/') || attachment.contentType?.startsWith('video/')) {
        const outputWebm = path.join(__dirname, 'temp', `${Date.now()}.webm`);
        await convertToWebmWithAudio(filePath, outputWebm);
        const urlUploaded = await uploadToCatbox(outputWebm);
        await message.channel.send(`Aqui seu arquivo processado: ${urlUploaded}`);

        fs.unlinkSync(filePath);
        fs.unlinkSync(outputWebm);
      } else if (attachment.contentType?.startsWith('image/')) {
        await message.channel.send('Recebi uma imagem, mas ainda não rola converter.');
        fs.unlinkSync(filePath);
      } else {
        await message.channel.send('Arquivo não suportado.');
        fs.unlinkSync(filePath);
      }
    }
  }

  function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(dest);
      axios.get(url, { responseType: 'stream' }).then(response => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      }).catch(reject);
    });
  }

  function convertToWebmWithAudio(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libvpx-vp9',
          '-c:a libopus',
          '-b:v 1M',
          '-pix_fmt yuva420p',
          '-auto-alt-ref 0'
        ])
        .on('end', () => resolve())
        .on('error', reject)
        .save(outputPath);
    });
  }

  async function uploadToCatbox(filePath) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));

    const { data } = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });
    return data;
  }
          }
