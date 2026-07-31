const css = `
.text-slate-900 { color: oklch(0.129 0.042 264.695); }
.bg-blue-500 { background-color: oklch(0.5 0.1 250); }
`;
const replaced = css.replace(/oklch\([^)]+\)/gi, '#000000');
console.log(replaced);
