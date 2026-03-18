const prisma = require('../config/prisma');

const getProducts = async (req, res) => {
  try {
    const { search, categoryId, supplierId, isActive = 'true', page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (isActive !== 'all') where.isActive = isActive === 'true';
    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          stockEntries: {
            where: { status: 'ACTIVE' },
            select: { remainingQty: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Add total stock to each product
    const productsWithStock = products.map((p) => ({
      ...p,
      totalStock: p.stockEntries.reduce((sum, e) => sum + e.remainingQty, 0),
    }));

    res.json({ products: productsWithStock, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

const getProductByBarcode = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { barcode: req.params.barcode },
      include: {
        category: true,
        stockEntries: {
          where: { status: 'ACTIVE', remainingQty: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });

    const totalStock = product.stockEntries.reduce((sum, e) => sum + e.remainingQty, 0);
    res.json({ product: { ...product, totalStock } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        supplier: true,
        stockEntries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      name, barcode, categoryId, supplierId, unitType, unitsPerBox,
      purchasePrice, sellingPrice, requiresPrescription, reorderLevel,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const product = await prisma.product.create({
      data: {
        name, barcode, categoryId, supplierId,
        unitType: unitType || 'tablet',
        unitsPerBox: parseInt(unitsPerBox) || 1,
        purchasePrice: purchasePrice !== undefined && purchasePrice !== null && purchasePrice !== ''
          ? parseFloat(purchasePrice)
          : 0,
        sellingPrice: sellingPrice !== undefined && sellingPrice !== null && sellingPrice !== ''
          ? parseFloat(sellingPrice)
          : 0,
        requiresPrescription: requiresPrescription === true,
        reorderLevel: parseInt(reorderLevel) || 10,
      },
      include: { category: true, supplier: true },
    });

    res.status(201).json({ product });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Barcode already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        purchasePrice: req.body.purchasePrice ? parseFloat(req.body.purchasePrice) : undefined,
        sellingPrice: req.body.sellingPrice ? parseFloat(req.body.sellingPrice) : undefined,
        unitsPerBox: req.body.unitsPerBox ? parseInt(req.body.unitsPerBox) : undefined,
        reorderLevel: req.body.reorderLevel ? parseInt(req.body.reorderLevel) : undefined,
      },
      include: { category: true, supplier: true },
    });

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// Bulk create products from parsed data (used by Excel upload)
const bulkCreateProducts = async (req, res) => {
  try {
    const products = req.body.products;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'No products provided' });
    }

    const data = products.map((p) => ({
      name: p.name,
      barcode: p.barcode || null,
      categoryId: p.categoryId || null,
      supplierId: p.supplierId || null,
      unitType: p.unitType || 'tablet',
      unitsPerBox: p.unitsPerBox ? parseInt(p.unitsPerBox) : 1,
      purchasePrice: p.purchasePrice ? parseFloat(p.purchasePrice) : 0,
      sellingPrice: p.sellingPrice ? parseFloat(p.sellingPrice) : 0,
      requiresPrescription: !!p.requiresPrescription,
      reorderLevel: p.reorderLevel ? parseInt(p.reorderLevel) : 10,
      isActive: p.isActive !== false,
    }));

    const created = await prisma.product.createMany({
      data,
      skipDuplicates: true,
    });

    res.status(201).json({ count: created.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk import products' });
  }
};

module.exports = {
  getProducts,
  getProductByBarcode,
  getProductById,
  createProduct,
  updateProduct,
  bulkCreateProducts,
};
