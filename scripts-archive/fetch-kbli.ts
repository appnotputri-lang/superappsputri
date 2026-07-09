import fs from 'fs';
import https from 'https';

https.get('https://raw.githubusercontent.com/withered-flowers/kbli-json/master/data/kbli-2020.json', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('kbli-2020.json', data);
    console.log('Saved successfully, length: ', data.length);
  });
}).on('error', (e) => {
  console.error(e);
});
