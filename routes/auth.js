const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config');
const { auth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

const router = express.Router();

// Register (dibangun ulang)
router.post('/register', async (req, res) => {
  try {
    const { username, password, nama, email, no_hp } = req.body;

    // Validasi manual
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username minimal 3 karakter' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }
    if (!nama) {
      return res.status(400).json({ error: 'Nama lengkap wajib diisi' });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Email tidak valid' });
    }
    if (no_hp && !/^(\+62|62|0)?[0-9]{9,12}$/.test(no_hp)) {
      return res.status(400).json({ error: 'Nomor HP tidak valid. Gunakan format: 081234567890' });
    }

    // Cek username/email sudah ada
    const [userByUsername] = await promisePool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (userByUsername.length > 0) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }
    const [userByEmail] = await promisePool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (userByEmail.length > 0) {
      return res.status(400).json({ error: 'Email sudah digunakan' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Simpan user baru
    const [result] = await promisePool.query(
      'INSERT INTO users (username, password_hash, nama, email, no_hp, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, password_hash, nama, email, no_hp || null, 'warga']
    );

    // Ambil data user yang baru
    const userId = result.insertId;
    const [userRows] = await promisePool.query(
      'SELECT id, username, nama, email, no_hp, profile_image, role FROM users WHERE id = ?',
      [userId]
    );
    const user = userRows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registrasi & login berhasil',
      token,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        email: user.email,
        no_hp: user.no_hp,
        profile_image: user.profile_image,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server', details: error.message });
  }
});

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Username wajib diisi'),
  body('password').notEmpty().withMessage('Password wajib diisi')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Get user
    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        email: user.email,
        no_hp: user.no_hp,
        profile_image: user.profile_image,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Change password
router.put('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Password saat ini wajib diisi'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user
    const [users] = await promisePool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Password saat ini salah' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await promisePool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update profile
router.put('/profile', auth, uploadImage, [
  body('nama').notEmpty().withMessage('Nama wajib diisi'),
  body('email').isEmail().withMessage('Email tidak valid'),
  body('no_hp').optional().custom((value) => {
    if (value && value.trim() !== '') {
      // Validasi format nomor HP Indonesia yang lebih fleksibel
      // Menerima: +6281234567890, 6281234567890, 081234567890, 81234567890, 91234567890, dll
      const phoneRegex = /^(\+62|62|0)?[0-9]{9,12}$/;
      if (!phoneRegex.test(value)) {
        throw new Error('Nomor HP tidak valid. Gunakan format: 081234567890');
      }
    }
    return true;
  }).withMessage('Nomor HP tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nama, email, no_hp } = req.body;
    const userId = req.user.id;

    // Check if email already exists (excluding current user)
    const [existingUser] = await promisePool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email sudah digunakan oleh user lain' });
    }

    // Handle profile image upload
    let profileImage = null;
    if (req.file) {
      profileImage = `/uploads/${req.file.filename}`;
    }

    // Update profile dengan error handling yang lebih baik
    console.log('Updating profile for user ID:', userId);
    console.log('Update data:', { 
      nama, 
      email, 
      no_hp, 
      profile_image: profileImage
    });
    
    try {
      // Jika ada file upload, update dengan foto baru
      if (profileImage) {
        await promisePool.query(
          'UPDATE users SET nama = ?, email = ?, no_hp = ?, profile_image = ? WHERE id = ?',
          [nama, email, no_hp || null, profileImage, userId]
        );
      } else {
        // Jika tidak ada file upload, update tanpa mengubah foto
        await promisePool.query(
          'UPDATE users SET nama = ?, email = ?, no_hp = ? WHERE id = ?',
          [nama, email, no_hp || null, userId]
        );
      }
      
      console.log('Update result: success');
    } catch (dbError) {
      console.error('Database update error:', dbError);
      throw new Error('Gagal menyimpan data ke database: ' + dbError.message);
    }

    // Get updated user data
    const [updatedUser] = await promisePool.query(
      'SELECT id, username, nama, email, no_hp, profile_image, role FROM users WHERE id = ?',
      [userId]
    );

    if (updatedUser.length === 0) {
      throw new Error('User tidak ditemukan setelah update');
    }

    console.log('Updated user data:', updatedUser[0]);

    res.json({
      message: 'Profil berhasil diupdate',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Terjadi kesalahan server', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete user account
router.delete('/account', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data untuk validasi
    const [userData] = await promisePool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (userData.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const user = userData[0];

    // Prevent admin from deleting themselves
    if (user.role === 'admin') {
      return res.status(403).json({ 
        error: 'Tidak dapat menghapus akun administrator' 
      });
    }

    // Delete related data first (foreign key constraints)
    try {
      // Delete user's surat records
      await promisePool.query('DELETE FROM surat WHERE user_id = ?', [userId]);
      
      // Delete user's lampiran_surat records (if any)
      await promisePool.query(
        'DELETE ls FROM lampiran_surat ls INNER JOIN surat s ON ls.surat_id = s.id WHERE s.user_id = ?', 
        [userId]
      );
      
      // Delete user's pengaduan records (if user_id exists)
      await promisePool.query('DELETE FROM pengaduan WHERE user_id = ?', [userId]);
      
      // Delete user's berita records (if created_by exists)
      await promisePool.query('DELETE FROM berita WHERE created_by = ?', [userId]);
      
      // Delete user's pengumuman records (if created_by exists)
      await promisePool.query('DELETE FROM pengumuman WHERE created_by = ?', [userId]);
      
      // Delete user's agenda records (if created_by exists)
      await promisePool.query('DELETE FROM agenda WHERE created_by = ?', [userId]);
      
    } catch (deleteError) {
      console.error('Error deleting related data:', deleteError);
      // Continue with user deletion even if related data deletion fails
    }

    // Finally delete the user
    await promisePool.query('DELETE FROM users WHERE id = ?', [userId]);

    console.log(`User account deleted: ID ${userId}, Username: ${user.username}`);

    res.json({ 
      message: 'Akun berhasil dihapus',
      deletedUser: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan server', 
      details: error.message 
    });
  }
});

module.exports = router; 