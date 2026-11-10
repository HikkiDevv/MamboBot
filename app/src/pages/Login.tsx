import React, { useState } from 'react';
import { Bot, KeyRound, ShieldCheck, Server, AlertCircle, Sparkles } from 'lucide-react';
import { apiRequest, setToken, setApiBaseUrl, getApiBaseUrl } from '../api/client';

interface LoginProps {
  onSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'pin' | 'owner'>('owner');
  const [pin, setPin] = useState('');
  const [ownerKey, setOwnerKey] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError(null);

    try {
      setApiBaseUrl(serverUrl);
      const res = await apiRequest('/auth/login-pin', {
        method: 'POST',
        body: JSON.stringify({ code: pin.trim() })
      });

      setToken(res.token);
      localStorage.setItem('mambobot_user', JSON.stringify(res.user));
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerKey.trim()) return;
    setLoading(true);
    setError(null);

    try {
      setApiBaseUrl(serverUrl);
      const res = await apiRequest('/auth/login-owner', {
        method: 'POST',
        body: JSON.stringify({
          key: ownerKey.trim(),
          username: ownerUsername.trim() || 'mambo'
        })
      });

      setToken(res.token);
      localStorage.setItem('mambobot_user', JSON.stringify(res.user));
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Error de acceso de owner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-violet-600/30 mb-3">
            <Bot className="w-9 h-9 text-white stroke-[1.8]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
            mamboBot
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Panel de Moderación y Sorteos Ponderados
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#121828] border border-gray-800 rounded-3xl p-6 shadow-2xl">
          {/* Tabs Selector */}
          <div className="grid grid-cols-2 p-1 bg-gray-900/80 rounded-2xl mb-5 border border-gray-800">
            <button
              onClick={() => { setTab('owner'); setError(null); }}
              className={`py-2 text-xs font-semibold rounded-xl transition ${
                tab === 'owner'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              👑 Owner
            </button>
            <button
              onClick={() => { setTab('pin'); setError(null); }}
              className={`py-2 text-xs font-semibold rounded-xl transition ${
                tab === 'pin'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🔑 PIN de Telegram
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'owner' ? (
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Contraseña de Owner
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={ownerKey}
                    onChange={(e) => setOwnerKey(e.target.value)}
                    className="w-full bg-[#182138] border border-gray-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Acceso directo de Owner sin necesidad de encender el bot previamente.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Tu Nombre o @Username (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="@mambo"
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  className="w-full bg-[#182138] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30 transition active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Entrar al Panel'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Código PIN de 6 dígitos
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full tracking-widest text-center text-lg font-mono font-bold bg-[#182138] border border-gray-700/80 rounded-xl py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-2 bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">
                  💡 Abre Telegram, inicia chat privado con el bot y envía <b className="text-violet-400">/login</b> para recibir tu código PIN temporal.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30 transition active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Validando PIN...' : 'Verificar y Entrar'}
              </button>
            </form>
          )}

          {/* Toggle de Configuración de Servidor */}
          <div className="mt-5 pt-4 border-t border-gray-800/80">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="text-[11px] text-gray-400 hover:text-gray-200 flex items-center justify-center gap-1.5 w-full transition"
            >
              <Server className="w-3.5 h-3.5" />
              <span>{showServerConfig ? 'Ocultar conexión de servidor' : 'Configurar URL del Servidor'}</span>
            </button>

            {showServerConfig && (
              <div className="mt-3">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://localhost:4000/api o URL de Railway"
                  className="w-full bg-[#182138] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Para producción pon tu URL de Railway o Render (ej: <code>https://tu-app.up.railway.app/api</code>).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
