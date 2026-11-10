import { Bot, InlineKeyboard } from 'grammy';
import { 
  upsertUser, 
  getUser, 
  createAuthCode, 
  createGiveaway, 
  getGiveaway, 
  addParticipant, 
  getGiveawayParticipants, 
  completeGiveaway, 
  drawWinners,
  addModLog,
  calculateUserWeight,
  getConfig,
  setConfig
} from '../database/queries.js';

let botInstance = null;
let botStatus = {
  isRunning: false,
  startedAt: null,
  botInfo: null,
  error: null
};

export function getBotStatus() {
  return {
    ...botStatus,
    uptimeSeconds: botStatus.startedAt ? Math.floor((Date.now() - botStatus.startedAt) / 1000) : 0
  };
}

export async function stopBot() {
  if (botInstance && botStatus.isRunning) {
    try {
      await botInstance.stop();
    } catch (e) {
      console.warn('[BOT] Advertencia al detener bot:', e.message);
    }
  }
  botInstance = null;
  botStatus = {
    isRunning: false,
    startedAt: null,
    botInfo: null,
    error: null
  };
  console.log('🛑 [BOT] mamboBot se ha detenido.');
  return getBotStatus();
}

export async function startBot(customToken = null) {
  if (botStatus.isRunning) {
    await stopBot();
  }

  const token = customToken || getConfig('telegram_bot_token') || process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token.includes('tu_token_aqui')) {
    botStatus.error = 'Token de Telegram no configurado o inválido';
    console.warn('[BOT] No se puede iniciar: Token no configurado.');
    return getBotStatus();
  }

  try {
    const bot = new Bot(token);
    botInstance = bot;

    // Middleware de registro automático
    bot.use(async (ctx, next) => {
      if (ctx.from) {
        upsertUser({
          id: ctx.from.id,
          username: ctx.from.username,
          first_name: ctx.from.first_name,
          last_name: ctx.from.last_name
        });
      }
      return next();
    });

    // /start
    bot.command('start', async (ctx) => {
      if (ctx.chat.type === 'private') {
        const user = getUser(ctx.from.id);
        const isStaff = user && (user.role === 'owner' || user.role === 'mod');
        
        let msg = `👋 ¡Hola, ${ctx.from.first_name || 'usuario'}!\n\n` +
          `Soy **mamboBot**, el asistente de moderación y sorteos.\n\n` +
          `📌 **Comandos:**\n` +
          `• /misuerte - Consulta tu multiplicador para sorteos.\n`;

        if (isStaff) {
          msg += `\n🛡️ **Panel Staff:**\n` +
            `• /login - Obtén tu PIN para ingresar a la App de mamboBot.\n` +
            `• /sorteo <minutos> <premio> - Inicia un sorteo en un grupo.\n`;
        } else {
          msg += `• /login - Solicita acceso o genera tu PIN.\n`;
        }

        await ctx.reply(msg, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`🤖 ¡mamboBot activo y vigilando el grupo! Usa /sorteo para rifas comunitarias.`);
      }
    });

    // /login
    bot.command('login', async (ctx) => {
      if (ctx.chat.type !== 'private') {
        return ctx.reply('⚠️ Por seguridad, usa /login únicamente en privado con el bot: @' + ctx.me.username);
      }

      const { code } = createAuthCode(ctx.from.id);
      const user = getUser(ctx.from.id);

      const msg = `🔐 **Acceso a la App mamboBot**\n\n` +
        `Tu código PIN de verificación es:\n\n` +
        `👉 \`${code}\` 👈\n\n` +
        `👤 Usuario: @${ctx.from.username || ctx.from.id}\n` +
        `🎖️ Rol actual: **${user?.role || 'member'}**\n` +
        `⏳ Expira en 5 minutos.\n\n` +
        `Ingresa este código en tu aplicación para iniciar sesión.`;

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    });

    // /misuerte
    bot.command('misuerte', async (ctx) => {
      const weight = calculateUserWeight(ctx.from.id);
      const user = getUser(ctx.from.id);
      await ctx.reply(
        `🍀 **Tu Suerte en mamboBot**\n\n` +
        `• Rol: **${user?.role || 'member'}**\n` +
        `• Multiplicador de probabilidad: **x${weight.toFixed(2)}**\n\n` +
        `¡Cuanto mayor sea tu multiplicador, más probabilidades tienes en los sorteos!`,
        { parse_mode: 'Markdown' }
      );
    });

    // /sorteo <minutos> <premio>
    bot.command('sorteo', async (ctx) => {
      const text = ctx.message.text.trim();
      const parts = text.split(' ');
      
      if (parts.length < 3) {
        return ctx.reply(
          `ℹ️ **Uso del comando:**\n\`/sorteo <minutos> <premio>\`\n\nEjemplo:\n\`/sorteo 10 Cuenta VIP 1 Mes\``,
          { parse_mode: 'Markdown' }
        );
      }

      const minutes = parseInt(parts[1], 10);
      if (isNaN(minutes) || minutes <= 0) {
        return ctx.reply('❌ Por favor especifica un tiempo válido en minutos (ej: 5, 10, 60).');
      }

      const prize = parts.slice(2).join(' ');
      const endsAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

      const giveaway = createGiveaway({
        chatId: ctx.chat.id,
        messageId: null,
        title: `Sorteo: ${prize}`,
        description: `¡Participa presionando el botón abajo!`,
        prize: prize,
        winnersCount: 1,
        createdBy: ctx.from.id,
        endsAt: endsAt
      });

      const keyboard = new InlineKeyboard().text('🎟️ ¡Participar en el Sorteo! (0)', `join_giveaway:${giveaway.id}`);

      const sent = await ctx.reply(
        `🎉 **¡NUEVO SORTEO INICIADO!** 🎉\n\n` +
        `🎁 **Premio:** ${prize}\n` +
        `⏳ **Duración:** ${minutes} minuto(s)\n` +
        `⏰ **Finaliza:** ${new Date(endsAt).toLocaleTimeString()}\n` +
        `👥 **Participantes:** 0\n\n` +
        `Toca el botón abajo para entrar. ¡Mucha suerte! 👇`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        }
      );

      scheduleGiveawayDraw(giveaway.id, minutes * 60 * 1000, ctx.chat.id, sent.message_id, prize);
    });

    // Botón participar
    bot.callbackQuery(/^join_giveaway:(\d+)$/, async (ctx) => {
      const giveawayId = parseInt(ctx.match[1], 10);
      const giveaway = getGiveaway(giveawayId);

      if (!giveaway || giveaway.status !== 'active') {
        return ctx.answerCallbackQuery({
          text: '❌ Este sorteo ya ha finalizado o no existe.',
          show_alert: true
        });
      }

      upsertUser({
        id: ctx.from.id,
        username: ctx.from.username,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name
      });

      const { weight } = addParticipant(giveawayId, ctx.from.id);
      const participants = getGiveawayParticipants(giveawayId);

      await ctx.answerCallbackQuery({
        text: `🎟️ ¡Estás participando!\nTu probabilidad tiene multiplicador x${weight.toFixed(2)}.`,
        show_alert: true
      });

      try {
        const updatedKeyboard = new InlineKeyboard().text(
          `🎟️ ¡Participar en el Sorteo! (${participants.length})`,
          `join_giveaway:${giveawayId}`
        );
        await ctx.editMessageReplyMarkup({ reply_markup: updatedKeyboard });
      } catch {
        // Ignorar si el markup no cambió
      }
    });

    // Moderación
    bot.command('warn', async (ctx) => {
      const caller = getUser(ctx.from.id);
      if (!caller || (caller.role !== 'owner' && caller.role !== 'mod')) {
        return ctx.reply('⛔ No tienes permisos de moderación.');
      }

      const replyMsg = ctx.message.reply_to_message;
      let targetUser = replyMsg ? replyMsg.from : null;

      if (!targetUser) {
        return ctx.reply('ℹ️ Responde al mensaje del usuario que deseas advertir con `/warn [motivo]`');
      }

      const reason = ctx.message.text.split(' ').slice(1).join(' ') || 'Incumplimiento de normas';
      addModLog({
        action: 'warn',
        targetUserId: targetUser.id,
        targetUsername: targetUser.username || targetUser.first_name,
        modUserId: ctx.from.id,
        reason: reason
      });

      await ctx.reply(
        `⚠️ **Advertencia aplicada**\n👤 Usuario: @${targetUser.username || targetUser.first_name}\n📝 Motivo: ${reason}\n🛡️ Mod: @${ctx.from.username || ctx.from.first_name}`,
        { parse_mode: 'Markdown' }
      );
    });

    bot.command('kick', async (ctx) => {
      const caller = getUser(ctx.from.id);
      if (!caller || (caller.role !== 'owner' && caller.role !== 'mod')) {
        return ctx.reply('⛔ No tienes permisos de moderación.');
      }

      const replyMsg = ctx.message.reply_to_message;
      if (!replyMsg) {
        return ctx.reply('ℹ️ Responde al mensaje del usuario con `/kick [motivo]`');
      }

      const reason = ctx.message.text.split(' ').slice(1).join(' ') || 'Expulsado por moderación';
      try {
        await ctx.banChatMember(replyMsg.from.id);
        await ctx.unbanChatMember(replyMsg.from.id);

        addModLog({
          action: 'kick',
          targetUserId: replyMsg.from.id,
          targetUsername: replyMsg.from.username || replyMsg.from.first_name,
          modUserId: ctx.from.id,
          reason: reason
        });

        await ctx.reply(`👢 Usuario @${replyMsg.from.username || replyMsg.from.first_name} ha sido expulsado.`);
      } catch (e) {
        await ctx.reply(`❌ Error al expulsar: ${e.message}`);
      }
    });

    bot.command('ban', async (ctx) => {
      const caller = getUser(ctx.from.id);
      if (!caller || (caller.role !== 'owner' && caller.role !== 'mod')) {
        return ctx.reply('⛔ No tienes permisos de moderación.');
      }

      const replyMsg = ctx.message.reply_to_message;
      if (!replyMsg) {
        return ctx.reply('ℹ️ Responde al mensaje del usuario con `/ban [motivo]`');
      }

      const reason = ctx.message.text.split(' ').slice(1).join(' ') || 'Baneado permanentemente';
      try {
        await ctx.banChatMember(replyMsg.from.id);

        addModLog({
          action: 'ban',
          targetUserId: replyMsg.from.id,
          targetUsername: replyMsg.from.username || replyMsg.from.first_name,
          modUserId: ctx.from.id,
          reason: reason
        });

        await ctx.reply(`🔨 Usuario @${replyMsg.from.username || replyMsg.from.first_name} ha sido baneado.`);
      } catch (e) {
        await ctx.reply(`❌ Error al banear: ${e.message}`);
      }
    });

    bot.on(':new_chat_members', async (ctx) => {
      for (const member of ctx.message.new_chat_members) {
        if (member.is_bot) continue;
        upsertUser({
          id: member.id,
          username: member.username,
          first_name: member.first_name,
          last_name: member.last_name
        });
        addModLog({
          action: 'join',
          targetUserId: member.id,
          targetUsername: member.username || member.first_name,
          modUserId: null,
          reason: 'Nuevo miembro se unió al grupo'
        });
      }
    });

    bot.catch((err) => {
      console.error('[BOT ERROR]', err.message || err);
    });

    // Iniciar el bot y guardar info
    await bot.init();
    botStatus = {
      isRunning: true,
      startedAt: Date.now(),
      botInfo: {
        id: bot.botInfo.id,
        username: bot.botInfo.username,
        first_name: bot.botInfo.first_name
      },
      error: null
    };

    bot.start({
      onStart: () => {
        console.log(`⚡ [BOT] mamboBot (@${bot.botInfo.username}) iniciado con éxito.`);
      }
    }).catch((e) => {
      botStatus.isRunning = false;
      botStatus.error = e.message;
      console.warn('[BOT] Error en ciclo de ejecución:', e.message);
    });

    if (customToken) {
      setConfig('telegram_bot_token', customToken);
    }

    return getBotStatus();
  } catch (err) {
    botStatus = {
      isRunning: false,
      startedAt: null,
      botInfo: null,
      error: err.message
    };
    console.error('[BOT STARTUP ERROR]', err.message);
    return getBotStatus();
  }
}

