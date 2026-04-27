# SindiCore — Plataforma de Gestão Condominial

SindiCore é uma plataforma web completa para gestão de condomínios residenciais e comerciais. Desenvolvida para síndicos, administradoras e porteiros, centraliza em um único sistema o controle de moradores, ocorrências, finanças, assembleias, visitantes e muito mais.

---

## Para quem é o SindiCore?

| Perfil | Uso principal |
|---|---|
| **Síndico** | Visão geral do condomínio, aprovação de ocorrências, controle financeiro, organização de assembleias |
| **Administradora** | Gestão de múltiplos condomínios, lançamentos financeiros, relatórios |
| **Porteiro** | Controle de acesso de visitantes em tempo real |
| **Morador** | (futuro) Abertura de ocorrências, reserva de áreas comuns |

---

## Recursos

### 🏠 Dashboard
- Cards com estatísticas em tempo real: unidades ocupadas, moradores ativos, ocorrências abertas, visitantes do dia
- Lista de ocorrências recentes e visitantes no condomínio
- Resumo financeiro do mês

### 👥 Moradores
- Cadastro completo de moradores por unidade (proprietário, inquilino, dependente)
- Dados pessoais: nome, CPF, RG, telefone, e-mail, data de nascimento
- Gestão de veículos por morador (placa, marca, modelo, cor)
- Importação em lote via planilha CSV
- Exportação da lista de moradores

### 🚨 Ocorrências
- Registro de ocorrências com título, descrição, categoria e prioridade
- Categorias: Geral, Manutenção, Segurança, Barulho, Vazamento, Outros
- Prioridades: Baixa, Média, Alta, Urgente
- Fluxo de status: Aberto → Em andamento → Resolvido
- Filtros por status e prioridade
- Exportação para CSV

### 💰 Financeiro
- Lançamentos de receitas e despesas
- Categorias: Condomínio, Energia, Água, Limpeza, Manutenção, Segurança, Multa, Fundo de Reserva
- Status de pagamento: Pendente, Pago, Atrasado
- Resumo com total de receitas, despesas e saldo
- Gráfico de receitas vs despesas dos últimos 6 meses
- Importação e exportação via planilha Excel/CSV

### 🎥 Assembleias
- Agendamento de assembleias ordinárias e extraordinárias
- Sala de reunião por vídeo integrada (WebRTC ponto-a-ponto)
- Chat com formatação (negrito, itálico, código) durante a reunião
- **Modo Assembleia**: desativa câmeras de todos os participantes simultaneamente
- Registro de ata durante ou após a reunião com auto-save
- Contagem de participantes presentes
- Fluxo de status: Agendada → Em andamento → Encerrada

### 📢 Avisos
- Publicação de comunicados para o condomínio
- Prioridades com destaque visual: Normal, Importante, Urgente
- Categorias: Geral, Manutenção, Assembleia, Financeiro, Segurança
- Data de expiração opcional

### 🚪 Visitantes
- Registro de entrada com nome, documento, telefone, motivo e placa do veículo
- Fluxo de autorização: Aguardando → Autorizado / Negado → Saiu
- Contador em tempo real de visitantes no condomínio
- Filtro por status e busca por nome, documento ou placa
- Exportação para CSV

### 🏢 Edifício
- Estrutura hierárquica: Condomínio → Torres → Andares → Unidades
- Cadastro e edição de torres, andares e unidades
- Status das unidades: Ocupada, Vaga, Em manutenção

### 🎾 Áreas Comuns
- Cadastro de áreas (salão, academia, churrasqueira, etc.)
- Sistema de reservas com controle de disponibilidade
- Horários de funcionamento, capacidade e regras de uso

### ⚙️ Configurações
- Gerenciamento de múltiplos condomínios por conta
- Edição de dados do condomínio (CNPJ, endereço, contato)
- Criação de novos condomínios
- Alteração de senha
- Perfil do usuário com cargo e condomínio ativo

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Banco de dados | SQLite via Prisma ORM |
| Autenticação | JWT (jose) + sessões seguras |
| Tempo real | Socket.IO (chat e sinalização WebRTC) |
| Vídeo conferência | WebRTC (malha ponto-a-ponto) |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| Gráficos | Recharts |
| Estado global | Zustand |
| Exportação | xlsx (Excel), CSV nativo |
| Ícones | Lucide React |

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- npm 9 ou superior

