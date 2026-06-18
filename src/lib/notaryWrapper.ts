export interface FormatToken {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  highlight?: string;
  size?: number;
  break?: number;
}

const charWidths: Record<string, number> = {
  'a': 0.63, 'b': 0.63, 'c': 0.61, 'd': 0.63, 'e': 0.63, 'f': 0.35, 'g': 0.63, 'h': 0.63, 'i': 0.25, 'j': 0.25, 'k': 0.56, 'l': 0.25, 'm': 0.94, 'n': 0.63, 'o': 0.65, 'p': 0.63, 'q': 0.63, 'r': 0.40, 's': 0.45, 't': 0.35, 'u': 0.63, 'v': 0.55, 'w': 0.85, 'x': 0.55, 'y': 0.55, 'z': 0.50,
  'A': 0.75, 'B': 0.65, 'C': 0.75, 'D': 0.75, 'E': 0.65, 'F': 0.60, 'G': 0.80, 'H': 0.75, 'I': 0.25, 'J': 0.50, 'K': 0.65, 'L': 0.55, 'M': 0.95, 'N': 0.75, 'O': 0.85, 'P': 0.65, 'Q': 0.85, 'R': 0.65, 'S': 0.60, 'T': 0.60, 'U': 0.75, 'V': 0.65, 'W': 1.05, 'X': 0.65, 'Y': 0.65, 'Z': 0.65,
  '0': 0.60, '1': 0.60, '2': 0.60, '3': 0.60, '4': 0.60, '5': 0.60, '6': 0.60, '7': 0.60, '8': 0.60, '9': 0.60,
  ' ': 0.38, '.': 0.30, ',': 0.30, '-': 0.35, '(': 0.35, ')': 0.35, ':': 0.30, ';': 0.30, '!': 0.30, '?': 0.45, '\'': 0.25, '"': 0.40, '/': 0.40, '\\': 0.40,
  '_': 0.50
};

export function measureTextWidth(text: string, bold: boolean = false): number {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    let cw = charWidths[c] || 0.65;
    
    if (bold) {
      cw *= 1.10;
    }
    width += cw;
  }
  // Clean Century Gothic scaling ratio
  return width * 1.05;
}

export function parseTextRuns(runs: FormatToken[], maxWidth = 41.5): FormatToken[][] {
  const tokens: (FormatToken & { isNewline?: boolean })[] = [];
  
  runs.forEach(run => {
    const rawParts = run.text.split(/(\r?\n)/);
    rawParts.forEach(part => {
      if (part === "\n" || part === "\r\n") {
        tokens.push({ text: "\n", isNewline: true });
      } else {
        const parts = part.match(/(\S+|\s+)/g) || [];
        parts.forEach(p => {
           tokens.push({ 
             text: p, 
             bold: run.bold,
             italic: run.italic,
             underline: run.underline,
             color: run.color,
             highlight: run.highlight,
             size: run.size
           });
        });
      }
    });
  });

  const lines: FormatToken[][] = [];
  let currentLine: FormatToken[] = [];
  let currentLength = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.isNewline) {
      lines.push(currentLine);
      currentLine = [];
      currentLength = 0;
      continue;
    }
    const tokWidth = measureTextWidth(token.text, !!token.bold);
    
    if (token.text.match(/^\s+$/)) {
      if (currentLength === 0) continue; 
      if (currentLength + tokWidth > maxWidth) continue;
      
      currentLine.push(token);
      currentLength += tokWidth;
    } else {
      if (currentLength + tokWidth > maxWidth && currentLength > 0) {
         lines.push(currentLine);
         currentLine = [token];
         currentLength = tokWidth;
      } else {
         currentLine.push(token);
         currentLength += tokWidth;
      }
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  // Clean trailing spaces
  lines.forEach(line => {
    while(line.length > 0 && line[line.length - 1].text.match(/^\s+$/)) {
      line.pop();
    }
  });

  return lines;
}
