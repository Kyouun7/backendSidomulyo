# WebSidomulyo Backend API

Backend API untuk Website Desa Sidomulyo menggunakan Express.js dan MySQL.

## 🚀 Fitur

- **Authentication & Authorization** - Login, register, JWT token
- **Berita Desa** - CRUD berita dengan kategori dan gambar
- **Surat Online** - Pengajuan surat dengan lampiran dokumen
- **Pengaduan Masyarakat** - Sistem pengaduan dengan status tracking
- **Statistik Desa** - Data statistik penduduk dan desa
- **Pariwisata** - Informasi wisata desa
- **Lembaga Desa** - Data lembaga dan pengurus
- **Struktur Organisasi** - Struktur pemerintahan desa
- **File Upload** - Upload gambar dan dokumen
- **Security** - Rate limiting, CORS, validation

## 📋 Prerequisites

- Node.js (v14 atau lebih baru)
- MySQL (v8.0 atau lebih baru)
- npm atau yarn

## 🛠️ Installation

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd WebSidomulyo/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup database**
   - Buat database MySQL dengan nama `websidomulyo`
   - Import file SQL yang sudah disediakan

4. **Setup environment variables**
   - Copy file `.env.example` ke `.env`
   - Sesuaikan konfigurasi database dan server

5. **Run server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=websido123!
DB_NAME=websidomulyo
DB_PORT=3306

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=websidomulyo_secret_key_2024_super_secure

# File Upload Configuration
UPLOAD_PATH=./public/uploads
MAX_FILE_SIZE=5242880
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "user123",
  "password": "password123",
  "nama": "Nama Lengkap",
  "email": "user@example.com",
  "no_hp": "081234567890"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "user123",
  "password": "password123"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

### Berita

#### Get All Berita
```http
GET /berita?page=1&limit=10&kategori=Pembangunan
```

#### Get Berita by ID
```http
GET /berita/1
```

#### Create Berita (Admin)
```http
POST /berita
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

{
  "title": "Judul Berita",
  "content": "Konten berita...",
  "kategori": "Pembangunan",
  "tanggal": "2024-01-15",
  "image": <file>
}
```

### Surat

#### Get All Surat (Admin)
```http
GET /surat?page=1&limit=10&status=Menunggu
Authorization: Bearer <admin_token>
```

#### Get My Surat (User)
```http
GET /surat/my-surat?page=1&limit=10
Authorization: Bearer <token>
```

#### Create Surat
```http
POST /surat
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "nama": "Nama Lengkap",
  "nik": "1234567890123456",
  "jenis_kelamin": "Laki-laki",
  "tempat_lahir": "Jakarta",
  "tanggal_lahir": "1990-01-01",
  "pekerjaan": "Wiraswasta",
  "kewarganegaraan": "Indonesia",
  "agama": "Islam",
  "no_hp": "081234567890",
  "alamat_ktp": "Alamat KTP",
  "alamat_sekarang": "Alamat Sekarang",
  "jenis_surat": "Surat Keterangan",
  "files": [<files>],
  "jenis_persyaratan_0": "KTP",
  "jenis_persyaratan_1": "KK"
}
```

### Pengaduan

#### Create Pengaduan (Public)
```http
POST /pengaduan
Content-Type: multipart/form-data

{
  "nama": "Nama Lengkap",
  "email": "user@example.com",
  "no_hp": "081234567890",
  "alamat": "Alamat lengkap",
  "judul": "Judul Pengaduan",
  "uraian": "Uraian pengaduan...",
  "image": <file>
}
```

#### Get All Pengaduan (Admin)
```http
GET /pengaduan?page=1&limit=10&status=Baru
Authorization: Bearer <admin_token>
```

### Statistik

#### Get All Statistik
```http
GET /statistik?kategori=penduduk
```

#### Create Statistik (Admin)
```http
POST /statistik
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "kategori": "penduduk",
  "label": "Total Penduduk",
  "value": 5000,
  "color": "#FF5733"
}
```

### Pariwisata

#### Get All Pariwisata
```http
GET /pariwisata?page=1&limit=10
```

#### Create Pariwisata (Admin)
```http
POST /pariwisata
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

{
  "nama": "Wisata Alam",
  "deskripsi": "Deskripsi wisata...",
  "tanggal": "2024-01-15",
  "image": <file>
}
```

### Lembaga

#### Get All Lembaga
```http
GET /lembaga
```

#### Create Lembaga (Admin)
```http
POST /lembaga
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "nama_lembaga": "BPD",
  "deskripsi": "Deskripsi lembaga..."
}
```

#### Add Pengurus to Lembaga (Admin)
```http
POST /lembaga/1/pengurus
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

{
  "nama": "Nama Pengurus",
  "jabatan": "Ketua",
  "foto": <file>
}
```

### Struktur Organisasi

#### Get All Struktur
```http
GET /struktur
```

#### Create Struktur (Admin)
```http
POST /struktur
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

{
  "nama": "Nama Lengkap",
  "jabatan": "Kepala Desa",
  "tipe": "kepala_desa",
  "foto": <file>
}
```

## 🔐 Authentication

API menggunakan JWT (JSON Web Token) untuk autentikasi. Token harus disertakan di header `Authorization`:

```
Authorization: Bearer <your_jwt_token>
```

### Role-based Access Control

- **Public** - Endpoint yang bisa diakses tanpa login
- **User** - Endpoint yang memerlukan login (role: warga)
- **Admin** - Endpoint yang memerlukan login dengan role admin

## 📁 File Upload

API mendukung upload file dengan batasan:

- **Format**: JPEG, PNG, GIF, PDF, DOC, DOCX
- **Ukuran maksimal**: 5MB per file
- **Path**: `/uploads/` (dapat diakses via `/uploads/filename`)

## 🛡️ Security Features

- **Rate Limiting** - 100 requests per 15 menit per IP
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security headers
- **Input Validation** - Validasi input menggunakan express-validator
- **SQL Injection Protection** - Menggunakan parameterized queries
- **File Upload Security** - Validasi tipe dan ukuran file

## 📊 Database Schema

Database terdiri dari 10 tabel utama:

1. **users** - Data pengguna/admin
2. **berita** - Berita desa
3. **surat** - Pengajuan surat
4. **lampiran_surat** - File lampiran surat
5. **pengaduan** - Pengaduan masyarakat
6. **statistik** - Data statistik desa
7. **pariwisata** - Informasi wisata
8. **lembaga_desa** - Data lembaga
9. **pengurus_lembaga** - Pengurus lembaga
10. **struktur_organisasi** - Struktur pemerintahan

## 🚀 Deployment

### Production Setup

1. **Environment Variables**
   ```env
   NODE_ENV=production
   PORT=5000
   JWT_SECRET=<strong_secret_key>
   ```

2. **Database**
   - Gunakan database production
   - Setup backup regular

3. **File Upload**
   - Gunakan cloud storage (AWS S3, Google Cloud Storage)
   - Setup CDN untuk file static

4. **Security**
   - Setup HTTPS
   - Gunakan reverse proxy (Nginx)
   - Setup firewall

## 📝 Error Handling

API mengembalikan response error dengan format:

```json
{
  "error": "Error message",
  "message": "Detailed error message (development only)"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

Untuk bantuan dan pertanyaan, silakan hubungi:
- Email: support@websidomulyo.com
- WhatsApp: +62 812-3456-7890 