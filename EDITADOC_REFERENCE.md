# EditaDoc — documento de referência do projeto

> Documento de referência para o Claude Code. Descreve o produto, a arquitetura, o stack, o schema do banco e as convenções de código do projeto.

---

## 1. Visão geral do produto

**EditaDoc** é um web app SaaS que transforma textos de editais licitatórios em documentos preenchidos e prontos para uso. O usuário cola o texto de um edital (ou faz upload do PDF), a IA identifica os modelos de documentos embutidos (declarações, propostas, credenciais), extrai os campos variáveis e gera cada documento preenchido automaticamente com os dados cadastrais da empresa do usuário.

### Fluxo principal

1. Usuário cola texto ou faz upload de PDF de edital
2. IA segmenta o edital e identifica blocos que são modelos de documento
3. Para cada modelo encontrado, a IA extrai campos variáveis (explícitos e implícitos)
4. O modelo vira um **template** salvo na biblioteca (pública ou do usuário)
5. Usuário seleciona o perfil de empresa e revisa os campos manuais
6. Sistema gera o documento final preenchido, exportável como `.docx`, `.pdf` ou texto

### Diferenciais

- Templates são extraídos automaticamente dos editais — a biblioteca cresce com o uso
- Deduplicação por similaridade: modelos repetidos entre editais são unificados
- Multi-perfil: um usuário pode ter N perfis de empresa conforme o plano
- Biblioteca pública de templates compartilhados entre todos os usuários

---

## 2. Stack técnico

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite, TypeScript, Tailwind CSS |
| Backend | Fastify, Node.js, TypeScript |
| Banco de dados | PostgreSQL (Railway) |
| ORM | Drizzle ORM |
| IA | Anthropic Claude API (Haiku para extração, Sonnet para casos complexos) |
| Geração de .docx | `docxtemplater` + `pizzip` |
| Geração de PDF | Puppeteer (HTML → PDF) |
| Extração de PDF entrada | `pdfjs-dist` |
| Armazenamento de arquivos | Cloudflare R2 |
| Deploy frontend | Vercel |
| Deploy backend | Railway |
| Autenticação | JWT + bcrypt |
| Pagamentos | Mercado Pago (assinaturas) |

---

## 3. Schema do banco de dados

```sql
-- Usuários e autenticação
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',         -- 'free' | 'pro' | 'agency'
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfis de empresa (N por usuário, limite depende do plano)
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                        -- nome amigável ("Construtora X - RS")
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  uf CHAR(2),
  cep TEXT,
  representante_nome TEXT,
  representante_cpf TEXT,
  representante_cargo TEXT,
  dados_extras JSONB,                        -- campos adicionais livres
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates de documentos
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),       -- NULL = template público/compartilhado
  title TEXT NOT NULL,                       -- ex: "Declaração de não empregar menores"
  category TEXT,                             -- 'declaracao' | 'proposta' | 'credencial' | 'outro'
  body TEXT NOT NULL,                        -- texto do template com marcadores {{campo}}
  fields JSONB NOT NULL,                     -- array de {key, label, type, auto}
  source_hash TEXT,                          -- hash do corpo normalizado para dedup
  usage_count INT DEFAULT 0,
  estado TEXT,                               -- 'RS' | 'SC' | null (federal)
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documentos gerados (histórico)
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES company_profiles(id),
  template_id UUID REFERENCES templates(id),
  title TEXT NOT NULL,
  body_filled TEXT NOT NULL,                 -- texto final preenchido
  fields_used JSONB,                         -- snapshot dos valores usados
  licitacao_ref TEXT,                        -- referência livre: "Pregão 012/2025 - PMPA"
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assinaturas Mercado Pago
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mp_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,                      -- 'authorized' | 'paused' | 'cancelled'
  next_payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Campos de template (estrutura de `fields` em JSONB)

```json
[
  {
    "key": "razao_social",
    "label": "Razão social",
    "type": "text",
    "auto": true,
    "profile_field": "razao_social"
  },
  {
    "key": "numero_pregao",
    "label": "Número do pregão",
    "type": "text",
    "auto": false,
    "profile_field": null
  }
]
```

- `auto: true` → preenchido automaticamente do perfil da empresa
- `auto: false` → requer preenchimento manual pelo usuário a cada geração
- `profile_field` → nome do campo correspondente em `company_profiles`

---

## 4. Pipeline de IA — extração de templates

### Etapa 1 — segmentação do edital

**Modelo:** Claude Haiku  
**Input:** texto completo do edital (até ~100k tokens)  
**Output:** array de segmentos identificados como modelos de documento

```
Prompt (sistema):
Você é um especialista em licitações públicas brasileiras. Analise o texto do edital
abaixo e identifique todos os blocos que são modelos de documentos a serem preenchidos
pelo licitante (declarações, propostas, credenciais, procurações, planilhas de preço etc.).

