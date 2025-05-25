const readline = require('readline');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');
const mime = require('mime-types');
const system = require('child_process');
const path = require('path');

system.execSync('clear');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("TOKEN DO BOT: ", (botToken) => {
  rl.close();

  const openRouterKey = "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";
  const client = new Client({
    intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel]
  });

  let userFiles = {};

  async function gerarRespostaIA(msg) {
    try {
      const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: msg }]
      }, {
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json"
        }
      });
      return res.data.choices[0].message.content;
    } catch {
      return "Erro ao gerar resposta.";
    }
  }

  async function enviarArquivo(msg, filePath) {
    const size = fs.statSync(filePath).size / 1024 / 1024;

    if (size > 200) {
      await msg.reply("Arquivo muito grande. Máx: 200MB.");
      fs.unlinkSync(filePath);
      return;
    }

    if (size <= 10) {
      await msg.reply({ files: [filePath] });
    } else {
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', fs.createReadStream(filePath));

      const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders()
      });

      await msg.reply(`Arquivo grande (${size.toFixed(1)}MB): ${res.data}`);
    }

    fs.unlinkSync(filePath);
  }

  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || msg.guild) return;
    const uid = msg.author.id;
    const attachments = msg.attachments.map(a => a);

    if (attachments.length > 0) {
      for (const file of attachments) {
        const mimeType = mime.lookup(file.name) || '';
        const ext = mime.extension(mimeType);
        const filePath = `./temp_${uid}_${Date.now()}.${ext}`;
        const res = await axios.get(file.url, { responseType: 'stream' });
        const writer = fs.createWriteStream(filePath);
        res.data.pipe(writer);
        await new Promise(resolve => writer.on('finish', resolve));

        if (!userFiles[uid]) userFiles[uid] = { audio: null, video: null };

        if (mimeType.startsWith('audio')) userFiles[uid].audio = filePath;
        else if (mimeType.startsWith('video')) userFiles[uid].video = filePath;
        else if (mimeType.startsWith('image')) {
          await enviarArquivo(msg, filePath);
          return;
        }

        if (userFiles[uid].audio && userFiles[uid].video) {
          const finalPath = `./mix_${uid}.webm`;
          await new Promise((resolve, reject) => {
            ffmpeg(userFiles[uid].video)
              .addInput(userFiles[uid].audio)
              .outputOptions('-c:v libvpx', '-c:a libvorbis')
              .save(finalPath)
              .on('end', resolve)
              .on('error', reject);
          });

          await enviarArquivo(msg, finalPath);
          fs.unlinkSync(userFiles[uid].audio);
          fs.unlinkSync(userFiles[uid].video);
          delete userFiles[uid];
        } else {
          const aviso = await gerarRespostaIA(`Arquivo recebido: ${ext}. Aguardando complemento ou instrução.`);
          await msg.reply(aviso);
        }
      }
    } else if (!msg.content.startsWith('http')) {
      const resposta = await gerarRespostaIA(msg.content);
      await msg.reply(resposta);
    }
  });

  client.once('ready', () => {
    console.log(`BOT ONLINE COMO ${client.user.username}`);
  });

  client.login(botToken);
});
