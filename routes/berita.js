const express = require('express');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadFlexible, handleMulterError } = require('../middleware/upload');
const { saveImagePath, getImageUrl } = require('../utils/imageHelper');

const router = express.Router();

// Get all berita (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, kategori } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT b.*, u.nama as created_by_name 
      FROM berita b 
      LEFT JOIN users u ON b.created_by = u.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM berita';
    let params = [];
    let countParams = [];

    if (kategori) {
      query += ' WHERE b.kategori = ?';
      countQuery += ' WHERE kategori = ?';
      params.push(kategori);
      countParams.push(kategori);
    }

    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [berita] = await promisePool.query(query, params);
    const [countResult] = await promisePool.query(countQuery, countParams);
    const total = countResult[0].total;

    // Convert image URLs to absolute URLs
    const beritaWithImages = berita.map(item => ({
      ...item,
      img: item.img ? getImageUrl(req, item.img) : null
    }));

    res.json({
      berita: beritaWithImages,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get berita error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get berita by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [berita] = await promisePool.query(
      `SELECT b.*, u.nama as created_by_name 
       FROM berita b 
       LEFT JOIN users u ON b.created_by = u.id 
       WHERE b.id = ?`,
      [id]
    );

    if (berita.length === 0) {
      return res.status(404).json({ error: 'Berita tidak ditemukan' });
    }

    // Convert image URL to absolute URL
    const beritaWithImage = {
      ...berita[0],
      img: berita[0].img ? getImageUrl(req, berita[0].img) : null
    };

    res.json({ berita: beritaWithImage });
  } catch (error) {
    console.error('Get berita by ID error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create berita (admin only)
router.post('/', adminAuth, uploadFlexible(['img', 'image', 'file']), handleMulterError, [
  body('title').notEmpty().withMessage('Judul berita wajib diisi'),
  body('content').notEmpty().withMessage('Konten berita wajib diisi'),
  body('kategori').isIn(['Pembangunan', 'Sosial', 'Agenda', 'Pendidikan', 'Lingkungan', 'Kesehatan', 'Pariwisata'])
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

    // Cek duplikasi berita berdasarkan title dan tanggal
    const [existing] = await promisePool.query(
      'SELECT id FROM berita WHERE title = ? AND tanggal = ?',
      [title, tanggal]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Berita dengan judul dan tanggal yang sama sudah ada.' });
    }

    const [result] = await promisePool.query(
      'INSERT INTO berita (title, content, kategori, img, tanggal, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, kategori, img, tanggal, created_by]
    );

    const [newBerita] = await promisePool.query(
      'SELECT * FROM berita WHERE id = ?',
      [result.insertId]
    );

    // Convert image URL to absolute URL
    const beritaWithImage = {
      ...newBerita[0],
      img: newBerita[0].img ? getImageUrl(req, newBerita[0].img) : null
    };

    res.status(201).json({
      message: 'Berita berhasil ditambahkan',
      berita: beritaWithImage
    });
  } catch (error) {
    console.error('Create berita error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update berita (admin only)
router.put('/:id', adminAuth, uploadFlexible(['img', 'image', 'file']), handleMulterError, [
  body('title').notEmpty().withMessage('Judul berita wajib diisi'),
  body('content').notEmpty().withMessage('Konten berita wajib diisi'),
  body('kategori').isIn(['Pembangunan', 'Sosial', 'Agenda', 'Pendidikan', 'Lingkungan', 'Kesehatan', 'Pariwisata'])
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

    // Check if berita exists
    const [existingBerita] = await promisePool.query(
      'SELECT * FROM berita WHERE id = ?',
      [id]
    );

    if (existingBerita.length === 0) {
      return res.status(404).json({ error: 'Berita tidak ditemukan' });
    }

    let img = existingBerita[0].img;
    if (req.file) {
      img = saveImagePath(req, req.file.filename);
    }

    await promisePool.query(
      'UPDATE berita SET title = ?, content = ?, kategori = ?, img = ?, tanggal = ? WHERE id = ?',
      [title, content, kategori, img, tanggal, id]
    );

    const [updatedBerita] = await promisePool.query(
      'SELECT * FROM berita WHERE id = ?',
      [id]
    );

    // Convert image URL to absolute URL
    const beritaWithImage = {
      ...updatedBerita[0],
      img: updatedBerita[0].img ? getImageUrl(req, updatedBerita[0].img) : null
    };

    res.json({
      message: 'Berita berhasil diupdate',
      berita: beritaWithImage
    });
  } catch (error) {
    console.error('Update berita error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete berita (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if berita exists
    const [existingBerita] = await promisePool.query(
      'SELECT * FROM berita WHERE id = ?',
      [id]
    );

    if (existingBerita.length === 0) {
      return res.status(404).json({ error: 'Berita tidak ditemukan' });
    }

    await promisePool.query('DELETE FROM berita WHERE id = ?', [id]);

    res.json({ message: 'Berita berhasil dihapus' });
  } catch (error) {
    console.error('Delete berita error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get berita by kategori
router.get('/kategori/:kategori', async (req, res) => {
  try {
    const { kategori } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [berita] = await promisePool.query(
      `SELECT b.*, u.nama as created_by_name 
       FROM berita b 
       LEFT JOIN users u ON b.created_by = u.id 
       WHERE b.kategori = ? 
       ORDER BY b.created_at DESC 
       LIMIT ? OFFSET ?`,
      [kategori, parseInt(limit), offset]
    );

    const [countResult] = await promisePool.query(
      'SELECT COUNT(*) as total FROM berita WHERE kategori = ?',
      [kategori]
    );

    // Convert image URLs to absolute URLs
    const beritaWithImages = berita.map(item => ({
      ...item,
      img: item.img ? getImageUrl(req, item.img) : null
    }));

    res.json({
      berita: beritaWithImages,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(countResult[0].total / limit),
        total_items: countResult[0].total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get berita by kategori error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router; 