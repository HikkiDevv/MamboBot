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
  recordUserMessage,
  processReferral,
  getLeaderboard,
  getFilterConfig,
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

    // 1. Middleware de registro de usuario
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

    // 2. Comando /start (soporta referidos /start ref_123456)
    bot.command('start', async (ctx) => {
      const payload = ctx.match?.trim();

      if (ctx.chat.type === 'private') {
        // Verificar si viene de un enlace de referido
        if (payload && payload.startsWith('ref_')) {
          const referrerId = parseInt(payload.replace('ref_', ''), 10);
          if (!isNaN(referrerId)) {
            const success = processReferral(ctx.from.id, referrerId);
            if (success) {
              await ctx.reply('🤝 ¡Te has registrado mediante invitación! Ambos reciben un bono de suerte en sorteos.');
              try {
                await bot.api.sendMessage(
                  referrerId,
                  `🎉 ¡Un amigo (@${ctx.from.username || ctx.from.first_name}) usó tu enlace de invitación! Tu suerte en sorteos aumentó (+0.10x).`
                );
              } catch {}
            }
          }
        }

        const user = getUser(ctx.from.id);
        const isStaff = user && (user.role === 'owner' || user.role === 'mod');
        
        let msg = `👋 ¡Hola, ${ctx.from.first_name || 'usuario'}!\n\n` +
          `Soy **mamboBot**, asistente de moderación, niveles y sorteos.\n\n` +
          `📌 **Comandos de usuario:**\n` +
          `• /misuerte - Consulta tu nivel y multiplicador de suerte.\n` +
          `• /invitar - Obtén tu enlace personal para ganar suerte invitando amigos.\n` +
          `• /top - Ver el ranking de miembros más activos y con mayor nivel.\n`;

        if (isStaff) {
          msg += `\n🛡️ **Panel Staff:**\n` +
            `• /login - Obtén tu PIN para ingresar a la App de mamboBot.\n` +
            `• /sorteo <minutos> <premio> - Inicia un sorteo en el grupo.\n`;
        }

        await ctx.reply(msg, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`🤖 ¡mamboBot activo en el grupo! Chatea para subir de nivel y escribe /top o /misuerte.`);
      }
    });

    // 3. Comando /invitar (Sistema de referidos)
    bot.command('invitar', async (ctx) => {
      const user = getUser(ctx.from.id);
      const botUsername = ctx.me.username;
      const refLink = `https://t.me/${botUsername}?start=ref_${ctx.from.id}`;

      const msg = `👥 **Tu Enlace de Invitación / Referidos**\n\n` +
        `Comparte este enlace con tus amigos:\n` +
        `👉 \`${refLink}\`\n\n` +
        `📊 **Tus estadísticas:**\n` +
        `• Amigos invitados: **${user?.referrals_count || 0}**\n` +
        `• Bono de suerte ganado: **+${((user?.referrals_count || 0) * 0.1).toFixed(2)}x**\n\n` +
        `¡Cada persona que entre con tu link te suma más probabilidades permanentes en los sorteos!`;

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    });

    // 4. Comando /misuerte
    bot.command('misuerte', async (ctx) => {
      const weight = calculateUserWeight(ctx.from.id);
      const user = getUser(ctx.from.id);
      const xp = user?.xp || 0;
      const level = user?.level || 1;
      const nextLevelXp = (level * level) * 50;

      await ctx.reply(
        `🍀 **Perfil de Suerte en mamboBot**\n\n` +
        `👤 Usuario: @${user?.username || ctx.from.first_name}\n` +
        `🎖️ Rol: **${user?.role || 'member'}**\n` +
        `⭐ Nivel: **${level}** (XP: ${xp}/${nextLevelXp})\n` +
        `💬 Mensajes enviados: **${user?.messages_count || 0}**\n` +
        `👥 Amigos invitados: **${user?.referrals_count || 0}**\n\n` +
        `🔥 **Multiplicador total de Suerte: x${weight.toFixed(2)}**\n` +
        `_(Sube de nivel chateando o invitando amigos para ganar más probabilidad)_`,
        { parse_mode: 'Markdown' }
      );
    });

    // 5. Comando /top (Leaderboard en Telegram)
    bot.command(['top', 'ranking'], async (ctx) => {
      const leaders = getLeaderboard(10);
      if (leaders.length === 0) {
        return ctx.reply('📊 Aún no hay suficiente actividad registrada en el ranking.');
      }

      let msg = `🏆 **TOP 10 MIEMBROS MÁS ACTIVOS** 🏆\n\n`;
      leaders.forEach((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const tag = u.username ? `@${u.username}` : (u.first_name || `ID:${u.id}`);
        msg += `${medal} **${tag}** (Nv.${u.level || 1})\n` +
               `   💬 ${u.messages_count || 0} msgs | 🍀 x${(u.calculated_weight || 1).toFixed(2)} suerte\n`;
      });

      msg += `\n💬 ¡Chatea en el grupo para subir de nivel en el ranking!`;
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    });

    // 6. Comando /login (PIN para la app)
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

    // 7. Comando /sorteo <minutos> <premio>
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

    // 8. Botón participar en sorteo
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
      const user = getUser(ctx.from.id);

      await ctx.answerCallbackQuery({
        text: `🎟️ ¡Estás participando!\nNv.${user?.level || 1} • Tu suerte tiene multiplicador x${weight.toFixed(2)}.`,
        show_alert: true
      });

      try {
        const updatedKeyboard = new InlineKeyboard().text(
          `🎟️ ¡Participar en el Sorteo! (${participants.length})`,
          `join_giveaway:${giveawayId}`
        );
        await ctx.editMessageReplyMarkup({ reply_markup: updatedKeyboard });
      } catch {}
    });

    // 9. Moderación manual (/warn, /kick, /ban) por respuesta o por @username
    bot.command('warn', async (ctx) => {
      const caller = getUser(ctx.from.id);
      if (!caller || (caller.role !== 'owner' && caller.role !== 'mod')) {
        return ctx.reply('⛔ No tienes permisos de moderación.');
      }

      const textParts = ctx.message.text.split(' ').filter(Boolean);
      const replyMsg = ctx.message.reply_to_message;
      let targetUser = replyMsg ? replyMsg.from : null;
      let reason = 'Incumplimiento de normas';

      if (!targetUser && textParts.length > 1) {
        const targetArg = textParts[1];
        const found = getUserByUsername(targetArg);
        if (found) {
          targetUser = found;
          reason = textParts.slice(2).join(' ') || reason;
        }
      } else if (targetUser) {
        reason = textParts.slice(1).join(' ') || reason;
      }

      if (!targetUser) {
        return ctx.reply('ℹ️ Responde al mensaje del usuario o escribe `/warn @usuario [motivo]`', { parse_mode: 'Markdown' });
      }

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

      const textParts = ctx.message.text.split(' ').filter(Boolean);
      const replyMsg = ctx.message.reply_to_message;
      let targetUser = replyMsg ? replyMsg.from : null;
      let reason = 'Expulsado por moderación';

      if (!targetUser && textParts.length > 1) {
        const targetArg = textParts[1];
        const found = getUserByUsername(targetArg);
        if (found) {
          targetUser = found;
          reason = textParts.slice(2).join(' ') || reason;
        }
      } else if (targetUser) {
        reason = textParts.slice(1).join(' ') || reason;
      }

      if (!targetUser) {
        return ctx.reply('ℹ️ Responde al mensaje del usuario o escribe `/kick @usuario [motivo]`', { parse_mode: 'Markdown' });
      }

      try {
        await ctx.banChatMember(targetUser.id);
        await ctx.unbanChatMember(targetUser.id);

        addModLog({
          action: 'kick',
          targetUserId: targetUser.id,
          targetUsername: targetUser.username || targetUser.first_name,
          modUserId: ctx.from.id,
          reason: reason
        });

        await ctx.reply(`👢 Usuario @${targetUser.username || targetUser.first_name} ha sido expulsado.`);
      } catch (e) {
        await ctx.reply(`❌ Error al expulsar: ${e.message}`);
      }
    });

    bot.command('ban', async (ctx) => {
      const caller = getUser(ctx.from.id);
      if (!caller || (caller.role !== 'owner' && caller.role !== 'mod')) {
        return ctx.reply('⛔ No tienes permisos de moderación.');
      }

      const textParts = ctx.message.text.split(' ').filter(Boolean);
      const replyMsg = ctx.message.reply_to_message;
      let targetUser = replyMsg ? replyMsg.from : null;
      let reason = 'Baneado permanentemente';

      if (!targetUser && textParts.length > 1) {
        const targetArg = textParts[1];
        const found = getUserByUsername(targetArg);
        if (found) {
          targetUser = found;
          reason = textParts.slice(2).join(' ') || reason;
        }
      } else if (targetUser) {
        reason = textParts.slice(1).join(' ') || reason;
      }

      if (!targetUser) {
        return ctx.reply('ℹ️ Responde al mensaje del usuario o escribe `/ban @usuario [motivo]`', { parse_mode: 'Markdown' });
      }

      try {
        await ctx.banChatMember(targetUser.id);

        addModLog({
          action: 'ban',
          targetUserId: targetUser.id,
          targetUsername: targetUser.username || targetUser.first_name,
          modUserId: ctx.from.id,
          reason: reason
        });

        await ctx.reply(`🔨 Usuario @${targetUser.username || targetUser.first_name} ha sido baneado.`);
      } catch (e) {
        await ctx.reply(`❌ Error al banear: ${e.message}`);
      }
    });

    // 10. Filtro automático de mensajes en grupos (Blacklist palabras + Bloqueo de enlaces + Contador de Niveles/XP)
    bot.on('message:text', async (ctx, next) => {
      if (ctx.chat.type === 'private') return next();

      const text = ctx.message.text.toLowerCase();
      const user = getUser(ctx.from.id);
      const isStaff = user && (user.role === 'owner' || user.role === 'mod');
      const filterConfig = getFilterConfig();

      // A) Comprobar Lista Negra de Palabras
      if (!isStaff && filterConfig.blacklistWords.length > 0) {
        const foundWord = filterConfig.blacklistWords.find((w) => text.includes(w.toLowerCase()));
        if (foundWord) {
          try {
            await ctx.deleteMessage();
            addModLog({
              action: 'warn',
              targetUserId: ctx.from.id,
              targetUsername: ctx.from.username || ctx.from.first_name,
              modUserId: null,
              reason: `Mensaje contenía palabra prohibida: "${foundWord}"`
            });
            const warnMsg = await ctx.reply(
              `⚠️ @${ctx.from.username || ctx.from.first_name}, tu mensaje fue eliminado por contener vocabulario o spam no permitido.`,
              { reply_to_message_id: ctx.message.message_id }
            ).catch(() => null);
            if (warnMsg) setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, warnMsg.message_id).catch(() => {}), 6000);
          } catch {}
          return; // No procesar XP si es spam
        }
      }

      // B) Comprobar Bloqueo de Enlaces
      if (!isStaff && filterConfig.blockLinksEnabled) {
        const hasEntitiesLink = ctx.message.entities?.some((e) => e.type === 'url' || e.type === 'text_link');
        const hasTextLink = /(https?:\/\/|t\.me\/|telegram\.me\/|wa\.me\/)/i.test(text);

        if (hasEntitiesLink || hasTextLink) {
          try {
            await ctx.deleteMessage();
            addModLog({
              action: 'warn',
              targetUserId: ctx.from.id,
              targetUsername: ctx.from.username || ctx.from.first_name,
              modUserId: null,
              reason: 'Envío de enlace no autorizado'
            });
            const warnMsg = await ctx.reply(
              `🚫 @${ctx.from.username || ctx.from.first_name}, no está permitido enviar enlaces en este grupo.`,
              { reply_to_message_id: ctx.message.message_id }
            ).catch(() => null);
            if (warnMsg) setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, warnMsg.message_id).catch(() => {}), 6000);
          } catch {}
          return; // No procesar XP si violó norma
        }
      }

      // C) Si el mensaje es limpio: Sumar XP y Mensajes para el sistema de niveles
      const result = recordUserMessage(ctx.from.id);
      if (result && result.leveledUp) {
        const newWeight = calculateUserWeight(ctx.from.id);
        const tag = ctx.from.username ? `@${ctx.from.username}` : `[${ctx.from.first_name}](tg://user?id=${ctx.from.id})`;
        await ctx.reply(
          `🎉 **¡SUBIDA DE NIVEL!** 🎉\n` +
          `¡Felicidades ${tag}! Has alcanzado el **Nivel ${result.level}**.\n` +
          `🍀 Tu multiplicador de suerte en sorteos aumentó a **x${newWeight.toFixed(2)}**!`,
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      }

      return next();
    });

    // 11. Evento de Bienvenida Personalizada
    bot.on(':new_chat_members', async (ctx) => {
      const filterConfig = getFilterConfig();

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

        // Enviar mensaje de bienvenida personalizado si está habilitado
        if (filterConfig.welcomeEnabled && filterConfig.welcomeMessage) {
          const userMention = member.username ? `@${member.username}` : `[${member.first_name}](tg://user?id=${member.id})`;
          const groupTitle = ctx.chat.title || 'el grupo';

          const formatted = filterConfig.welcomeMessage
            .replace(/{usuario}/g, userMention)
            .replace(/{grupo}/g, groupTitle);

          await ctx.reply(formatted, { parse_mode: 'Markdown' }).catch(() => {});
        }
      }
    });

    bot.catch((err) => {
      console.error('[BOT ERROR]', err.message || err);
    });

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
