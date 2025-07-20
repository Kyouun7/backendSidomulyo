const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '../tentang.json');

async function readTentang() {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Return default data if file doesn't exist
      const defaultData = {
        selayangPandang: {
          id: 1,
          judul: "Selayang Pandang",
          konten: "Desa Sidomulyo adalah desa yang terletak di Kecamatan X, Kabupaten Y, Provinsi Z. Desa ini memiliki luas wilayah sekitar X hektar dengan jumlah penduduk sekitar X jiwa.",
          gambar: null,
          updatedAt: new Date().toISOString()
        },
        visiMisi: {
          id: 2,
          judul: "Visi & Misi",
          visi: "Terwujudnya Desa Sidomulyo yang maju, mandiri, dan sejahtera",
          misi: [
            "Meningkatkan kualitas pendidikan dan kesehatan masyarakat",
            "Mengembangkan perekonomian desa berbasis potensi lokal",
            "Membangun infrastruktur desa yang berkelanjutan",
            "Menguatkan kelembagaan desa dan partisipasi masyarakat"
          ],
          updatedAt: new Date().toISOString()
        },
        sejarah: {
          id: 3,
          judul: "Sejarah Desa",
          konten: "Sejarah Desa Sidomulyo dimulai pada tahun XXXX ketika sekelompok masyarakat pertama kali menetap di wilayah ini. Nama 'Sidomulyo' diambil dari kata 'Sido' yang berarti menjadi dan 'Mulyo' yang berarti makmur.",
          gambar: null,
          updatedAt: new Date().toISOString()
        },
        geografis: {
          id: 4,
          judul: "Kondisi Geografis",
          konten: "Desa Sidomulyo memiliki topografi yang bervariasi dari dataran rendah hingga perbukitan. Wilayah ini dialiri oleh beberapa sungai dan memiliki tanah yang subur untuk pertanian.",
          batasUtara: "Desa X",
          batasSelatan: "Desa Y", 
          batasBarat: "Desa Z",
          batasTimur: "Desa W",
          luasWilayah: "X hektar",
          jumlahPenduduk: "X jiwa",
          gambar: null,
          updatedAt: new Date().toISOString()
        },
        demografis: {
          id: 5,
          judul: "Kondisi Demografis",
          konten: "Masyarakat Desa Sidomulyo terdiri dari berbagai suku dan agama yang hidup rukun berdampingan. Mayoritas penduduk bekerja sebagai petani dan pedagang.",
          jumlahKK: "X KK",
          jumlahLakiLaki: "X jiwa",
          jumlahPerempuan: "X jiwa",
          agama: {
            "Islam": "X%",
            "Kristen": "X%",
            "Katolik": "X%",
            "Hindu": "X%",
            "Buddha": "X%"
          },
          pendidikan: {
            "Tidak Sekolah": "X%",
            "SD": "X%",
            "SMP": "X%",
            "SMA": "X%",
            "D3/S1": "X%",
            "S2/S3": "X%"
          },
          updatedAt: new Date().toISOString()
        }
      };
      // Create file with default data
      await writeTentang(defaultData);
      return defaultData;
    }
    throw err;
  }
}

async function writeTentang(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId(data) {
  if (!data || Object.keys(data).length === 0) return 1;
  const ids = Object.values(data).map(item => item.id || 0);
  return Math.max(...ids) + 1;
}

module.exports = { readTentang, writeTentang, generateId }; 