const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const beritaRoutes = require('./routes/berita');
const suratRoutes = require('./routes/surat');
const pengaduanRoutes = require('./routes/pengaduan');
const statistikRoutes = require('./routes/statistik');
const pengumumanRoutes = require('./routes/pengumuman');
const pariwisataRoutes = require('./routes/pariwisata');
const lembagaRoutes = require('./routes/lembaga');
const strukturRoutes = require('./routes/struktur');
const pesanKontakRoutes = require('./routes/pesan_kontak');
const agendaRoutes = require('./routes/agenda');
const tentangRoutes = require('./routes/tentang');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const isDev = process.env.NODE_ENV !== 'production';

// Rate limiting (longgar untuk dev, ketat untuk login/register)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 200,
  message: {
    error: 'Terlalu banyak permintaan, silakan coba lagi beberapa saat lagi.'
  }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 20 : 10,
  message: {
    error: 'Terlalu banyak percobaan login/register, silakan coba lagi nanti.'
  }
});

// Terapkan general limiter hanya untuk endpoint data
app.use(['/api/berita', '/api/surat', '/api/pengaduan', '/api/statistik', '/api/pengumuman', '/api/pariwisata', '/api/lembaga', '/api/struktur', '/api/tentang'], generalLimiter);
// Terapkan limiter ketat hanya untuk login/register
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS configuration - lebih permisif untuk development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://web-sidomulyo-a9tz.vercel.app'
  // Tambahkan port frontend Anda di sini jika berbeda
];
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed for this origin'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware - tingkatkan limit untuk handle base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/berita', beritaRoutes);
app.use('/api/surat', suratRoutes);
app.use('/api/pengaduan', pengaduanRoutes);
app.use('/api/statistik', statistikRoutes);
app.use('/api/pengumuman', pengumumanRoutes);
app.use('/api/pariwisata', pariwisataRoutes);
app.use('/api/lembaga', lembagaRoutes);
app.use('/api/struktur', strukturRoutes);
app.use('/api/pesan-kontak', pesanKontakRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/tentang', tentangRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'WebSidomulyo API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'WebSidomulyo API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      berita: '/api/berita',
      surat: '/api/surat',
      pengaduan: '/api/pengaduan',
      tentang: '/api/tentang'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/me'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle specific errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      message: err.message 
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Token tidak valid atau expired' 
    });
  }
  
  // Default error
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Terjadi kesalahan pada server'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`🌐 Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app; 