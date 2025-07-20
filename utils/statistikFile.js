const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '../statistik.json');
const TEMP_PATH = path.join(__dirname, '../statistik.tmp.json');

async function readStatistik() {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeStatistik(data) {
  try {
    await fs.writeFile(TEMP_PATH, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(TEMP_PATH, DATA_PATH);
  } catch (err) {
    console.error('Gagal menulis statistik.json:', err);
    throw err;
  }
}

function generateId(data) {
  if (!Array.isArray(data) || data.length === 0) return 1;
  return Math.max(...data.map(item => item.id || 0)) + 1;
}

module.exports = { readStatistik, writeStatistik, generateId }; 