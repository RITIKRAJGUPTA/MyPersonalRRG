import mongoose from 'mongoose';

const dailyRoutineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  expenses: {
    food: { type: Number, default: 0 },
    grocery: { type: Number, default: 0 },
    chaiCoffee: { type: Number, default: 0 },
    fastFood: { type: Number, default: 0 },
    extra: { type: Number, default: 0 },
    sentMoney: { type: Number, default: 0 },
    loanRepayment: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    bills: { type: Number, default: 0 },
    shopping: { type: Number, default: 0 },
    entertainment: { type: Number, default: 0 }
  },
  expenseItems: [{
    id: { type: String },
    description: { type: String },
    category: { type: String, default: 'other' }
  }],
  thought: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  totalExpenses: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save hook
dailyRoutineSchema.pre('save', function() {
  const expenses = this.expenses || {};
  this.totalExpenses = (expenses.food || 0) + 
                       (expenses.grocery || 0) + 
                       (expenses.chaiCoffee || 0) +
                       (expenses.fastFood || 0) +
                       (expenses.extra || 0) + 
                       (expenses.sentMoney || 0) + 
                       (expenses.loanRepayment || 0) +
                       (expenses.other || 0) +
                       (expenses.transport || 0) +
                       (expenses.bills || 0) +
                       (expenses.shopping || 0) +
                       (expenses.entertainment || 0);
});

dailyRoutineSchema.index({ userId: 1, date: -1 });

export default mongoose.model('DailyRoutine', dailyRoutineSchema);