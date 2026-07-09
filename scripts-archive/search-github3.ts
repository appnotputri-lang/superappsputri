import https from 'https';
https.get('https://api.github.com/search/code?q=repo:idx-repo/kbli+extension:json', {headers:{'User-Agent':'npx'}}, (res) => {
  let data = '';
  res.on('data', c => data+=c);
  res.on('end', () => console.log(JSON.parse(data).items?.map(x=>x.path)));
});
