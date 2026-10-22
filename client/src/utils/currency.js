/**
 * WEALTHOS FINANCIAL PRECISION UTILITIES
 * 
 * Strict integer arithmetic for currency values.
 * All monetary amounts are stored as integer subunits (paise for INR)
 * using a fixed decimal scale factor (SCALE = 100) to eliminate IEEE 754
 * binary floating-point rounding errors.
 */

export const SCALE = 100; // 1 Rupee = 100 Paise

/**
 * Converts a floating-point or numeric Rupee value to integer Paise (subunits).
 * Example: 142850.40 -> 14285040
 * 
 * @param {number|string} rupees - Rupee amount
 * @returns {number} Integer paise
 */
export const toSubunits = (rupees) => {
  const num = Number(rupees);
  if (isNaN(num)) return 0;
  return Math.round(num * SCALE);
};

/**
 * Converts integer Paise (subunits) back to a decimal Rupee value.
 * Example: 14285040 -> 142850.40
 * 
 * @param {number} paise - Integer paise
 * @returns {number} Decimal rupees
 */
export const fromSubunits = (paise) => {
  const num = Number(paise);
  if (isNaN(num)) return 0;
  return num / SCALE;
};

// Formatter instance configured for Indian numbering system (e.g. ₹1,42,850.40)
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a Rupee amount into localized INR currency string.
 * Example: 142850.40 -> "₹1,42,850.40"
 * 
 * @param {number|string} amountInRupees - Amount in rupees
 * @returns {string} Formatted INR string
 */
export const formatINR = (amountInRupees) => {
  const num = Number(amountInRupees) || 0;
  return inrFormatter.format(num);
};

/**
 * Formats integer paise directly into localized INR currency string.
 * 
 * @param {number} paise - Amount in integer paise
 * @returns {string} Formatted INR string
 */
export const formatINRFromSubunits = (paise) => {
  return formatINR(fromSubunits(paise));
};

/**
 * Calculates investment P&L with integer arithmetic.
 * Ensures invested value, current value, and net gain/loss maintain
 * sub-cent accuracy before formatting.
 * 
 * @param {number} avgBuyPriceSubunits - Purchase price in integer paise
 * @param {number} currentPriceSubunits - Current market price in integer paise
 * @param {number} quantity - Number of shares/units held
 * @returns {object} P&L metrics with both raw integer subunits and formatted values
 */
export const calculatePnL = (avgBuyPriceSubunits, currentPriceSubunits, quantity) => {
  const avgSub = Math.round(Number(avgBuyPriceSubunits) || 0);
  const currentSub = Math.round(Number(currentPriceSubunits) || 0);
  const qty = Number(quantity) || 0;

  // Subunit calculations
  const investedSubunits = avgSub * qty;
  const currentSubunits = currentSub * qty;
  const pnlSubunits = currentSubunits - investedSubunits;

  // Return percentage calculation
  const returnPercent = investedSubunits > 0 
    ? (pnlSubunits / investedSubunits) * 100 
    : 0;

  const isPositive = pnlSubunits >= 0;

  return {
    investedSubunits,
    currentSubunits,
    pnlSubunits,
    investedRupees: fromSubunits(investedSubunits),
    currentRupees: fromSubunits(currentSubunits),
    pnlRupees: fromSubunits(pnlSubunits),
    returnPercent,
    isPositive,
    formattedInvested: formatINR(fromSubunits(investedSubunits)),
    formattedCurrent: formatINR(fromSubunits(currentSubunits)),
    formattedPnl: `${isPositive ? '+' : ''}${formatINR(fromSubunits(pnlSubunits))}`,
    formattedReturnPercent: `${isPositive ? '+' : ''}${returnPercent.toFixed(2)}%`,
  };
};
