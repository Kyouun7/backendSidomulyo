const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file gambar JPG, JPEG, atau PNG yang diperbolehkan!'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File terlalu besar. Maksimal 5MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: `Field '${err.field}' tidak diharapkan. Gunakan field 'img' untuk upload gambar.` });
    }
    return res.status(400).json({ error: 'Error upload file: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Specific upload configurations
const uploadImage = upload.single('foto'); // Changed to 'foto' to match frontend
const uploadDocument = upload.single('document');
const uploadMultiple = upload.array('files', 5); // Max 5 files

// Flexible upload middleware that accepts multiple field names
const uploadFlexible = (fieldNames = ['foto', 'img', 'image', 'file']) => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldNames[0]);
    uploadSingle(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_UNEXPECTED_FILE') {
        // Try alternative field names
        for (let i = 1; i < fieldNames.length; i++) {
          const altUpload = upload.single(fieldNames[i]);
          altUpload(req, res, (altErr) => {
            if (!altErr || !(altErr instanceof multer.MulterError)) {
              return next();
            }
          });
        }
        return res.status(400).json({ 
          error: `Field upload tidak valid. Gunakan salah satu dari: ${fieldNames.join(', ')}` 
        });
      }
      next(err);
    });
  };
};

module.exports = {
  upload,
  uploadImage,
  uploadDocument,
  uploadMultiple,
  uploadFlexible,
  handleMulterError
}; 