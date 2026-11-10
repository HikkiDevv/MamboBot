# 🤖 mamboBot - Telegram Bot & APK Admin Panel

Sistema completo para gestión y moderación de grupos de Telegram con sorteos ponderados y panel de control en APK para Android.

---

## 📁 Estructura del Proyecto

- **`backend/`**: Servidor Node.js + Telegram Bot (grammY) + Base de datos SQLite de alta velocidad.
  - Endpoints para encender/apagar el bot remotamente.
  - Motor de sorteos interactivos en Telegram con algoritmo ponderado (weighted random).
  - Logs y acciones de moderación (warn, kick, ban, unban, ingresos).
  - Autenticación segura vía PIN de Telegram (`/login`) y Clave Maestra de Dueña.
- **`app/`**: Aplicación móvil para Android construida con React + Vite + Tailwind CSS + Capacitor.
  - Botón táctil para **Encender / Apagar el Bot**.
  - Creación y gestión de sorteos en vivo con participantes y re-roll.
  - Ajuste de probabilidades por Rol (Dueña, Mod, VIP, Booster, Miembro) y por Usuario individual.
  - Panel de moderación y auditoría de eventos.

---

## ⚡ Cómo Usar

### 1. Iniciar el Backend (en local o servidor 24/7 como Railway)
```bash
cd /data/data/com.termux/files/home/mambobot/backend
npm start
```
*(El servidor se iniciará en `http://0.0.0.0:4000`)*.

### 2. Probar la App en el Navegador / Móvil
```bash
cd /data/data/com.termux/files/home/mambobot/app
npm run dev
```

### 3. Acceso al Panel APK
- **Modo Dueña:**
  - Pestaña: **👑 Dueña (Maestra)**
  - Clave inicial por defecto: `mambobot2026` (configurable en `backend/.env` con `OWNER_SECRET_KEY`)
- **Modo Moderador con Telegram:**
  - Envía `/login` en privado a tu bot en Telegram.
  - Copia el PIN de 6 dígitos e ingrésalo en la app.

---

## ☁️ Despliegue en la Nube (24/7 sin gastar batería de tu teléfono)
Para que el bot funcione 24 horas aunque tu teléfono esté apagado:
1. Sube la carpeta `backend` a **Railway**, **Render** o cualquier hosting VPS.
2. En la APK, toca el icono de engranaje (Configuración) y pega la URL de tu servidor en la nube (ejemplo: `https://mambobot.up.railway.app/api`).
3. ¡Listo! Puedes encender y apagar el bot desde el botón de la APK en tu móvil cuando quieras.

---

## 📱 Compilar el APK para Android
El proyecto incluye un flujo automatizado de GitHub Actions en `.github/workflows/android-apk.yml`.
1. Crea un repositorio en GitHub para `mambobot/app`.
2. Sube el código (`git push origin main`).
3. GitHub Actions compilará automáticamente el archivo `.apk` y lo dejará disponible para descarga directa en la sección **Actions / Releases**.
