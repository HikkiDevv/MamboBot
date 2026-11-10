import { db } from './db.js';

// ==================== CONFIGURACIÓN DINÁMICA ====================
export function getConfig(key) {
  const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
  const res = stmt.get(key);
  return res ? res.value : null;
}

export function setConfig(key, value) {
  const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
  stmt.run(key, value);
  return value;
}

export function getAllConfig() {
  const stmt = db.prepare('SELECT key, value FROM config');
  const rows = stmt.all();
  const config = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

export function getFilterConfig() {
  const welcomeEnabled = getConfig('welcome_enabled') === 'true';
  const welcomeMessage = getConfig('welcome_message') || '👋 ¡Bienvenido/a {usuario} a {grupo}!';
  const blockLinksEnabled = getConfig('block_links_enabled') === 'true';
  let blacklistWords = [];
  try {
    blacklistWords = JSON.parse(getConfig('blacklist_words') || '[]');
  } catch {
    blacklistWords = [];
  }

  return {
    welcomeEnabled,
    welcomeMessage,
    blockLinksEnabled,
    blacklistWords
  };
}

export function updateFilterConfig({ welcomeEnabled, welcomeMessage, blockLinksEnabled, blacklistWords }) {
  if (welcomeEnabled !== undefined) setConfig('welcome_enabled', welcomeEnabled ? 'true' : 'false');
  if (welcomeMessage !== undefined) setConfig('welcome_message', welcomeMessage);
  if (blockLinksEnabled !== undefined) setConfig('block_links_enabled', blockLinksEnabled ? 'true' : 'false');
  if (blacklistWords !== undefined) {
    setConfig('blacklist_words', JSON.stringify(Array.isArray(blacklistWords) ? blacklistWords : []));
  }
  return getFilterConfig();
}

// ==================== USUARIOS & ROLES ====================
export function upsertUser(user) {
  const now = new Date().toISOString();
  const existing = getUser(user.id);

  if (existing) {
    const stmt = db.prepare(`
      UPDATE users 
      SET username = ?, first_name = ?, last_name = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(user.username || existing.username, user.first_name || existing.first_name, user.last_name || existing.last_name, now, user.id);
    return getUser(user.id);
  } else {
    const stmt = db.prepare(`
      INSERT INTO users (id, username, first_name, last_name, role, custom_multiplier, xp, level, messages_count, referrals_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 1, 0, 0, ?, ?)
    `);
    stmt.run(user.id, user.username || null, user.first_name || '', user.last_name || '', user.role || 'member', 1.0, now, now);
    return getUser(user.id);
  }
}

export function getUser(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
}

export function getAllUsers() {
  const stmt = db.prepare(`
    SELECT u.*, 
      COALESCE(rc.multiplier, 1.0) as role_multiplier,
      (u.custom_multiplier * COALESCE(rc.multiplier, 1.0) + ((u.level - 1) * 0.05) + (u.referrals_count * 0.1)) as effective_multiplier
    FROM users u
    LEFT JOIN roles_config rc ON u.role = rc.role_name
    ORDER BY u.messages_count DESC, u.level DESC
    LIMIT 200
  `);
  return stmt.all();
}

export function updateUserRole(id, role) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?');
  stmt.run(role, now, id);
  return getUser(id);
}

export function updateUserMultiplier(id, customMultiplier) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE users SET custom_multiplier = ?, updated_at = ? WHERE id = ?');
  stmt.run(parseFloat(customMultiplier), now, id);
  return getUser(id);
}

export function getRolesConfig() {
  const stmt = db.prepare('SELECT * FROM roles_config');
  return stmt.all();
}

export function updateRoleMultiplier(roleName, multiplier) {
  const stmt = db.prepare('INSERT OR REPLACE INTO roles_config (role_name, multiplier) VALUES (?, ?)');
  stmt.run(roleName, parseFloat(multiplier));
  return getRolesConfig();
}

// ==================== SISTEMA DE NIVELES & REFERIDOS ====================
export function recordUserMessage(userId) {
  const user = getUser(userId);
  if (!user) return null;

  const newMessages = (user.messages_count || 0) + 1;
  const xpGain = 10;
  const newXp = (user.xp || 0) + xpGain;
  
  // Fórmula de nivel: nivel = floor(sqrt(XP / 50)) + 1
  const calculatedLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 50)) + 1);
  const leveledUp = calculatedLevel > (user.level || 1);

  const stmt = db.prepare(`
    UPDATE users 
    SET messages_count = ?, xp = ?, level = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(newMessages, newXp, calculatedLevel, new Date().toISOString(), userId);

  return {
    userId,
    messagesCount: newMessages,
    xp: newXp,
    level: calculatedLevel,
    leveledUp
  };
}

export function processReferral(newUserId, referrerId) {
  if (!referrerId || referrerId === newUserId) return false;
  
  const newUser = getUser(newUserId);
  const referrer = getUser(referrerId);
  
  if (!referrer) return false;
  if (newUser && newUser.referred_by) return false; // Ya fue referido antes

  const now = new Date().toISOString();
  const stmtNew = db.prepare('UPDATE users SET referred_by = ?, updated_at = ? WHERE id = ?');
  stmtNew.run(referrerId, now, newUserId);

  const stmtRef = db.prepare('UPDATE users SET referrals_count = referrals_count + 1, updated_at = ? WHERE id = ?');
  stmtRef.run(now, referrerId);

  return true;
}

export function calculateUserWeight(userId) {
  const user = getUser(userId);
  if (!user) return 1.0;
  
  const roleStmt = db.prepare('SELECT multiplier FROM roles_config WHERE role_name = ?');
  const roleConf = roleStmt.get(user.role || 'member');
  const roleMult = roleConf ? roleConf.multiplier : 1.0;
  
  const customMult = user.custom_multiplier || 1.0;
  // Bono por nivel: +0.05 por cada nivel superior al nivel 1
  const levelBonus = Math.max(0, ((user.level || 1) - 1) * 0.05);
  // Bono por referidos: +0.10 por cada amigo invitado
  const referralBonus = (user.referrals_count || 0) * 0.10;

  const total = (roleMult * customMult) + levelBonus + referralBonus;
  return Number(total.toFixed(2));
}

export function getLeaderboard(limit = 25) {
  const stmt = db.prepare(`
    SELECT u.id, u.username, u.first_name, u.role, u.level, u.xp, u.messages_count, u.referrals_count,
      (u.custom_multiplier * COALESCE(rc.multiplier, 1.0) + ((u.level - 1) * 0.05) + (u.referrals_count * 0.1)) as calculated_weight
    FROM users u
    LEFT JOIN roles_config rc ON u.role = rc.role_name
    WHERE u.is_banned = 0
    ORDER BY u.messages_count DESC, u.xp DESC, u.referrals_count DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

// ==================== AUTENTICACIÓN TELEGRAM ====================
export function createAuthCode(userId) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + (5 * 60 * 1000);

  const delStmt = db.prepare('DELETE FROM auth_codes WHERE user_id = ?');
  delStmt.run(userId);

  const stmt = db.prepare('INSERT INTO auth_codes (code, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)');
  stmt.run(code, userId, expiresAt, now);

  return { code, expiresAt };
}

export function verifyAuthCode(code) {
  const now = Date.now();
  const stmt = db.prepare('SELECT * FROM auth_codes WHERE code = ? AND expires_at > ?');
  const record = stmt.get(code, now);

  if (!record) return null;

  const delStmt = db.prepare('DELETE FROM auth_codes WHERE code = ?');
  delStmt.run(code);

  return getUser(record.user_id);
}

// ==================== SORTEOS ====================
export function createGiveaway({ chatId, messageId, title, description, prize, winnersCount, createdBy, endsAt }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO giveaways (chat_id, message_id, title, description, prize, winners_count, created_by, created_at, ends_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);
  const result = stmt.run(chatId, messageId, title, description || '', prize, winnersCount || 1, createdBy, now, endsAt);
  return getGiveaway(result.lastInsertRowid);
}

export function getGiveaway(id) {
  const stmt = db.prepare('SELECT * FROM giveaways WHERE id = ?');
  const row = stmt.get(id);
  if (!row) return null;
  if (row.winner_ids) {
    try {
      row.winners = JSON.parse(row.winner_ids);
    } catch {
      row.winners = [];
    }
  } else {
    row.winners = [];
  }
  return row;
}

export function getActiveGiveaways() {
  const stmt = db.prepare(`
    SELECT g.*, 
      (SELECT COUNT(*) FROM giveaway_participants gp WHERE gp.giveaway_id = g.id) as participants_count
    FROM giveaways g 
    WHERE status = 'active'
    ORDER BY ends_at ASC
  `);
  return stmt.all();
}

export function getAllGiveaways() {
  const stmt = db.prepare(`
    SELECT g.*, 
      (SELECT COUNT(*) FROM giveaway_participants gp WHERE gp.giveaway_id = g.id) as participants_count
    FROM giveaways g 
    ORDER BY id DESC
    LIMIT 100
  `);
  return stmt.all();
}

export function addParticipant(giveawayId, userId) {
  const weight = calculateUserWeight(userId);
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO giveaway_participants (giveaway_id, user_id, joined_at, calculated_weight)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(giveawayId, userId, now, weight);
  return { giveawayId, userId, weight };
}

export function getGiveawayParticipants(giveawayId) {
  const stmt = db.prepare(`
    SELECT gp.*, u.username, u.first_name, u.last_name, u.role, u.level
    FROM giveaway_participants gp
    JOIN users u ON gp.user_id = u.id
    WHERE gp.giveaway_id = ?
    ORDER BY gp.calculated_weight DESC, gp.joined_at ASC
  `);
  return stmt.all(giveawayId);
}

export function completeGiveaway(id, winners) {
  const stmt = db.prepare(`
    UPDATE giveaways 
    SET status = 'completed', winner_ids = ?
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(winners), id);
  return getGiveaway(id);
}

export function drawWinners(giveawayId, count = 1) {
  const participants = getGiveawayParticipants(giveawayId);
  if (participants.length === 0) return [];

  let pool = [...participants];
  const winners = [];
  const targetCount = Math.min(count, pool.length);

  for (let i = 0; i < targetCount; i++) {
    const totalWeight = pool.reduce((sum, p) => sum + (p.calculated_weight || 1.0), 0);
    let randomNum = Math.random() * totalWeight;

    let selectedIndex = 0;
    for (let j = 0; j < pool.length; j++) {
      randomNum -= pool[j].calculated_weight || 1.0;
      if (randomNum <= 0) {
        selectedIndex = j;
        break;
      }
    }

    winners.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }

  return winners;
}

// ==================== MODERACIÓN & LOGS ====================
export function addModLog({ action, targetUserId, targetUsername, modUserId, reason }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO moderation_logs (action, target_user_id, target_username, mod_user_id, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(action, targetUserId || null, targetUsername || null, modUserId || null, reason || '', now);
}

export function getModLogs(limit = 100) {
  const stmt = db.prepare(`
    SELECT m.*, u.username as mod_username
    FROM moderation_logs m
    LEFT JOIN users u ON m.mod_user_id = u.id
    ORDER BY m.id DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

export function getDashboardStats() {
  const totalUsersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const activeGiveawaysStmt = db.prepare('SELECT COUNT(*) as count FROM giveaways WHERE status = "active"');
  const completedGiveawaysStmt = db.prepare('SELECT COUNT(*) as count FROM giveaways WHERE status = "completed"');
  const logsCountStmt = db.prepare('SELECT COUNT(*) as count FROM moderation_logs');
  const totalMessagesStmt = db.prepare('SELECT SUM(messages_count) as total FROM users');

  return {
    totalUsers: totalUsersStmt.get().count,
    activeGiveaways: activeGiveawaysStmt.get().count,
    completedGiveaways: completedGiveawaysStmt.get().count,
    totalLogs: logsCountStmt.get().count,
    totalMessages: totalMessagesStmt.get().total || 0
  };
}
