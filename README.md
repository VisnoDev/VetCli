# VetCli — Sistema de Gestão Veterinária

Sistema multi-tenant para gestão de clínicas veterinárias: pacientes, tutores, atendimentos, prescrições, laboratório, vacinação, estoque, agenda e financeiro.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| **Backend** | NestJS 11, Prisma 7, PostgreSQL, JWT (cookies HttpOnly) |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4 |
| **Infra** | Docker Compose (PostgreSQL) |

## Recursos

- **Autenticação segura** — JWT em cookies HttpOnly, refresh token com rotação, rate limiting, Helmet
- **Multi-tenancy** — isolamento de dados por clínica em todas as camadas
- **Cadastro público** — clínicas se registram e criam o primeiro administrador
- **Controle de acesso (RBAC)** — permissões granulares por cargo (Admin, Veterinário, Recepcionista, Bioquímico)

## Como rodar

### Pré-requisitos
- Node.js 20+
- Docker (para o PostgreSQL)

### 1. Banco de dados
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # ajuste DATABASE_URL e JWT_SECRET
npm install
npx prisma db push
npm run seed                  # popula dados de exemplo
npm run start:dev             # http://localhost:3001
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

## Variáveis de ambiente

Os arquivos `.env` **não** são versionados. Use os `.env.example` como base:
- `backend/.env` — `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`
- `frontend/.env.local` (opcional) — `NEXT_PUBLIC_API_URL`

## Estrutura

```
backend/    API NestJS + Prisma
frontend/   App Next.js (App Router)
docker-compose.yml
```

---

Projeto em desenvolvimento.
