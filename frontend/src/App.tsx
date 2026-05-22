import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard';
import KnowledgeGraph from './components/KnowledgeGraph';
import ArticleDetail from './components/ArticleDetail';
import Settings from './components/Settings';
import ReadLater from './components/ReadLater';
import InsightsPage from './pages/InsightsPage';

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/knowledge" element={<KnowledgeGraph />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/articles/:id" element={<ArticleDetail />} />
            <Route path="/read-later" element={<ReadLater />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
