require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const os = require('os');
const fs = require('fs');
const https = require('https');

const db = require('./config/database');
const { initRealtime } = require('./utils/realtime');
const { ensureSchemaMigrations } = require('./utils/db_migrations');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');

const app = express();
const PORT = process.env.PORT || 5000;
const SERVER_IP = process.env.SERVER_IP || '0.0.0.0';
const PORT_TLS = Number(process.env.PORT_TLS) || 5443;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:3000'
    ];

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: null,
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", "https://www.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        workerSrc: ["'self'", "blob:"],
        connectSrc: ["'self'", "https://www.gstatic.com", "https://fonts.gstatic.com", "http://localhost:*", "http://127.0.0.1:*", "http://192.168.107.135:*", "http://*", "ws:", "wss:"],
      },
    },
  })
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Reward App server is running' });
});

app.get('/download-apk', (req, res) => {
  res.download(path.join(__dirname, 'public', 'admin.apk'));
});

// SPA Fallback route for Flutter Web client routing
app.get('/*splat', (req, res, next) => {
  // Unknown API paths must return JSON 404, never the Flutter HTML shell.
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // If request contains an extension (e.g. .css, .js, .png), pass to Express 404 handler
  if (path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'studentlogin.html'));
});

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

async function start() {
  await db.init();
  await ensureSchemaMigrations();

  const displayIp = SERVER_IP !== '0.0.0.0' ? SERVER_IP : getLocalIP();

  const server = app.listen(PORT, '0.0.0.0', () => {
    initRealtime(server);
    console.log('=============================================');
    console.log('  Reward App Server Running!');
    console.log('=============================================');
    console.log(`  Admin Dashboard:  http://${displayIp}:${PORT}/adminlogin.html`);
    console.log(`  Student PWA:      http://${displayIp}:${PORT}/studentlogin.html`);
    console.log(`  Health Check:     http://${displayIp}:${PORT}/api/health`);
    console.log('  Database:          MySQL (' + (process.env.DB_NAME || 'reward_app') + ')');
    console.log('=============================================');
  });

  // HTTPS server: serves the same app for the admin wrapper (secure-context camera).
  // Skipped gracefully when certs are missing so the HTTP server is never blocked.
  const certKeyPath = path.join(__dirname, 'certs', 'server.key');
  const certPath = path.join(__dirname, 'certs', 'server.crt');
  if (fs.existsSync(certKeyPath) && fs.existsSync(certPath)) {
    const tlsServer = https.createServer({
      key: fs.readFileSync(certKeyPath),
      cert: fs.readFileSync(certPath)
    }, app);
    tlsServer.listen(PORT_TLS, '0.0.0.0', () => {
      initRealtime(tlsServer);
      console.log('  Admin TLS (camera): https://' + displayIp + ':' + PORT_TLS + '/adminlogin.html');
    });
  } else {
    console.log('  Admin TLS (camera): SKIPPED (certs/server.key or server.crt not found)');
  }
}

start().catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
