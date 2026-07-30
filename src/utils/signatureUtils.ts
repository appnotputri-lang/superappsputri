import defaultSignature from '../assets/images/notary_stamp_signature_1785252991786.jpg';

export const DEFAULT_SIGNATURE_URL = defaultSignature;

export const getSignatureImage = (): string => {
  try {
    const custom = localStorage.getItem('notary_signature_custom');
    if (custom && custom.trim().length > 0) return custom;
  } catch (e) {
    console.error('Error reading custom signature:', e);
  }
  return DEFAULT_SIGNATURE_URL;
};

export const setSignatureImage = (dataUrl: string): void => {
  try {
    localStorage.setItem('notary_signature_custom', dataUrl);
  } catch (e) {
    console.error('Error saving custom signature:', e);
  }
};

export const resetSignatureImage = (): void => {
  try {
    localStorage.removeItem('notary_signature_custom');
  } catch (e) {
    console.error('Error resetting custom signature:', e);
  }
};
