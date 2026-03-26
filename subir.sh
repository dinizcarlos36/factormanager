#!/bin/bash

# Script para subir mudanças para GitHub e Vercel automaticamente

# Pega a mensagem do commit do primeiro argumento, ou usa uma padrão
MESSAGE=${1:-"Update automático do FactorManager"}

echo "🚀 Iniciando processo de envio..."

# Adiciona todas as mudanças
git add .

# Faz o commit
git commit -m "$MESSAGE"

# Faz o push para o branch selecionado (main)
echo "📤 Enviando para o GitHub..."
git push origin main

echo "✅ Sucesso! O código está no GitHub e a Vercel iniciará o deploy em instantes."
