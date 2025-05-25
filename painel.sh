#!/data/data/com.termux/files/usr/bin/bash
clear
echo -e "\e[1;31m"
figlet "DK SUPPORT BOT"
echo -e "\e[0m"
echo "Iniciando instalação..."
pkg update -y && pkg upgrade -y
pkg install nodejs -y
pkg install ffmpeg -y
pkg install git -y

mkdir -p ~/dk-bot && cd ~/dk-bot
echo "Baixando dependências..."
npm init -y
npm i discord.js axios form-data fluent-ffmpeg ffmpeg-static mime-types prompt-sync

echo "Colando bot.js..."
curl -o bot.js https://URL-DO-SEU-GIST-ou-PASTE

echo "Pronto. Use: node bot.js"
