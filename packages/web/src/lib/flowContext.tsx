import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { AnalyzeResult, Template, CompanyProfile } from './types'

type FlowState = {
  analyzeResult: AnalyzeResult | null
  selectedTemplate: Template | null
  selectedProfile: CompanyProfile | null
  manualValues: Record<string, string>
  licitacaoRef: string
  generatedDocId: string | null
  setAnalyzeResult: (r: AnalyzeResult) => void
  setSelectedTemplate: (t: Template) => void
  setSelectedProfile: (p: CompanyProfile) => void
  setManualValues: (v: Record<string, string>) => void
  setLicitacaoRef: (r: string) => void
  setGeneratedDocId: (id: string) => void
  reset: () => void
}

const FlowContext = createContext<FlowState | null>(null)

export function FlowProvider({ children }: { children: ReactNode }) {
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<CompanyProfile | null>(null)
  const [manualValues, setManualValues] = useState<Record<string, string>>({})
  const [licitacaoRef, setLicitacaoRef] = useState('')
  const [generatedDocId, setGeneratedDocId] = useState<string | null>(null)

  const reset = () => {
    setAnalyzeResult(null)
    setSelectedTemplate(null)
    setSelectedProfile(null)
    setManualValues({})
    setLicitacaoRef('')
    setGeneratedDocId(null)
  }

  return (
    <FlowContext.Provider value={{
      analyzeResult, selectedTemplate, selectedProfile,
      manualValues, licitacaoRef, generatedDocId,
      setAnalyzeResult, setSelectedTemplate, setSelectedProfile,
      setManualValues, setLicitacaoRef, setGeneratedDocId,
      reset,
    }}>
      {children}
    </FlowContext.Provider>
  )
}

export function useFlow() {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error('useFlow fora de FlowProvider')
  return ctx
}
