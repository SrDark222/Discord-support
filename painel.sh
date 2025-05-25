#!/bin/bash

clear

cat << "EOF"
████████╗ ██████╗  ██████╗ 
╚══██╔══╝██╔═══██╗██╔════╝ 
   ██║   ██║   ██║██║  ███╗
   ██║   ██║   ██║██║   ██║
   ██║   ╚██████╔╝╚██████╔╝
   ╚═╝    ╚═════╝  ╚═════╝ 
EOF

sleep 1
clear

progress_bar() {
  local duration=$1
  local steps=50
  for ((i=0; i<=steps; i++)); do
    clear
    local percent=$(( i * 100 / steps ))
    local filled=$(( i ))
    local empty=$(( steps - filled ))
    local bar=$(printf "%0.s#" $(seq 1 $filled))
    local space=$(printf "%0.s-" $(seq 1 $empty))
    echo "TCC - Instalando dependências"
    echo ""
    echo -ne "[${bar}${space}] ${percent}%\n"
    sleep $(echo "$duration / $steps" | bc -l)
  done
}

clear
echo "Atualizando pacotes..."
progress_bar 3

clear
echo "Instalando Node.js..."
progress_bar 4

clear
echo "Instalando dependências do projeto..."
progress_bar 5

clear
echo "Instalação finalizada com sucesso."
sleep 1
clear

echo "Iniciando bot automaticamente..."
sleep 1
clear

node bot.js
