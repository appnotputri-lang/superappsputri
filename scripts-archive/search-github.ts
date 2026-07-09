import https from 'https';
https.get('https://api.github.com/search/repositories?q=kbli', {headers:{'User-Agent':'npx'}}, (res) => {
  let data = '';
  res.on('data', c => data+=c);
  res.on('end', () => console.log(JSON.parse(data).items.slice(0,5).map(x=>x.html_url)));
});
