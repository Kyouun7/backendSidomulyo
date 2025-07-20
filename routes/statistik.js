const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const { readStatistik, writeStatistik, generateId } = require('../utils/statistikFile');

const router = express.Router();

// Get all statistik (public)
router.get('/', async (req, res) => {
  try {
    const { kategori } = req.query;
    let statistik = await readStatistik();
    if (kategori) {
      statistik = statistik.filter(item => item.kategori === kategori);
    }
    statistik.sort((a, b) => {
      if (a.kategori === b.kategori) {
        return a.label.localeCompare(b.label);
      }
      return a.kategori.localeCompare(b.kategori);
    });
    // Group by kategori
    const groupedStatistik = statistik.reduce((acc, item) => {
      if (!acc[item.kategori]) acc[item.kategori] = [];
      acc[item.kategori].push(item);
      return acc;
    }, {});
    res.json({ statistik: groupedStatistik });
  } catch (error) {
    console.error('Get statistik error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get statistik by kategori (public)
router.get('/kategori/:kategori', async (req, res) => {
  try {
    const { kategori } = req.params;
    let statistik = await readStatistik();
    statistik = statistik.filter(item => item.kategori === kategori);
    statistik.sort((a, b) => a.label.localeCompare(b.label));
    res.json({ statistik });
  } catch (error) {
    console.error('Get statistik by kategori error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create statistik (admin only)
router.post('/', adminAuth, [
  body('kategori').notEmpty().withMessage('Kategori wajib diisi'),
  body('label').notEmpty().withMessage('Label wajib diisi'),
  body('value').isInt({ min: 0 }).withMessage('Value harus berupa angka positif'),
  body('color').optional().isHexColor().withMessage('Color harus berupa hex color')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { kategori, label, value, color } = req.body;
    let statistik = await readStatistik();
    // Cek duplikat
    if (statistik.some(item => item.kategori === kategori && item.label === label)) {
      return res.status(400).json({ error: 'Statistik dengan kategori dan label yang sama sudah ada' });
    }
    const id = generateId(statistik);
    const newStat = { id, kategori, label, value, color };
    statistik.push(newStat);
    await writeStatistik(statistik);
    res.status(201).json({ message: 'Statistik berhasil ditambahkan', statistik: newStat });
  } catch (error) {
    console.error('Create statistik error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update statistik (admin only)
router.put('/:id', adminAuth, [
  body('kategori').notEmpty().withMessage('Kategori wajib diisi'),
  body('label').notEmpty().withMessage('Label wajib diisi'),
  body('value').isInt({ min: 0 }).withMessage('Value harus berupa angka positif'),
  body('color').optional({ nullable: true }).isHexColor().withMessage('Color harus berupa hex color')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;
    const { kategori, label, value, color } = req.body;
    let statistik = await readStatistik();
    const idx = statistik.findIndex(item => String(item.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Statistik tidak ditemukan' });
    }
    // Pastikan color tidak hilang jika tidak dikirim
    statistik[idx] = {
      ...statistik[idx],
      kategori,
      label,
      value,
      color: color || statistik[idx].color
    };
    await writeStatistik(statistik);
    res.json({ message: 'Statistik berhasil diupdate', statistik: statistik[idx] });
  } catch (error) {
    console.error('Update statistik error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete statistik (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let statistik = await readStatistik();
    const idx = statistik.findIndex(item => String(item.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Statistik tidak ditemukan' });
    }
    statistik.splice(idx, 1);
    await writeStatistik(statistik);
    res.json({ message: 'Statistik berhasil dihapus' });
  } catch (error) {
    console.error('Delete statistik error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Bulk update statistik (admin only)
router.put('/bulk/update', adminAuth, [
  body('statistik').isArray().withMessage('Statistik harus berupa array'),
  body('statistik.*.id').isInt().withMessage('ID harus berupa angka'),
  body('statistik.*.value').isInt({ min: 0 }).withMessage('Value harus berupa angka positif')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { statistik: updates } = req.body;
    let statistik = await readStatistik();
    for (const item of updates) {
      const idx = statistik.findIndex(s => String(s.id) === String(item.id));
      if (idx !== -1) {
        statistik[idx].value = item.value;
      }
    }
    await writeStatistik(statistik);
    res.json({ message: 'Statistik berhasil diupdate secara massal' });
  } catch (error) {
    console.error('Bulk update statistik error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get statistik overview (admin only)
router.get('/overview', adminAuth, async (req, res) => {
  try {
    const statistik = await readStatistik();
    const total_items = statistik.length;
    const kategoriSet = new Set(statistik.map(item => item.kategori));
    const total_kategori = kategoriSet.size;
    res.json({ total_items, total_kategori });
  } catch (error) {
    console.error('Get statistik overview error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router; 