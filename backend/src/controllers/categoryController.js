import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';

const DEFAULT_CATEGORIES = [
  'Pipes & Fittings',
  'Brass C.P. Fittings',
  'Valves & Diverters',
  'Sanitaryware',
  'Bath Accessories',
];

// @desc    Get all product categories with product counts
// @route   GET /api/categories
export const getCategories = async (req, res) => {
  try {
    let categories = await Category.find().sort({ order: 1, name: 1 });

    // Auto-seed default categories if empty
    if (categories.length === 0) {
      // Gather any existing distinct categories from products
      const existingProdCats = await Product.distinct('category');
      const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingProdCats.filter(Boolean)]));
      
      const seedDocs = combined.map((name, idx) => ({
        name,
        order: idx,
      }));

      await Category.insertMany(seedDocs, { ordered: false }).catch(() => {});
      categories = await Category.find().sort({ order: 1, name: 1 });
    }

    // Get product counts for each category
    const productCounts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    productCounts.forEach(pc => {
      if (pc._id) countMap[pc._id] = pc.count;
    });

    const categoriesWithCount = categories.map(cat => ({
      _id: cat._id,
      name: cat.name,
      description: cat.description,
      order: cat.order,
      productCount: countMap[cat.name] || 0,
      createdAt: cat.createdAt,
    }));

    res.json({
      success: true,
      count: categoriesWithCount.length,
      categories: categoriesWithCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new product category
// @route   POST /api/categories
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const trimmedName = name.trim();

    // Check if category already exists (case-insensitive)
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({
      name: trimmedName,
      description: description ? description.trim() : '',
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      category: {
        _id: category._id,
        name: category.name,
        description: category.description,
        productCount: 0,
      },
      message: `Category "${category.name}" created successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const categoryName = category.name;
    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Category "${categoryName}" removed successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
