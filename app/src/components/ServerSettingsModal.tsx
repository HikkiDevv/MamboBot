import React, { useState } from 'react';
import { Server, Check, X } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(url);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
      window.location.reload();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-gray-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-violet-400" />
            Conexión de Servidor API
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          URL del backend donde corre mamboBot (en Railway, VPS o red local):
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tu-app-en-railway.up.railway.app/api"
            className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 font-mono"
            required
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5"
            >
              {saved ? <Check className="w-3.5 h-3.5 text-white" /> : 'Guardar y Recargar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
