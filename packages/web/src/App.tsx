import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/authContext'
import PrivateRoute from './components/PrivateRoute'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import EditalInput from './pages/EditalInput'
import FieldsReview from './pages/FieldsReview'
import DocumentExport from './pages/DocumentExport'
import Templates from './pages/Templates'
import Profiles from './pages/Profiles'
import History from './pages/History'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rotas protegidas — redireciona para /login se sem JWT */}
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<EditalInput />} />
              <Route path="/review" element={<FieldsReview />} />
              <Route path="/export" element={<DocumentExport />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/profiles" element={<Profiles />} />
              <Route path="/history" element={<History />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
