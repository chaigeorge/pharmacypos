const prisma = require('../config/prisma');

// Generate sale number: SALE-YYYYMMDD-XXXX
const generateSaleNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.sale.count({
    where: {
      createdAt: {
        gte: new Date(today.setHours(0, 0, 0, 0)),
      },
    },
  });
  return `SALE-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

const createSale = async (req, res) => {
  try {
    const { items, discount = 0, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sale must have at least one item' });
    }

    // Validate and calculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          stockEntries: {
            where: { status: 'ACTIVE', remainingQty: { gt: 0 } },
            orderBy: { expiryDate: 'asc' }, // FEFO - First Expiry First Out
          },
        },
      });

      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` });
      }

      const totalStock = product.stockEntries.reduce((sum, e) => sum + e.remainingQty, 0);
      if (totalStock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${totalStock}`,
        });
      }

      const lineTotal = parseFloat(item.unitPrice) * item.quantity;
      subtotal += lineTotal;

      processedItems.push({
        productId: item.productId,
        stockEntryId: product.stockEntries[0]?.id || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: lineTotal,
      });
    }

    const total = subtotal - parseFloat(discount);
    const saleNumber = await generateSaleNumber();

    // Create sale in transaction
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          saleNumber,
          cashierId: req.user.id,
          subtotal,
          discount: parseFloat(discount),
          total,
          notes,
          items: { create: processedItems },
        },
        include: {
          items: { include: { product: true } },
          cashier: { select: { id: true, name: true } },
        },
      });

      // Deduct stock (FEFO)
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            stockEntries: {
              where: { status: 'ACTIVE', remainingQty: { gt: 0 } },
              orderBy: { expiryDate: 'asc' },
            },
          },
        });

        let remaining = item.quantity;
        for (const entry of product.stockEntries) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, entry.remainingQty);
          const newQty = entry.remainingQty - deduct;
          await tx.stockEntry.update({
            where: { id: entry.id },
            data: {
              remainingQty: newQty,
              status: newQty === 0 ? 'DEPLETED' : 'ACTIVE',
            },
          });
          remaining -= deduct;
        }
      }

      return newSale;
    });

    res.status(201).json({ sale });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
};

const getSales = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, status, cashierId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (req.user.role === 'PHARMACIST') where.cashierId = req.user.id;
    if (cashierId && req.user.role !== 'PHARMACIST') where.cashierId = cashierId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          cashier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({ sales, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
};

const getSaleById = async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        cashier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, barcode: true, unitType: true } },
            stockEntry: { select: { batchNumber: true, expiryDate: true } },
          },
        },
      },
    });

    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (req.user.role === 'PHARMACIST' && sale.cashierId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ sale });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
};

const voidSale = async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Only completed sales can be voided' });
    }

    // Restore stock
    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        if (item.stockEntryId) {
          await tx.stockEntry.update({
            where: { id: item.stockEntryId },
            data: {
              remainingQty: { increment: item.quantity },
              status: 'ACTIVE',
            },
          });
        }
      }

      await tx.sale.update({
        where: { id: req.params.id },
        data: { status: 'VOIDED' },
      });
    });

    res.json({ message: 'Sale voided successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to void sale' });
  }
};

module.exports = { createSale, getSales, getSaleById, voidSale };
