import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Preprocessing from './pages/Preprocessing.jsx';
import TrainTestSplit from './pages/TrainTestSplit.jsx';
import LinearRegression from './pages/LinearRegression.jsx';
import KNN from './pages/KNN.jsx';
import DecisionTree from './pages/DecisionTree.jsx';
import KMeans from './pages/KMeans.jsx';
import Evaluation from './pages/Evaluation.jsx';
import Comparison from './pages/Comparison.jsx';
import Learn from './pages/Learn.jsx';
import Quiz from './pages/Quiz.jsx';
import Playground from './pages/Playground.jsx';
import NotFound from './pages/NotFound.jsx';

function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu and scroll to the top on navigation.
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="app">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <div className="app__main">
        <Navbar menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((o) => !o)} />
        <main id="main" className="content" tabIndex={-1}>
          <ErrorBoundary key={pathname}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/preprocessing" element={<Preprocessing />} />
              <Route path="/train-test-split" element={<TrainTestSplit />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/linear-regression" element={<LinearRegression />} />
              <Route path="/knn" element={<KNN />} />
              <Route path="/decision-tree" element={<DecisionTree />} />
              <Route path="/kmeans" element={<KMeans />} />
              <Route path="/evaluation" element={<Evaluation />} />
              <Route path="/comparison" element={<Comparison />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </main>
        <footer className="footer">
          ML Algorithm Visualizer · No backend, database or API keys - all processing happens locally in your browser.
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  // HashRouter keeps navigation working offline and from any static host / file path.
  return (
    <HashRouter>
      <AppProvider>
        <Layout />
      </AppProvider>
    </HashRouter>
  );
}
