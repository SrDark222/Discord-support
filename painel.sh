#!/bin/bash

clear
echo " ____  _  __  ____  _   _ ____  ____   ___  ____ _____   ____   ___ _____"
echo "|  _ \| |/ / / ___|| | | |  _ \|  _ \ / _ \|  _ \_   _| | __ ) / _ \_   _|"
echo "| | | | ' /  \___ \| | | | |_) | |_) | | | | |_) || |   |  _ \| | | || |  "
echo "| |_| | . \   ___) | |_| |  __/|  __/| |_| |  _ < | |   | |_) | |_| || |  "
echo "|____/|_|\_\ |____/ \___/|_|   |_|    \___/|_| \_\|_|   |____/ \___/ |_|  "
echo
echo "Iniciando instalação..."
sleep 1
clear

progress_bar() {
  local duration=$1
  local interval=0.1
  local steps=$(awk "BEGIN {print int($duration / $interval)}")
  echo -n "["
  for ((i=0; i<steps; i++)); do
    echo -n "#"
    sleep $interval
  done
  echo "]"
}

echo -n "[1/4] Atualizando pacotes... "
pkg update -y > /dev/null 2>&1 && pkg upgrade -y > /dev/null 2>&1
echo "OK"
progress_bar 2

echo -n "[2/4] Instalando Node.js... "
pkg install nodejs -y > /dev/null 2>&1
echo "OK"
progress_bar 2

echo -n "[3/4] Instalando dependências do bot (discord.js, readline-sync)... "
npm install discord.js readline-sync > /dev/null 2>&1
echo "OK"
progress_bar 2

echo -n "[4/4] Finalizando setup... "
sleep 1
echo "OK"
progress_bar 1

echo
echo "Setup concluído! Agora rode: node bot.js"
echo
