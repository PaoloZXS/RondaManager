import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import SediPage from './pages/SediPage';
import GuardiePage from './pages/GuardiePage';
import PuntiControlloPage from './pages/PuntiControlloPage';
import PercorsiPage from './pages/PercorsiPage';
import TurniPage from './pages/TurniPage';
import TelefoniPage from './pages/TelefoniPage';
import ImpostazioniPage from './pages/ImpostazioniPage';
import AnomaliePage from './pages/AnomaliePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sedi" element={<SediPage />} />
          <Route path="guardie" element={<GuardiePage />} />
          <Route path="punti-controllo" element={<PuntiControlloPage />} />
          <Route path="percorsi" element={<PercorsiPage />} />
          <Route path="turni" element={<TurniPage key="normali" />} />
          <Route path="archivio" element={<TurniPage key="archivio" />} />
          <Route path="telefoni" element={<TelefoniPage />} />
          <Route path="anomalie" element={<AnomaliePage />} />
          <Route path="impostazioni" element={<ImpostazioniPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
