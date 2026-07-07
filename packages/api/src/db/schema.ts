import { pgTable, uuid, text, boolean, integer, jsonb, timestamp, date, char } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  plan: text('plan').notNull().default('free'),
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const companyProfiles = pgTable('company_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  razaoSocial: text('razao_social').notNull(),
  cnpj: text('cnpj').notNull(),
  endereco: text('endereco'),
  cidade: text('cidade'),
  uf: char('uf', { length: 2 }),
  cep: text('cep'),
  representanteNome: text('representante_nome'),
  representanteCpf: text('representante_cpf'),
  representanteCargo: text('representante_cargo'),
  dadosExtras: jsonb('dados_extras'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id),
  title: text('title').notNull(),
  category: text('category'),
  body: text('body').notNull(),
  fields: jsonb('fields').notNull(),
  sourceHash: text('source_hash'),
  usageCount: integer('usage_count').default(0).notNull(),
  estado: text('estado'),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const generatedDocuments = pgTable('generated_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').references(() => companyProfiles.id),
  templateId: uuid('template_id').references(() => templates.id),
  title: text('title').notNull(),
  bodyFilled: text('body_filled').notNull(),
  fieldsUsed: jsonb('fields_used'),
  licitacaoRef: text('licitacao_ref'),
  exportedAt: timestamp('exported_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  mpSubscriptionId: text('mp_subscription_id').unique(),
  plan: text('plan').notNull(),
  status: text('status').notNull(),
  nextPaymentDate: date('next_payment_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  companyProfiles: many(companyProfiles),
  templates: many(templates),
  generatedDocuments: many(generatedDocuments),
  subscriptions: many(subscriptions),
}))

export const companyProfilesRelations = relations(companyProfiles, ({ one, many }) => ({
  user: one(users, { fields: [companyProfiles.userId], references: [users.id] }),
  generatedDocuments: many(generatedDocuments),
}))

export const templatesRelations = relations(templates, ({ one, many }) => ({
  owner: one(users, { fields: [templates.ownerId], references: [users.id] }),
  generatedDocuments: many(generatedDocuments),
}))

export const generatedDocumentsRelations = relations(generatedDocuments, ({ one }) => ({
  user: one(users, { fields: [generatedDocuments.userId], references: [users.id] }),
  profile: one(companyProfiles, { fields: [generatedDocuments.profileId], references: [companyProfiles.id] }),
  template: one(templates, { fields: [generatedDocuments.templateId], references: [templates.id] }),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}))

// Tipos derivados do schema
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type CompanyProfile = typeof companyProfiles.$inferSelect
export type NewCompanyProfile = typeof companyProfiles.$inferInsert
export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
export type GeneratedDocument = typeof generatedDocuments.$inferSelect
export type NewGeneratedDocument = typeof generatedDocuments.$inferInsert
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert

export type TemplateField = {
  key: string
  label: string
  type: 'text' | 'date' | 'number'
  auto: boolean
  profile_field: keyof CompanyProfile | null
}
