import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAuthCode, getUser } from '../database/queries.js';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mambobot_super_secret_jwt_key_2026';

// Middleware de autenticación JWT
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

// Middleware para verificar que sea owner o mod
export function requireStaff(req, res, next) {
  if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'mod')) {
    return res.status(403).json({ error: 'Acceso restringido a moderadores y owner' });
  }
  next();
}

// Login directo de Owner con Contraseña
authRouter.post('/login-owner', (req, res) => {
  const { key, username } = req.body;
  const masterKey = process.env.OWNER_SECRET_KEY || 'mambobot2026';

  if (!key || key !== masterKey) {
    return res.status(401).json({ error: 'Contraseña de owner incorrecta' });
  }

  // Id virtual de owner inicial o existente
  const ownerId = 100000000;
  const user = {
    id: ownerId,
    username: username || 'mambo',
    first_name: 'mambo',
    role: 'owner'
  };

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });

  return res.json({
    token,
    user
  });
});
authRouter.post('/login-pin', (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código PIN requerido' });
  }

  const user = verifyAuthCode(code.trim());
  if (!user) {
    return res.status(401).json({ error: 'Código PIN incorrecto o expirado. Solicita uno nuevo con /login en Telegram.' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      custom_multiplier: user.custom_multiplier
    }
  });
});

// Obtener datos del usuario logueado
authRouter.get('/me', requireAuth, (req, res) => {
  const user = getUser(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  return res.json({
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    custom_multiplier: user.custom_multiplier
  });
});
