const fs = require('fs');
const path = 'src/lib/docx-renderer/templates/SirkulerTemplate.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/if \(block\.indentLeft === 720\) level = 0;\s*if \(block\.indentLeft === 1080\) level = 1;\s*if \(block\.indentLeft === 1440\) level = 2;/g, `if (block.indentLeft === 720) level = 0;
        if (block.indentLeft === 1080) level = 1;
        if (block.indentLeft === 1440) level = 2;
        
        if (block.indentTabs !== undefined) {
          if (block.indentTabs <= 1.0) level = 0;
          else if (block.indentTabs <= 1.5) level = 1;
          else if (block.indentTabs <= 2.0) level = 2;
          else level = 3;
        }`);

fs.writeFileSync(path, code);