Para cada bloco encontrado, retorne JSON com:
- title: nome do documento
- category: 'declaracao' | 'proposta' | 'credencial' | 'planilha' | 'outro'
- start_marker: primeiras 80 chars do bloco
- end_marker: últimas 80 chars do bloco
- body: texto completo do bloco

Retorne apenas JSON, sem texto adicional.
```

### Etapa 2 — extração de campos

**Modelo:** Claude Haiku  
**Input:** corpo de um único modelo de documento  
**Output:** lista de campos com metadados

```
Prompt (sistema):
Analise o modelo de documento abaixo e identifique todos os campos variáveis —
tanto explícitos (marcados com [], ___, XXXXX, ou similar) quanto implícitos
(onde o contexto indica que um dado da empresa licitante deve ser inserido).

Normalize os campos para os tipos padrão quando aplicável:
razao_social, cnpj, endereco, cidade, uf, cep, representante_nome,
representante_cpf, representante_cargo, data_assinatura, numero_pregao,
numero_processo, orgao_licitante, objeto_licitacao.

Para campos não mapeáveis, use key descritiva em snake_case.

Retorne o texto do modelo com campos substituídos por {{key}} e o array de fields.
Retorne apenas JSON, sem texto adicional.
```

### Etapa 3 — deduplicação

Antes de salvar um template novo:

1. Normalizar o corpo: remover espaços extras, lowercase, remover pontuação variável
2. Calcular SHA-256 do corpo normalizado
3. Buscar `templates` com `source_hash` igual ou com similaridade > 0.9 (usando `pg_trgm`)
4. Se encontrar match: incrementar `usage_count` e retornar o template existente
5. Se não encontrar: salvar como template novo

```sql
-- Extensão necessária
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index para similarity search
CREATE INDEX templates_body_trgm ON templates USING gin (body gin_trgm_ops);

-- Query de deduplicação
SELECT id, title, similarity(body, $1) AS sim
FROM templates
WHERE similarity(body, $1) > 0.85
ORDER BY sim DESC
LIMIT 1;
```

---

## 5. Geração de documentos

### Preenchimento dos campos

```typescript
// Exemplo de função de preenchimento
function fillTemplate(body: string, fields: Field[], profile: CompanyProfile, manualValues: Record<string, string>): string {
  let filled = body;
  for (const field of fields) {
    const value = field.auto
      ? (profile[field.profile_field as keyof CompanyProfile] ?? '')
      : (manualValues[field.key] ?? `[${field.label}]`);
    filled = filled.replaceAll(`{{${field.key}}}`, value);
  }
  return filled;
}
```

### Exportação .docx

Usar `docxtemplater` com template Word base que já tem formatação de documento oficial brasileiro (fonte Times New Roman ou Arial 12pt, margens 2.5cm, espaçamento 1.5).

```typescript
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

