
import * as fs from 'fs';

const newItem = {
  kode: "85578",
  judul: "PENDIDIKAN DAN PELATIHAN PERSONEL PENERBANGAN",
  uraian: "Kelompok ini mencakup jasa pendidikan personel penerbangan yang dilakukan oleh swasta, seperti personel pesawat udara, personel bandar udara, personel navigasi penerbangan, personel keamanan penerbangan. Kelompok ini juga mencakup pengangkutan khusus awak pesawat dalam rangka pendidikan.",
  level: "Kelompok"
};

try {
  const content = fs.readFileSync('kbli_2025.json', 'utf8');
  const json = JSON.parse(content);
  
  // Check if it already exists as a kode
  const exists = json.data.find((item: any) => item.kode === newItem.kode);
  if (exists) {
    console.log('KBLI already exists as a code');
    process.exit(0);
  }
  
  json.data.push(newItem);
  
  // Sort by code
  json.data.sort((a: any, b: any) => a.kode.localeCompare(b.kode));
  
  fs.writeFileSync('kbli_2025.json', JSON.stringify(json));
  console.log('Successfully added KBLI 85578');
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
