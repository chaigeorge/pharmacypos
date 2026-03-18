const prisma = require('../config/prisma');

const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const where = { status: 'COMPLETED' };
    if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...(where.createdAt || {}), lte: new Date(endDate) };

    const sales = await prisma.sale.findMany({
      where,
      include: {
        cashier: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, purchasePrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate profit per sale
    const salesWithProfit = sales.map((sale) => {
      const cost = sale.items.reduce((sum, item) => {
        return sum + parseFloat(item.product.purchasePrice) * item.quantity;
      }, 0);
      return {
        ...sale,
        cost,
        profit: parseFloat(sale.total) - cost,
      };
    });

    const totalRevenue = salesWithProfit.reduce((sum, s) => sum + parseFloat(s.total), 0);
    const totalCost = salesWithProfit.reduce((sum, s) => sum + s.cost, 0);
    const totalProfit = totalRevenue - totalCost;

    res.json({
      sales: salesWithProfit,
      summary: {
        totalSales: sales.length,
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
};

const getBestSellers = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const where = { sale: { status: 'COMPLETED' } };
    if (startDate || endDate) {
      where.sale.createdAt = {};
      if (startDate) where.sale.createdAt.gte = new Date(startDate);
      if (endDate) where.sale.createdAt.lte = new Date(endDate);
    }

    const items = await prisma.saleItem.groupBy({
      by: ['productId'],
      where,
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: parseInt(limit),
    });

    const products = await Promise.all(
      items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, unitType: true },
        });
        return {
          product,
          totalQuantity: item._sum.quantity,
          totalRevenue: parseFloat(item._sum.total),
        };
      })
    );

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch best sellers' });
  }
};

const getInventoryValue = async (req, res) => {
  try {
    const entries = await prisma.stockEntry.findMany({
      where: { status: 'ACTIVE', remainingQty: { gt: 0 } },
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by product and track latest selling price per product
    const grouped = {};
    for (const e of entries) {
      const productId = e.productId;
      if (!grouped[productId]) {
        grouped[productId] = {
          product: e.product,
          totalQty: 0,
          totalPurchaseValue: 0,
          latestSellingPrice: null,
          latestCreatedAt: null,
        };
      }

      const g = grouped[productId];
      g.totalQty += e.remainingQty;
      g.totalPurchaseValue += parseFloat(e.purchasePrice) * e.remainingQty;

      if (!g.latestCreatedAt || e.createdAt > g.latestCreatedAt) {
        g.latestCreatedAt = e.createdAt;
        g.latestSellingPrice = parseFloat(e.sellingPrice);
      }
    }

    let totalPurchaseValue = 0;
    let totalSellingValue = 0;

    Object.values(grouped).forEach((g) => {
      totalPurchaseValue += g.totalPurchaseValue;
      const sellPrice = g.latestSellingPrice || 0;
      totalSellingValue += sellPrice * g.totalQty;
    });

    res.json({
      totalItems: entries.length,
      totalPurchaseValue,
      totalSellingValue,
      potentialProfit: totalSellingValue - totalPurchaseValue,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate inventory value' });
  }
};

const getProfitReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [salesData, expensesData] = await Promise.all([
      prisma.sale.findMany({
        where: {
          status: 'COMPLETED',
          ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
        },
        include: {
          items: {
            include: { product: { select: { purchasePrice: true } } },
          },
        },
      }),
      prisma.expense.aggregate({
        where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
        _sum: { amount: true },
      }),
    ]);

    const revenue = salesData.reduce((sum, s) => sum + parseFloat(s.total), 0);
    const cogs = salesData.reduce((sum, sale) => {
      return (
        sum +
        sale.items.reduce(
          (itemSum, item) => itemSum + parseFloat(item.product.purchasePrice) * item.quantity,
          0
        )
      );
    }, 0);
    const expenses = parseFloat(expensesData._sum.amount || 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;

    res.json({
      revenue,
      cogs,
      grossProfit,
      expenses,
      netProfit,
      grossMargin: revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : 0,
      netMargin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate profit report' });
  }
};

module.exports = { getSalesReport, getBestSellers, getInventoryValue, getProfitReport };
