import { Router } from 'express';
import { InlineKeyboard } from 'grammy';
import { 
  getAllGiveaways, 
  getGiveaway, 
  createGiveaway, 
  getGiveawayParticipants,
  drawWinners, 
  completeGiveaway,
  getRolesConfig, 
  updateRoleMultiplier, 
  getAllUsers, 
  updateUserMultiplier, 
  updateUserRole 
} from '../database/queries.js';
import { requireAuth, requireStaff } from './auth.js';
import { getBot, scheduleGiveawayDraw } from '../bot/bot.js';

export const sorteosRouter = Router();

// Todas las rutas requieren estar autenticado
sorteosRouter.use(requireAuth);

// 1. Obtener lista de todos los sorteos
sorteosRouter.get('/', (req, res) => {
  const giveaways = getAllGiveaways();
  res.json(giveaways);
});

// 2. Obtener un sorteo específico con participantes
sorteosRouter.get('/:id', (req, res) => {
  const giveaway = getGiveaway(req.params.id);
  if (!giveaway) {
    return res.status(404).json({ error: 'Sorteo no encontrado' });
  }

  const participants = getGiveawayParticipants(req.params.id);
  res.json({ giveaway, participants });
});

// 3. Crear sorteo desde la App (Dueña / Mod)
sorteosRouter.post('/', requireStaff, async (req, res) => {
  const { title, description, prize, winnersCount, durationMinutes, chatId } = req.body;

  if (!prize || !durationMinutes) {
    return res.status(400).json({ error: 'Premio y duración son requeridos' });
  }

  const targetChatId = chatId || process.env.TELEGRAM_GROUP_ID;
  if (!targetChatId) {
    return res.status(400).json({ error: 'Chat ID del grupo de Telegram no configurado' });
  }

  const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

  const giveaway = createGiveaway({
    chatId: targetChatId,
    messageId: null,
    title: title || `Sorteo: ${prize}`,
    description: description || '',
    prize: prize,
    winnersCount: winnersCount || 1,
    createdBy: req.user.id,
    endsAt: endsAt
  });

  const bot = getBot();
  let messageId = null;

  if (bot) {
    try {
      const keyboard = new InlineKeyboard().text('🎟️ ¡Participar en el Sorteo! (0)', `join_giveaway:${giveaway.id}`);
      const sent = await bot.api.sendMessage(
        targetChatId,
        `🎉 **¡NUEVO SORTEO DESDE EL PANEL!** 🎉\n\n` +
        `🎁 **Premio:** ${prize}\n` +
        `📝 ${description || '¡Participa tocando el botón abajo!'}\n\n` +
        `⏳ **Duración:** ${durationMinutes} minuto(s)\n` +
        `⏰ **Finaliza:** ${new Date(endsAt).toLocaleTimeString()}\n` +
        `👥 **Participantes:** 0`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        }
      );
      messageId = sent.message_id;
    } catch (err) {
      console.error('[SORTEO CREATION TELEGRAM SEND ERROR]', err.message);
    }
  }

  scheduleGiveawayDraw(giveaway.id, durationMinutes * 60 * 1000, targetChatId, messageId, prize);

  res.status(201).json(giveaway);
});

// 4. Re-sortear (Re-roll) si un ganador no reclama
sorteosRouter.post('/:id/reroll', requireStaff, async (req, res) => {
  const giveaway = getGiveaway(req.params.id);
  if (!giveaway) {
    return res.status(404).json({ error: 'Sorteo no encontrado' });
  }

  const winners = drawWinners(giveaway.id, giveaway.winners_count || 1);
  if (winners.length === 0) {
    return res.status(400).json({ error: 'No hay participantes suficientes para re-sortear' });
  }

  completeGiveaway(giveaway.id, winners);

  const bot = getBot();
  if (bot && giveaway.chat_id) {
    const winnerMentions = winners.map((w, idx) => {
      const tag = w.username ? `@${w.username}` : `[${w.first_name}](tg://user?id=${w.user_id})`;
      return `${idx + 1}. 🎉 ${tag} (Suerte: x${(w.calculated_weight || 1).toFixed(2)})`;
    }).join('\n');

    try {
      await bot.api.sendMessage(
        giveaway.chat_id,
        `🎲 **¡NUEVO GANADOR (RE-ROLL)!** 🎲\n\n` +
        `🎁 **Premio:** ${giveaway.prize}\n\n` +
        `🏅 **Nuevo(s) Ganador(es):**\n${winnerMentions}\n\n` +
        `¡Felicidades! 🎉`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('[REROLL NOTIFY ERROR]', e.message);
    }
  }

  res.json({ message: 'Re-sorteo ejecutado con éxito', winners });
});

// 5. Configuración de probabilidades por roles
sorteosRouter.get('/config/roles', (req, res) => {
  const roles = getRolesConfig();
  res.json(roles);
});

sorteosRouter.post('/config/roles', requireStaff, (req, res) => {
  const { roleName, multiplier } = req.body;
  if (!roleName || multiplier === undefined) {
    return res.status(400).json({ error: 'roleName y multiplier son requeridos' });
  }

  const updated = updateRoleMultiplier(roleName, multiplier);
  res.json(updated);
});

// 6. Lista de usuarios y sus probabilidades personalizadas
sorteosRouter.get('/config/users', (req, res) => {
  const users = getAllUsers();
  res.json(users);
});

// Modificar multiplicador personalizado de un usuario
sorteosRouter.post('/config/users/:id/weight', requireStaff, (req, res) => {
  const { multiplier } = req.body;
  if (multiplier === undefined || isNaN(multiplier)) {
    return res.status(400).json({ error: 'Multiplicador numérico requerido' });
  }

  const updated = updateUserMultiplier(req.params.id, multiplier);
  res.json(updated);
});

// Modificar rol de un usuario
sorteosRouter.post('/config/users/:id/role', requireStaff, (req, res) => {
  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ error: 'Rol requerido' });
  }

  const updated = updateUserRole(req.params.id, role);
  res.json(updated);
});
