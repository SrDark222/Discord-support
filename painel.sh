#!/bin/bash

clear
echo " ____   ____   ____ "
echo "|_  _| |  _ \\ |  _ \\  TCC Bot Installer"
echo "  ||   | |_) || |_) |"
echo "  ||   |  __/ |  __/ "
echo "  ||   |_|    |_|    "
echo
echo "Iniciando instalação..."

# Barra de progresso simples
progress_bar() {
  local progress=$1
  local max=50
  local filled=$((progress * max / 100))
  local empty=$((max - filled))
  printf "\r["
  for ((i=0; i<filled; i++)); do printf "#"; done
  for ((i=0; i<empty; i++)); do printf " "; done
  printf "] %d%%" "$progress"
}

install_pkg() {
  local pkg=$1
  echo -e "\nInstalando $pkg..."
  pkg install -y $pkg >/dev/null 2>&1 &
  PID=$!

  local i=0
  while kill -0 $PID 2>/dev/null; do
    ((i=i+5))
    if [ $i -gt 100 ]; then i=100; fi
    progress_bar $i
    sleep 0.2
  done

  wait $PID
  progress_bar 100
  echo -e "\n$pkg instalado!"
  sleep 1
  clear
}

# Lista de pacotes que vão instalar
packages=(nodejs git ffmpeg)

for p in "${packages[@]}"; do
  install_pkg $p
done

echo "Instalando dependências do Node.js (discord.js e axios)..."
npm install discord.js axios >/dev/null 2>&1 &

PID=$!
i=0
while kill -0 $PID 2>/dev/null; do
  ((i=i+4))
  if [ $i -gt 100 ]; then i=100; fi
  progress_bar $i
  sleep 0.15
done

wait $PID
progress_bar 100
echo -e "\nDependências Node.js instaladas!"
sleep 1
clear

echo "Instalação finalizada. Rodando o bot..."
node bot.js
