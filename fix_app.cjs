const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

const importStatement = `import { GlobalModalManager } from './components/modals/GlobalModalManager';\n`;
if (!code.includes("GlobalModalManager")) {
  code = code.replace("import DocumentPreview from './components/DocumentPreview';", importStatement + "import DocumentPreview from './components/DocumentPreview';");
}

const renderManager = `
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
      />
`;

// Looking for the start of the modals, which are right after the mergedData definition.
// Wait, mergedData is computed inside an IIFE? Let's check!
