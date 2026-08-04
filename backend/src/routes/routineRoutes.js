import express from 'express';
import {
  createOrUpdateRoutine,
  getRoutineByDate,
  getRoutinesByDateRange,
  deleteRoutine,
  getMonthlySummary
} from '../controllers/routineController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected (require authentication)
router.use(protect);

// Create or update routine for today or specific date
router.post('/', createOrUpdateRoutine);

// Get routine for specific date
router.get('/:date', getRoutineByDate);

// Get routines for date range
router.get('/range/:startDate/:endDate', getRoutinesByDateRange);

// Get monthly summary
router.get('/summary/:year/:month', getMonthlySummary);

// Delete routine for a date
router.delete('/:date', deleteRoutine);

export default router;