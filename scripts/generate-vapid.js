import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('====================================================');
console.log('VAPID Key Pair Generated Successfully!');
console.log('====================================================\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:admin@notarisputri.web.id\n');
console.log('====================================================');
console.log('Catatan: Masukkan key di atas ke Cloudflare Pages -> Settings -> Environment variables.');
console.log('JANGAN mengekspos VAPID_PRIVATE_KEY ke client/frontend.');
console.log('====================================================');
