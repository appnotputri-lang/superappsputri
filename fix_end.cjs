const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  // At the end, we have:
  //             </div>
  //     })();
  // };
  // Which actually is missing the closing parenthesis for the inner return statement
  // Let's just find the last "    })();" and replace it with "            );\n  })();"
  // Wait, I can just replace "    })();" with "            );\n  })();"
  content = content.replace("    })();\n};\nexport", "            );\n  })();\n};\nexport");
  fs.writeFileSync(file, content);
}

fixFile('src/features/document-generator/pages/RUPSLBPage.tsx');
fixFile('src/features/document-generator/pages/RUPSTPage.tsx');
