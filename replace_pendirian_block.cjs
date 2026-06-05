const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

// 1. Find the entire RUPST block
const startRupst = ") : activeSidebarTab === 'rupst' ? (";
const endRupst = "          ) : activeSidebarTab === 'pendirian' ? (";

const rupstIndex = content.indexOf(startRupst);
const endIndex = content.indexOf(endRupst);

if (rupstIndex === -1 || endIndex === -1) {
  console.log("Could not find RUPST block boundaries", rupstIndex, endIndex);
  process.exit(1);
}

let rupstBlock = content.substring(rupstIndex, endIndex);

// Make Pendirian block from it
let pendirianBlock = rupstBlock
  .replace(") : activeSidebarTab === 'rupst' ? (", "          ) : activeSidebarTab === 'pendirian' ? (")
  // Replace titles and placeholders
  .replace(/RUPS Tahunan \(RUPST\)/g, 'Pendirian PT')
  .replace(/RUPS Tahunan/g, 'Pendirian PT')
  .replace(/RUPST/g, 'Pendirian PT')
  .replace(/rupstIsAudited/g, 'pendirianIsAudited')
  .replace(/rupstFiscalYear/g, 'pendirianFiscalYear')
  .replace(/rupstFinancialReportNumber/g, 'pendirianFinancialReportNumber')
  .replace(/rupstFinancialReportDate/g, 'pendirianFinancialReportDate')
  .replace(/rupstFinancialReportSignatoryName/g, 'pendirianFinancialReportSignatoryName')
  .replace(/rupstFinancialReportSignatoryPosition/g, 'pendirianFinancialReportSignatoryPosition')
  .replace(/rupstKapName/g, 'pendirianKapName')
  .replace(/rupstKapLicenseNumber/g, 'pendirianKapLicenseNumber')
  .replace(/rupstKapExpiryDate/g, 'pendirianKapExpiryDate')
  .replace(/rupstNetProfit/g, 'pendirianNetProfit')
  .replace(/rupstDividendAmount/g, 'pendirianDividendAmount')
  .replace(/rupstRetainedProfit/g, 'pendirianRetainedProfit')
  .replace(/rupstAlasanAudit/g, 'pendirianAlasanAudit')
  .replace(/rupstStatement/g, 'pendirianStatement')
  .replace(/rupstInvitationNumber/g, 'pendirianInvitationNumber')
  .replace(/rupstInvitationDate/g, 'pendirianInvitationDate')
  .replace(/rupstMeetingEndTime/g, 'pendirianMeetingEndTime')
  .replace(/rupstAdArticle/g, 'pendirianAdArticle')
  .replace(/rupstAdParagraph/g, 'pendirianAdParagraph')
  .replace(/rupstQuorumArticle/g, 'pendirianQuorumArticle')
  .replace(/rupstQuorumParagraph/g, 'pendirianQuorumParagraph')
  // ID modifications
  .replace(/setEditingRupstId/g, 'setEditingPendirianId')
  .replace(/editingRupstId/g, 'editingPendirianId')
  .replace(/rupst_projects/g, 'pendirian_projects');

const pendirianEndIndex = content.indexOf("          ) : activeSidebarTab === 'perbaikan' ? (");

// Remove everything from the start of `activeSidebarTab === 'pendirian'` up to `perbaikan` and insert `pendirianBlock` in its place
if (endIndex !== -1 && pendirianEndIndex !== -1) {
  content = content.substring(0, endIndex) + pendirianBlock + "\\n" + content.substring(pendirianEndIndex);
  fs.writeFileSync('App.tsx', content);
  console.log('Success replacing Pendirian block');
} else {
  console.log('Could not find existing Pendirian block limits');
}
