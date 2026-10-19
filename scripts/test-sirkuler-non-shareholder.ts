import { generateSirkulerLaporanBlocks } from '../src/lib/sirkulerLaporanContentBlocks';
import { generateRupstAktaBlocks } from '../src/lib/rupsTahunanAktaContentBlocks';
import { CompanyData } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

const mockData: CompanyData = {
  companyName: 'MAJU BERSAMA JAYA',
  clientType: 'PT',
  documentType: 'CIRCULAR',
  rupstType: 'sirkuler',
  domicile: 'Kota Bandung',
  signingDate: '2026-05-10',
  rupstFiscalYear: '2025',
  originalTotalShares: 1000,
  originalSharePrice: 100000,
  targetCapitalBase: 400000000,
  targetCapitalPaid: 100000000,
  representativeType: 'EXISTING',
  authorizedRepresentativeId: 'sh-1',
  shareholders: [
    {
      id: 'sh-1',
      name: 'BUDI SANTOSO',
      salutation: 'Tuan',
      sharesOwned: 600,
      isPresent: true,
      birthDate: '1980-01-01',
      birthCity: 'Bandung',
      occupation: 'Swasta',
      address: {
        province: 'Jawa Barat',
        city: 'Bandung',
        fullAddress: 'Jl. Merdeka No. 1',
        rt: '01',
        rw: '02',
        kelurahan: 'Citarum',
        kecamatan: 'Bandung Wetan'
      },
      nik: '3201010101800001',
      nationality: 'WNI'
    },
    {
      id: 'sh-2',
      name: 'SITI RAHMAWATI',
      salutation: 'Nyonya',
      sharesOwned: 400,
      isPresent: true,
      birthDate: '1985-05-05',
      birthCity: 'Jakarta',
      occupation: 'Wiraswasta',
      address: {
        province: 'DKI Jakarta',
        city: 'Jakarta Selatan',
        fullAddress: 'Jl. Sudirman No. 10',
        rt: '03',
        rw: '04',
        kelurahan: 'Senayan',
        kecamatan: 'Kebayoran Baru'
      },
      nik: '3171010505850002',
      nationality: 'WNI'
    },
    {
      // Non-shareholder: Director with 0 shares!
      id: 'sh-3',
      name: 'AHMAD NONSHAREHOLDER',
      salutation: 'Tuan',
      sharesOwned: 0,
      isPresent: true,
      isManagement: true,
      managementPosition: 'Direktur',
      birthDate: '1990-10-10',
      birthCity: 'Surabaya',
      occupation: 'Direktur',
      address: {
        province: 'Jawa Timur',
        city: 'Surabaya',
        fullAddress: 'Jl. Pemuda No. 5',
        rt: '01',
        rw: '01',
        kelurahan: 'Embong Kaliasin',
        kecamatan: 'Genteng'
      },
      nik: '3578011010900003',
      nationality: 'WNI'
    }
  ],
  oldManagementItems: [
    {
      id: 'm-1',
      name: 'AHMAD NONSHAREHOLDER',
      position: 'Direktur',
      salutation: 'Tuan'
    }
  ],
  newManagementItems: [],
  guests: [],
  amendmentDeeds: [],
  shareTransfers: [],
  finalShareholders: [],
  resolutions: {} as any,
  oldAddress: {} as any,
  newAddress: {} as any,
  oldDomicile: '',
  oldFullAddress: '',
  fullAddress: '',
  kbliItems: [],
  managementChangeType: 'REAPPOINTMENT',
  managementEffectiveUntil: '',
  originalAuthorizedShares: 4000,
  originalCapitalBase: 400000000,
  originalCapitalPaid: 100000000,
  capitalArticleNumber: '4',
  domicileArticleNumber: '1',
  signingPlace: 'Bandung',
  aktaStartTime: '10:00',
  meetingStartTime: '10:00',
  meetingEndTime: '11:00',
  meetingChair: 'BUDI SANTOSO',
  meetingAgenda: 'Laporan Tahunan',
  establishmentDeedNumber: '10',
  establishmentDeedDate: '2020-01-01',
  establishmentNotary: 'NOTARIS BANDUNG',
  establishmentNotaryDomicile: 'Bandung',
  establishmentSkNumber: 'AHU-001.2020',
  establishmentSkDate: '2020-01-02',
  latestAmendmentDeedNumber: '',
  latestAmendmentDeedDate: '',
  latestAmendmentNotary: '',
  latestAmendmentSkNumber: '',
  latestAmendmentSkDate: ''
};

console.log('Testing RUPST Sirkuler with non-shareholder present in data.shareholders...');

// 1. Test Keputusan Sirkuler (generateSirkulerLaporanBlocks)
const sirkulerBlocks = generateSirkulerLaporanBlocks(mockData);

// Find all text runs mentioning AHMAD
const ahmadInSirkuler = sirkulerBlocks.filter(b => {
  if (b.type === 'p' || b.type === 'list' || b.type === 'numbered') {
    const text = (b.runs || []).map((r: any) => r.text).join(' ');
    return text.includes('AHMAD NONSHAREHOLDER');
  }
  return false;
});
assert(ahmadInSirkuler.length === 0, 'Non-shareholder AHMAD must NOT appear in sirkuler decision text/attendees');

// Check signatures in sirkuler
const sigBlock = sirkulerBlocks.find(b => b.type === 'signatures') as any;
assert(sigBlock !== undefined, 'Signatures block must exist in sirkuler decision');
const sigNames = (sigBlock.shareholders || []).map((s: any) => s.name);
assert(sigNames.includes('BUDI SANTOSO'), 'BUDI SANTOSO must be in signatures');
assert(sigNames.includes('SITI RAHMAWATI'), 'SITI RAHMAWATI must be in signatures');
assert(!sigNames.includes('AHMAD NONSHAREHOLDER'), 'Non-shareholder AHMAD must NOT be in signatures');

// 2. Test Akta Sirkuler (generateRupstAktaBlocks)
const aktaBlocks = generateRupstAktaBlocks(mockData);

// In Akta Sirkuler, check attendees under "Bahwa para pemegang saham... yang ditandatangani oleh:"
const attendeeBlocks = aktaBlocks.filter(b => {
  if (b.type === 'list') {
    const text = (b.runs || []).map((r: any) => r.text).join(' ');
    return text.includes('AHMAD NONSHAREHOLDER');
  }
  return false;
});
assert(attendeeBlocks.length === 0, 'Non-shareholder AHMAD must NOT appear in Akta Sirkuler attendees / signatories list');

// Verify BUDI and SITI are present in Akta Sirkuler
const budiInAkta = aktaBlocks.some(b => {
  if (b.type === 'list') {
    const text = (b.runs || []).map((r: any) => r.text).join(' ');
    return text.includes('BUDI SANTOSO');
  }
  return false;
});
assert(budiInAkta, 'Shareholder BUDI SANTOSO must appear in Akta Sirkuler');

const sitiInAkta = aktaBlocks.some(b => {
  if (b.type === 'list') {
    const text = (b.runs || []).map((r: any) => r.text).join(' ');
    return text.includes('SITI RAHMAWATI');
  }
  return false;
});
assert(sitiInAkta, 'Shareholder SITI RAHMAWATI must appear in Akta Sirkuler');

console.log('\nAll RUPST Sirkuler non-shareholder exclusion tests passed successfully! 🎉');
