import { Router } from 'express';
import { startBot, stopBot, getBotStatus } from '../bot/bot.js';
import { setConfig, getConfig } from '../database/queries.js';
import { requireAuth, requireStaff } from './auth.js';

export const botControlRouter = Router();

// Consultar estado en vivo del bot (público o autenticado)
botControlRouter.get('/status', (req, res) => {
  const status = getBotStatus();
  const configuredGroup = getConfig('telegram_group_id') || process.env.TELEGRAM_GROUP_ID || null;
  res.json({
    ...status,
    groupId: configuredGroup
  });
});

// Encender bot desde la App (Dueña / Mods)
botControlRouter.post('/start', requireAuth, requireStaff, async (req, res) => {
  const { token } = req.body;
  if (token) {
    setConfig('telegram_bot_token', token.trim());
  }

  const status = await startBot(token);
  if (status.error) {
    return res.status(400).json({ error: status.error, status });
  }

  res.json({ message: 'Bot encendido con éxito', status });
});

// Apagar bot desde la App (Dueña / Mods)
botControlRouter.post('/stop', requireAuth, requireStaff, async (req, res) => {
  const status = await stopBot();
  res.json({ message: 'Bot apagado correctamente', status });
});

// Guardar configuración (token, id del grupo)
botControlRouter.post('/config', requireAuth, requireStaff, (req, res) => {
  const { token, groupId } = req.body;

  if (token) {
    setConfig('telegram_bot_token', token.trim());
  }
  if (groupId) {
    setConfig('telegram_group_id', groupId.toString().trim());
  }

  res.json({
    message: 'Configuración guardada exitosamente',
    groupId: getConfig('telegram_group_id'),
    hasToken: Boolean(getConfig('telegram_bot_token'))
  });
});
