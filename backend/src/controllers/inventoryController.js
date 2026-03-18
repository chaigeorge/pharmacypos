const prisma = require('../config/prisma');

const getInventory = async (req, res) => {
  try {
    const { filter, productId, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (productId) where.productId = productId;

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    if (filter === 'expiring_soon') {
      where.expiryDate = { lte: in30Days, gte: now };
      where.status = 'ACTIVE';
    } else if (filter === 'expiring_60') {
      where.expiryDate = { lte: in60Days, gte: now };
      where.status = 'ACTIVE';
    } else if (filter === 'expired') {
      where.expiryDate = { lt: now };
    } else if (filter === 'active') {
      where.status = 'ACTIVE';
      where.remainingQty = { gt: 0 };
    } else if (filter === 'depleted') {
      where.remainingQty = 0;
    } else {
      where.status = { not: 'DEPLETED' };
    }

    const [entries, total] = await Promise.all([
      prisma.stockEntry.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { expiryDate: 'asc' },
        include: {
          product: {
            select: { id: true, name: true, barcode: true, unitType: true, reorderLevel: true },
          },
          receivedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.stockEntry.count({ where }),
    ]);

    res.json({ entries, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

const getLowStock = async (req, res) => {
  try {
    // Get products where total active stock is below reorder level
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        stockEntries: {
          where: { status: 'ACTIVE' },
          select: { remainingQty: true },
        },
      },
    });

    const lowStock = products
      .map((p) => ({
        ...p,
        totalStock: p.stockEntries.reduce((sum, e) => sum + e.remainingQty, 0),
      }))
      .filter((p) => p.totalStock <= p.reorderLevel);

    res.json({ products: lowStock });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch low stock' });
  }
};

const updateStockEntry = async (req, res) => {
  try {
    const { batchNumber, expiryDate, sellingPrice, purchasePrice } = req.body;

    const entry = await prisma.stockEntry.update({
      where: { id: req.params.id },
      data: {
        ...(batchNumber && { batchNumber }),
        ...(expiryDate && { expiryDate: new Date(expiryDate) }),
        ...(sellingPrice && { sellingPrice: parseFloat(sellingPrice) }),
        ...(purchasePrice && { purchasePrice: parseFloat(purchasePrice) }),
      },
      include: { product: true },
    });

    res.json({ entry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock entry' });
  }
};

module.exports = { getInventory, getLowStock, updateStockEntry };
