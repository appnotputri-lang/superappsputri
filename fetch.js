async function fetchUrl() {
  const res = await fetch('https://dpb.unpad.ac.id/wp-json/dpb/v1/kbli2025-detail?kode=46100');
  const text = await res.text();
  console.log(text);
}
fetchUrl();
