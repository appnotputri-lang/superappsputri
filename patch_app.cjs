const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf-8');

// Add import
const importGlobalModal = "import { GlobalModalManager } from './components/modals/GlobalModalManager';\n";
if (!code.includes("GlobalModalManager")) {
  code = code.replace("import DocumentPreview from './components/DocumentPreview';", importGlobalModal + "import DocumentPreview from './components/DocumentPreview';");
}

// Remove the modals block from App.tsx
// Find index of `      <Modal ` after the ProxyInputModal IIFE.
const searchStr = `        );
      })()}

      <Modal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)}`;

if (!code.includes(searchStr)) {
  console.log("Could not find the start of the modals.");
  process.exit(1);
}

const startIdx = code.indexOf(searchStr);
// We will replace from startIdx to the end before the last </div>
// The end of the modals is after {isEditProfileModalOpen && user && userProfile && ( ... )}
const endSearchStr = `      {isEditProfileModalOpen && user && userProfile && (
        <EditProfileModal
          isOpen={isEditProfileModalOpen}
          onClose={() => setIsEditProfileModalOpen(false)}
          userId={user.uid}
          currentProfile={userProfile}
        />
      )}`;

const endIdx = code.indexOf(endSearchStr, startIdx);
if (endIdx === -1) {
  console.log("Could not find the end of the modals.");
  process.exit(1);
}

const finalEndIdx = endIdx + endSearchStr.length;

const renderManager = `        );
      })()}

      <GlobalModalManager
        editingShareholder={editingShareholder}
        setEditingShareholder={setEditingShareholder}
        editMode={editMode}
        setEditMode={setEditMode}
        data={data}
        currentTargetSharesPaid={currentTargetSharesPaid}
        saveShareholder={saveShareholder}
        isPreviewOpen={isPreviewOpen}
        setIsPreviewOpen={setIsPreviewOpen}
        zoom={zoom}
        setZoom={setZoom}
        handlePrint={handlePrint}
        handleExportWord={handleExportWord}
        activeSidebarTab={activeSidebarTab}
        mergedData={mergedData}
        isAddKbliModalOpen={isAddKbliModalOpen}
        setIsAddKbliModalOpen={setIsAddKbliModalOpen}
        kbliModalSearchTerm={kbliModalSearchTerm}
        setKbliModalSearchTerm={setKbliModalSearchTerm}
        handleKbliModalKeyDown={handleKbliModalKeyDown}
        performKbliModalSearch={performKbliModalSearch}
        kbliPaginatedResults={kbliPaginatedResults}
        kbliCheckedKblis={kbliCheckedKblis}
        handleToggleAllKbliOnPage={handleToggleAllKbliOnPage}
        handleToggleKbliChecked={handleToggleKbliChecked}
        kbliTotalPages={kbliTotalPages}
        getKbliPageNumbers={getKbliPageNumbers}
        kbliCurrentPage={kbliCurrentPage}
        setKbliCurrentPage={setKbliCurrentPage}
        handleAddKbliBatch={handleAddKbliBatch}
        showPendirianPreview={showPendirianPreview}
        setShowPendirianPreview={setShowPendirianPreview}
        pendirianPreviewData={pendirianPreviewData}
        handlePendirianExportWord={handlePendirianExportWord}
        isExportingPendirian={isExportingPendirian}
        isEditProfileModalOpen={isEditProfileModalOpen}
        setIsEditProfileModalOpen={setIsEditProfileModalOpen}
        user={user}
        userProfile={userProfile}
      />`;

code = code.substring(0, startIdx) + renderManager + code.substring(finalEndIdx);
fs.writeFileSync('App.tsx', code);
console.log("App.tsx patched successfully.");
