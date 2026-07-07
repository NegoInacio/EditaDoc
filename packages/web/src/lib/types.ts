export type TemplateField = {
  key: string
  label: string
  type: 'text' | 'date' | 'number'
  auto: boolean
  profile_field: string | null
}

export type AnalyzeResult = {
  templates: {
    id: string
    title: string
    category: string
    isDuplicate: boolean
    fieldsCount: number
  }[]
  total: number
  duplicates: number
  new: number
}

export type Template = {
  id: string
  title: string
  category: string | null
  body: string
  fields: TemplateField[]
  isPublic: boolean
  usageCount: number
  createdAt: string
}

export type CompanyProfile = {
  id: string
  name: string
  razaoSocial: string
  cnpj: string
  cidade?: string
  uf?: string
}

export type GeneratedDocument = {
  id: string
  title: string
  bodyFilled: string
}
