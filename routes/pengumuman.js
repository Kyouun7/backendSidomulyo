const express = require('express');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadFlexible, handleMulterError } = require('../middleware/upload');
const { saveImagePath, getImageUrl } = require('../utils/imageHelper');

const router = express.Router();

// Get all pengumuman (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, kategori } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, u.nama as created_by_name 
      FROM pengumuman p 
      LEFT JOIN users u ON p.created_by = u.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM pengumuman';
    let params = [];
    let countParams = [];

    if (kategori) {
      query += ' WHERE p.kategori = ?';
      countQuery += ' WHERE kategori = ?';
      params.push(kategori);
      countParams.push(kategori);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [pengumuman] = await promisePool.query(query, params);
    const [countResult] = await promisePool.query(countQuery, countParams);
    const total = countResult[0].total;

    // Convert image URLs to absolute URLs
    const pengumumanWithImages = pengumuman.map(item => ({
      ...item,
      img: item.img ? getImageUrl(req, item.img) : null
    }));

    res.json({
      pengumuman: pengumumanWithImages,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get pengumuman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get pengumuman by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [pengumuman] = await promisePool.query(
      `SELECT p.*, u.nama as created_by_name 
       FROM pengumuman p 
       LEFT JOIN users u ON p.created_by = u.id 
       WHERE p.id = ?`,
      [id]
    );

    if (pengumuman.length === 0) {
      return res.status(404).json({ error: 'Pengumuman tidak ditemukan' });
    }

    // Convert image URL to absolute URL
    const pengumumanWithImage = {
      ...pengumuman[0],
      img: pengumuman[0].img ? getImageUrl(req, pengumuman[0].img) : null
    };

    res.json({ pengumuman: pengumumanWithImage });
  } catch (error) {
    console.error('Get pengumuman by ID error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create pengumuman (admin only)
router.post('/', adminAuth, uploadFlexible(['img', 'image', 'file']), handleMulterError, [
  body('title').notEmpty().withMessage('Judul pengumuman wajib diisi'),
  body('content').notEmpty().withMessage('Konten pengumuman wajib diisi'),
  body('kategori').isIn(['Umum', 'Penting', 'Darurat', 'Informasi', 'Layanan', 'Kesehatan', 'Pendidikan'])
    .withMessage('Kategori tidak valid'),
  body('tanggal').isDate().withMessage('Tanggal tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, kategori, tanggal } = req.body;
    const created_by = req.user.id;
    const img = req.file ? saveImagePath(req, req.file.filename) : null;

    // Cek duplikasi pengumuman berdasarkan title dan tanggal
    const [existing] = await promisePool.query(
      'SELECT id FROM pengumuman WHERE title = ? AND tanggal = ?',
      [title, tanggal]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Pengumuman dengan judul dan tanggal yang sama sudah ada.' });
    }

    const [result] = await promisePool.query(
      'INSERT INTO pengumuman (title, content, kategori, img, tanggal, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, kategori, img, tanggal, created_by]
    );

    const [newPengumuman] = await promisePool.query(
      'SELECT * FROM pengumuman WHERE id = ?',
      [result.insertId]
    );

    // Convert image URL to absolute URL
    const pengumumanWithImage = {
      ...newPengumuman[0],
      img: newPengumuman[0].img ? getImageUrl(req, newPengumuman[0].img) : null
    };

    res.status(201).json({
      message: 'Pengumuman berhasil ditambahkan',
      pengumuman: pengumumanWithImage
    });
  } catch (error) {
    console.error('Create pengumuman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update pengumuman (admin only)
router.put('/:id', adminAuth, uploadFlexible(['img', 'image', 'file']), handleMulterError, [
  body('title').notEmpty().withMessage('Judul pengumuman wajib diisi'),
  body('content').notEmpty().withMessage('Konten pengumuman wajib diisi'),
  body('kategori').isIn(['Umum', 'Penting', 'Darurat', 'Informasi', 'Layanan', 'Kesehatan', 'Pendidikan'])
    .withMessage('Kategori tidak valid'),
  body('tanggal').isDate().withMessage('Tanggal tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, content, kategori, tanggal } = req.body;

    // Check if pengumuman exists
    const [existingPengumuman] = await promisePool.query(
      'SELECT * FROM pengumuman WHERE id = ?',
      [id]
    );

    if (existingPengumuman.length === 0) {
      return res.status(404).json({ error: 'Pengumuman tidak ditemukan' });
    }

    let img = existingPengumuman[0].img;
    if (req.file) {
      img = saveImagePath(req, req.file.filename);
    }

    await promisePool.query(
      'UPDATE pengumuman SET title = ?, content = ?, kategori = ?, img = ?, tanggal = ? WHERE id = ?',
      [title, content, kategori, img, tanggal, id]
    );

    const [updatedPengumuman] = await promisePool.query(
      'SELECT * FROM pengumuman WHERE id = ?',
      [id]
    );

    // Convert image URL to absolute URL
    const pengumumanWithImage = {
      ...updatedPengumuman[0],
      img: updatedPengumuman[0].img ? getImageUrl(req, updatedPengumuman[0].img) : null
    };

    res.json({
      message: 'Pengumuman berhasil diupdate',
      pengumuman: pengumumanWithImage
    });
  } catch (error) {
    console.error('Update pengumuman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete pengumuman (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if pengumuman exists
    const [existingPengumuman] = await promisePool.query(
      'SELECT * FROM pengumuman WHERE id = ?',
      [id]
    );

    if (existingPengumuman.length === 0) {
      return res.status(404).json({ error: 'Pengumuman tidak ditemukan' });
    }

    await promisePool.query('DELETE FROM pengumuman WHERE id = ?', [id]);

    res.json({ message: 'Pengumuman berhasil dihapus' });
  } catch (error) {
    console.error('Delete pengumuman error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router; 