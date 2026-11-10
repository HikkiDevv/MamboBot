import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, UserMinus, UserX, AlertTriangle, UserCheck, Plus, X } from 'lucide-react';
import { apiRequest } from '../api/client';

export const Moderacion: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'warn' | 'kick' | 'ban'>('warn');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUsername, setTargetUsername] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = async () => {
    try {
      const data = await apiRequest('/moderacion/logs?limit=80');
      setLogs(data);
    } catch (e: any) {
      // Ignorar errores menores
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleManualAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      await apiRequest('/moderacion/action', {
        method: 'POST',
        body: JSON.stringify({
          action: actionType,
          targetUserId: Number(targetUserId),
          targetUsername: targetUsername || undefined,
          reason
        })
      });

      setFeedback(`Acción de moderación (${actionType.toUpperCase()}) aplicada con éxito.`);
      setShowActionModal(false);
      setTargetUserId('');
      setTargetUsername('');
      setReason('');
      await fetchLogs();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.action === filter;
  });

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            Moderación y Actividad
          </h2>
          <p className="text-xs text-gray-400">Historial de sanciones, ingresos y eventos</p>
        </div>

        <button
          onClick={() => setShowActionModal(true)}
          className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-900/30 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Sancionar
        </button>
      </div>

      {feedback && (
        <div className="mb-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs">
          {feedback}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'warn', label: 'Advertencias' },
          { id: 'kick', label: 'Expulsiones' },
          { id: 'ban', label: 'Baneos' },
          { id: 'join', label: 'Ingresos' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
              filter === btn.id
                ? 'bg-violet-600 text-white'
                : 'bg-[#121828] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Lista de Eventos */}
      {filteredLogs.length === 0 ? (
        <div className="bg-[#121828]/60 border border-gray-800 rounded-2xl p-8 text-center text-xs text-gray-500">
          No hay registros de moderación para este filtro.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-[#121828] border border-gray-800 rounded-2xl p-3.5 flex items-start justify-between"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl mt-0.5 ${
                  log.action === 'ban' ? 'bg-rose-500/20 text-rose-400' :
                  log.action === 'kick' ? 'bg-amber-500/20 text-amber-400' :
                  log.action === 'warn' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {log.action === 'ban' ? <UserX className="w-4 h-4" /> :
                   log.action === 'kick' ? <UserMinus className="w-4 h-4" /> :
                   log.action === 'warn' ? <AlertTriangle className="w-4 h-4" /> :
                   <UserCheck className="w-4 h-4" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      @{log.target_username || log.target_user_id || 'Usuario'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      ID: {log.target_user_id}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 mt-0.5">
                    {log.reason || 'Acción registrada por el sistema'}
                  </p>

                  {log.mod_username && (
                    <span className="text-[10px] text-violet-400 font-medium">
                      Mod: @{log.mod_username}
                    </span>
                  )}
                </div>
              </div>

              <span className="text-[10px] text-gray-500 whitespace-nowrap">
                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal Sanción Manual */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Aplicar Sanción
              </h3>
              <button onClick={() => setShowActionModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAction} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Tipo de Acción</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-900 rounded-xl border border-gray-800">
                  <button
                    type="button"
                    onClick={() => setActionType('warn')}
                    className={`py-1.5 text-xs font-bold rounded-lg ${actionType === 'warn' ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}
                  >
                    Warn
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('kick')}
                    className={`py-1.5 text-xs font-bold rounded-lg ${actionType === 'kick' ? 'bg-amber-600 text-white' : 'text-gray-400'}`}
                  >
                    Kick
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('ban')}
                    className={`py-1.5 text-xs font-bold rounded-lg ${actionType === 'ban' ? 'bg-rose-600 text-white' : 'text-gray-400'}`}
                  >
                    Ban
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">ID Numérico de Telegram *</label>
                <input
                  type="number"
                  placeholder="Ej: 123456789"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">@Username (Opcional)</label>
                <input
                  type="text"
                  placeholder="@usuario"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Motivo</label>
                <textarea
                  rows={2}
                  placeholder="Spam, insultos, contenido no permitido..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition disabled:opacity-50"
                >
                  {submitting ? 'Aplicando...' : 'Confirmar Sanción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
