const express = require('express');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Endpoint: Kirim pesan kontak (public)
router.post('/', [
  body('nama').notEmpty().withMessage('Nama wajib diisi'),
  body('email').isEmail().withMessage('Email tidak valid'),
  body('no_hp').optional(),
  body('pesan').notEmpty().withMessage('Pesan wajib diisi')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { nama, email, no_hp, pesan } = req.body;
    await promisePool.query(
      'INSERT INTO pesan_kontak (nama, email, no_hp, pesan) VALUES (?, ?, ?, ?)',
      [nama, email, no_hp, pesan]
    );
    res.status(201).json({ message: 'Pesan berhasil dikirim' });
  } catch (error) {
    console.error('Create pesan kontak error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Endpoint: Ambil semua pesan kontak (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const [pesan] = await promisePool.query('SELECT * FROM pesan_kontak ORDER BY created_at DESC');
    res.json({ pesan });
  } catch (error) {
    console.error('Get pesan kontak error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Endpoint: Ambil info kontak desa (public/admin)
router.get('/kontak-desa', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM kontak_desa LIMIT 1');
    if (rows.length === 0) return res.status(404).json({ error: 'Kontak desa belum diatur' });
    res.json({ kontak: rows[0] });
  } catch (error) {
    console.error('Get kontak desa error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Endpoint: Edit info kontak desa (admin only)
router.put('/kontak-desa', adminAuth, [
  body('alamat').notEmpty().withMessage('Alamat wajib diisi'),
  body('email').isEmail().withMessage('Email tidak valid'),
  body('whatsapp').optional(),
  body('instagram').optional(),
  body('facebook').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { alamat, email, whatsapp, instagram, facebook } = req.body;
    await promisePool.query(
      'UPDATE kontak_desa SET alamat=?, email=?, whatsapp=?, instagram=?, facebook=?, updated_at=NOW() WHERE id=1',
      [alamat, email, whatsapp, instagram, facebook]
    );
    res.json({ message: 'Kontak desa berhasil diperbarui' });
  } catch (error) {
    console.error('Update kontak desa error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router; 