const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');
const mime = require('mime-types');
const readline = require('readline');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Token do bot: ", (botToken) => {
  rl.question("ID do usuário p/ enviar DM: ", (userId) => {
    rl.question("Mensagem pra enviar: ", async (mensagemDM) => {
      rl.close();

      const client = new Client({
        intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
        partials: [Partials.Channel]
      });

      const openRouterKey = "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";
      let userFiles = {};

      async function gerarRespostaIA(input) {
        try {
          const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "openai/gpt-3.5-turbo",
            messages: [{ role: "user", content: input }]
          }, {
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              "Content-Type": "application/json"
            }
          });
          return res.data.choices[0].message.content;
        } catch (err) {
          return "Erro ao conectar com a IA.";
        }
      }

      async function enviarArquivo(msg, filePath) {
        const sizeMB = fs.statSync(filePath).size / 1024 / 1024;
        if (sizeMB > 200) {
          const aviso = await gerarRespostaIA(`Arquivo muito grande (${sizeMB.toFixed(1)}MB).`);
          await msg.reply(aviso);
          fs.unlinkSync(filePath);
          return;
        }

        if (sizeMB <= 10) {
          await msg.reply({ files: [filePath] });
        } else {
          const form = new FormData();
          form.append("reqtype", "fileupload");
          form.append("fileToUpload", fs.createReadStream(filePath));
          const res = await axios.post("https://catbox.moe/user/api.php", form, {
            headers: form.getHeaders()
          });
          await msg.reply(`Arquivo upado: ${res.data}`);
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
            const filePath = `./temp/${uid}_${Date.now()}.${ext}`;
            const res = await axios.get(file.url, { responseType: 'stream' });
            const writer = fs.createWriteStream(filePath);
            res.data.pipe(writer);
            await new Promise(r => writer.on('finish', r));

            if (!userFiles[uid]) userFiles[uid] = { audio: null, video: null };

            if (mimeType.startsWith('audio')) userFiles[uid].audio = filePath;
            else if (mimeType.startsWith('video')) userFiles[uid].video = filePath;
            else if (mimeType.startsWith('image')) {
              await enviarArquivo(msg, filePath);
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

            const resp = await gerarRespostaIA(`Recebi um arquivo: ${ext}. Aguardo o outro ou comando.`);
            await msg.reply(resp);
          }
        } else {
          const resposta = await gerarRespostaIA(msg.content);
          await msg.reply(resposta);
        }
      });

      client.once('ready', async () => {
        console.log(`BOT ONLINE: ${client.user.username}`);
        try {
          const user = await client.users.fetch(userId);
          await user.send(mensagemDM);
          console.log("DM enviada com sucesso.");
        } catch (err) {
          console.log("Erro ao enviar DM:", err.message);
        }
      });

      client.login(botToken);
    });
  });
});
