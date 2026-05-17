import https from 'https';

https.get('https://api.github.com/search/code?q=01111+Pertanian+Jagung+extension:json', {headers:{'User-Agent':'Mozilla/5.0'}}, (res) => {
  let data = '';
  res.on('data', c => data+=c);
  res.on('end', () => console.log(JSON.parse(data).items?.map(x=>x.html_url)));
});
