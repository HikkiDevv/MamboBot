import React, { useEffect, useState } from 'react';
import { BotPowerCard } from '../components/BotPowerCard';
import { Users, Gift, ShieldAlert, Sparkles, PlusCircle, ArrowRight, Clock, Trophy } from 'lucide-react';
import { apiRequest } from '../api/client';

interface DashboardProps {
  botStatus: any;
  onRefreshBot: () => void;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ botStatus, onRefreshBot, onNavigateTab }) => {
  const [stats, setStats] = useState<any>({ totalUsers: 0, activeGiveaways: 0, completedGiveaways: 0, totalLogs: 0 });
  const [activeGiveaways, setActiveGiveaways] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [statsRes, giveawaysRes, logsRes] = await Promise.all([
        apiRequest('/moderacion/stats').catch(() => ({ totalUsers: 0, activeGiveaways: 0, completedGiveaways: 0, totalLogs: 0 })),
        apiRequest('/sorteos').catch(() => []),
        apiRequest('/moderacion/logs?limit=4').catch(() => [])
      ]);

      setStats(statsRes);
      setActiveGiveaways(giveawaysRes.filter((g: any) => g.status === 'active'));
      setRecentLogs(logsRes);
    } catch (e) {
      // Ignorar errores menores
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto">
      {/* Botón y Tarjeta de Encendido / Apagado del Bot */}
      <BotPowerCard botStatus={botStatus} onRefresh={onRefreshBot} />

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div 
          onClick={() => onNavigateTab('pesos')}
          className="bg-[#121828] border border-gray-800 rounded-2xl p-3.5 cursor-pointer hover:border-violet-500/50 transition group"
        >
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-medium">Usuarios Registrados</span>
            <Users className="w-4 h-4 text-violet-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl font-bold text-white">{stats.totalUsers}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Con pesos asignados</p>
        </div>

        <div 
          onClick={() => onNavigateTab('sorteos')}
          className="bg-[#121828] border border-gray-800 rounded-2xl p-3.5 cursor-pointer hover:border-violet-500/50 transition group"
        >
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-medium">Sorteos Activos</span>
            <Gift className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{stats.activeGiveaways}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">{stats.completedGiveaways} completados</p>
        </div>
      </div>

      {/* Sorteos Activos en Vivo */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-violet-400" />
            Sorteos en Curso
          </h3>
          <button
            onClick={() => onNavigateTab('sorteos')}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {activeGiveaways.length === 0 ? (
          <div className="bg-[#121828]/60 border border-dashed border-gray-800 rounded-2xl p-5 text-center">
            <Trophy className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No hay sorteos en curso en este momento.</p>
            <button
              onClick={() => onNavigateTab('sorteos')}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium inline-flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Crear Nuevo Sorteo
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeGiveaways.map((giveaway) => (
              <div
                key={giveaway.id}
                onClick={() => onNavigateTab('sorteos')}
                className="bg-[#121828] border border-gray-800 rounded-2xl p-3.5 cursor-pointer hover:border-violet-500/40 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{giveaway.prize}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{giveaway.title}</p>
                  </div>
                  <span className="text-[11px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Activo
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400 pt-2 border-t border-gray-800/60">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-violet-400" />
                    {giveaway.participants_count || 0} participantes
                  </span>
                  <span className="flex items-center gap-1 text-amber-400/90">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(giveaway.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actividad Reciente de Moderación */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
            Actividad Reciente
          </h3>
          <button
            onClick={() => onNavigateTab('moderacion')}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition"
          >
            <span>Ver log</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div className="bg-[#121828]/60 border border-gray-800 rounded-2xl p-4 text-center text-xs text-gray-500">
            No hay eventos recientes registrados.
          </div>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div key={log.id} className="bg-[#121828] border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    log.action === 'ban' ? 'bg-rose-500/20 text-rose-400' :
                    log.action === 'kick' ? 'bg-amber-500/20 text-amber-400' :
                    log.action === 'warn' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {log.action}
                  </span>
                  <div>
                    <div className="text-xs font-medium text-white">
                      @{log.target_username || log.target_user_id || 'Usuario'}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate max-w-[180px]">
                      {log.reason || 'Sin motivo especificado'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