export function scheduleGiveawayDraw(giveawayId, delayMs, chatId, messageId, prize) {
  setTimeout(async () => {
    try {
      const giveaway = getGiveaway(giveawayId);
      if (!giveaway || giveaway.status !== 'active') return;

      const winners = drawWinners(giveawayId, giveaway.winners_count || 1);
      completeGiveaway(giveawayId, winners);

      if (winners.length > 0) {
        const winnerMentions = winners.map((w, idx) => {
          const tag = w.username ? `@${w.username}` : `[${w.first_name}](tg://user?id=${w.user_id})`;
          return `${idx + 1}. 🎉 ${tag} (Suerte: x${(w.calculated_weight || 1).toFixed(2)})`;
        }).join('\n');

        const announceMsg = `🏆 **¡SORTEO FINALIZADO!** 🏆\n\n` +
          `🎁 **Premio:** ${prize || giveaway.prize}\n` +
          `👥 **Total participantes:** ${getGiveawayParticipants(giveawayId).length}\n\n` +
          `🏅 **Ganador(es):**\n${winnerMentions}\n\n` +
          `¡Felicidades! 🎉 Por favor ponte en contacto con los moderadores para reclamar tu premio.`;

        if (botInstance && botStatus.isRunning) {
          await botInstance.api.sendMessage(chatId, announceMsg, { parse_mode: 'Markdown' });
        }
      } else {
        if (botInstance && botStatus.isRunning) {
          await botInstance.api.sendMessage(
            chatId,
            `⌛ El sorteo por **${prize || giveaway.prize}** ha terminado pero no hubo participantes registrados.`
          );
        }
      }
    } catch (err) {
      console.error('[SORTEO DRAW ERROR]', err);
    }
  }, Math.max(1000, delayMs));
}

export function getBot() {
  return botInstance;
}
