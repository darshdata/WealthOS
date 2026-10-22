import { Router } from 'express';
import {
  getPortfolio,
  executeTrade,
  getPortfolioSnapshots,
  triggerPortfolioSnapshot,
} from '../controllers/portfolioController.js';

const router = Router();

/**
 * @route   GET /api/portfolio
 * @desc    Get user portfolio balances, active positions, and recent transactions
 * @access  Public (Demo)
 */
router.get('/', getPortfolio);

/**
 * @route   POST /api/portfolio/trade
 * @desc    Execute BUY/SELL trade with idempotency key and update ledger
 * @access  Public (Demo)
 */
router.post('/trade', executeTrade);

/**
 * @route   GET /api/portfolio/snapshots
 * @desc    Get chronological historical portfolio valuation snapshots
 * @access  Public (Demo / Trusted identity)
 */
router.get('/snapshots', getPortfolioSnapshots);

/**
 * @route   POST /api/portfolio/snapshots/trigger
 * @desc    Manually record daily snapshot or seed historical snapshots (Dev / Test)
 * @access  Restricted in production
 */
router.post('/snapshots/trigger', triggerPortfolioSnapshot);

export default router;
