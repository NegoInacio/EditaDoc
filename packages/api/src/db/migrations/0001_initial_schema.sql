-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Usuários e autenticação
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Perfis de empresa
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  uf CHAR(2),
  cep TEXT,
  representante_nome TEXT,
  representante_cpf TEXT,
  representante_cargo TEXT,
  dados_extras JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Templates de documentos
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT,
  body TEXT NOT NULL,
  fields JSONB NOT NULL,
  source_hash TEXT,
  usage_count INT DEFAULT 0 NOT NULL,
  estado TEXT,
  is_public BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índice para deduplicação por similaridade (pg_trgm)
CREATE INDEX IF NOT EXISTS templates_body_trgm ON templates USING gin (body gin_trgm_ops);

-- Documentos gerados
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES company_profiles(id),
  template_id UUID REFERENCES templates(id),
  title TEXT NOT NULL,
  body_filled TEXT NOT NULL,
  fields_used JSONB,
  licitacao_ref TEXT,
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Assinaturas Mercado Pago
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mp_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  next_payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
