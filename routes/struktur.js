const express = require('express');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

const router = express.Router();

// Get all struktur organisasi (public)
router.get('/', async (req, res) => {
  try {
    const [struktur] = await promisePool.query(
      'SELECT * FROM struktur_organisasi ORDER BY FIELD(tipe, "kepala_desa", "sekretaris", "kaur", "kasi", "kasun"), nama'
    );

    res.json({ struktur });
  } catch (error) {
    console.error('Get struktur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get struktur by tipe (public)
router.get('/tipe/:tipe', async (req, res) => {
  try {
    const { tipe } = req.params;

    const [struktur] = await promisePool.query(
      'SELECT * FROM struktur_organisasi WHERE tipe = ? ORDER BY nama',
      [tipe]
    );

    res.json({ struktur });
  } catch (error) {
    console.error('Get struktur by tipe error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get struktur by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [struktur] = await promisePool.query(
      'SELECT * FROM struktur_organisasi WHERE id = ?',
      [id]
    );

    if (struktur.length === 0) {
      return res.status(404).json({ error: 'Struktur organisasi tidak ditemukan' });
    }

    res.json({ struktur: struktur[0] });
  } catch (error) {
    console.error('Get struktur by ID error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create struktur organisasi (admin only)
router.post('/', adminAuth, uploadImage, [
  body('nama').notEmpty().withMessage('Nama wajib diisi'),
  body('jabatan').notEmpty().withMessage('Jabatan wajib diisi'),
  body('tipe').isIn(['kepala_desa', 'sekretaris', 'kaur', 'kasi', 'kasun']).withMessage('Tipe tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nama, jabatan, tipe } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : null;

    // Check if struktur with same tipe and jabatan already exists
    const [existingStruktur] = await promisePool.query(
      'SELECT id FROM struktur_organisasi WHERE tipe = ? AND jabatan = ?',
      [tipe, jabatan]
    );

    if (existingStruktur.length > 0) {
      return res.status(400).json({ error: 'Struktur dengan tipe dan jabatan yang sama sudah ada' });
    }

    const [result] = await promisePool.query(
      'INSERT INTO struktur_organisasi (nama, jabatan, foto, tipe) VALUES (?, ?, ?, ?)',
      [nama, jabatan, foto, tipe]
    );

    const [newStruktur] = await promisePool.query(
      'SELECT * FROM struktur_organisasi WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Struktur organisasi berhasil ditambahkan',
      struktur: newStruktur[0]
    });
  } catch (error) {
    console.error('Create struktur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update struktur organisasi (admin only)
router.put('/:id', adminAuth, uploadImage, [
  body('nama').notEmpty().withMessage('Nama wajib diisi'),
  body('jabatan').notEmpty().withMessage('Jabatan wajib diisi'),
  body('tipe').isIn(['kepala_desa', 'sekretaris', 'kaur', 'kasi', 'kasun']).withMessage('Tipe tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nama, jabatan, tipe } = req.body;

    // Check if struktur exists
    const [existingStruktur] = await promisePool.query(
      'SELECT * FROM struktur_organisasi WHERE id = ?',
      [id]
    );

    if (existingStruktur.length === 0) {
      return res.status(404).json({ error: 'Struktur organisasi tidak ditemukan' });
    }

    // Check if struktur with same tipe and jabatan already exists (excluding current id)
    const [duplicateStruktur] = await promisePool.query(
      'SELECT id FROM struktur_organisasi WHERE tipe = ? AND jabatan = ? AND id != ?',
      [tipe, jabatan, id]
    );

    if (duplicateStruktur.length > 0) {
      return res.status(400).json({ error: 'Struktur dengan tipe dan jabatan yang sama sudah ada' });
    }

    let foto = existingStruktur[0].foto;
    if (req.file) {
      foto = `/uploads/${req.file.filename}`;
    }

    await promisePool.query(
      'UPDATE struktur_organisasi SET nama = ?, jabatan = ?, foto = ?, tipe = ? WHERE id = ?',
      [nama, jabatan, foto, tipe, id]
    );

    const [updatedStruktur] = await promisePool.query(
      'SELECT * FROM struktur_organisasi WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Struktur organisasi berhasil diupdate',
      struktur: updatedStruktur[0]
    });
  } catch (error) {
    console.error('Update struktur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete struktur organisasi (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if struktur exists
    const [existingStruktur] = await promisePool.query(
      'SELECT * FROM struktur_organisasi WHERE id = ?',
      [id]
    );

    if (existingStruktur.length === 0) {
      return res.status(404).json({ error: 'Struktur organisasi tidak ditemukan' });
    }

    await promisePool.query('DELETE FROM struktur_organisasi WHERE id = ?', [id]);

    res.json({ message: 'Struktur organisasi berhasil dihapus' });
  } catch (error) {
    console.error('Delete struktur error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get struktur overview (admin only)
router.get('/overview', adminAuth, async (req, res) => {
  try {
    const [totalStruktur] = await promisePool.query('SELECT COUNT(*) as total FROM struktur_organisasi');
    const [kepalaDesa] = await promisePool.query("SELECT COUNT(*) as total FROM struktur_organisasi WHERE tipe = 'kepala_desa'");
    const [sekretaris] = await promisePool.query("SELECT COUNT(*) as total FROM struktur_organisasi WHERE tipe = 'sekretaris'");
    const [kaur] = await promisePool.query("SELECT COUNT(*) as total FROM struktur_organisasi WHERE tipe = 'kaur'");
    const [kasi] = await promisePool.query("SELECT COUNT(*) as total FROM struktur_organisasi WHERE tipe = 'kasi'");
    const [kasun] = await promisePool.query("SELECT COUNT(*) as total FROM struktur_organisasi WHERE tipe = 'kasun'");

    res.json({
      total: totalStruktur[0].total,
      kepala_desa: kepalaDesa[0].total,
      sekretaris: sekretaris[0].total,
      kaur: kaur[0].total,
      kasi: kasi[0].total,
      kasun: kasun[0].total
    });
  } catch (error) {
    console.error('Get struktur overview error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router; 