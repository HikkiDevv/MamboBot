import React, { useState, useEffect } from 'react';
import { Gift, Plus, Users, Clock, Trophy, RotateCcw, AlertCircle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { apiRequest } from '../api/client';

export const Sorteos: React.FC = () => {
  const [giveaways, setGiveaways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGiveaway, setSelectedGiveaway] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [prize, setPrize] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [winnersCount, setWinnersCount] = useState(1);

  const fetchGiveaways = async () => {
    try {
      const data = await apiRequest('/sorteos');
      setGiveaways(data);
    } catch (e: any) {
      setFeedback(`Error al cargar sorteos: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiveaways();
    const interval = setInterval(fetchGiveaways, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateGiveaway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prize) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      await apiRequest('/sorteos', {
        method: 'POST',
        body: JSON.stringify({
          prize,
          description,
          durationMinutes: Number(durationMinutes),
          winnersCount: Number(winnersCount)
        })
      });

      setFeedback('🎉 ¡Sorteo creado y publicado en Telegram!');
      setShowCreateModal(false);
      setPrize('');
      setDescription('');
      await fetchGiveaways();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewParticipants = async (giveaway: any) => {
    setSelectedGiveaway(giveaway);
    setLoadingParticipants(true);
    try {
      const res = await apiRequest(`/sorteos/${giveaway.id}`);
      setParticipants(res.participants || []);
    } catch (e) {
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleReroll = async (id: number) => {
    if (!confirm('¿Deseas volver a sortear (re-roll) para elegir un nuevo ganador?')) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await apiRequest(`/sorteos/${id}/reroll`, { method: 'POST' });
      setFeedback('🎲 ¡Re-sorteo ejecutado y anunciado en Telegram!');
      await fetchGiveaways();
      if (selectedGiveaway?.id === id) {
        handleViewParticipants(selectedGiveaway);
      }
    } catch (err: any) {
      setFeedback(`Error al re-sortear: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredGiveaways = giveaways.filter((g) => g.status === activeTab);

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-violet-400" />
            Gestión de Sorteos
          </h2>
          <p className="text-xs text-gray-400">Crea rifas y consulta los participantes</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-violet-900/30 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Crear Sorteo
        </button>
      </div>

      {feedback && (
        <div className="mb-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Selector de Pestaña */}
      <div className="grid grid-cols-2 p-1 bg-gray-900/90 rounded-2xl mb-4 border border-gray-800">
        <button
          onClick={() => setActiveTab('active')}
          className={`py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'active' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          En Curso ({giveaways.filter((g) => g.status === 'active').length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'completed' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          Historial / Ganadores ({giveaways.filter((g) => g.status === 'completed').length})
        </button>
      </div>

      {/* Lista de Sorteos */}
      {filteredGiveaways.length === 0 ? (
        <div className="bg-[#121828]/60 border border-dashed border-gray-800 rounded-2xl p-8 text-center">
          <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-400">
            {activeTab === 'active'
              ? 'No hay sorteos activos en este momento.'
              : 'No hay sorteos finalizados en el historial.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGiveaways.map((g) => {
            let winnersList: any[] = [];
            if (g.winner_ids) {
              try {
                winnersList = typeof g.winner_ids === 'string' ? JSON.parse(g.winner_ids) : g.winner_ids;
              } catch {}
            }

            return (
              <div
                key={g.id}
                className="bg-[#121828] border border-gray-800 rounded-2xl p-4 shadow-sm hover:border-gray-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{g.prize}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{g.title}</p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      g.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {g.status === 'active' ? 'Activo' : 'Finalizado'}
                  </span>
                </div>

                {/* Ganadores si está completado */}
                {winnersList.length > 0 && (
                  <div className="mt-3 p-2.5 rounded-xl bg-violet-950/30 border border-violet-500/20">
                    <div className="text-[11px] font-bold text-violet-300 flex items-center gap-1 mb-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      Ganador(es):
                    </div>
                    {winnersList.map((w: any, idx: number) => (
                      <div key={idx} className="text-xs text-gray-200">
                        🎉 @{w.username || w.first_name || w.user_id}{' '}
                        <span className="text-[10px] text-gray-400">(Suerte: x{(w.calculated_weight || 1).toFixed(2)})</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/80">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-violet-400" />
                      {g.participants_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {new Date(g.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleViewParticipants(g)}
                      className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition"
                    >
                      Participantes
                    </button>
                    {g.status === 'completed' && (
                      <button
                        onClick={() => handleReroll(g.id)}
                        disabled={actionLoading}
                        title="Re-sortear"
                        className="p-1 rounded-lg bg-gray-800 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 transition"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Sorteo */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-violet-400" />
                Nuevo Sorteo
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGiveaway} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Premio *</label>
                <input
                  type="text"
                  placeholder="Ej: Cuenta VIP 1 Mes / $10 USD"
                  value={prize}
                  onChange={(e) => setPrize(e.target.value)}
                  className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Instrucciones / Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Toca el botón abajo para participar en la rifa..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Duración (Minutos)</label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Nº Ganadores</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={winnersCount}
                    onChange={(e) => setWinnersCount(Number(e.target.value))}
                    className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition disabled:opacity-50"
                >
                  {actionLoading ? 'Publicando...' : 'Lanzar Sorteo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Participantes */}
      {selectedGiveaway && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white truncate max-w-[220px]">
                  {selectedGiveaway.prize}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {participants.length} participante(s) inscritos
                </p>
              </div>
              <button onClick={() => setSelectedGiveaway(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {loadingParticipants ? (
                <div className="text-center py-6 text-xs text-gray-400">Cargando participantes...</div>
              ) : participants.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  Aún no hay participantes inscritos en este sorteo.
                </div>
              ) : (
                participants.map((p) => (
                  <div key={p.user_id} className="bg-[#182138] rounded-xl p-2.5 flex items-center justify-between border border-gray-800">
                    <div>
                      <div className="text-xs font-semibold text-white">
                        @{p.username || p.first_name || p.user_id}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Rol: <span className="uppercase text-violet-400">{p.role || 'member'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                        x{(p.calculated_weight || 1).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 mt-2 border-t border-gray-800">
              <button
                onClick={() => setSelectedGiveaway(null)}
                className="w-full py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-medium hover:bg-gray-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
