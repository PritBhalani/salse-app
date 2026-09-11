import { Product } from '../models/Product.js';

// @desc    Get all products with category, brand and search filters
// @route   GET /api/products
export const getProducts = async (req, res) => {
  try {
    const { category, brand, search, inStockOnly } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }
    if (brand) {
      filter.brand = brand;
    }
    if (inStockOnly === 'true') {
      filter.isOutOfStock = false;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create product (Warehouse / Admin)
// @route   POST /api/products
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      category,
      brand,
      uom,
      boxQuantity,
      basePrice,
      gstPercentage,
      stockQuantity,
      imageUrl,
      description,
    } = req.body;

    const product = await Product.create({
      name,
      sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
      category,
      brand,
      uom: uom || 'Pcs',
      boxQuantity: boxQuantity || 1,
      basePrice: parseFloat(basePrice),
      gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage) : 18,
      stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity, 10) : 100,
      isOutOfStock: stockQuantity <= 0,
      imageUrl,
      description,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update product (Warehouse / Admin)
// @route   PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.stockQuantity !== undefined) {
      updateData.isOutOfStock = updateData.stockQuantity <= 0;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Quick toggle Out-of-Stock status (Warehouse Department)
// @route   PATCH /api/products/:id/toggle-stock
export const toggleStockStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.isOutOfStock = !product.isOutOfStock;
    await product.save();

    res.json({
      success: true,
      product,
      message: `Product is now ${product.isOutOfStock ? 'OUT OF STOCK' : 'IN STOCK'}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
