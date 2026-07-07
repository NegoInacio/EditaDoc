// Fonte única de verdade para todos os limites por plano (seção 8 do reference doc)

export type Plan = 'free' | 'pro' | 'agency'

export const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, agency: 2 }

export const PLAN_LIMITS = {
  profilesMax: { free: 1, pro: 5, agency: Infinity },
  docsPerMonth: { free: 5, pro: Infinity, agency: Infinity },
  uploadPdf: { free: false, pro: true, agency: true },
  ownTemplates: { free: false, pro: true, agency: true },
  apiAccess: { free: false, pro: false, agency: true },
  whiteLabel: { free: false, pro: false, agency: true },
} as const satisfies Record<string, Record<Plan, number | boolean>>

export function planRank(plan: string): number {
  return PLAN_RANK[plan as Plan] ?? 0
}

export function hasFeature(plan: string, feature: keyof typeof PLAN_LIMITS): boolean {
  const val = PLAN_LIMITS[feature][plan as Plan]
  return typeof val === 'boolean' ? val : val > 0
}

export function numericLimit(plan: string, feature: 'profilesMax' | 'docsPerMonth'): number {
  const val = PLAN_LIMITS[feature][plan as Plan]
  return typeof val === 'number' ? val : val ? Infinity : 0
}
