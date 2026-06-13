const ts = require('typescript');
const fs = require('fs');

const code = fs.readFileSync('App.tsx', 'utf8');
const sourceFile = ts.createSourceFile('App.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function walk(node) {
    if (node.kind === ts.SyntaxKind.JsxElement) {
        const opening = node.openingElement;
        const closing = node.closingElement;
        const openName = opening.tagName.getText();
        const closeName = closing.tagName.getText();
        if (openName !== closeName) {
            console.log(`Mismatch: <${openName}> at line ${sourceFile.getLineAndCharacterOfPosition(opening.getStart()).line + 1} but closed with </${closeName}> at line ${sourceFile.getLineAndCharacterOfPosition(closing.getStart()).line + 1}`);
        }
    }
    ts.forEachChild(node, walk);
}
walk(sourceFile);

const program = ts.createProgram(['App.tsx'], { jsx: ts.JsxEmit.React });
const diagnostics = program.getSemanticDiagnostics();
const syntactic = program.getSyntacticDiagnostics();

console.log("Syntactic Errors:", syntactic.length);
syntactic.slice(0, 10).forEach(d => {
    if (d.file) {
        const pos = d.file.getLineAndCharacterOfPosition(d.start);
        const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        console.log(`SynErr at ${pos.line + 1}:${pos.character + 1}: ${msg}`);
    }
});
