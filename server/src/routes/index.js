import { Router } from 'express';
import healthRoutes from './health.routes.js';
import portfolioRoutes from './portfolio.routes.js';

const router = Router();

// Mount sub-routers
router.use('/health', healthRoutes);
router.use('/portfolio', portfolioRoutes);

export default router;
