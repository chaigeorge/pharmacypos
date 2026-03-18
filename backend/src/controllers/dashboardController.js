const prisma = require('../config/prisma');

const getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Today's sales
    const todaySales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: 'COMPLETED',
      },
      _sum: { total: true },
      _count: true,
    });

    // Today's expenses
    const todayExpenses = await prisma.expense.aggregate({
      where: { date: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
    });

    // Low stock products
    const allProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        stockEntries: {
          where: { status: 'ACTIVE' },
          select: { remainingQty: true },
        },
      },
    });

    const lowStockCount = allProducts.filter((p) => {
      const total = p.stockEntries.reduce((sum, e) => sum + e.remainingQty, 0);
      return total <= p.reorderLevel;
    }).length;

    // Expiring soon (within 30 days)
    const expiringSoon = await prisma.stockEntry.count({
      where: {
        expiryDate: { lte: in30Days, gte: today },
        status: 'ACTIVE',
        remainingQty: { gt: 0 },
      },
    });

    // Already expired
    const expiredCount = await prisma.stockEntry.count({
      where: {
        expiryDate: { lt: today },
        status: 'ACTIVE',
        remainingQty: { gt: 0 },
      },
    });

    // Recent transactions (last 10)
    const recentSales = await prisma.sale.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        cashier: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });

    // Monthly sales chart (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);

      const daySales = await prisma.sale.aggregate({
        where: {
          createdAt: { gte: day, lt: nextDay },
          status: 'COMPLETED',
        },
        _sum: { total: true },
        _count: true,
      });

      last7Days.push({
        date: day.toISOString().slice(0, 10),
        total: parseFloat(daySales._sum.total || 0),
        count: daySales._count,
      });
    }

    res.json({
      todaySales: {
        total: parseFloat(todaySales._sum.total || 0),
        count: todaySales._count,
      },
      todayExpenses: parseFloat(todayExpenses._sum.amount || 0),
      lowStockCount,
      expiringSoon,
      expiredCount,
      recentSales,
      salesChart: last7Days,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

module.exports = { getDashboard };
