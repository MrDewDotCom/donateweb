import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Donate from './pages/Donate'
import Overlay from './pages/Overlay'
import Admin from './pages/Admin'
import Login from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Donate />} />
        <Route path="/overlay" element={<Overlay />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
