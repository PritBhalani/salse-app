import React, { useState, useEffect, useRef } from 'react';
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Filter,
  DollarSign,
  Package,
  Image as ImageIcon,
  Upload,
  Camera,
  Link2,
  X,
  RefreshCw,
  Tags,
  FolderPlus,
  Settings2,
} from 'lucide-react';
import { productsAPI, uploadAPI, categoriesAPI } from '../services/api';

export const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // Category Manager Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  // Photo upload state
  const [photoTab, setPhotoTab] = useState('UPLOAD'); // 'UPLOAD' or 'LINK'
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);

  // Product form
  const [formData, setFormData] = useState({
    name: '',
    category: 'Brass C.P. Fittings',
    brand: 'Jaquar',
    sku: '',
    basePrice: '',
    boxQuantity: 12,
    uom: 'Pcs',
    stockQuantity: 100,
    imageUrl: '',
    description: '',
  });

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      if (res.data.success) {
        setCategoriesList(res.data.categories || []);
        // Set default category if form category not initialized
        if (res.data.categories?.length > 0 && !formData.category) {
          setFormData((prev) => ({ ...prev, category: res.data.categories[0].name }));
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productsAPI.getAll();
      if (res.data.success) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleToggleStock = async (id, currentStatus) => {
    try {
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, isOutOfStock: !currentStatus } : p))
      );
      await productsAPI.toggleStock(id);
    } catch (err) {
      console.error('Error toggling stock status:', err);
      fetchProducts(); // rollback on error
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas compression failed'));
              }
            },
            'image/jpeg',
            0.82
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    setUploadingPhoto(true);
    setPhotoError('');

    try {
      const compressedBlob = await compressImage(file);
      const uploadData = new FormData();
      uploadData.append('photo', compressedBlob, file.name.replace(/\.[^/.]+$/, '') + '.jpg');

      const res = await uploadAPI.uploadPhoto(uploadData);
      if (res.data.success) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: res.data.imageUrl,
        }));
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      setPhotoError('Photo upload failed. You can paste an image URL instead.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        basePrice: parseFloat(formData.basePrice) || 0,
        boxQuantity: parseInt(formData.boxQuantity, 10) || 1,
        stockQuantity: parseInt(formData.stockQuantity, 10) || 0,
      };

      if (editProduct) {
        const res = await productsAPI.update(editProduct._id, payload);
        if (res.data.success) {
          setIsAddModalOpen(false);
          setEditProduct(null);
          fetchProducts();
          fetchCategories();
        }
      } else {
        const res = await productsAPI.create(payload);
        if (res.data.success) {
          setIsAddModalOpen(false);
          fetchProducts();
          fetchCategories();
        }
      }
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Failed to save product: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product from the inventory catalog?')) {
      try {
        await productsAPI.delete(id);
        fetchProducts();
        fetchCategories();
      } catch (err) {
        console.error('Error deleting product:', err);
      }
    }
  };

  // Category Manager Handlers
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCategoryError('Please enter a category name');
      return;
    }

    setSavingCategory(true);
    setCategoryError('');

    try {
      const res = await categoriesAPI.create({
        name: newCatName.trim(),
        description: newCatDescription.trim(),
      });

      if (res.data.success) {
        const createdCatName = newCatName.trim();
        setNewCatName('');
        setNewCatDescription('');
        setFormData((prev) => ({ ...prev, category: createdCatName }));
        await fetchCategories();
      }
    } catch (err) {
      setCategoryError(err.response?.data?.message || 'Failed to add category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    const catObj = categoriesList.find((c) => c._id === catId || c.name === catName);
    const prodCount = catObj?.productCount || 0;

    let confirmMsg = `Are you sure you want to remove the category "${catName}"?`;
    if (prodCount > 0) {
      confirmMsg += `\n\n⚠️ Warning: ${prodCount} product(s) are currently under this category.`;
    }

    if (window.confirm(confirmMsg)) {
      try {
        await categoriesAPI.delete(catId);
        if (selectedCategory === catName) {
          setSelectedCategory('ALL');
        }
        await fetchCategories();
      } catch (err) {
        alert('Failed to delete category: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const openEditModal = (p) => {
    setEditProduct(p);
    setFormData({
      name: p.name || '',
      category: p.category || (categoriesList[0]?.name || 'Pipes & Fittings'),
      brand: p.brand || '',
      sku: p.sku || '',
      basePrice: p.basePrice || '',
      boxQuantity: p.boxQuantity || 1,
      uom: p.uom || 'Pcs',
      stockQuantity: p.stockQuantity || 100,
      imageUrl: p.imageUrl || '',
      description: p.description || '',
    });
    setPhotoTab('UPLOAD');
    setPhotoError('');
    setIsAddModalOpen(true);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Unique list of category names for filter pills
  const allCategoryNames = categoriesList.map((c) => c.name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Plumbing & Bathware Inventory Catalog
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Upload product photos directly from your device, manage wholesale pricing, packaging box quantities, and add/remove catalog categories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Manage Categories Button */}
          <button
            onClick={() => {
              setCategoryError('');
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95"
          >
            <Tags className="w-4 h-4 text-sky-400" />
            <span>Manage Categories</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-900 text-sky-400 text-[10px] font-bold">
              {categoriesList.length}
            </span>
          </button>

          {/* Add New Product Button */}
          <button
            onClick={() => {
              setEditProduct(null);
              setFormData({
                name: '',
                category: selectedCategory !== 'ALL' ? selectedCategory : (categoriesList[0]?.name || 'Brass C.P. Fittings'),
                brand: '',
                sku: '',
                basePrice: '',
                boxQuantity: 12,
                uom: 'Pcs',
                stockQuantity: 100,
                imageUrl: '',
                description: '',
              });
              setPhotoTab('UPLOAD');
              setPhotoError('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-900/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Astral pipes, Jaquar bib cocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {/* ALL Pill */}
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            🌟 ALL ({products.length})
          </button>

          {/* Dynamic Categories */}
          {categoriesList.map((cat) => {
            const count = cat.productCount ?? products.filter((p) => p.category === cat.name).length;
            return (
              <button
                key={cat._id || cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.name
                    ? 'bg-sky-600 text-white shadow'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedCategory === cat.name
                      ? 'bg-sky-700/80 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* Quick Add Category Pill */}
          <button
            onClick={() => {
              setCategoryError('');
              setIsCategoryModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-900/60 border border-dashed border-slate-700 hover:border-sky-500 text-sky-400 hover:text-sky-300 transition-all flex items-center gap-1"
            title="Add or Remove Category"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Category</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Photo</th>
                <th className="py-3 px-4">Item Name & SKU</th>
                <th className="py-3 px-3">Brand & Category</th>
                <th className="py-3 px-3 text-center">Packaging (UOM)</th>
                <th className="py-3 px-4 text-right">Wholesale Price</th>
                <th className="py-3 px-3 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Out-of-Stock Toggle</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-500">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-50" />
                    <p className="text-sm font-semibold">No products found in this category.</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click "Add New Product" to add items to "{selectedCategory}".
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr
                    key={p._id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      p.isOutOfStock ? 'opacity-65 bg-slate-950/30' : ''
                    }`}
                  >
                    {/* Photo Thumbnail */}
                    <td className="py-3 px-4">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700/80 shadow-sm"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">
                          📦
                        </div>
                      )}
                    </td>

                    {/* Name & SKU */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white text-xs">{p.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku || 'N/A'}</span>
                    </td>

                    {/* Brand & Category */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 text-[10px] font-bold border border-sky-500/20 mr-1.5">
                        {p.brand || 'Unbranded'}
                      </span>
                      <span className="text-slate-400 text-[11px] block mt-0.5">{p.category}</span>
                    </td>

                    {/* Packaging */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-semibold text-slate-300">
                        {p.boxQuantity || 1} {p.uom || 'Pcs'}/box
                      </span>
                    </td>

                    {/* Wholesale Price */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-white">₹{p.basePrice?.toLocaleString()}</div>
                      <span className="text-[10px] text-slate-400">
                        ₹{((p.basePrice || 0) * (p.boxQuantity || 1)).toLocaleString()} / box
                      </span>
                    </td>

                    {/* Stock Level */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          p.stockQuantity > 50
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.stockQuantity > 0
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {p.stockQuantity || 0} Pcs
                      </span>
                    </td>

                    {/* Out of Stock Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStock(p._id, p.isOutOfStock)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                          p.isOutOfStock
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                        }`}
                      >
                        {p.isOutOfStock ? (
                          <>
                            <ToggleLeft className="w-3.5 h-3.5 text-rose-400" />
                            <span>OUT OF STOCK</span>
                          </>
                        ) : (
                          <>
                            <ToggleRight className="w-3.5 h-3.5 text-emerald-400" />
                            <span>IN STOCK</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-950 text-slate-400 hover:text-sky-400 transition-colors"
                          title="Edit Price, Photo & Specs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p._id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MANAGE CATEGORIES MODAL (ADD & REMOVE CATEGORIES) */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Tags className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Manage Catalog Categories</h3>
                  <p className="text-[11px] text-slate-400">
                    Add new product categories or remove unused ones across the ERP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Category Box */}
            <form onSubmit={handleAddCategory} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-sky-400" />
                <span>Add New Category</span>
              </h4>

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. CPVC Solvents, Water Tanks, Kitchen Sinks"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{savingCategory ? 'Adding...' : 'Add'}</span>
                </button>
              </div>

              {categoryError && (
                <p className="text-rose-400 text-[11px] font-semibold">{categoryError}</p>
              )}
            </form>

            {/* Existing Categories List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300">
                  Existing Categories ({categoriesList.length}):
                </h4>
                <span className="text-[10px] text-slate-500">Live synchronized</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {categoriesList.map((cat) => {
                  const pCount = cat.productCount ?? products.filter((p) => p.category === cat.name).length;
                  return (
                    <div
                      key={cat._id || cat.name}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm">🏷️</span>
                        <div>
                          <p className="text-xs font-bold text-white">{cat.name}</p>
                          <span className="text-[10px] text-slate-400">
                            {pCount} product{pCount !== 1 ? 's' : ''} in catalog
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteCategory(cat._id, cat.name)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                        title={`Remove category "${cat.name}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT PRODUCT MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-4">
              {editProduct ? 'Edit Product Details & Photo' : 'Add New Plumbing / Bathware Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Product Description / Name *:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CPVC Pipe 1 inch SDR 11 (3m)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Direct Photo Upload Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-sky-400" />
                    <span>Product Photo:</span>
                  </label>

                  {/* Mode Switcher */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPhotoTab('UPLOAD')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        photoTab === 'UPLOAD'
                          ? 'bg-sky-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📸 Upload from Device
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoTab('LINK')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        photoTab === 'LINK'
                          ? 'bg-sky-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔗 Paste Link
                    </button>
                  </div>
                </div>

                {photoTab === 'UPLOAD' ? (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {formData.imageUrl ? (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                        <img
                          src={formData.imageUrl}
                          alt="Uploaded Preview"
                          className="w-16 h-16 rounded-xl object-cover border border-slate-700 shadow-md"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                            Photo Ready for Catalog
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            Optimized & synced to Salesman & Shop Owner apps
                          </span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2.5 py-1 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 hover:bg-sky-900 text-[10px] font-bold flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" /> Change Photo
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, imageUrl: '' })}
                              className="px-2.5 py-1 rounded-lg bg-rose-950 border border-rose-800 text-rose-400 hover:bg-rose-900 text-[10px] font-bold flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-5 text-center cursor-pointer bg-slate-900/60 hover:bg-slate-900 transition-all group"
                      >
                        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-white">Click or Drag to Upload Photo</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Supports phone camera photos, JPG, PNG, WEBP (Auto-optimized)
                        </p>
                        {uploadingPhoto && (
                          <span className="inline-block mt-2 text-sky-400 text-xs font-bold animate-pulse">
                            ⚡ Optimizing & uploading photo...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                    />
                    {formData.imageUrl && (
                      <div className="mt-2 p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                        <img
                          src={formData.imageUrl}
                          alt="Link Preview"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div>
                          <span className="text-emerald-400 font-bold block">Live Link Preview</span>
                          <span className="text-[10px] text-slate-400">Photo URL verified.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {photoError && <p className="text-rose-400 text-[10px] font-bold">{photoError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Category *:</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryError('');
                        setIsCategoryModalOpen(true);
                      }}
                      className="text-[10px] text-sky-400 hover:underline font-bold"
                    >
                      + Manage
                    </button>
                  </div>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                  >
                    {formData.category && !categoriesList.some((c) => c.name === formData.category) && (
                      <option value={formData.category}>{formData.category}</option>
                    )}
                    {categoriesList.map((c) => (
                      <option key={c._id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Brand Name *:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Astral, Jaquar, Cera"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Base Price (₹) *:</label>
                  <input
                    type="number"
                    required
                    placeholder="480"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Box Pack Qty *:</label>
                  <input
                    type="number"
                    required
                    placeholder="12"
                    value={formData.boxQuantity}
                    onChange={(e) => setFormData({ ...formData, boxQuantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Stock (Pcs):</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Specs / Application Details:</label>
                <textarea
                  rows="2"
                  placeholder="e.g. 10-year chrome warranty, ceramic disc cartridge..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditProduct(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingPhoto}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-lg shadow-sky-900/30"
                >
                  {uploadingPhoto ? 'Uploading Photo...' : editProduct ? 'Save Updates' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
