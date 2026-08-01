import { InvoiceItem } from '../types';

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

/**
 * Configurable tax table for PPh 21 (Tarif Progresif Pasal 17 UU HPP).
 * Lapisan 1: 0 s/d 60.000.000 -> 5%
 * Lapisan 2: > 60.000.000 s/d 250.000.000 -> 15%
 * Lapisan 3: > 250.000.000 s/d 500.000.000 -> 25%
 * Lapisan 4: > 500.000.000 s/d 5.000.000.000 -> 30%
 * Lapisan 5: > 5.000.000.000 -> 35%
 */
export const TAX_TABLE: TaxBracket[] = [
  { min: 0, max: 60000000, rate: 0.05 },
  { min: 60000000, max: 250000000, rate: 0.15 },
  { min: 250000000, max: 500000000, rate: 0.25 },
  { min: 500000000, max: 5000000000, rate: 0.30 },
  { min: 5000000000, max: Infinity, rate: 0.35 },
];

/**
 * Single source of truth for progressive PPh 21 calculation.
 * Calculates total PPh 21 tax for a given gross income based on TAX_TABLE brackets.
 */
export function calculatePPh21(gross: number): number {
  if (gross <= 0) return 0;
  let tax = 0;
  for (const bracket of TAX_TABLE) {
    if (gross > bracket.min) {
      const taxableInBracket = Math.min(gross, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
    }
  }
  return tax;
}

/**
 * Iterative Gross Up PPh 21 algorithm.
 * Finds the Gross amount required to achieve the target Net amount after PPh 21 progressive deduction.
 * 
 * Pseudo code:
 * targetNet = honorariumInput
 * gross = targetNet
 * repeat
 *   pph = calculatePPh21(gross)
 *   net = gross - pph
 *   difference = targetNet - net
 *   gross = gross + difference
 * until abs(difference) < 1
 */
export function calculateGrossUpPPh21(targetNet: number): { gross: number; pph: number; net: number } {
  if (targetNet <= 0) return { gross: 0, pph: 0, net: 0 };

  let gross = targetNet;
  let difference = 0;
  let pph = 0;
  let net = 0;
  let iterations = 0;
  const maxIterations = 1000;

  do {
    pph = calculatePPh21(gross);
    net = gross - pph;
    difference = targetNet - net;
    gross = gross + difference;
    iterations++;
  } while (Math.abs(difference) >= 1 && iterations < maxIterations);

  pph = calculatePPh21(gross);
  net = gross - pph;

  return {
    gross: Math.round(gross),
    pph: Math.round(pph),
    net: Math.round(net)
  };
}

export interface InvoiceTaxSummary {
  honorarium: number;    // Honorarium Bersih (Net)
  pphGrossUp: number;    // PPh 21 (Gross Up)
  totalTagihan: number;  // Total Tagihan (Gross = Honorarium + PPh 21)
  subtotal: number;      // Same as honorarium
}

/**
 * Calculates complete invoice tax and summary using calculatePPh21() and calculateGrossUpPPh21().
 */
export function calculateInvoiceTotals(items: InvoiceItem[]): InvoiceTaxSummary {
  let totalNetTaxable = 0;
  let totalNonTaxable = 0;

  items.forEach((it) => {
    const qty = it.quantity || 1;
    const price = it.unitPrice || 0;
    const itemTotal = qty * price;

    if (it.isTaxed) {
      totalNetTaxable += itemTotal;
    } else {
      totalNonTaxable += itemTotal;
    }
  });

  let pphGrossUp = 0;
  let grossTaxable = 0;

  if (totalNetTaxable > 0) {
    const grossUpRes = calculateGrossUpPPh21(totalNetTaxable);
    grossTaxable = grossUpRes.gross;
    pphGrossUp = grossUpRes.pph;
  }

  const honorarium = totalNetTaxable + totalNonTaxable;
  const totalTagihan = grossTaxable + totalNonTaxable;

  return {
    honorarium,
    pphGrossUp,
    totalTagihan,
    subtotal: honorarium
  };
}
