const express = require('express');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadFlexible, handleMulterError } = require('../middleware/upload');
const { saveImagePath, getImageUrl } = require('../utils/imageHelper');

const router = express.Router();

// Get all agenda (public)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT a.*, u.nama as created_by_name 
      FROM agenda a 
      LEFT JOIN users u ON a.created_by = u.id
    `;
    let params = [];

    if (status) {
      query += ' WHERE a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.tanggal ASC, a.waktu ASC';

    const [agenda] = await promisePool.query(query, params);

    // Convert image URLs to absolute URLs
    const agendaWithImages = agenda.map(item => ({
      ...item,
      img: item.img ? getImageUrl(req, item.img) : null
    }));

    res.json({
      agenda: agendaWithImages
    });
  } catch (error) {
    console.error('Get agenda error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get agenda by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [agenda] = await promisePool.query(
      `SELECT a.*, u.nama as created_by_name 
       FROM agenda a 
       LEFT JOIN users u ON a.created_by = u.id 
       WHERE a.id = ?`,
      [id]
    );

    if (agenda.length === 0) {
      return res.status(404).json({ error: 'Agenda tidak ditemukan' });
    }

    // Convert image URL to absolute URL
    const agendaWithImage = {
      ...agenda[0],
      img: agenda[0].img ? getImageUrl(req, agenda[0].img) : null
    };

    res.json({ agenda: agendaWithImage });
  } catch (error) {
    console.error('Get agenda by ID error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create agenda (admin only)
router.post('/', adminAuth, uploadFlexible(['img', 'image', 'file']), handleMulterError, [
  body('title').notEmpty().withMessage('Judul agenda wajib diisi'),
  body('deskripsi').notEmpty().withMessage('Deskripsi agenda wajib diisi'),
  body('tanggal').isDate().withMessage('Tanggal tidak valid'),
  body('waktu').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format waktu tidak valid (HH:MM)'),
  body('lokasi').notEmpty().withMessage('Lokasi agenda wajib diisi'),
  body('status').isIn(['Akan Datang', 'Sedang Berlangsung', 'Selesai']).withMessage('Status tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, deskripsi, tanggal, waktu, lokasi, status } = req.body;
    const created_by = req.user.id;
    const img = req.file ? saveImagePath(req, req.file.filename) : null;

    // Cek duplikasi agenda berdasarkan title dan tanggal
    const [existing] = await promisePool.query(
      'SELECT id FROM agenda WHERE title = ? AND tanggal = ?',
      [title, tanggal]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Agenda dengan judul dan tanggal yang sama sudah ada.' });
    }

    const [result] = await promisePool.query(
      'INSERT INTO agenda (title, deskripsi, tanggal, waktu, lokasi, status, img, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, deskripsi, tanggal, waktu, lokasi, status, img, created_by]
    );

    const [newAgenda] = await promisePool.query(
      'SELECT * FROM agenda WHERE id = ?',
      [result.insertId]
    );

    // Convert image URL to absolute URL
    const agendaWithImage = {
      ...newAgenda[0],
      img: newAgenda[0].img ? getImageUrl(req, newAgenda[0].img) : null
    };

    res.status(201).json({
      message: 'Agenda berhasil ditambahkan',
      agenda: agendaWithImage
    });
  } catch (error) {
    console.error('Create agenda error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update agenda (admin only)
router.put('/:id', adminAuth, [
  body('title').notEmpty().withMessage('Judul agenda wajib diisi'),
  body('deskripsi').notEmpty().withMessage('Deskripsi agenda wajib diisi'),
  body('tanggal').isDate().withMessage('Tanggal tidak valid'),
  body('waktu').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format waktu tidak valid (HH:MM)'),
  body('lokasi').notEmpty().withMessage('Lokasi agenda wajib diisi'),
  body('status').isIn(['Akan Datang', 'Sedang Berlangsung', 'Selesai']).withMessage('Status tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, deskripsi, tanggal, waktu, lokasi, status } = req.body;

    // Check if agenda exists
    const [existingAgenda] = await promisePool.query(
      'SELECT * FROM agenda WHERE id = ?',
      [id]
    );

    if (existingAgenda.length === 0) {
      return res.status(404).json({ error: 'Agenda tidak ditemukan' });
    }

    await promisePool.query(
      'UPDATE agenda SET title = ?, deskripsi = ?, tanggal = ?, waktu = ?, lokasi = ?, status = ? WHERE id = ?',
      [title, deskripsi, tanggal, waktu, lokasi, status, id]
    );

    const [updatedAgenda] = await promisePool.query(
      'SELECT * FROM agenda WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Agenda berhasil diupdate',
      agenda: updatedAgenda[0]
    });
  } catch (error) {
    console.error('Update agenda error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete agenda (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if agenda exists
    const [existingAgenda] = await promisePool.query(
      'SELECT * FROM agenda WHERE id = ?',
      [id]
    );

    if (existingAgenda.length === 0) {
      return res.status(404).json({ error: 'Agenda tidak ditemukan' });
    }

    await promisePool.query('DELETE FROM agenda WHERE id = ?', [id]);

    res.json({ message: 'Agenda berhasil dihapus' });
  } catch (error) {
    console.error('Delete agenda error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router; 