---

## Instalação e execução

### 1. Clone o repositório

```bash
git clone https://github.com/joaovquerino1/sindicore.git
cd sindicore
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Chave secreta para assinatura dos tokens JWT (use uma string longa e aleatória)
JWT_SECRET=sua_chave_secreta_aqui

# URL do banco de dados SQLite (o arquivo será criado automaticamente)
DATABASE_URL="file:./dev.db"
```

> **Dica:** Gere um JWT_SECRET seguro com: `openssl rand -base64 32`

### 4. Crie e popule o banco de dados

```bash
# Aplica o schema e cria o arquivo dev.db
npx prisma migrate deploy

# Popula o banco com dados de exemplo (usuário admin + condomínio de teste)
npm run db:seed
```

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

---

## Credenciais padrão (após o seed)

| Campo | Valor |
|---|---|
| E-mail | `admin@sindicore.com` |
| Senha | `admin123` |

> ⚠️ Altere a senha em **Configurações → Alterar senha** antes de usar em produção.

---

## Scripts disponíveis

```bash
npm run dev        # Servidor de desenvolvimento com hot-reload
npm run build      # Build de produção
npm run start      # Servidor de produção (requer build)
npm run lint       # Verifica o código com ESLint
npm run db:seed    # Popula o banco com dados iniciais
```

---

## Estrutura do projeto

```
sindicore/
├── prisma/
│   ├── schema.prisma       # Modelos do banco de dados
│   ├── seed.ts             # Dados iniciais
│   └── migrations/         # Histórico de migrações
├── server.js               # Servidor customizado com Socket.IO
├── src/
│   ├── app/
│   │   ├── api/            # Rotas da API REST
│   │   ├── dashboard/      # Página do dashboard
│   │   ├── moradores/      # Gestão de moradores
│   │   ├── ocorrencias/    # Ocorrências e chamados
│   │   ├── financeiro/     # Controle financeiro
│   │   ├── assembleias/    # Assembleias e reuniões
│   │   ├── avisos/         # Comunicados
│   │   ├── visitantes/     # Controle de acesso
│   │   ├── edificio/       # Torres, andares e unidades
│   │   ├── areas-comuns/   # Áreas comuns e reservas
│   │   ├── configuracoes/  # Configurações da conta
│   │   ├── reuniao/[id]/   # Sala de reunião WebRTC
│   │   └── login/          # Página de login
│   ├── components/
│   │   ├── ui/             # Componentes base (shadcn)
│   │   └── layout/         # Header, sidebar, bottom nav mobile
│   ├── lib/
│   │   ├── auth.ts         # Funções de autenticação JWT
│   │   ├── prisma.ts       # Cliente Prisma singleton
│   │   └── export.ts       # Utilitários de exportação
│   ├── hooks/              # Hooks customizados
│   ├── store/              # Estado global (Zustand)
│   └── types/              # Tipos TypeScript
```

---

## Deploy em produção

### Opção 1 — Servidor próprio (VPS/dedicado)

```bash
# Build da aplicação
npm run build

# Inicie com PM2 (gerenciador de processos)
npm install -g pm2
pm2 start server.js --name sindicore
pm2 save
pm2 startup
```

> O `server.js` integra o Next.js com o Socket.IO. Use-o no lugar do `next start`.

### Opção 2 — Vercel + banco externo

Para deploy na Vercel, substitua o SQLite por PostgreSQL ou MySQL:

1. Altere o `provider` em `prisma/schema.prisma` de `sqlite` para `postgresql`
2. Atualize `DATABASE_URL` com a string de conexão do banco externo
3. Execute `npx prisma migrate deploy` no ambiente de produção
4. Faça o deploy via `vercel --prod`

> ⚠️ O Socket.IO (WebRTC para assembleias) requer um servidor persistente. Em ambientes serverless como Vercel, o módulo de videoconferência não funcionará sem um servidor dedicado separado.

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `JWT_SECRET` | ✅ Sim | Chave para assinar e verificar tokens JWT |
| `DATABASE_URL` | ✅ Sim | URL de conexão com o banco de dados |
| `NODE_ENV` | — | `development` ou `production` (detectado automaticamente) |

---

## Licença

MIT — use, modifique e distribua livremente.
