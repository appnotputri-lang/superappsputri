import fs from 'fs';
import { JSDOM } from 'jsdom';

const raw = fs.readFileSync('46100.json', 'utf8');
const obj = JSON.parse(raw);
const dom = new JSDOM(obj.html);

// Find the Ruang Lingkup section
const sections = Array.from(dom.window.document.querySelectorAll('.dpb-oss-section'));
const rlSection = sections.find(sec => {
    const title = sec.querySelector('.dpb-oss-section-title');
    return title && title.textContent?.trim().toLowerCase() === 'ruang lingkup';
});

if (rlSection) {
    const accordions = rlSection.querySelectorAll('.dpb-oss-accordion-item');
    accordions.forEach(acc => {
        const titleSpan = acc.querySelector('.dpb-oss-accordion-head span');
        const ruangLingkup = titleSpan ? titleSpan.textContent?.trim() : '';
        console.log(`\nFound Ruang Lingkup: ${ruangLingkup}`);

        const panels = acc.querySelectorAll('.dpb-oss-tab-panel');
        panels.forEach(panel => {
           // Try to find the Skala Usaha name
           // Or just trust the class names or data-panel
           let skala = '';
           const dataPanel = panel.getAttribute('data-panel') || '';
           if (dataPanel.includes('mikro')) skala = 'Mikro';
           else if (dataPanel.includes('kecil')) skala = 'Kecil';
           else if (dataPanel.includes('menengah')) skala = 'Menengah';
           else if (dataPanel.includes('besar')) skala = 'Besar';

           // Find Tingkat Risiko and Perizinan Berusaha
           const infoItems = panel.querySelectorAll('.dpb-oss-info-item');
           let risiko = '';
           let izin = '';

           infoItems.forEach(item => {
               const label = item.querySelector('.dpb-oss-info-label')?.textContent?.trim();
               const value = item.querySelector('.dpb-oss-info-value')?.textContent?.trim();
               if (label === 'Tingkat Risiko') risiko = value || '';
               if (label === 'Perizinan Berusaha') izin = value || '';
           });

           console.log(`  Skala: ${skala} -> Risiko: ${risiko}, Izin: ${izin}`);
        });
    });
} else {
    console.log("Ruang Lingkup section not found");
}
