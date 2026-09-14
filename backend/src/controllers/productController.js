import { Product } from '../models/Product.js';

// Format image URL so mobile apps (React Native) always receive absolute URLs
const formatImageUrl = (req, url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.get('host') || 'salse-app.onrender.com';
  return `${protocol}://${host}${url.startsWith('/') ? '' : '/'}${url}`;
};

const formatProductDoc = (req, p) => {
  if (!p) return p;
  const doc = p.toObject ? p.toObject() : { ...p };
  if (doc.imageUrl) {
    doc.imageUrl = formatImageUrl(req, doc.imageUrl);
  }
  return doc;
};

// @desc    Get all products with category, brand and search filters (supports lean & pagination)
// @route   GET /api/products
export const getProducts = async (req, res) => {
  try {
    const { category, brand, search, inStockOnly, page, limit } = req.query;
    const filter = {};

    if (category && category !== 'ALL') {
      filter.category = category;
    }
    if (brand) {
      filter.brand = brand;
    }
    if (inStockOnly === 'true') {
      filter.isOutOfStock = false;
    }
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { sku: { $regex: safeSearch, $options: 'i' } },
        { brand: { $regex: safeSearch, $options: 'i' } },
        { category: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    let query = Product.find(filter).sort({ category: 1, name: 1 });

    if (typeof query.lean === 'function') {
      query = query.lean();
    }

    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const l = Math.max(1, parseInt(limit, 10) || 50);
      const skip = (p - 1) * l;
      query = query.skip(skip).limit(l);
    }

    const products = await query;
    const formatted = products.map((p) => formatProductDoc(req, p));
    res.json({ success: true, count: formatted.length, products: formatted });
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
    res.json({ success: true, product: formatProductDoc(req, product) });
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
      hasVariants,
      variants,
    } = req.body;

    const trimmedName = name?.trim();
    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }

    // Prevent duplicate product names (case-insensitive exact match)
    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingProduct = await Product.findOne({
      name: { $regex: `^${escapedName}$`, $options: 'i' },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: `A product with the name "${existingProduct.name}" already exists in the catalog!`,
      });
    }

    const parsedVariants = Array.isArray(variants) ? variants : [];
    const isVarMode = Boolean(hasVariants && parsedVariants.length > 0);

    let finalBasePrice = parseFloat(basePrice) || 0;
    let finalStockQty = stockQuantity !== undefined && stockQuantity !== '' && stockQuantity !== null
      ? parseInt(stockQuantity, 10) || 0
      : 0;
    let finalBoxQty = boxQuantity !== undefined && boxQuantity !== '' && boxQuantity !== null
      ? parseInt(boxQuantity, 10) || 1
      : 1;

    if (isVarMode && parsedVariants.length > 0) {
      finalBasePrice = parsedVariants[0].basePrice || finalBasePrice;
      finalBoxQty = parsedVariants[0].boxQuantity || finalBoxQty;
      finalStockQty = parsedVariants.reduce((sum, v) => sum + (parseInt(v.stockQuantity, 10) || 0), 0);
    }

    const product = await Product.create({
      name: trimmedName,
      sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
      category,
      brand,
      uom: uom || 'Pcs',
      boxQuantity: finalBoxQty,
      basePrice: finalBasePrice,
      gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage) : 18,
      stockQuantity: finalStockQty,
      isOutOfStock: finalStockQty <= 0,
      imageUrl,
      description,
      hasVariants: isVarMode,
      variants: parsedVariants,
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

    // Prevent duplicate product names (case-insensitive)
    if (updateData.name) {
      const trimmedName = updateData.name.trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'Product name cannot be empty' });
      }

      const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingProduct = await Product.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: `^${escapedName}$`, $options: 'i' },
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: `Another product with the name "${existingProduct.name}" already exists in the catalog!`,
        });
      }

      updateData.name = trimmedName;
    }

    if (updateData.hasVariants && Array.isArray(updateData.variants) && updateData.variants.length > 0) {
      updateData.stockQuantity = updateData.variants.reduce((sum, v) => sum + (parseInt(v.stockQuantity, 10) || 0), 0);
      updateData.basePrice = updateData.variants[0].basePrice || updateData.basePrice;
    }

    if (updateData.stockQuantity !== undefined) {
      updateData.stockQuantity = updateData.stockQuantity === '' || updateData.stockQuantity === null
        ? 0
        : parseInt(updateData.stockQuantity, 10) || 0;
      updateData.isOutOfStock = updateData.stockQuantity <= 0;
    }

    if (updateData.boxQuantity !== undefined) {
      updateData.boxQuantity = updateData.boxQuantity === '' || updateData.boxQuantity === null
        ? 1
        : parseInt(updateData.boxQuantity, 10) || 1;
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

// @desc    Add / Restock quantity when new inventory arrives at warehouse
// @route   POST /api/products/:id/add-stock
export const addStockToProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { addedQuantity, addedBoxes, variantAdditions, autoInStock = true } = req.body;

    if (product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0) {
      // If variant additions provided
      if (Array.isArray(variantAdditions) && variantAdditions.length > 0) {
        variantAdditions.forEach((addition) => {
          let v = null;
          if (addition.variantId) {
            v = product.variants.id ? product.variants.id(addition.variantId) : null;
          }
          if (!v && addition._id) {
            v = product.variants.find((item) => item._id && item._id.toString() === addition._id.toString());
          }
          if (!v && addition.size) {
            v = product.variants.find((item) => item.size === addition.size);
          }

          if (v) {
            const qtyToAdd =
              (parseInt(addition.addedQuantity, 10) || 0) +
              (parseInt(addition.addedBoxes, 10) || 0) * (v.boxQuantity || 1);
            if (qtyToAdd !== 0) {
              v.stockQuantity = Math.max(0, (v.stockQuantity || 0) + qtyToAdd);
              if (v.stockQuantity > 0 && autoInStock) {
                v.isOutOfStock = false;
              }
            }
          }
        });
      } else if (addedQuantity || addedBoxes) {
        const qtyToAdd =
          (parseInt(addedQuantity, 10) || 0) +
          (parseInt(addedBoxes, 10) || 0) * (product.boxQuantity || 1);
        if (qtyToAdd !== 0 && product.variants.length > 0) {
          product.variants[0].stockQuantity = Math.max(0, (product.variants[0].stockQuantity || 0) + qtyToAdd);
          if (product.variants[0].stockQuantity > 0 && autoInStock) {
            product.variants[0].isOutOfStock = false;
          }
        }
      }

      // Recompute total stock
      product.stockQuantity = product.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
      if (product.stockQuantity > 0 && autoInStock) {
        product.isOutOfStock = false;
      }
    } else {
      // Standard product without variants
      const boxQty = product.boxQuantity || 1;
      const qtyToAdd =
        (parseInt(addedQuantity, 10) || 0) +
        (parseInt(addedBoxes, 10) || 0) * boxQty;

      if (qtyToAdd !== 0) {
        product.stockQuantity = Math.max(0, (product.stockQuantity || 0) + qtyToAdd);
        if (product.stockQuantity > 0 && autoInStock) {
          product.isOutOfStock = false;
        }
      }
    }

    await product.save();

    res.json({
      success: true,
      product,
      message: `Stock updated successfully. Live warehouse stock: ${product.stockQuantity} Pcs`,
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
