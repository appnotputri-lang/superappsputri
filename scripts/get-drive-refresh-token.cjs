/**
 * Script untuk mendapatkan Google Drive Refresh Token.
 * Jalankan dari terminal: node scripts/get-drive-refresh-token.cjs
 */
const { google } = require('googleapis');
const readline = require('readline');

// Pastikan Anda sudah mengisi CLIENT_ID dan CLIENT_SECRET di sini atau di env
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GOOGLE_DRIVE_CLIENT_ID dan GOOGLE_DRIVE_CLIENT_SECRET harus diset di environment variables.');
  process.exit(1);
}

const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // Out-of-band redirect

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Pastikan selalu dapat refresh token
});

console.log('--- Google Drive Auth Setup ---');
console.log('1. Buka URL ini di browser Anda:');
console.log(authUrl);
console.log('\n2. Login dengan akun Google yang ingin digunakan.');
console.log('3. Setelah memberikan izin, Anda akan mendapatkan kode verifikasi.');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\nMasukkan kode verifikasi dari browser di sini: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n--- Hasil Token ---');
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('\nSimpan refresh token di atas ke environment variable GOOGLE_DRIVE_REFRESH_TOKEN.');
    if (!tokens.refresh_token) {
      console.log('\nPERINGATAN: Tidak mendapatkan refresh token. Coba hapus izin aplikasi di akun Google Anda lalu ulangi.');
    }
  } catch (err) {
    console.error('Error saat menukar kode:', err.message);
  }
});
