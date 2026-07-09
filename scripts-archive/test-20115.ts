import https from 'https';
const req = https.request('https://dpb.unpad.ac.id/wp-json/dpb/v1/kbli2025-detail?kode=20115', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', (d) => data += d);
  res.on('end', () => console.log(data));
});
req.end();
