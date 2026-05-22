const fs = require('fs');

function replaceFileContents(path, replacements) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        code = code.replace(new RegExp(search, 'g'), replace);
    }
    fs.writeFileSync(path, code);
}

replaceFileContents('src/components/GuideMenu.tsx', [
    ['grid md:grid-cols-2 gap-4', 'grid grid-cols-1 gap-4']
]);

replaceFileContents('src/DraftAktaPendirian.tsx', [
    ['grid grid-cols-1 md:grid-cols-2 gap-4', 'grid grid-cols-1 gap-4'],
    ['grid grid-cols-2 gap-2', 'grid grid-cols-1 gap-2']
]);

console.log('Fixed side-by-side grids');
