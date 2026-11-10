import React from 'react';
import { Power, Settings, LogOut, ShieldAlert, Bot } from 'lucide-react';

interface HeaderProps {
  user: any;
  botStatus: any;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, botStatus, onLogout, onOpenSettings }) => {
  const isOnline = botStatus?.isRunning;

  return (
    <header className="sticky top-0 z-40 bg-[#0d1322]/90 backdrop-blur-md border-b border-gray-800/80 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/20">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-none tracking-tight flex items-center gap-1.5 text-white">
            mamboBot
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-500/30">
              Admin
            </span>
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[11px] font-medium text-gray-400">
              {isOnline ? (
                <span className="text-emerald-400">En Línea {botStatus?.botInfo?.username ? `(@${botStatus.botInfo.username})` : ''}</span>
              ) : (
                <span className="text-rose-400">Bot Apagado</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenSettings}
          title="Configuración de Servidor y Conexión"
          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 text-gray-400 hover:text-white transition"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onLogout}
          title="Cerrar Sesión"
          className="p-2 rounded-lg bg-gray-800/60 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
