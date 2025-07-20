const express = require('express');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');

const router = express.Router();

// Helper untuk konversi url_file lampiran ke absolute URL backend
function getFileUrl(req, url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${req.protocol}://${req.get('host')}${url}`;
}

// Get all surat (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, jenis_surat } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.*, u.username, u.nama as user_nama 
      FROM surat s 
      LEFT JOIN users u ON s.user_id = u.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM surat';
    let params = [];
    let countParams = [];

    const conditions = [];
    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
      countParams.push(status);
    }
    if (jenis_surat) {
      conditions.push('s.jenis_surat = ?');
      params.push(jenis_surat);
      countParams.push(jenis_surat);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY s.tanggal_pengajuan DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [surat] = await promisePool.query(query, params);
    const [countResult] = await promisePool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      surat,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get surat error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get surat by user ID (user can only see their own surat)
router.get('/my-surat', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [surat] = await promisePool.query(
      `SELECT s.*, u.username, u.nama as user_nama 
       FROM surat s 
       LEFT JOIN users u ON s.user_id = u.id 
       WHERE s.user_id = ? 
       ORDER BY s.tanggal_pengajuan DESC 
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), offset]
    );

    const [countResult] = await promisePool.query(
      'SELECT COUNT(*) as total FROM surat WHERE user_id = ?',
      [userId]
    );

    res.json({
      surat,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(countResult[0].total / limit),
        total_items: countResult[0].total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get my surat error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get surat by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT s.*, u.username, u.nama as user_nama 
      FROM surat s 
      LEFT JOIN users u ON s.user_id = u.id 
      WHERE s.id = ?
    `;
    let params = [id];

    // If user is not admin, they can only see their own surat
    if (userRole !== 'admin') {
      query += ' AND s.user_id = ?';
      params.push(userId);
    }

    const [surat] = await promisePool.query(query, params);

    if (surat.length === 0) {
      return res.status(404).json({ error: 'Surat tidak ditemukan' });
    }

    // Get lampiran surat
    const [lampiran] = await promisePool.query(
      'SELECT * FROM lampiran_surat WHERE surat_id = ?',
      [id]
    );
    // Konversi url_file ke absolute URL backend
    const lampiranWithUrl = lampiran.map(l => ({
      ...l,
      url_file: getFileUrl(req, l.url_file)
    }));

    res.json({ 
      surat: { ...surat[0], lampiran: lampiranWithUrl } 
    });
  } catch (error) {
    console.error('Get surat by ID error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create surat (user)
router.post('/', auth, uploadMultiple, [
  body('nama').notEmpty().withMessage('Nama wajib diisi'),
  body('nik').isLength({ min: 16, max: 16 }).withMessage('NIK harus 16 digit'),
  body('jenis_kelamin').isIn(['Laki-laki', 'Perempuan']).withMessage('Jenis kelamin tidak valid'),
  body('tempat_lahir').notEmpty().withMessage('Tempat lahir wajib diisi'),
  body('tanggal_lahir').isDate().withMessage('Tanggal lahir tidak valid'),
  body('pekerjaan').notEmpty().withMessage('Pekerjaan wajib diisi'),
  body('kewarganegaraan').notEmpty().withMessage('Kewarganegaraan wajib diisi'),
  body('agama').notEmpty().withMessage('Agama wajib diisi'),
  body('no_hp').notEmpty().withMessage('Nomor HP wajib diisi'),
  body('alamat_ktp').notEmpty().withMessage('Alamat KTP wajib diisi'),
  body('alamat_sekarang').notEmpty().withMessage('Alamat sekarang wajib diisi'),
  body('jenis_surat').notEmpty().withMessage('Jenis surat wajib diisi')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nama, nik, jenis_kelamin, tempat_lahir, tanggal_lahir,
      pekerjaan, kewarganegaraan, agama, no_hp,
      alamat_ktp, alamat_sekarang, jenis_surat
    } = req.body;

    const user_id = req.user.id;

    // Insert surat
    const [result] = await promisePool.query(
      `INSERT INTO surat (
        user_id, nama, nik, jenis_kelamin, tempat_lahir, tanggal_lahir,
        pekerjaan, kewarganegaraan, agama, no_hp, alamat_ktp, 
        alamat_sekarang, jenis_surat
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, nama, nik, jenis_kelamin, tempat_lahir, tanggal_lahir,
       pekerjaan, kewarganegaraan, agama, no_hp, alamat_ktp,
       alamat_sekarang, jenis_surat]
    );

    const suratId = result.insertId;

    // Insert lampiran if files uploaded
    if (req.files && req.files.length > 0) {
      const lampiranValues = req.files.map((file, index) => {
        const jenis_persyaratan = req.body[`jenis_persyaratan_${index}`] || 'Dokumen Pendukung';
        return [suratId, file.originalname, `/uploads/${file.filename}`, jenis_persyaratan];
      });

      await promisePool.query(
        'INSERT INTO lampiran_surat (surat_id, nama_file, url_file, jenis_persyaratan) VALUES ?',
        [lampiranValues]
      );
    }

    const [newSurat] = await promisePool.query(
      'SELECT * FROM surat WHERE id = ?',
      [suratId]
    );

    res.status(201).json({
      message: 'Surat berhasil diajukan',
      surat: newSurat[0]
    });
  } catch (error) {
    console.error('Create surat error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update surat status (admin only)
router.put('/:id/status', adminAuth, [
  body('status').isIn(['Menunggu', 'Diproses', 'Selesai']).withMessage('Status tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Check if surat exists
    const [existingSurat] = await promisePool.query(
      'SELECT * FROM surat WHERE id = ?',
      [id]
    );

    if (existingSurat.length === 0) {
      return res.status(404).json({ error: 'Surat tidak ditemukan' });
    }

    await promisePool.query(
      'UPDATE surat SET status = ? WHERE id = ?',
      [status, id]
    );

    const [updatedSurat] = await promisePool.query(
      'SELECT * FROM surat WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Status surat berhasil diupdate',
      surat: updatedSurat[0]
    });
  } catch (error) {
    console.error('Update surat status error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete surat (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if surat exists
    const [existingSurat] = await promisePool.query(
      'SELECT * FROM surat WHERE id = ?',
      [id]
    );

    if (existingSurat.length === 0) {
      return res.status(404).json({ error: 'Surat tidak ditemukan' });
    }

    // Delete lampiran first (foreign key constraint)
    await promisePool.query('DELETE FROM lampiran_surat WHERE surat_id = ?', [id]);
    
    // Delete surat
    await promisePool.query('DELETE FROM surat WHERE id = ?', [id]);

    res.json({ message: 'Surat berhasil dihapus' });
  } catch (error) {
    console.error('Delete surat error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get surat statistics (admin only)
router.get('/stats/overview', adminAuth, async (req, res) => {
  try {
    const [totalSurat] = await promisePool.query('SELECT COUNT(*) as total FROM surat');
    const [menunggu] = await promisePool.query("SELECT COUNT(*) as total FROM surat WHERE status = 'Menunggu'");
    const [diproses] = await promisePool.query("SELECT COUNT(*) as total FROM surat WHERE status = 'Diproses'");
    const [selesai] = await promisePool.query("SELECT COUNT(*) as total FROM surat WHERE status = 'Selesai'");

    res.json({
      total: totalSurat[0].total,
      menunggu: menunggu[0].total,
      diproses: diproses[0].total,
      selesai: selesai[0].total
    });
  } catch (error) {
    console.error('Get surat stats error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// --- PERBAIKAN PERSYARATAN SURAT ---
// Catatan Umum Pengambilan Surat:
// - Harap membawa identitas asli (KTP/KK/SIM)
// - Materai 10.000 (jika diperlukan untuk penandatanganan)
// - Handphone (untuk keperluan komunikasi/konfirmasi)

// Persyaratan Khusus:
// 1. Surat Keterangan Bepergian / Buruh Kerja:
//    - Membawa identitas asli (KTP/KK/SIM)
//    - Alamat tujuan (domisili tujuan) yang jelas
//    - Berkas pendukung lain (misal: surat keterangan kerja, surat pengantar RT/RW, dsb.)
//
// 2. Surat Keterangan Menikah / Belum Menikah:
//    - Membawa identitas asli (KTP/KK/SIM)
//    - Berkas pendukung (misal: surat pengantar RT/RW, surat pernyataan belum menikah, dsb.)
//    - Jika kehilangan buku nikah, suami dan istri wajib hadir bersama saat pengajuan
//    - Jika suami/istri bekerja di luar negeri, wajib membuat surat pernyataan bermaterai
//
// 3. Surat Keterangan Waris / Legal Hasil:
//    - Membawa identitas asli (KTP/KK/SIM)
//    - Berkas pendukung (riwayat waris, dokumen legal hasil, dsb.)
//
// 4. Surat Keterangan Kelahiran:
//    - Membawa identitas asli (KTP/KK/SIM)
//    - Berkas pendukung (misal: surat keterangan lahir dari bidan/rumah sakit, KK orang tua, dsb.)
//    - Pas Foto 4x6 (2 lembar):
//        - Jika lahir pada tanggal ganjil: pas foto berwarna merah
//        - Jika lahir pada tanggal genap: pas foto berwarna biru
//
// Catatan Tambahan:
// - Pastikan semua dokumen asli dan fotokopi sudah lengkap sebelum datang ke kantor desa.
// - Untuk dokumen yang memerlukan materai, siapkan materai 10.000 sesuai kebutuhan.
// - Bawa handphone untuk memudahkan komunikasi jika diperlukan saat pengambilan surat.

module.exports = router; 