async function fetchUrl() {
  const res = await fetch('https://notarisputrisurat.pages.dev/assets/index-BIPnOqGa.js');
  const text = await res.text();
  const fs = require('fs');
  fs.writeFileSync('downloaded.js', text);
  console.log('Saved to downloaded.js');
}
fetchUrl();
