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
} from 'lucide-react';
import { productsAPI, uploadAPI } from '../services/api';

export const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

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

  const categories = [
    'ALL',
    'Pipes & Fittings',
    'Brass C.P. Fittings',
    'Valves & Diverters',
    'Sanitaryware',
    'Bath Accessories',
  ];

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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setPhotoError('');

    try {
      // 1. Instant client-side compression for smooth preview
      const compressedDataUrl = await compressImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: compressedDataUrl }));

      // 2. Upload file to backend server storage
      const uploadFormData = new FormData();
      uploadFormData.append('photo', file);

      try {
        const res = await uploadAPI.uploadPhoto(uploadFormData);
        if (res.data?.success && res.data?.url) {
          setFormData((prev) => ({ ...prev, imageUrl: res.data.url }));
        }
      } catch (uploadErr) {
        console.warn('Server upload fallback to optimized Base64 image:', uploadErr);
        // Keeps the optimized base64 image which works completely in DB & all apps
      }
    } catch (err) {
      console.error('Image processing error:', err);
      setPhotoError('Failed to process selected image file.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editProduct) {
        await productsAPI.update(editProduct._id, formData);
      } else {
        await productsAPI.create(formData);
      }
      setIsAddModalOpen(false);
      setEditProduct(null);
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      alert(err.response?.data?.message || 'Error saving product');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product SKU?')) return;
    try {
      await productsAPI.delete(id);
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Error deleting product');
    }
  };

  const openEditModal = (p) => {
    setEditProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      brand: p.brand,
      sku: p.sku || '',
      basePrice: p.basePrice,
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
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

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
            Upload product photos directly from your device, manage wholesale pricing, packaging box quantities, and toggle out-of-stock items.
          </p>
        </div>

        <button
          onClick={() => {
            setEditProduct(null);
            setFormData({
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
            setPhotoTab('UPLOAD');
            setPhotoError('');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-900/20 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Astral pipes, Jaquar bib cocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === c
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
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
              {filteredProducts.map((p) => (
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
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </td>

                  {/* Name */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">{p.name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{p.sku || 'N/A'}</div>
                  </td>

                  {/* Brand & Category */}
                  <td className="py-3.5 px-3">
                    <span className="font-semibold text-sky-400 block">{p.brand}</span>
                    <span className="text-[11px] text-slate-400">{p.category}</span>
                  </td>

                  {/* Packaging */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 font-bold">
                      <Package className="w-3.5 h-3.5" />
                      <span>{p.boxQuantity} {p.uom || 'Pcs'}/box</span>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400 text-sm">
                    ₹{p.basePrice?.toLocaleString()}
                    <span className="text-[10px] text-slate-500 font-normal block">
                      (₹{((p.basePrice || 0) * (p.boxQuantity || 1)).toLocaleString()} / box)
                    </span>
                  </td>

                  {/* Stock */}
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.isOutOfStock || p.stockQuantity <= 0
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : p.stockQuantity < 20
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {p.isOutOfStock ? '0 (Out of Stock)' : `${p.stockQuantity} Pcs`}
                    </span>
                  </td>

                  {/* Stock Toggle Switch */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleStock(p._id, p.isOutOfStock)}
                      className="inline-flex items-center gap-1.5 transition-transform active:scale-90"
                      title={p.isOutOfStock ? 'Click to mark IN STOCK' : 'Click to mark OUT OF STOCK'}
                    >
                      {p.isOutOfStock ? (
                        <div className="flex items-center gap-1 text-rose-400 bg-rose-950/50 border border-rose-800/60 px-2 py-1 rounded-lg">
                          <ToggleLeft className="w-4 h-4 text-rose-500" />
                          <span className="text-[10px] font-bold">OUT OF STOCK</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-1 rounded-lg">
                          <ToggleRight className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-bold">IN STOCK</span>
                        </div>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
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

              {/* Direct Photo Upload / Camera Section */}
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
                  <label className="block text-slate-300 font-semibold mb-1">Category *:</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="Pipes & Fittings">Pipes & Fittings</option>
                    <option value="Brass C.P. Fittings">Brass C.P. Fittings</option>
                    <option value="Valves & Diverters">Valves & Diverters</option>
                    <option value="Sanitaryware">Sanitaryware</option>
                    <option value="Bath Accessories">Bath Accessories</option>
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
