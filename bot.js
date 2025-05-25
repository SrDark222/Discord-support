const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');
const mime = require('mime-types');
const path = require('path');
const os = require('os');
const system = require('child_process');

system.execSync('clear');

const botToken = prompt("Token do bot:");
const openRouterKey = "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";

const client = new Client({ intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent] });

let userFiles = {};

async function gerarRespostaIA(pergunta) {
  try {
    const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: "openai/gpt-3.5-turbo",
      messages: [{ role: "user", content: pergunta }]
    }, {
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json"
      }
    });

    return res.data.choices[0].message.content;
  } catch (err) {
    return "Erro ao conectar com a I.A";
  }
}

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || msg.guild) return;

  const uid = msg.author.id;
  const attachments = msg.attachments.map(a => a);

  if (attachments.length > 0) {
    for (const file of attachments) {
      const mimeType = mime.lookup(file.name) || '';
      const ext = mime.extension(mimeType);
      const filePath = `./temp/${uid}_${Date.now()}.${ext}`;
      const res = await axios.get(file.url, { responseType: 'stream' });
      const writer = fs.createWriteStream(filePath);
      res.data.pipe(writer);
      await new Promise(r => writer.on('finish', r));

      if (!userFiles[uid]) userFiles[uid] = { audio: null, video: null };

      if (mimeType.startsWith('audio')) userFiles[uid].audio = filePath;
      else if (mimeType.startsWith('video')) userFiles[uid].video = filePath;
      else if (mimeType.startsWith('image')) {
        const out = filePath.replace(ext, 'jpg');
        await new Promise((resolve, reject) => {
          ffmpeg(filePath).toFormat('jpg').save(out).on('end', resolve).on('error', reject);
        });
        await enviarArquivo(msg, out);
        return;
      }

      if (userFiles[uid].audio && userFiles[uid].video) {
        const finalPath = `./temp/final_${uid}.webm`;
        await new Promise((resolve, reject) => {
          ffmpeg(userFiles[uid].video).addInput(userFiles[uid].audio)
            .outputOptions('-c:v libvpx', '-c:a libvorbis')
            .save(finalPath)
            .on('end', resolve).on('error', reject);
        });
        await enviarArquivo(msg, finalPath);
        fs.unlinkSync(userFiles[uid].audio);
        fs.unlinkSync(userFiles[uid].video);
        delete userFiles[uid];
        return;
      }

      const resp = await gerarRespostaIA(`Arquivo recebido: ${ext}. Aguardo o outro (áudio/vídeo) ou envio instrução.`);
      await msg.reply(resp);
    }
  } else if (!msg.content.startsWith('http')) {
    const resp = await gerarRespostaIA(msg.content);
    await msg.reply(resp);
  }
});

async function enviarArquivo(msg, filePath) {
  const size = fs.statSync(filePath).size / 1024 / 1024;
  if (size > 200) {
    const resp = await gerarRespostaIA(`Usuário tentou enviar ${size.toFixed(1)}MB. Avise que o limite é 200MB.`);
    await msg.reply(resp);
    fs.unlinkSync(filePath);
    return;
  }

  if (size <= 10) {
    await msg.reply({ files: [filePath] });
  } else {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));
    const res = await axios.post("https://catbox.moe/user/api.php", form, { headers: form.getHeaders() });
    const resp = await gerarRespostaIA(`Arquivo grande (${size.toFixed(1)}MB). Aqui o link do catbox: ${res.data}`);
    await msg.reply(resp);
  }

  fs.unlinkSync(filePath);
}

client.once('ready', () => {
  console.log(`\nBOT ONLINE COMO ${client.user.username}`);
});

client.login(botToken);
