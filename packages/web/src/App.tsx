import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { FlowProvider } from './lib/flowContext'
import EditalInput from './pages/EditalInput'
import FieldsReview from './pages/FieldsReview'
import DocumentExport from './pages/DocumentExport'
import Templates from './pages/Templates'
import Profiles from './pages/Profiles'
import History from './pages/History'

function Nav() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    `text-sm px-3 py-1.5 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex gap-2 flex-wrap">
      <NavLink to="/" end className={cls}>Novo edital</NavLink>
      <NavLink to="/templates" className={cls}>Templates</NavLink>
      <NavLink to="/profiles" className={cls}>Perfis</NavLink>
      <NavLink to="/history" className={cls}>Histórico</NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <FlowProvider>
        <Nav />
        <Routes>
          <Route path="/" element={<EditalInput />} />
          <Route path="/review" element={<FieldsReview />} />
          <Route path="/export" element={<DocumentExport />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </FlowProvider>
    </BrowserRouter>
  )
}
