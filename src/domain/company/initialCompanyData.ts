import { Address, ResolutionFlags, Shareholder, CompanyData } from '../../types';
import {
  INITIAL_ADDRESS,
  INITIAL_RESOLUTIONS,
  INITIAL_MANUAL_REP,
  INITIAL_STATE
} from '../../constants/appConstants';

export {
  INITIAL_ADDRESS,
  INITIAL_RESOLUTIONS,
  INITIAL_MANUAL_REP,
  INITIAL_STATE
};

export const sanitizeCompanyData = (data: any): CompanyData => {
  if (!data || typeof data !== 'object') {
    return { ...INITIAL_STATE };
  }
  const raw = data;
  return {
    ...INITIAL_STATE,
    ...raw,
    companyName: raw.companyName || raw.title || '',
    resolutions: {
      ...INITIAL_RESOLUTIONS,
      ...(raw.resolutions && typeof raw.resolutions === 'object' ? raw.resolutions : {})
    },
    oldAddress: {
      ...INITIAL_ADDRESS,
      ...(raw.oldAddress && typeof raw.oldAddress === 'object' ? raw.oldAddress : {})
    },
    newAddress: {
      ...INITIAL_ADDRESS,
      ...(raw.newAddress && typeof raw.newAddress === 'object' ? raw.newAddress : {})
    },
    manualRepresentative: {
      ...INITIAL_MANUAL_REP,
      ...(raw.manualRepresentative && typeof raw.manualRepresentative === 'object' ? raw.manualRepresentative : {})
    },
    shareholders: Array.isArray(raw.shareholders) ? raw.shareholders : [],
    finalShareholders: Array.isArray(raw.finalShareholders) ? raw.finalShareholders : [],
    shareTransfers: Array.isArray(raw.shareTransfers) ? raw.shareTransfers : [],
    shareTransfersNew: Array.isArray(raw.shareTransfersNew)
      ? raw.shareTransfersNew
      : (Array.isArray(raw.shareTransfers) ? raw.shareTransfers : []),
    capitalSubscriptionsNew: Array.isArray(raw.capitalSubscriptionsNew) ? raw.capitalSubscriptionsNew : [],
    managementDismissals: Array.isArray(raw.managementDismissals) ? raw.managementDismissals : [],
    managementAppointments: Array.isArray(raw.managementAppointments) ? raw.managementAppointments : [],
    oldManagementItems: Array.isArray(raw.oldManagementItems) ? raw.oldManagementItems : [],
    newManagementItems: Array.isArray(raw.newManagementItems) ? raw.newManagementItems : [],
    kbliItems: Array.isArray(raw.kbliItems) ? raw.kbliItems : [],
    amendmentDeeds: Array.isArray(raw.amendmentDeeds) ? raw.amendmentDeeds : [],
    guests: Array.isArray(raw.guests) ? raw.guests : []
  };
};
