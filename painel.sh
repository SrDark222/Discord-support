#!/bin/bash

# Função de limpar e mostrar título
title() {
  clear
  echo "======================================="
  echo "         Painel de Instalação           "
  echo "======================================="
  echo
}

# Função de loading com barra progressiva fake
loading() {
  local msg=$1
  local duration=$2
  local interval=0.1
  local steps=$((duration / interval))
  echo -n "$msg "
  for ((i=0; i<=steps; i++)); do
    sleep $interval
    printf "\r$msg ["
    percent=$(( i * 100 / steps ))
    filled=$(( i * 20 / steps ))
    empty=$((20 - filled))
    printf '%0.s#' $(seq 1 $filled)
    printf '%0.s-' $(seq 1 $empty)
    printf "] %3d%%" $percent
  done
  echo -e "\n"
}

# Função de instalar dependência npm
install_dep() {
  local dep=$1
  loading "Instalando $dep..." 3
  npm install $dep --silent
  if [ $? -eq 0 ]; then
    echo "$dep instalado com sucesso!"
  else
    echo "Erro ao instalar $dep!"
    exit 1
  fi
  sleep 1
}

# Início do script
title
echo "Atualizando pacotes do Termux..."
loading "Atualizando repositórios..." 2
pkg update -y > /dev/null 2>&1

echo "Instalando Node.js..."
loading "Instalando Node.js..." 3
pkg install nodejs -y > /dev/null 2>&1

# Checa se npm tá instalado
if ! command -v npm &> /dev/null
then
  echo "Erro: npm não encontrado, abortando."
  exit 1
fi

# Instala as libs npm necessárias com estilo
deps=("discord.js" "axios" "fluent-ffmpeg" "mime-types")
for d in "${deps[@]}"; do
  install_dep $d
done

title
echo "Todas as dependências foram instaladas!"
echo "Preparando para rodar o bot..."

sleep 1

# Roda o bot.js (supondo que tá no mesmo dir)
if [ -f bot.js ]; then
  echo "Executando bot.js..."
  sleep 1
  node bot.js
else
  echo "Arquivo bot.js não encontrado no diretório atual."
fi
