import { InvoiceItem } from '../types';

export interface TaxRateOption {
  label: string;
  rate: number;
  divisor: number;
}

export const PPH21_RATES: TaxRateOption[] = [
  { label: '5%', rate: 0.05, divisor: 0.95 },
  { label: '15%', rate: 0.15, divisor: 0.85 },
  { label: '25%', rate: 0.25, divisor: 0.75 },
  { label: '30%', rate: 0.30, divisor: 0.70 },
  { label: '35%', rate: 0.35, divisor: 0.65 },
];

/**
 * Calculates Gross Up PPh 21 based on the selected tax rate.
 * 
 * Formulas:
 * Tarif 5%:  Gross = Net / 0.95
 * Tarif 15%: Gross = Net / 0.85
 * Tarif 25%: Gross = Net / 0.75
 * Tarif 30%: Gross = Net / 0.70
 * Tarif 35%: Gross = Net / 0.65
 * 
 * PPh = Gross - Net
 * Net = Gross - PPh
 */
export function calculateGrossUpByRate(net: number, rate: number = 0.05): { gross: number; pph: number; net: number } {
  if (net <= 0) return { gross: 0, pph: 0, net: 0 };

  const normalizedRate = rate > 1 ? rate / 100 : rate;
  const divisor = 1 - normalizedRate;

  if (divisor <= 0) return { gross: net, pph: 0, net };

  const gross = Math.round(net / divisor);
  const pph = gross - net;

  return {
    gross,
    pph,
    net
  };
}

/**
 * Helper function to calculate item gross subtotal (display subtotal).
 * If Gross Up is checked, returns Gross amount.
 * Otherwise, returns net item total (quantity * unitPrice).
 */
export function getItemSubtotal(item: InvoiceItem): number {
  const qty = item.quantity || 1;
  const price = item.unitPrice || 0;
  const net = qty * price;
  if (item.isTaxed) {
    const rate = item.taxRate !== undefined ? item.taxRate : 0.05;
    return calculateGrossUpByRate(net, rate).gross;
  }
  return net;
}

/**
 * Helper function to calculate item PPh 21 amount.
 */
export function getItemTax(item: InvoiceItem): number {
  const qty = item.quantity || 1;
  const price = item.unitPrice || 0;
  const net = qty * price;
  if (item.isTaxed) {
    const rate = item.taxRate !== undefined ? item.taxRate : 0.05;
    return calculateGrossUpByRate(net, rate).pph;
  }
  return 0;
}

/**
 * Helper function to get net item amount.
 */
export function getItemNet(item: InvoiceItem): number {
  const qty = item.quantity || 1;
  const price = item.unitPrice || 0;
  return qty * price;
}

export interface InvoiceTaxSummary {
  grossSubtotal: number; // Sub Total (Sum of item gross amounts)
  taxAmount: number;     // Potongan Pajak (PPh 21)
  netTotal: number;      // Total Tagihan (Net amount)
}

/**
 * Calculates complete invoice totals including Gross Up PPh 21.
 */
export function calculateInvoiceTotals(items: InvoiceItem[]): InvoiceTaxSummary {
  let grossSubtotal = 0;
  let taxAmount = 0;
  let netTotal = 0;

  items.forEach((it) => {
    grossSubtotal += getItemSubtotal(it);
    taxAmount += getItemTax(it);
    netTotal += getItemNet(it);
  });

  return {
    grossSubtotal,
    taxAmount,
    netTotal
  };
}
