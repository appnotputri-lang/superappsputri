const fs = require('fs');
let file = fs.readFileSync('App.tsx', 'utf8');

const stratTag = '{/* AGENDA PERUBAHAN */}';
const endTag = '<AhuSection title="AKTA PENDIRIAN DAN PERUBAHAN">';

const startIdx = file.indexOf(stratTag);
const endIdx = file.indexOf(endTag);

if (startIdx > -1 && endIdx > -1) {
    const extracted = file.substring(startIdx, endIdx);
    
    // Remove from current position 
    file = file.replace(extracted, '');

    // Now insert it right before the DOMISILI PERSEROAN anchor in the Draft Notulen branch
    const anchor = '{/* DOMISILI PERSEROAN */}';
    const anchorIdx = file.indexOf(anchor);

    if (anchorIdx > -1) {
        file = file.substring(0, anchorIdx) + extracted + '\n            ' + file.substring(anchorIdx);
        fs.writeFileSync('App.tsx', file);
        console.log('Fixed AGENDA PERUBAHAN location');
    } else {
        console.log('Could not find DOMISILI PERSEROAN anchor:' + anchorIdx);
    }
} else {
    console.log('Could not find tags Start:', startIdx, 'End:', endIdx);
}
