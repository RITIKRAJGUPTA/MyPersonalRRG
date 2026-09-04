import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx'; // Add this import
import api from '../config/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [routine, setRoutine] = useState(null);
  const [expenses, setExpenses] = useState({
    food: '',
    grocery: '',
    chaiCoffee: '',
    fastFood: '',
    extra: '',
    sentMoney: '',
    loanRepayment: '',
    other: '',
    transport: '',
    bills: '',
    shopping: '',
    entertainment: ''
  });
  const [thought, setThought] = useState('');
  const [saving, setSaving] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseItems, setExpenseItems] = useState([]);
  
  // History states
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterType, setFilterType] = useState('month');
  const [filterValue, setFilterValue] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

  // New state for month selection for report download
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
      navigate('/login');
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        toast.error('Failed to fetch user data');
        localStorage.removeItem('userInfo');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    if (selectedDate) {
      fetchRoutine();
    }
  }, [selectedDate]);

  // Set initial filter values
  useEffect(() => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
    setReportYear(now.getFullYear());
    setReportMonth(now.getMonth() + 1);
    
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
    const currentWeek = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    setSelectedWeek(currentWeek.toString());
    
    setSelectedDateFilter(now.toISOString().split('T')[0]);
  }, []);

  const fetchRoutine = async () => {
    try {
      const response = await api.get(`/routine/${selectedDate}`);

      if (response.data.data) {
        setRoutine(response.data.data);
        const exp = response.data.data.expenses;
        setExpenses({
          food: exp.food || '',
          grocery: exp.grocery || '',
          chaiCoffee: exp.chaiCoffee || '',
          fastFood: exp.fastFood || '',
          extra: exp.extra || '',
          sentMoney: exp.sentMoney || '',
          loanRepayment: exp.loanRepayment || '',
          other: exp.other || '',
          transport: exp.transport || '',
          bills: exp.bills || '',
          shopping: exp.shopping || '',
          entertainment: exp.entertainment || ''
        });
        setThought(response.data.data.thought || '');
        setExpenseItems(response.data.data.expenseItems || []);
      } else {
        resetForm();
      }
    } catch (error) {
      console.error('Error fetching routine:', error);
    }
  };

  const resetForm = () => {
    setRoutine(null);
    setExpenses({
      food: '',
      grocery: '',
      chaiCoffee: '',
      fastFood: '',
      extra: '',
      sentMoney: '',
      loanRepayment: '',
      other: '',
      transport: '',
      bills: '',
      shopping: '',
      entertainment: ''
    });
    setThought('');
    setExpenseItems([]);
  };

  const fetchMonthlySummary = async () => {
    try {
      const date = new Date(selectedDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const response = await api.get(`/routine/summary/${year}/${month}`);
      setMonthlySummary(response.data.data);
      setShowSummary(true);
    } catch (error) {
      toast.error('Failed to fetch summary');
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      let startDate, endDate;
      
      if (filterType === 'month') {
        const year = selectedYear;
        const month = parseInt(selectedMonth) - 1;
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 1);
      } else if (filterType === 'week') {
        const weekNum = parseInt(selectedWeek);
        const firstDayOfYear = new Date(selectedYear, 0, 1);
        const daysOffset = (weekNum - 1) * 7;
        startDate = new Date(selectedYear, 0, firstDayOfYear.getDay() + daysOffset);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      } else if (filterType === 'date') {
        startDate = new Date(selectedDateFilter);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(selectedDateFilter);
        endDate.setHours(23, 59, 59, 999);
      }

      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      const response = await api.get(`/routine/range/${start}/${end}`);
      setHistoryData(response.data.data || []);
      setShowHistory(true);
    } catch (error) {
      toast.error('Failed to fetch history');
      console.error('History fetch error:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // NEW: Function to download monthly report as Excel
  const downloadMonthlyReport = async () => {
    setDownloadingReport(true);
    try {
      const year = reportYear;
      const month = parseInt(reportMonth) - 1;
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 1);

      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      const response = await api.get(`/routine/range/${start}/${end}`);
      const data = response.data.data || [];

      if (data.length === 0) {
        toast.error('No data found for the selected month');
        setDownloadingReport(false);
        return;
      }

      // Prepare data for Excel
      const excelData = data.map((item) => ({
        'Date': new Date(item.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        'Food': item.expenses.food || 0,
        'Grocery': item.expenses.grocery || 0,
        'Chai/Coffee': item.expenses.chaiCoffee || 0,
        'Fast Food': item.expenses.fastFood || 0,
        'Transport': item.expenses.transport || 0,
        'Bills/Recharge': item.expenses.bills || 0,
        'Shopping': item.expenses.shopping || 0,
        'Entertainment': item.expenses.entertainment || 0,
        'Sent Money': item.expenses.sentMoney || 0,
        'Loan Repayment': item.expenses.loanRepayment || 0,
        'Extra': item.expenses.extra || 0,
        'Other': item.expenses.other || 0,
        'Total': item.totalExpenses || 0,
        'Thought': item.thought || ''
      }));

      // Calculate totals
      const totals = {
        'Date': 'TOTAL',
        'Food': excelData.reduce((sum, row) => sum + row['Food'], 0),
        'Grocery': excelData.reduce((sum, row) => sum + row['Grocery'], 0),
        'Chai/Coffee': excelData.reduce((sum, row) => sum + row['Chai/Coffee'], 0),
        'Fast Food': excelData.reduce((sum, row) => sum + row['Fast Food'], 0),
        'Transport': excelData.reduce((sum, row) => sum + row['Transport'], 0),
        'Bills/Recharge': excelData.reduce((sum, row) => sum + row['Bills/Recharge'], 0),
        'Shopping': excelData.reduce((sum, row) => sum + row['Shopping'], 0),
        'Entertainment': excelData.reduce((sum, row) => sum + row['Entertainment'], 0),
        'Sent Money': excelData.reduce((sum, row) => sum + row['Sent Money'], 0),
        'Loan Repayment': excelData.reduce((sum, row) => sum + row['Loan Repayment'], 0),
        'Extra': excelData.reduce((sum, row) => sum + row['Extra'], 0),
        'Other': excelData.reduce((sum, row) => sum + row['Other'], 0),
        'Total': excelData.reduce((sum, row) => sum + row['Total'], 0),
        'Thought': ''
      };

      excelData.push(totals);

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Date
        { wch: 10 }, // Food
        { wch: 10 }, // Grocery
        { wch: 12 }, // Chai/Coffee
        { wch: 12 }, // Fast Food
        { wch: 12 }, // Transport
        { wch: 14 }, // Bills/Recharge
        { wch: 12 }, // Shopping
        { wch: 16 }, // Entertainment
        { wch: 14 }, // Sent Money
        { wch: 18 }, // Loan Repayment
        { wch: 10 }, // Extra
        { wch: 10 }, // Other
        { wch: 12 }, // Total
        { wch: 30 } // Thought
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');

      // Generate filename
      const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
      const fileName = `Expense_Report_${monthName}_${year}.xlsx`;

      // Download
      XLSX.writeFile(wb, fileName);
      toast.success(`Report downloaded successfully!`);
    } catch (error) {
      toast.error('Failed to download report');
      console.error('Download error:', error);
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleExpenseChange = (field, value) => {
    if (value === '' || !isNaN(value)) {
      setExpenses({
        ...expenses,
        [field]: value
      });
    }
  };

  const addExpenseItem = () => {
    if (!expenseDescription.trim()) {
      toast.error('Please enter expense description');
      return;
    }

    const newItem = {
      id: Date.now(),
      description: expenseDescription.trim(),
      category: 'other'
    };

    setExpenseItems([...expenseItems, newItem]);
    setExpenseDescription('');
  };

  const removeExpenseItem = (id) => {
    setExpenseItems(expenseItems.filter(item => item.id !== id));
  };

  const getTotalExpenses = () => {
    const total = Object.values(expenses).reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
    return total;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const expensesToSend = {};
      Object.keys(expenses).forEach(key => {
        expensesToSend[key] = parseFloat(expenses[key]) || 0;
      });

      const data = {
        date: selectedDate,
        expenses: expensesToSend,
        thought,
        expenseItems: expenseItems
      };

      const response = await api.post('/routine', data);

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchRoutine();
        if (showHistory) {
          await fetchHistory();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save routine');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await api.delete(`/routine/${selectedDate}`);
      toast.success('Routine deleted successfully');
      resetForm();
      if (showHistory) {
        await fetchHistory();
      }
    } catch (error) {
      toast.error('Failed to delete routine');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const getHistoryTotal = (data) => {
    return data.reduce((sum, item) => sum + (item.totalExpenses || 0), 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="text-xl font-bold text-gray-800">Daily Routine Tracker</div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}!</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toggle Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowHistory(false)}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              !showHistory 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Daily Entry
          </button>
          <button
            onClick={() => {
              setShowHistory(true);
              fetchHistory();
            }}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              showHistory 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            View History
          </button>
        </div>

        {!showHistory ? (
          // Daily Entry View
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column - Date and Summary */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Date</h2>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={fetchMonthlySummary}
                    className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-4 py-2 rounded-md text-sm transition-colors"
                  >
                    View Monthly Summary
                  </button>
                </div>
              </div>

              {/* Monthly Summary */}
              {showSummary && monthlySummary && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Monthly Summary</h2>
                    <button
                      onClick={() => setShowSummary(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Total Expenses:</span> ₹{monthlySummary.totalExpenses}</p>
                    <p><span className="font-medium">Food:</span> ₹{monthlySummary.totalFood}</p>
                    <p><span className="font-medium">Grocery:</span> ₹{monthlySummary.totalGrocery}</p>
                    <p><span className="font-medium">Chai/Coffee:</span> ₹{monthlySummary.totalChaiCoffee || 0}</p>
                    <p><span className="font-medium">Fast Food:</span> ₹{monthlySummary.totalFastFood || 0}</p>
                    <p><span className="font-medium">Transport:</span> ₹{monthlySummary.totalTransport || 0}</p>
                    <p><span className="font-medium">Bills:</span> ₹{monthlySummary.totalBills || 0}</p>
                    <p><span className="font-medium">Shopping:</span> ₹{monthlySummary.totalShopping || 0}</p>
                    <p><span className="font-medium">Entertainment:</span> ₹{monthlySummary.totalEntertainment || 0}</p>
                    <p><span className="font-medium">Extra:</span> ₹{monthlySummary.totalExtra}</p>
                    <p><span className="font-medium">Sent Money:</span> ₹{monthlySummary.totalSentMoney}</p>
                    <p><span className="font-medium">Loan Repayment:</span> ₹{monthlySummary.totalLoanRepayment || 0}</p>
                    <p><span className="font-medium">Other:</span> ₹{monthlySummary.totalOther}</p>
                    <p><span className="font-medium">Daily Average:</span> ₹{monthlySummary.dailyAverage?.toFixed(2) || 0}</p>
                    <p><span className="font-medium">Days with entries:</span> {monthlySummary.daysWithEntries}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content - Routine Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedDate === new Date().toISOString().split('T')[0] ? "Today's" : new Date(selectedDate).toLocaleDateString()} Routine
                  </h2>
                  {routine && (
                    <button
                      onClick={handleDelete}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Delete Entry
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Expenses Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Expenses</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Food (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.food}
                          onChange={(e) => handleExpenseChange('food', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 80"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grocery (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.grocery}
                          onChange={(e) => handleExpenseChange('grocery', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chai/Coffee (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.chaiCoffee}
                          onChange={(e) => handleExpenseChange('chaiCoffee', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fast Food (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.fastFood}
                          onChange={(e) => handleExpenseChange('fastFood', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transport (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.transport}
                          onChange={(e) => handleExpenseChange('transport', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 40"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bills/Recharge (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.bills}
                          onChange={(e) => handleExpenseChange('bills', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shopping (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.shopping}
                          onChange={(e) => handleExpenseChange('shopping', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 2000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Entertainment (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.entertainment}
                          onChange={(e) => handleExpenseChange('entertainment', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sent Money (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.sentMoney}
                          onChange={(e) => handleExpenseChange('sentMoney', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 440"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loan Repayment (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.loanRepayment}
                          onChange={(e) => handleExpenseChange('loanRepayment', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 2000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Extra (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.extra}
                          onChange={(e) => handleExpenseChange('extra', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 25"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Other (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={expenses.other}
                          onChange={(e) => handleExpenseChange('other', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Add Expense Items */}
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-700 mb-3">Quick Add Expense Items</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={expenseDescription}
                        onChange={(e) => setExpenseDescription(e.target.value)}
                        placeholder="e.g., Rapido - 23, Pani - 10"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyPress={(e) => e.key === 'Enter' && addExpenseItem()}
                      />
                      <button
                        onClick={addExpenseItem}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                      >
                        Add Item
                      </button>
                    </div>

                    {expenseItems.length > 0 && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          {expenseItems.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm"
                            >
                              {item.description}
                              <button
                                onClick={() => removeExpenseItem(item.id)}
                                className="ml-2 text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Total Expenses Display */}
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-indigo-900">Total Expenses:</span>
                      <span className="text-2xl font-bold text-indigo-600">₹{getTotalExpenses()}</span>
                    </div>
                  </div>

                  {/* Thought Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Thoughts</h3>
                    <textarea
                      value={thought}
                      onChange={(e) => setThought(e.target.value)}
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Write your thoughts for today..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : routine ? 'Update Routine' : 'Save Routine'}
                    </button>
                  </div>

                  {routine && (
                    <div className="bg-green-50 text-green-800 p-3 rounded-md text-sm">
                      ✅ Last updated: {new Date(routine.updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // History View
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Expense History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>

            {/* Filter Controls */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter By</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                {filterType === 'month' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <input
                        type="number"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                    </div>
                  </>
                )}

                {filterType === 'week' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <input
                        type="number"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="1-52"
                      />
                    </div>
                  </>
                )}

                {filterType === 'date' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                    <input
                      type="date"
                      value={selectedDateFilter}
                      onChange={(e) => setSelectedDateFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="flex items-end">
                  <button
                    onClick={fetchHistory}
                    disabled={historyLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    {historyLoading ? 'Loading...' : 'Apply Filter'}
                  </button>
                </div>
              </div>
            </div>

            {/* NEW: Monthly Report Download Section */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-md font-semibold text-green-800 mb-3">📊 Download Monthly Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={reportYear}
                    onChange={(e) => setReportYear(parseInt(e.target.value) || new Date().getFullYear())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="2000"
                    max="2100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div>
                  <button
                    onClick={downloadMonthlyReport}
                    disabled={downloadingReport}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {downloadingReport ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Excel Report
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Downloads a detailed Excel report with all expense categories, daily breakdown, and monthly totals.
              </p>
            </div>

            {/* History Table */}
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-600">Loading history...</div>
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-600">No entries found for the selected filter.</div>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Entries</p>
                    <p className="text-2xl font-bold text-indigo-600">{historyData.length}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-green-600">₹{getHistoryTotal(historyData)}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Average per Day</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{(getHistoryTotal(historyData) / historyData.length).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Food</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grocery</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chai/Coffee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fast Food</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transport</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bills</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shopping</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entertainment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Money</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Repayment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extra</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Other</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thought</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyData.map((item) => (
                        <tr key={item._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(item.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.food || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.grocery || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.chaiCoffee || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.fastFood || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.transport || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.bills || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.shopping || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.entertainment || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.sentMoney || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.loanRepayment || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.extra || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{item.expenses.other || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">₹{item.totalExpenses}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {item.thought || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
