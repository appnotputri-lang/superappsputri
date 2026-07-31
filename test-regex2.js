const css = `
.text-slate-900 { color: oklch(0.129 0.042 264.695); }
.bg-slate-100 { background-color: oklch(0.968 0.007 247.896); }
.text-blue-500 { color: oklch(0.623 0.214 259.815); }
.border-gray-300 { border-color: oklch(0.869 0.005 252.894); }
`;
// Note: oklch can have slashes for alpha: oklch(0.623 0.214 259.815 / 0.5)
const replaced = css.replace(/oklch\(([^)]+)\)/gi, (match, inner) => {
    const parts = inner.trim().split(/\s+/);
    const l = parseFloat(parts[0]);
    if (isNaN(l)) return '#000000';
    const gray = Math.round(l * 255);
    
    // Check for alpha
    const alphaIndex = inner.indexOf('/');
    if (alphaIndex !== -1) {
        const alphaStr = inner.substring(alphaIndex + 1).trim();
        const alpha = parseFloat(alphaStr);
        if (!isNaN(alpha)) {
            return `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
        }
    }
    
    return `rgb(${gray}, ${gray}, ${gray})`;
});
console.log(replaced);
