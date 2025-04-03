# Usa a imagem oficial do Node.js na versão 18
FROM node:18

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia o arquivo package.json para instalar dependências
COPY package.json .

# Instala as dependências do projeto
RUN npm install

# Copia todos os arquivos do diretório atual para dentro do contêiner
COPY . .

# Define o comando padrão para rodar a aplicação
CMD ["node", "server.js"]