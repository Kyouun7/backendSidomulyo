const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const { readTentang, writeTentang } = require('../utils/tentangFile');

const router = express.Router();

// Get semua data tentang (public)
router.get('/', async (req, res) => {
  try {
    const tentang = await readTentang();
    res.json({ tentang });
  } catch (error) {
    console.error('Get tentang error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get data tentang berdasarkan section (public)
router.get('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const tentang = await readTentang();
    
    // Mapping untuk section dengan dash ke camelCase
    let sectionKey = section;
    if (section === 'visi-misi') {
      sectionKey = 'visiMisi';
    } else if (section === 'selayang-pandang') {
      sectionKey = 'selayangPandang';
    }
    
    if (!tentang[sectionKey]) {
      return res.status(404).json({ error: 'Section tidak ditemukan' });
    }
    
    res.json({ tentang: tentang[sectionKey] });
  } catch (error) {
    console.error('Get tentang by section error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update selayang pandang (admin only)
router.put('/selayang-pandang', adminAuth, [
  body('judul').notEmpty().withMessage('Judul wajib diisi'),
  body('konten').notEmpty().withMessage('Konten wajib diisi'),
  body('gambar').optional().custom((value) => {
    if (value !== null && value !== undefined && value !== '') {
      // If value is provided, it must be a valid URL
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('Gambar harus berupa URL yang valid');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { judul, konten, gambar } = req.body;
    const tentang = await readTentang();
    
    tentang.selayangPandang = {
      ...tentang.selayangPandang,
      judul,
      konten,
      gambar: gambar || null,
      updatedAt: new Date().toISOString()
    };
    
    await writeTentang(tentang);
    res.json({ 
      message: 'Selayang pandang berhasil diupdate', 
      tentang: tentang.selayangPandang 
    });
  } catch (error) {
    console.error('Update selayang pandang error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update visi misi (admin only)
router.put('/visi-misi', adminAuth, [
  body('judul').notEmpty().withMessage('Judul wajib diisi'),
  body('visi').notEmpty().withMessage('Visi wajib diisi'),
  body('misi').isArray({ min: 1 }).withMessage('Misi harus berupa array dengan minimal 1 item'),
  body('misi.*').notEmpty().withMessage('Setiap misi tidak boleh kosong')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { judul, visi, misi } = req.body;
    const tentang = await readTentang();
    
    tentang.visiMisi = {
      ...tentang.visiMisi,
      judul,
      visi,
      misi,
      updatedAt: new Date().toISOString()
    };
    
    await writeTentang(tentang);
    res.json({ 
      message: 'Visi & Misi berhasil diupdate', 
      tentang: tentang.visiMisi 
    });
  } catch (error) {
    console.error('Update visi misi error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update sejarah (admin only)
router.put('/sejarah', adminAuth, [
  body('judul').notEmpty().withMessage('Judul wajib diisi'),
  body('konten').notEmpty().withMessage('Konten wajib diisi'),
  body('gambar').optional().custom((value) => {
    if (value !== null && value !== undefined && value !== '') {
      // If value is provided, it must be a valid URL
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('Gambar harus berupa URL yang valid');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { judul, konten, gambar } = req.body;
    const tentang = await readTentang();
    
    tentang.sejarah = {
      ...tentang.sejarah,
      judul,
      konten,
      gambar: gambar || null,
      updatedAt: new Date().toISOString()
    };
    
    await writeTentang(tentang);
    res.json({ 
      message: 'Sejarah berhasil diupdate', 
      tentang: tentang.sejarah 
    });
  } catch (error) {
    console.error('Update sejarah error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update kondisi geografis (admin only)
router.put('/geografis', adminAuth, [
  body('judul').notEmpty().withMessage('Judul wajib diisi'),
  body('konten').notEmpty().withMessage('Konten wajib diisi'),
  body('batasUtara').notEmpty().withMessage('Batas utara wajib diisi'),
  body('batasSelatan').notEmpty().withMessage('Batas selatan wajib diisi'),
  body('batasBarat').notEmpty().withMessage('Batas barat wajib diisi'),
  body('batasTimur').notEmpty().withMessage('Batas timur wajib diisi'),
  body('luasWilayah').notEmpty().withMessage('Luas wilayah wajib diisi'),
  body('jumlahPenduduk').notEmpty().withMessage('Jumlah penduduk wajib diisi'),
  body('gambar').optional().custom((value) => {
    if (value !== null && value !== undefined && value !== '') {
      // If value is provided, it must be a valid URL
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('Gambar harus berupa URL yang valid');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { 
      judul, 
      konten, 
      batasUtara, 
      batasSelatan, 
      batasBarat, 
      batasTimur, 
      luasWilayah, 
      jumlahPenduduk, 
      gambar 
    } = req.body;
    
    const tentang = await readTentang();
    
    tentang.geografis = {
      ...tentang.geografis,
      judul,
      konten,
      batasUtara,
      batasSelatan,
      batasBarat,
      batasTimur,
      luasWilayah,
      jumlahPenduduk,
      gambar: gambar || null,
      updatedAt: new Date().toISOString()
    };
    
    await writeTentang(tentang);
    res.json({ 
      message: 'Kondisi geografis berhasil diupdate', 
      tentang: tentang.geografis 
    });
  } catch (error) {
    console.error('Update geografis error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update kondisi demografis (admin only)
router.put('/demografis', adminAuth, [
  body('judul').notEmpty().withMessage('Judul wajib diisi'),
  body('konten').notEmpty().withMessage('Konten wajib diisi'),
  body('jumlahKK').notEmpty().withMessage('Jumlah KK wajib diisi'),
  body('jumlahLakiLaki').notEmpty().withMessage('Jumlah laki-laki wajib diisi'),
  body('jumlahPerempuan').notEmpty().withMessage('Jumlah perempuan wajib diisi'),
  body('agama').isObject().withMessage('Data agama harus berupa object'),
  body('pendidikan').isObject().withMessage('Data pendidikan harus berupa object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { 
      judul, 
      konten, 
      jumlahKK, 
      jumlahLakiLaki, 
      jumlahPerempuan, 
      agama, 
      pendidikan 
    } = req.body;
    
    const tentang = await readTentang();
    
    tentang.demografis = {
      ...tentang.demografis,
      judul,
      konten,
      jumlahKK,
      jumlahLakiLaki,
      jumlahPerempuan,
      agama,
      pendidikan,
      updatedAt: new Date().toISOString()
    };
    
    await writeTentang(tentang);
    res.json({ 
      message: 'Kondisi demografis berhasil diupdate', 
      tentang: tentang.demografis 
    });
  } catch (error) {
    console.error('Update demografis error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get overview tentang (admin only)
router.get('/admin/overview', adminAuth, async (req, res) => {
  try {
    const tentang = await readTentang();
    const sections = Object.keys(tentang);
    const totalSections = sections.length;
    
    const overview = sections.map(section => ({
      section,
      judul: tentang[section].judul,
      updatedAt: tentang[section].updatedAt
    }));
    
    res.json({ 
      totalSections, 
      sections: overview 
    });
  } catch (error) {
    console.error('Get tentang overview error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router; 