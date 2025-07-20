/**
 * Utility helper untuk menangani URL gambar
 */

// Base URL untuk development dan production
const getBaseUrl = (req) => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  }
  return `${req.protocol}://${req.get('host')}`;
};

// Convert relative path ke absolute URL
const getImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  
  // Jika sudah absolute URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Jika relative path, convert ke absolute URL
  const baseUrl = getBaseUrl(req);
  return `${baseUrl}${imagePath}`;
};

// Save image path dengan path relatif
const saveImagePath = (req, filename) => {
  if (!filename) return null;
  return `/uploads/${filename}`;
};

// Validate image URL
const isValidImageUrl = (url) => {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/uploads/');
};

// Get filename from URL
const getFilenameFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1];
};

module.exports = {
  getBaseUrl,
  getImageUrl,
  saveImagePath,
  isValidImageUrl,
  getFilenameFromUrl
}; 