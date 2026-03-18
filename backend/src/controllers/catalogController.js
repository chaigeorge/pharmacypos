const prisma = require('../config/prisma');

// Categories
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const category = await prisma.category.create({ data: { name } });
    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Category already exists' });
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Suppliers
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json({ suppliers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const supplier = await prisma.supplier.create({ data: { name, phone, email, address } });
    res.status(201).json({ supplier });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ supplier });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update supplier' });
  }
};

module.exports = { getCategories, createCategory, getSuppliers, createSupplier, updateSupplier };
