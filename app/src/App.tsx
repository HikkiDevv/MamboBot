import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NavigationBar } from './components/NavigationBar';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Sorteos } from './pages/Sorteos';
import { AjustesPesos } from './pages/AjustesPesos';
import { Moderacion } from './pages/Moderacion';
import { getToken, clearAuth, apiRequest } from './api/client';

export const App: React.FC = () => {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [botStatus, setBotStatus] = useState<any>({ isRunning: false, botInfo: null });
  const [showSettings, setShowSettings] = useState(false);

  // Cargar usuario inicial si hay token
  useEffect(() => {
    const savedUser = localStorage.getItem('mambobot_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }
  }, []);

  // Consultar estado del bot
  const fetchBotStatus = async () => {
    try {
      const res = await apiRequest('/bot/status');
      setBotStatus(res);
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    if (token) {
      fetchBotStatus();
      const interval = setInterval(fetchBotStatus, 6000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleLogout = () => {
    clearAuth();
    setTokenState(null);
    setUser(null);
  };

  if (!token) {
    return (
      <Login
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setTokenState(getToken());
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans select-none">
      {/* Header Superior */}
      <Header
        user={user}
        botStatus={botStatus}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Contenido Principal según Pestaña */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'dashboard' && (
          <Dashboard
            botStatus={botStatus}
            onRefreshBot={fetchBotStatus}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'sorteos' && <Sorteos />}
        {activeTab === 'pesos' && <AjustesPesos />}
        {activeTab === 'moderacion' && <Moderacion />}
      </main>

      {/* Barra de Navegación Inferior */}
      <NavigationBar activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Modal de Conexión de Servidor */}
      <ServerSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default App;