async function generateDocx(templateBuffer: Buffer, data: Record<string, string>): Promise<Buffer> {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer' });
}
```

---

## 6. Estrutura de pastas do projeto

```
editadoc/
├── packages/
│   ├── web/                    # Frontend React + Vite
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── EditalInput.tsx       # Passo 1: colar/upload
│   │   │   │   ├── FieldsReview.tsx      # Passo 2: revisar campos
│   │   │   │   ├── DocumentExport.tsx    # Passo 3: gerar e exportar
│   │   │   │   ├── Templates.tsx         # Biblioteca de templates
│   │   │   │   ├── Profiles.tsx          # Gerenciar perfis de empresa
│   │   │   │   └── History.tsx           # Histórico de documentos
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── vite.config.ts
│   │
│   └── api/                    # Backend Fastify
│       ├── src/
│       │   ├── routes/
│       │   │   ├── edital.ts             # POST /edital/analyze
│       │   │   ├── templates.ts          # GET/POST /templates
│       │   │   ├── profiles.ts           # CRUD /profiles
│       │   │   ├── documents.ts          # POST /documents/generate
│       │   │   └── auth.ts               # POST /auth/login, /register
│       │   ├── services/
│       │   │   ├── ai/
│       │   │   │   ├── segmenter.ts      # Etapa 1: segmentação
│       │   │   │   ├── fieldExtractor.ts # Etapa 2: extração de campos
│       │   │   │   └── pipeline.ts       # Orquestrador do pipeline
│       │   │   ├── deduplicator.ts       # Etapa 3: deduplicação
│       │   │   ├── docGenerator.ts       # Gera .docx e .pdf
│       │   │   └── pdfParser.ts          # Extrai texto de PDF input
│       │   ├── db/
│       │   │   ├── schema.ts             # Drizzle schema
│       │   │   └── index.ts              # Conexão e instância
│       │   └── middleware/
│       │       ├── auth.ts               # Verificação JWT
│       │       └── requirePlan.ts        # Guard de plano (free/pro/agency)
│       └── package.json
│
├── package.json                # Monorepo root (workspaces)
└── EDITADOC_REFERENCE.md      # Este arquivo
```

---

## 7. Rotas da API

| Método | Rota | Descrição | Plano mínimo |
|---|---|---|---|
| POST | `/auth/register` | Criar conta | — |
| POST | `/auth/login` | Login, retorna JWT | — |
| GET | `/profiles` | Listar perfis do usuário | free |
| POST | `/profiles` | Criar perfil de empresa | free (limite: 1) |
| PUT | `/profiles/:id` | Editar perfil | free |
| DELETE | `/profiles/:id` | Remover perfil | free |
| POST | `/edital/analyze` | Enviar edital → recebe templates extraídos | free |
| GET | `/templates` | Listar templates (públicos + próprios) | free |
| POST | `/templates` | Salvar template manualmente | pro |
| DELETE | `/templates/:id` | Remover template próprio | pro |
| POST | `/documents/generate` | Gerar documento preenchido | free (limite: 5/mês) |
| GET | `/documents` | Histórico de documentos gerados | free |
| GET | `/documents/:id/export` | Baixar .docx ou .pdf | free |

---

## 8. Limites por plano

| Recurso | Free | Pro | Agency |
|---|---|---|---|
| Perfis de empresa | 1 | 5 | Ilimitado |
| Documentos gerados / mês | 5 | Ilimitado | Ilimitado |
| Templates próprios | 0 | Ilimitado | Ilimitado |
| Upload de PDF de edital | Não | Sim | Sim |
| Acesso à API | Não | Não | Sim |
| White-label | Não | Não | Sim |

---

## 9. Variáveis de ambiente

```env
# API
DATABASE_URL=postgresql://...
JWT_SECRET=
ANTHROPIC_API_KEY=
CLOUDFLARE_R2_BUCKET=editadoc-files
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=

# Mercado Pago
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=

# Frontend
VITE_API_URL=https://api.editadoc.com.br
```

---

## 10. Convenções de código

- TypeScript estrito (`"strict": true`) em todos os pacotes
- Drizzle ORM para todas as queries — sem SQL raw exceto para `pg_trgm`
- Funções de serviço retornam `Result<T, Error>` (discriminated union) — sem throws não tratados
- Prompts de IA em arquivos `.txt` separados em `services/ai/prompts/`
- Logs estruturados com `pino` (já incluso no Fastify)
- Variáveis de ambiente validadas com `zod` na inicialização do servidor
- Commits em português, mensagens curtas e descritivas

---

## 11. Próximos passos sugeridos para o Claude Code

1. Inicializar monorepo com `pnpm workspaces`
2. Criar schema Drizzle e rodar primeira migration
3. Implementar autenticação (register/login/JWT middleware)
4. Implementar CRUD de perfis de empresa
5. Implementar pipeline de IA (segmenter → fieldExtractor → deduplicator)
6. Implementar rota `POST /edital/analyze` end-to-end com texto colado
7. Implementar geração de `.docx` com template Word base
8. Construir frontend — fluxo de 3 passos (EditalInput → FieldsReview → DocumentExport)
9. Adicionar suporte a upload de PDF (pdfjs-dist)
10. Implementar biblioteca de templates (listagem + filtros)
11. Integrar Mercado Pago para assinaturas
12. Implementar guards de plano em todas as rotas protegidas
