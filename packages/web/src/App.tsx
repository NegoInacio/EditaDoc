import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EditalInput from './pages/EditalInput'
import FieldsReview from './pages/FieldsReview'
import DocumentExport from './pages/DocumentExport'
import Templates from './pages/Templates'
import Profiles from './pages/Profiles'
import History from './pages/History'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditalInput />} />
        <Route path="/review" element={<FieldsReview />} />
        <Route path="/export" element={<DocumentExport />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  )
}
