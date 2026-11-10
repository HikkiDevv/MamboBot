import { Router } from 'express';
import { getModLogs, getDashboardStats, addModLog } from '../database/queries.js';
import { requireAuth, requireStaff } from './auth.js';
import { getBot } from '../bot/bot.js';

export const moderacionRouter = Router();

moderacionRouter.use(requireAuth);

// 1. Estadísticas generales para el dashboard
moderacionRouter.get('/stats', (req, res) => {
  const stats = getDashboardStats();
  res.json(stats);
});

// 2. Historial de logs de moderación y actividad
moderacionRouter.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const logs = getModLogs(limit);
  res.json(logs);
});

// 3. Registrar acción de moderación manual desde el panel
moderacionRouter.post('/action', requireStaff, async (req, res) => {
  const { action, targetUserId, targetUsername, reason } = req.body;

  if (!action || !targetUserId) {
    return res.status(400).json({ error: 'Acción y targetUserId son requeridos' });
  }

  addModLog({
    action,
    targetUserId,
    targetUsername: targetUsername || null,
    modUserId: req.user.id,
    reason: reason || ''
  });

  const bot = getBot();
  const groupId = process.env.TELEGRAM_GROUP_ID;

  if (bot && groupId) {
    try {
      if (action === 'kick') {
        await bot.api.banChatMember(groupId, targetUserId);
        await bot.api.unbanChatMember(groupId, targetUserId);
      } else if (action === 'ban') {
        await bot.api.banChatMember(groupId, targetUserId);
      } else if (action === 'unban') {
        await bot.api.unbanChatMember(groupId, targetUserId);
      }
    } catch (err) {
      console.error('[MODERATION ACTION TELEGRAM ERROR]', err.message);
    }
  }

  res.json({ success: true, message: `Acción ${action} registrada correctamente` });
});
