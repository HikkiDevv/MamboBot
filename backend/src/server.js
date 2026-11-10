import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database/db.js';
import { startBot } from './bot/bot.js';
import { authRouter } from './routes/auth.js';
import { sorteosRouter } from './routes/sorteos.js';
import { moderacionRouter } from './routes/moderacion.js';
import { botControlRouter } from './routes/botControl.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Inicializar DB SQLite
initDatabase();

// Iniciar bot si hay token configurado y válido
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (BOT_TOKEN && !BOT_TOKEN.includes('tu_token_aqui')) {
  startBot(BOT_TOKEN);
} else {
  console.log('ℹ️  [BOT] Bot en espera. Puedes encenderlo y configurar el token desde la App con el botón.');
}

// Rutas de API
app.use('/api/auth', authRouter);
app.use('/api/bot', botControlRouter);
app.use('/api/sorteos', sorteosRouter);
app.use('/api/moderacion', moderacionRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'mamboBot API', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [mamboBot Backend] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
});
