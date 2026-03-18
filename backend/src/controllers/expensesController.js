const prisma = require('../config/prisma');

const getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [expenses, total, sum] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { date: 'desc' },
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    res.json({
      expenses,
      total,
      totalAmount: parseFloat(sum._sum.amount || 0),
      page: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

const createExpense = async (req, res) => {
  try {
    const { date, category, amount, notes } = req.body;

    if (!date || !category || !amount) {
      return res.status(400).json({ error: 'Date, category, and amount are required' });
    }

    const expense = await prisma.expense.create({
      data: {
        date: new Date(date),
        category,
        amount: parseFloat(amount),
        notes,
      },
    });

    res.status(201).json({ expense });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        amount: req.body.amount ? parseFloat(req.body.amount) : undefined,
        date: req.body.date ? new Date(req.body.date) : undefined,
      },
    });
    res.json({ expense });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense };
