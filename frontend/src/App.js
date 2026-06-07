import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { I18nProvider, useI18n } from './lib/i18n';
import { AuthProvider } from './lib/auth';
import { Header } from './components/Header';
import Home from './pages/Home';
import Register from './pages/Register';
import Matches from './pages/Matches';
import MyPredictions from './pages/MyPredictions';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';
import './App.css';

const Layout = ({ children }) => {
  const { isAr } = useI18n();
  return (
    <div className="App" dir={isAr ? 'rtl' : 'ltr'} data-testid="app-root">
      <Header />
      <main>{children}</main>
      <footer className="border-t border-white/5 mt-20 py-8 px-4 text-center text-xs text-slate-500">
        © 2026 National Care Co. · {isAr ? 'مسابقة كأس العالم' : 'World Cup Contest'}
      </footer>
      <Toaster position={isAr ? 'top-left' : 'top-right'} theme="dark" richColors />
    </div>
  );
};

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/my-predictions" element={<MyPredictions />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
