const express = require('express');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadFlexible, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// Get all pengaduan (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM pengaduan';
    let countQuery = 'SELECT COUNT(*) as total FROM pengaduan';
    let params = [];
    let countParams = [];

    if (status) {
      query += ' WHERE status = ?';
      countQuery += ' WHERE status = ?';
      params.push(status);
      countParams.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [pengaduan] = await promisePool.query(query, params);
    const [countResult] = await promisePool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      pengaduan,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get pengaduan error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get pengaduan milik user login
router.get('/my-pengaduan', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [pengaduan] = await promisePool.query(
      'SELECT * FROM pengaduan WHERE user_id = ? ORDER BY tanggal_pengaduan DESC LIMIT ? OFFSET ?',
      [userId, parseInt(limit), offset]
    );

    const [countResult] = await promisePool.query(
      'SELECT COUNT(*) as total FROM pengaduan WHERE user_id = ?',
      [userId]
    );

    res.json({
      pengaduan,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(countResult[0].total / limit),
        total_items: countResult[0].total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get my pengaduan error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get pengaduan by ID (admin only)
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [pengaduan] = await promisePool.query(
      'SELECT * FROM pengaduan WHERE id = ?',
      [id]
    );

    if (pengaduan.length === 0) {
      return res.status(404).json({ error: 'Pengaduan tidak ditemukan' });
    }

    res.json({ pengaduan: pengaduan[0] });
  } catch (error) {
    console.error('Get pengaduan by ID error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create pengaduan (public) - DIBANGUN ULANG
router.post('/', auth, (req, res, next) => {
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Hanya file gambar JPG, JPEG, atau PNG yang diperbolehkan!'));
    }
  };
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
  }).single('img');
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File terlalu besar. Maksimal 5MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    // Validasi field wajib
    const { nama, email: emailBody, no_hp, alamat, judul, uraian, nik, tanggal_pengaduan } = req.body;
    // Ambil email dari user login jika ada
    const email = req.user ? req.user.email : emailBody;
    console.log('DEBUG pengaduan:', { nama, email, no_hp, alamat, judul, uraian, nik, tanggal_pengaduan, user: req.user });
    if (!nama || !email || !no_hp || !alamat || !judul || !uraian || !nik || !tanggal_pengaduan) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }
    // Validasi email hanya jika user tidak login
    if (!req.user) {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'Email tidak valid.' });
      }
    }
    // Validasi NIK
    if (!/^\d{16}$/.test(nik)) {
      return res.status(400).json({ error: 'NIK harus 16 digit.' });
    }
    // Validasi tanggal_pengaduan (ISO date)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_pengaduan)) {
      return res.status(400).json({ error: 'Tanggal pengaduan wajib format YYYY-MM-DD.' });
    }
    // Simpan ke database
    try {
      const lampiran = req.file ? `/uploads/${req.file.filename}` : null;
      const user_id = req.user ? req.user.id : null;
      const [result] = await promisePool.query(
        'INSERT INTO pengaduan (user_id, nama, email, no_hp, alamat, judul, uraian, lampiran, nik, tanggal_pengaduan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [user_id, nama, email, no_hp, alamat, judul, uraian, lampiran, nik, tanggal_pengaduan]
      );
      const [newPengaduan] = await promisePool.query(
        'SELECT * FROM pengaduan WHERE id = ?',
        [result.insertId]
      );
      res.status(201).json({
        message: 'Pengaduan berhasil dikirim',
        pengaduan: newPengaduan[0]
      });
    } catch (error) {
      console.error('Create pengaduan error:', error);
      res.status(500).json({ error: error.message || 'Terjadi kesalahan server' });
    }
  });
});

// Update pengaduan status (admin only)
router.put('/:id/status', adminAuth, [
  body('status').isIn(['Baru', 'Diproses', 'Selesai']).withMessage('Status tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Check if pengaduan exists
    const [existingPengaduan] = await promisePool.query(
      'SELECT * FROM pengaduan WHERE id = ?',
      [id]
    );

    if (existingPengaduan.length === 0) {
      return res.status(404).json({ error: 'Pengaduan tidak ditemukan' });
    }

    await promisePool.query(
      'UPDATE pengaduan SET status = ? WHERE id = ?',
      [status, id]
    );

    const [updatedPengaduan] = await promisePool.query(
      'SELECT * FROM pengaduan WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Status pengaduan berhasil diupdate',
      pengaduan: updatedPengaduan[0]
    });
  } catch (error) {
    console.error('Update pengaduan status error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete pengaduan (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if pengaduan exists
    const [existingPengaduan] = await promisePool.query(
      'SELECT * FROM pengaduan WHERE id = ?',
      [id]
    );

    if (existingPengaduan.length === 0) {
      return res.status(404).json({ error: 'Pengaduan tidak ditemukan' });
    }

    await promisePool.query('DELETE FROM pengaduan WHERE id = ?', [id]);

    res.json({ message: 'Pengaduan berhasil dihapus' });
  } catch (error) {
    console.error('Delete pengaduan error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get pengaduan statistics (admin only)
router.get('/stats/overview', adminAuth, async (req, res) => {
  try {
    const [totalPengaduan] = await promisePool.query('SELECT COUNT(*) as total FROM pengaduan');
    const [baru] = await promisePool.query("SELECT COUNT(*) as total FROM pengaduan WHERE status = 'Baru'");
    const [diproses] = await promisePool.query("SELECT COUNT(*) as total FROM pengaduan WHERE status = 'Diproses'");
    const [selesai] = await promisePool.query("SELECT COUNT(*) as total FROM pengaduan WHERE status = 'Selesai'");

    res.json({
      total: totalPengaduan[0].total,
      baru: baru[0].total,
      diproses: diproses[0].total,
      selesai: selesai[0].total
    });
  } catch (error) {
    console.error('Get pengaduan stats error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router; 