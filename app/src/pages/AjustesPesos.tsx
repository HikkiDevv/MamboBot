import React, { useState, useEffect } from 'react';
import { Sliders, Users, Shield, Sparkles, Check, Search, Save, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api/client';

export const AjustesPesos: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  // Cargar roles y usuarios
  const fetchData = async () => {
    try {
      const [rolesRes, usersRes] = await Promise.all([
        apiRequest('/sorteos/config/roles').catch(() => []),
        apiRequest('/sorteos/config/users').catch(() => [])
      ]);
      setRoles(rolesRes);
      setUsers(usersRes);
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateRole = async (roleName: string, multiplier: number) => {
    setSavingRoleId(roleName);
    setFeedback(null);
    try {
      await apiRequest('/sorteos/config/roles', {
        method: 'POST',
        body: JSON.stringify({ roleName, multiplier: Number(multiplier) })
      });
      setFeedback(`Multiplicador de rol '${roleName}' actualizado a x${multiplier}`);
      await fetchData();
    } catch (e: any) {
      setFeedback(`Error: ${e.message}`);
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleUpdateUserWeight = async (userId: number, multiplier: number) => {
    try {
      await apiRequest(`/sorteos/config/users/${userId}/weight`, {
        method: 'POST',
        body: JSON.stringify({ multiplier: Number(multiplier) })
      });
      setFeedback(`Probabilidad de usuario actualizada a x${multiplier}`);
      await fetchData();
    } catch (e: any) {
      setFeedback(`Error: ${e.message}`);
    }
  };

  const handleUpdateUserRole = async (userId: number, role: string) => {
    try {
      await apiRequest(`/sorteos/config/users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role })
      });
      setFeedback(`Rol actualizado a ${role}`);
      await fetchData();
    } catch (e: any) {
      setFeedback(`Error: ${e.message}`);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.first_name && u.first_name.toLowerCase().includes(q)) ||
      u.id.toString().includes(q)
    );
  });

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-violet-400" />
          Probabilidades y Suerte
        </h2>
        <p className="text-xs text-gray-400">
          Ajusta los multiplicadores de sorteo por rol y por usuario específico
        </p>
      </div>

      {feedback && (
        <div className="mb-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Sección 1: Probabilidad por Rol */}
      <div className="bg-[#121828] border border-gray-800 rounded-3xl p-4 mb-5 shadow-lg">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5 mb-3">
          <Shield className="w-4 h-4 text-violet-400" />
          Multiplicadores por Rol
        </h3>

        <div className="space-y-3">
          {roles.map((r) => (
            <div key={r.role_name} className="bg-[#182138] rounded-2xl p-3 border border-gray-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {r.role_name}
                </span>
                <p className="text-[10px] text-gray-400">
                  Multiplicador base para miembros con este rol
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  defaultValue={r.multiplier}
                  onBlur={(e) => handleUpdateRole(r.role_name, parseFloat(e.target.value) || 1.0)}
                  className="w-16 bg-[#111827] border border-gray-700 rounded-xl px-2 py-1 text-xs text-center text-amber-400 font-bold focus:outline-none focus:border-violet-500"
                />
                <span className="text-xs font-semibold text-gray-400">x</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección 2: Probabilidad por Usuario Específico */}
      <div className="bg-[#121828] border border-gray-800 rounded-3xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-violet-400" />
            Usuarios y Suerte Individual
          </h3>
          <span className="text-[11px] text-gray-500">{filteredUsers.length} encontrados</span>
        </div>

        {/* Buscador */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por @usuario o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#182138] border border-gray-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Lista de Usuarios */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500">
            No se encontraron usuarios. Los miembros aparecen automáticamente cuando interactúan en el grupo de Telegram.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-[#182138] border border-gray-800 rounded-2xl p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">
                      @{user.username || user.first_name || user.id}
                    </span>
                    <div className="text-[10px] text-gray-400">
                      ID: {user.id}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Selector de Rol */}
                    <select
                      value={user.role || 'member'}
                      onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                      className="bg-[#111827] border border-gray-700 rounded-xl px-2 py-1 text-[11px] text-violet-300 font-semibold uppercase focus:outline-none focus:border-violet-500"
                    >
                      <option value="member">Member</option>
                      <option value="vip">VIP</option>
                      <option value="booster">Booster</option>
                      <option value="mod">Mod</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-800/60">
                  <span className="text-[11px] text-gray-400">Multiplicador propio:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="20"
                      defaultValue={user.custom_multiplier || 1.0}
                      onBlur={(e) => handleUpdateUserWeight(user.id, parseFloat(e.target.value) || 1.0)}
                      className="w-16 bg-[#111827] border border-gray-700 rounded-xl px-2 py-0.5 text-xs text-center text-amber-400 font-bold focus:outline-none focus:border-violet-500"
                    />
                    <span className="text-xs font-semibold text-gray-400">x</span>
                    <span className="text-[10px] text-gray-500 ml-1">
                      (Total: x{(user.effective_multiplier || user.custom_multiplier || 1).toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
