import React, { useState } from 'react';
import { Power, Radio, AlertTriangle, Key, Users, RefreshCw, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../api/client';

interface BotPowerCardProps {
  botStatus: any;
  onRefresh: () => void;
}

export const BotPowerCard: React.FC<BotPowerCardProps> = ({ botStatus, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [groupInput, setGroupInput] = useState(botStatus?.groupId || '');
  const [feedback, setFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    if (botStatus?.groupId && !groupInput) {
      setGroupInput(botStatus.groupId);
    }
  }, [botStatus?.groupId]);

  const isRunning = botStatus?.isRunning;

  const handleToggleBot = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      if (isRunning) {
        await apiRequest('/bot/stop', { method: 'POST' });
        setFeedback('Bot apagado correctamente');
      } else {
        const res = await apiRequest('/bot/start', { method: 'POST' });
        if (res.status?.isRunning) {
          setFeedback('¡Bot encendido con éxito!');
        } else if (res.status?.error) {
          setFeedback(`Error: ${res.status.error}`);
          setShowConfigModal(true);
        }
      }
      await onRefresh();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
      if (err.message.includes('Token')) {
        setShowConfigModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      await apiRequest('/bot/config', {
        method: 'POST',
        body: JSON.stringify({
          token: tokenInput || undefined,
          groupId: groupInput || undefined
        })
      });

      // Si no estaba corriendo y pusimos token, intentar arrancar
      if (tokenInput) {
        await apiRequest('/bot/start', {
          method: 'POST',
          body: JSON.stringify({ token: tokenInput })
        });
      }

      setFeedback('Configuración guardada y aplicada');
      setShowConfigModal(false);
      await onRefresh();
    } catch (err: any) {
      setFeedback(`Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number = 0) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="bg-gradient-to-br from-[#12192c] to-[#182138] border border-gray-800 rounded-2xl p-4 shadow-xl mb-4 relative overflow-hidden">
      {/* Glow decorativo de fondo */}
      <div className={`absolute -right-12 -top-12 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none ${isRunning ? 'bg-emerald-500' : 'bg-rose-500'}`} />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isRunning ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <Radio className={`w-5 h-5 ${isRunning ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Motor Telegram</h2>
            <p className="text-xs text-gray-400">
              {isRunning ? `Activo (${formatUptime(botStatus.uptimeSeconds)})` : 'Inactivo / Apagado'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowConfigModal(true)}
          className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700/60 flex items-center gap-1 transition"
        >
          <Key className="w-3.5 h-3.5" />
          Configurar
        </button>
      </div>

      {botStatus?.error && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{botStatus.error}</span>
        </div>
      )}

      {feedback && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Botón Principal de Encendido/Apagado */}
      <button
        onClick={handleToggleBot}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg active:scale-95 ${
          isRunning
            ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-900/30'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
        } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        <Power className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        <span>{isRunning ? 'Apagar Bot de Telegram' : 'Encender Bot de Telegram'}</span>
      </button>

      {/* Modal de Configuración de Token y Grupo */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-violet-400" />
              Configurar Bot de Telegram
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Ingresa el token proporcionado por <b>@BotFather</b> y el ID del grupo donde se harán los sorteos.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Token del Bot (@BotFather)
                </label>
                <input
                  type="password"
                  placeholder="123456789:ABCdefGHIjklmnOPQRstuVWXyz"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  ID del Grupo de Telegram (ej: -100...)
                </label>
                <input
                  type="text"
                  placeholder="-1001234567890"
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition flex items-center justify-center gap-1.5"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Guardar y Activar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
