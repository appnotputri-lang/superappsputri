const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

const importStatement = `import { GlobalModalManager } from './components/modals/GlobalModalManager';\n`;
code = code.replace("import DocumentPreview from './components/DocumentPreview';", importStatement + "import DocumentPreview from './components/DocumentPreview';");

// Remove everything from {(() => { to the end before </div>\n  );\n};

const modalRegex = /\{\(\(\) => \{\n\s*const mergedData = \{\n[\s\S]*?\{\/\* Edit Profile Modal \*\/\}\n\s*\{isEditProfileModalOpen && user && userProfile && \(\n\s*<EditProfileModal\n\s*isOpen=\{isEditProfileModalOpen\}\n\s*onClose=\{\(\) => setIsEditProfileModalOpen\(false\)\}\n\s*userId=\{user\.uid\}\n\s*currentProfile=\{userProfile\}\n\s*\/>\n\s*\)\}\n\s*\n\s*<\/div>/g;

// Instead of regex, I'll just find the exact lines to remove and replace with GlobalModalManager.
// Wait, the `{(() => { const mergedData = {` block has the modals inside it?
// Let's check App.tsx around line 8520.
