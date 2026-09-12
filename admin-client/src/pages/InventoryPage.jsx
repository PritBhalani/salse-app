import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { productsAPI } from '../services/api';

export const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

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
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleToggleStock = async (product) => {
    try {
      const res = await productsAPI.toggleStock(product._id);
      if (res.data.success) {
        setProducts((prev) =>
          prev.map((p) => (p._id === product._id ? { ...p, isOutOfStock: !p.isOutOfStock } : p))
        );
      }
    } catch (err) {
      console.error('Error toggling stock:', err);
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
      await fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      alert(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsAPI.delete(id);
        await fetchProducts();
      } catch (err) {
        console.error('Error deleting product:', err);
      }
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Plumbing & Bathware Inventory Catalog
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage product photos, wholesale pricing, packaging box quantities, and toggle out-of-stock items for salesmen & shop owners.
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
                    <span className="font-semibold text-slate-200">{p.brand}</span>
                    <div className="text-[11px] text-sky-400">{p.category}</div>
                  </td>

                  {/* Packaging */}
                  <td className="py-3.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold">
                      {p.boxQuantity} {p.uom}/Box
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-extrabold text-white text-sm">₹{p.basePrice}</div>
                    <div className="text-[10px] text-slate-500">
                      ₹{(p.basePrice * (p.boxQuantity || 1)).toLocaleString()} / Box (+18% GST)
                    </div>
                  </td>

                  {/* Stock Quantity */}
                  <td className="py-3.5 px-3 text-center">
                    {p.isOutOfStock ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                        OUT OF STOCK
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-400">{p.stockQuantity} Pcs</span>
                    )}
                  </td>

                  {/* Instant Toggle Button */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleStock(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 mx-auto ${
                        p.isOutOfStock
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                      title="Click to toggle stock availability for salesmen and shop owners"
                    >
                      {p.isOutOfStock ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                      <span>{p.isOutOfStock ? 'OUT OF STOCK' : 'IN STOCK'}</span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditProduct(p);
                          setFormData({
                            name: p.name,
                            category: p.category,
                            brand: p.brand,
                            sku: p.sku || '',
                            basePrice: p.basePrice,
                            boxQuantity: p.boxQuantity || 12,
                            uom: p.uom || 'Pcs',
                            stockQuantity: p.stockQuantity || 100,
                            imageUrl: p.imageUrl || '',
                            description: p.description || '',
                          });
                          setIsAddModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
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

              {/* Photo Image URL Input with Live Preview */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Product Photo URL (Image Link):</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                />
                {formData.imageUrl ? (
                  <div className="mt-2 p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-700"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div>
                      <span className="text-emerald-400 font-bold block">Live Photo Preview Loaded</span>
                      <span className="text-[10px] text-slate-400">This photo will appear in Salesman & Shop Owner catalogs.</span>
                    </div>
                  </div>
                ) : null}
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
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-lg shadow-sky-900/30"
                >
                  {editProduct ? 'Save Updates' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
