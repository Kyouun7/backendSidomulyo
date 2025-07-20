const express = require('express');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

const router = express.Router();

// Get all pariwisata (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [pariwisata] = await promisePool.query(
      'SELECT * FROM pariwisata ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [parseInt(limit), offset]
    );

    const [countResult] = await promisePool.query('SELECT COUNT(*) as total FROM pariwisata');
    const total = countResult[0].total;

    res.json({
      pariwisata,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get pariwisata error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get pariwisata by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [pariwisata] = await promisePool.query(
      'SELECT * FROM pariwisata WHERE id = ?',
      [id]
    );

    if (pariwisata.length === 0) {
      return res.status(404).json({ error: 'Pariwisata tidak ditemukan' });
    }

    res.json({ pariwisata: pariwisata[0] });
  } catch (error) {
    console.error('Get pariwisata by ID error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create pariwisata (admin only)
router.post('/', adminAuth, uploadImage, [
  body('nama').notEmpty().withMessage('Nama pariwisata wajib diisi'),
  body('deskripsi').notEmpty().withMessage('Deskripsi wajib diisi'),
  body('tanggal').optional().isDate().withMessage('Tanggal tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nama, deskripsi, tanggal } = req.body;
    const img = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await promisePool.query(
      'INSERT INTO pariwisata (nama, deskripsi, img, tanggal) VALUES (?, ?, ?, ?)',
      [nama, deskripsi, img, tanggal]
    );

    const [newPariwisata] = await promisePool.query(
      'SELECT * FROM pariwisata WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Pariwisata berhasil ditambahkan',
      pariwisata: newPariwisata[0]
    });
  } catch (error) {
    console.error('Create pariwisata error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update pariwisata (admin only)
router.put('/:id', adminAuth, uploadImage, [
  body('nama').notEmpty().withMessage('Nama pariwisata wajib diisi'),
  body('deskripsi').notEmpty().withMessage('Deskripsi wajib diisi'),
  body('tanggal').optional().isDate().withMessage('Tanggal tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nama, deskripsi, tanggal } = req.body;

    // Check if pariwisata exists
    const [existingPariwisata] = await promisePool.query(
      'SELECT * FROM pariwisata WHERE id = ?',
      [id]
    );

    if (existingPariwisata.length === 0) {
      return res.status(404).json({ error: 'Pariwisata tidak ditemukan' });
    }

    let img = existingPariwisata[0].img;
    if (req.file) {
      img = `/uploads/${req.file.filename}`;
    }

    await promisePool.query(
      'UPDATE pariwisata SET nama = ?, deskripsi = ?, img = ?, tanggal = ? WHERE id = ?',
      [nama, deskripsi, img, tanggal, id]
    );

    const [updatedPariwisata] = await promisePool.query(
      'SELECT * FROM pariwisata WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Pariwisata berhasil diupdate',
      pariwisata: updatedPariwisata[0]
    });
  } catch (error) {
    console.error('Update pariwisata error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete pariwisata (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if pariwisata exists
    const [existingPariwisata] = await promisePool.query(
      'SELECT * FROM pariwisata WHERE id = ?',
      [id]
    );

    if (existingPariwisata.length === 0) {
      return res.status(404).json({ error: 'Pariwisata tidak ditemukan' });
    }

    await promisePool.query('DELETE FROM pariwisata WHERE id = ?', [id]);

    res.json({ message: 'Pariwisata berhasil dihapus' });
  } catch (error) {
    console.error('Delete pariwisata error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router; 