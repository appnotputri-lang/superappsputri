import https from 'https';

const options = {
  hostname: 'dpb.unpad.ac.id',
  port: 443,
  path: '/wp-json/dpb/v1/kbli2025-detail?kode=46100',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (d) => {
    data += d;
  });
  res.on('end', () => {
    console.log(data);
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
