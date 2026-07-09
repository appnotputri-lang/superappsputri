const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf-8');

const regex = /(const INITIAL_ADDRESS: Address = \{.*?\n};\n\nconst INITIAL_RESOLUTIONS: ResolutionFlags = \{.*?\n};\n\nconst INITIAL_MANUAL_REP: Shareholder = \{.*?\n};\n\nexport const INITIAL_STATE: CompanyData = \{.*?\n};)/s;
const match = content.match(regex);

if (match) {
  let extracted = match[1];
  extracted = extracted.replace(/const INITIAL_ADDRESS/g, 'export const INITIAL_ADDRESS');
  extracted = extracted.replace(/const INITIAL_RESOLUTIONS/g, 'export const INITIAL_RESOLUTIONS');
  extracted = extracted.replace(/const INITIAL_MANUAL_REP/g, 'export const INITIAL_MANUAL_REP');
  
  let result = "import { Address, ResolutionFlags, Shareholder, CompanyData } from '../../../types';\n\n" + extracted;
  fs.writeFileSync('src/domain/company/initialCompanyData.ts', result);
  console.log('Extracted successfully!');
} else {
  console.error('Match not found!');
}
