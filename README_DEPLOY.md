# 🚀 Guia de Deploy Vercel - FactorManager

Este manual explica como colocar o sistema **FactorManager** no ar utilizando a Vercel.

## 📋 Pré-requisitos

1.  Uma conta na [Vercel](https://vercel.com).
2.  O código do projeto em um repositório (GitHub, GitLab ou Bitbucket).

---

## 🛠️ Passo a Passo (Via Dashboard da Vercel)

### 1. Importar o Projeto
- No dashboard da Vercel, clique em **"Add New..."** -> **"Project"**.
- Conecte sua conta do GitHub e selecione o repositório `factormanager`.

### 2. Configurações de Build
A Vercel detectará automaticamente que se trata de um projeto **Next.js**. As configurações padrão devem ser mantidas:
- **Framework Preset**: `Next.js`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Variáveis de Ambiente (CRÍTICO) 🔐
Esta é a parte mais importante. Você precisa adicionar as seguintes variáveis na seção **"Environment Variables"**:

| Nome da Variável | Valor |
| :--- | :--- |
| `NEXT_PUBLIC_INSFORGE_URL` | Sua URL do Backend InsForge |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Sua Anon Key do InsForge |

> [!IMPORTANT]
> Copie os valores exatamente como estão no seu arquivo `.env.local` atual.

### 4. Deploy
Clique em **"Deploy"**. A Vercel irá baixar as dependências, rodar o build e fornecer uma URL pública (ex: `factormanager.vercel.app`).

---

## 💻 Deploy via Vercel CLI (Opcional)

Se preferir fazer pelo terminal:

1. Instale a CLI: `npm i -g vercel`
2. No diretório do projeto, rode: `vercel`
3. Siga as instruções no terminal para conectar ao projeto.
4. Para subir as variáveis de ambiente via CLI:
   ```bash
   vercel env add NEXT_PUBLIC_INSFORGE_URL
   vercel env add NEXT_PUBLIC_INSFORGE_ANON_KEY
   ```
5. Para deploy final (produção): `vercel --prod`

---

## ✅ Verificação Pós-Deploy

Após o deploy, acesse a URL fornecida e verifique:
1. Se a tela de login carrega corretamente.
2. Se o login com as credenciais criadas (Wellington Rocha) funciona.
3. Se os dados (clientes, títulos) estão sendo carregados do banco.

---

## ⚠️ Dica de Segurança
Nunca suba o arquivo `.env.local` para o GitHub (ele já deve estar no `.gitignore`). Use sempre o dashboard da Vercel ou a CLI para gerenciar segredos.
