import { Routes, Route } from 'react-router-dom';
import AppNavbar from './components/AppNavbar';
import Footer from './components/Footer';
import TextAnalysisPage from './pages/TextAnalysisPage';
import BiasScorePage from './pages/BiasScorePage';
import NeutralPositionPage from './pages/NeutralPositionPage';
import AboutPage from './pages/AboutPage';

function App() {
  return (
    <>
      <AppNavbar />
      <main>
        <Routes>
          <Route path="/" element={<TextAnalysisPage />} />
          <Route path="/bias-score" element={<BiasScorePage />} />
          <Route path="/neutral-position" element={<NeutralPositionPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;
