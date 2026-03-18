const prisma = require('../config/prisma');

const receivePurchase = async (req, res) => {
  try {
    const { supplierId, invoiceNo, notes, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Purchase must have at least one item' });
    }

    let totalAmount = 0;

    const purchase = await prisma.$transaction(async (tx) => {
      const newPurchase = await tx.purchase.create({
        data: {
          supplierId: supplierId || null,
          invoiceNo,
          notes,
          totalAmount: 0,
        },
      });

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product not found: ${item.productId}`);

        // Apply multiplier: boxes × unitsPerBox
        const actualQuantity = item.quantity * (item.unitsPerBox || product.unitsPerBox || 1);
        const itemTotal = parseFloat(item.purchasePrice) * item.quantity;
        totalAmount += itemTotal;

        await tx.stockEntry.create({
          data: {
            productId: item.productId,
            purchaseId: newPurchase.id,
            batchNumber: item.batchNumber,
            expiryDate: new Date(item.expiryDate),
            quantity: actualQuantity,
            remainingQty: actualQuantity,
            purchasePrice: parseFloat(item.purchasePrice),
            sellingPrice: parseFloat(item.sellingPrice || product.sellingPrice),
            receivedById: req.user.id,
          },
        });

        // Optionally update product's default prices
        if (item.updatePrice) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              purchasePrice: parseFloat(item.purchasePrice),
              sellingPrice: parseFloat(item.sellingPrice || product.sellingPrice),
            },
          });
        }
      }

      return tx.purchase.update({
        where: { id: newPurchase.id },
        data: { totalAmount },
        include: {
          supplier: true,
          stockEntries: { include: { product: true } },
        },
      });
    });

    res.status(201).json({ purchase });
  } catch (error) {
    console.error('Receive purchase error:', error);
    res.status(500).json({ error: error.message || 'Failed to receive purchase' });
  }
};

const getPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { stockEntries: true } },
        },
      }),
      prisma.purchase.count({ where }),
    ]);

    res.json({ purchases, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

const getPurchaseById = async (req, res) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        stockEntries: {
          include: {
            product: { select: { id: true, name: true, unitType: true } },
            receivedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    res.json({ purchase });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
};

module.exports = { receivePurchase, getPurchases, getPurchaseById };
