import fs from 'fs';
import { JSDOM } from 'jsdom';

const raw = fs.readFileSync('20115.json', 'utf8');
const obj = JSON.parse(raw);
const dom = new JSDOM(obj.html);

// Find the Ruang Lingkup section
const sections = Array.from(dom.window.document.querySelectorAll('.dpb-oss-section'));
const rlSection = sections.find(sec => {
    const title = sec.querySelector('.dpb-oss-section-title');
    return title && title.textContent?.trim().toLowerCase() === 'ruang lingkup';
});

if (rlSection) {
    console.log("Found Ruang Lingkup Section in 20115!");
    const accordions = rlSection.querySelectorAll('.dpb-oss-accordion-item');
    if (accordions.length === 0) {
        console.log("No accordions inside RL section!");
        // Is there a table instead?
        const table = rlSection.querySelector('table');
        console.log("Table exists? ", !!table);
    }
} else {
    console.log("RL Section not found");
}
