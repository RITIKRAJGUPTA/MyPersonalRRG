import DailyRoutine from '../models/DailyRoutine.js';

// @desc    Create or update daily routine
// @route   POST /api/routine
export const createOrUpdateRoutine = async (req, res) => {
  try {
    const { date, expenses, thought, expenseItems } = req.body;
    const userId = req.user.id;

    const routineDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(routineDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(routineDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Prepare expense object with all fields
    const expenseData = {
      food: Number(expenses?.food) || 0,
      grocery: Number(expenses?.grocery) || 0,
      chaiCoffee: Number(expenses?.chaiCoffee) || 0,
      fastFood: Number(expenses?.fastFood) || 0,
      extra: Number(expenses?.extra) || 0,
      sentMoney: Number(expenses?.sentMoney) || 0,
      loanRepayment: Number(expenses?.loanRepayment) || 0,
      other: Number(expenses?.other) || 0,
      transport: Number(expenses?.transport) || 0,
      bills: Number(expenses?.bills) || 0,
      shopping: Number(expenses?.shopping) || 0,
      entertainment: Number(expenses?.entertainment) || 0
    };

    let routine = await DailyRoutine.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (routine) {
      // Update existing
      routine.expenses = expenseData;
      routine.thought = thought || '';
      if (expenseItems) {
        routine.expenseItems = expenseItems;
      }
      
      await routine.save();
      
      return res.json({
        success: true,
        message: 'Routine updated successfully',
        data: routine
      });
    }

    // Create new
    const newRoutine = new DailyRoutine({
      userId,
      date: routineDate,
      expenses: expenseData,
      thought: thought || '',
      expenseItems: expenseItems || []
    });

    await newRoutine.save();

    res.status(201).json({
      success: true,
      message: 'Routine created successfully',
      data: newRoutine
    });

  } catch (error) {
    console.error('Create/Update routine error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to save routine'
    });
  }
};;
// @desc    Get routine for specific date
// @route   GET /api/routine/:date
export const getRoutineByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const routine = await DailyRoutine.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!routine) {
      return res.json({
        success: true,
        data: null,
        message: 'No routine found for this date'
      });
    }

    res.json({
      success: true,
      data: routine
    });

  } catch (error) {
    console.error('Get routine error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch routine'
    });
  }
};

// @desc    Get routines for date range
// @route   GET /api/routine/range/:startDate/:endDate
export const getRoutinesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const userId = req.user.id;

    // Parse as UTC (midnight UTC)
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T00:00:00.000Z');  // end is the first day of the next month

    // Use $gte for start, and $lt for end (exclusive)
    const routines = await DailyRoutine.find({
      userId,
      date: { $gte: start, $lt: end }
    }).sort({ date: -1 });

    res.json({
      success: true,
      data: routines,
      count: routines.length
    });
  } catch (error) {
    console.error('Get routines range error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch routines'
    });
  }
};

// @desc    Delete routine for a date
// @route   DELETE /api/routine/:date
export const deleteRoutine = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const routine = await DailyRoutine.findOneAndDelete({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!routine) {
      return res.status(404).json({
        success: false,
        message: 'No routine found for this date'
      });
    }

    res.json({
      success: true,
      message: 'Routine deleted successfully'
    });

  } catch (error) {
    console.error('Delete routine error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete routine'
    });
  }
};

// @desc    Get monthly summary
// @route   GET /api/routine/summary/:year/:month
// Update the getMonthlySummary function
export const getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user.id;

     const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const routines = await DailyRoutine.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });

    const summary = {
      totalExpenses: 0,
      totalFood: 0,
      totalGrocery: 0,
      totalChaiCoffee: 0,
      totalFastFood: 0,
      totalExtra: 0,
      totalSentMoney: 0,
      totalLoanRepayment: 0,
      totalOther: 0,
      totalTransport: 0,
      totalBills: 0,
      totalShopping: 0,
      totalEntertainment: 0,
      dailyAverage: 0,
      daysWithEntries: routines.length
    };

    routines.forEach(routine => {
      summary.totalExpenses += routine.totalExpenses || 0;
      summary.totalFood += routine.expenses.food || 0;
      summary.totalGrocery += routine.expenses.grocery || 0;
      summary.totalChaiCoffee += routine.expenses.chaiCoffee || 0;
      summary.totalFastFood += routine.expenses.fastFood || 0;
      summary.totalExtra += routine.expenses.extra || 0;
      summary.totalSentMoney += routine.expenses.sentMoney || 0;
      summary.totalLoanRepayment += routine.expenses.loanRepayment || 0;
      summary.totalOther += routine.expenses.other || 0;
      summary.totalTransport += routine.expenses.transport || 0;
      summary.totalBills += routine.expenses.bills || 0;
      summary.totalShopping += routine.expenses.shopping || 0;
      summary.totalEntertainment += routine.expenses.entertainment || 0;
    });

    if (routines.length > 0) {
      summary.dailyAverage = summary.totalExpenses / routines.length;
    }

    res.json({
      success: true,
      data: summary,
      routines
    });

  } catch (error) {
    console.error('Monthly summary error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get monthly summary'
    });
  }
};