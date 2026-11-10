import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  UserMinus, 
  UserX, 
  AlertTriangle, 
  UserCheck, 
  Plus, 
  X, 
  Trash2, 
  Save, 
  Sparkles, 
  Link as LinkIcon, 
  MessageSquare, 
  Trophy, 
  Award,
  Users
} from 'lucide-react';
import { apiRequest } from '../api/client';

export const Moderacion: React.FC = () => {
  const [subTab, setSubTab] = useState<'logs' | 'filters' | 'leaderboard'>('logs');
  const [logs, setLogs] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Configuración de Filtros & Bienvenida
  const [blockLinks, setBlockLinks] = useState(true);
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [blacklistWords, setBlacklistWords] = useState<string[]>([]);
  const [newWordInput, setNewWordInput] = useState('');
  const [savingFilters, setSavingFilters] = useState(false);

  // Modal Sanción Manual
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'warn' | 'kick' | 'ban'>('warn');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUsername, setTargetUsername] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchModerationData = async () => {
    try {
      const [logsRes, filtersRes, leadersRes] = await Promise.all([
        apiRequest('/moderacion/logs?limit=80').catch(() => []),
        apiRequest('/moderacion/filters').catch(() => null),
        apiRequest('/moderacion/leaderboard?limit=30').catch(() => [])
      ]);

      setLogs(logsRes);
      setLeaderboard(leadersRes);

      if (filtersRes) {
        setBlockLinks(filtersRes.blockLinksEnabled);
        setWelcomeEnabled(filtersRes.welcomeEnabled);
        setWelcomeMessage(filtersRes.welcomeMessage);
        setBlacklistWords(filtersRes.blacklistWords || []);
      }
    } catch {
      // Ignorar errores menores
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationData();
    const interval = setInterval(fetchModerationData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newWordInput.trim().toLowerCase();
    if (!word || blacklistWords.includes(word)) return;
    setBlacklistWords([...blacklistWords, word]);
    setNewWordInput('');
  };

  const handleRemoveWord = (wordToRemove: string) => {
    setBlacklistWords(blacklistWords.filter((w) => w !== wordToRemove));
  };

  const handleSaveFilters = async () => {
    setSavingFilters(true);
    setFeedback(null);
    try {
      await apiRequest('/moderacion/filters', {
        method: 'POST',
        body: JSON.stringify({
          blockLinksEnabled: blockLinks,
          welcomeEnabled,
          welcomeMessage,
          blacklistWords
        })
      });
      setFeedback('✅ Filtros y mensaje de bienvenida guardados');
    } catch (err: any) {
      setFeedback(`Error al guardar: ${err.message}`);
    } finally {
      setSavingFilters(false);
    }
  };

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
      await fetchModerationData();
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
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            Centro de Control
          </h2>
          <p className="text-xs text-gray-400">Moderación, filtros automáticos y ranking</p>
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
        <div className="mb-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Sub-Pestañas */}
      <div className="grid grid-cols-3 p-1 bg-gray-900/90 rounded-2xl mb-4 border border-gray-800 text-center">
        <button
          onClick={() => setSubTab('logs')}
          className={`py-2 text-xs font-semibold rounded-xl transition ${
            subTab === 'logs' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          Bitácora Logs
        </button>
        <button
          onClick={() => setSubTab('filters')}
          className={`py-2 text-xs font-semibold rounded-xl transition ${
            subTab === 'filters' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          Filtros & Bienvenida
        </button>
        <button
          onClick={() => setSubTab('leaderboard')}
          className={`py-2 text-xs font-semibold rounded-xl transition ${
            subTab === 'leaderboard' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          🏆 Ranking
        </button>
      </div>

      {/* ================= PESTAÑA 1: BITÁCORA LOGS ================= */}
      {subTab === 'logs' && (
        <div>
          {/* Filtros rápidos */}
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
        </div>
      )}

      {/* ================= PESTAÑA 2: FILTROS & BIENVENIDA ================= */}
      {subTab === 'filters' && (
        <div className="space-y-4">
          {/* Bloqueo de Enlaces */}
          <div className="bg-[#121828] border border-gray-800 rounded-3xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Bloqueo de Enlaces (Anti-Spam)</h3>
                  <p className="text-[10px] text-gray-400">
                    Borra automáticamente enlaces enviados por miembros regulares
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={blockLinks}
                onChange={(e) => setBlockLinks(e.target.checked)}
                className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Lista Negra de Palabras */}
          <div className="bg-[#121828] border border-gray-800 rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Lista Negra de Palabras
            </h3>
            <p className="text-[10px] text-gray-400 mb-3">
              Si un mensaje contiene alguna de estas palabras, el bot lo borra y advierte al usuario.
            </p>

            {/* Input agregar palabra */}
            <form onSubmit={handleAddWord} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Añadir palabra o frase prohibida..."
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.target.value)}
                className="flex-1 bg-[#182138] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition"
              >
                Añadir
              </button>
            </form>

            {/* Chips de palabras */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {blacklistWords.length === 0 ? (
                <span className="text-[11px] text-gray-500">No hay palabras en la lista negra.</span>
              ) : (
                blacklistWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-medium"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(word)}
                      className="hover:text-rose-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Plantilla de Bienvenida */}
          <div className="bg-[#121828] border border-gray-800 rounded-3xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-violet-400" />
                Mensaje de Bienvenida
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400">Activo</span>
                <input
                  type="checkbox"
                  checked={welcomeEnabled}
                  onChange={(e) => setWelcomeEnabled(e.target.checked)}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mb-2">
              Variables disponibles: <code className="text-violet-400 font-mono">{"{usuario}"}</code> (mención) y <code className="text-violet-400 font-mono">{"{grupo}"}</code> (nombre del grupo).
            </p>

            <textarea
              rows={3}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="👋 ¡Bienvenido/a {usuario} a {grupo}! 🎉"
              className="w-full bg-[#182138] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none font-sans"
            />
          </div>

          {/* Botón Guardar Cambios */}
          <button
            onClick={handleSaveFilters}
            disabled={savingFilters}
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{savingFilters ? 'Guardando...' : 'Guardar Filtros y Bienvenida'}</span>
          </button>
        </div>
      )}

      {/* ================= PESTAÑA 3: RANKING & NIVELES ================= */}
      {subTab === 'leaderboard' && (
        <div className="space-y-3">
          <div className="bg-[#121828] border border-gray-800 rounded-3xl p-4 shadow-lg mb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
              <Trophy className="w-4 h-4 text-amber-400" />
              Sistema de Niveles & Tickets Automáticos
            </h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Cada mensaje suma <b>XP</b>. Subir de nivel suma <b>+0.05x</b> de suerte permanente en sorteos. Cada amigo invitado mediante <code>/invitar</code> suma <b>+0.10x</b>.
            </p>
          </div>

          {leaderboard.length === 0 ? (
            <div className="bg-[#121828]/60 border border-gray-800 rounded-2xl p-8 text-center text-xs text-gray-500">
              Aún no hay miembros con actividad registrada.
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((u, idx) => (
                <div
                  key={u.id}
                  className="bg-[#121828] border border-gray-800 rounded-2xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Medalla o número */}
                    <div className="w-7 text-center font-bold text-sm">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                        <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">
                          @{u.username || u.first_name || u.id}
                        </span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          Nv.{u.level || 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                        <span>💬 {u.messages_count || 0} msgs</span>
                        <span>👥 {u.referrals_count || 0} referidos</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-400/20">
                      x{(u.calculated_weight || 1).toFixed(2)} suerte
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
