import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Search,
  Plus,
  Receipt,
  FileText,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Key,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { shopsAPI, routesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export const ShopsLedgerPage = () => {
  const { toast } = useToast();
  const [shops, setShops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopDetailData, setShopDetailData] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [editShopData, setEditShopData] = useState(null);
  const [deleteConfirmShop, setDeleteConfirmShop] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    altPhone: '',
    city: 'Morbi',
    address: '',
    latitude: 22.8123,
    longitude: 70.8354,
    routeId: '',
    gstNumber: '',
    creditLimit: 150000,
    ownerPassword: '',
  });

  const handleEditShopClick = (shop) => {
    setEditShopData({
      _id: shop._id,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      phone: shop.phone,
      altPhone: shop.altPhone || '',
      city: shop.city,
      address: shop.address,
      routeId: shop.routeId?._id || shop.routeId || '',
      gstNumber: shop.gstNumber || '',
      creditLimit: shop.creditLimit || 150000,
    });
  };

  const handleSaveShopEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editShopData,
        routeId: editShopData.routeId || null,
        creditLimit: parseFloat(editShopData.creditLimit) || 150000,
      };
      const res = await shopsAPI.update(editShopData._id, payload);
      if (res.data.success) {
        const name = editShopData.shopName;
        setEditShopData(null);
        await fetchShops();
        toast.success(`Shop "${name}" details & beat updated successfully!`, 'Shop Updated');
      }
    } catch (err) {
      console.error('Error updating shop:', err);
      toast.error(err.response?.data?.message || 'Failed to update shop details.', 'Update Error');
    }
  };

  const handleDeleteShop = async (shop) => {
    if (!shop || !shop._id) return;
    setIsDeleting(true);
    try {
      const res = await shopsAPI.delete(shop._id);
      if (res.data.success) {
        const deletedName = shop.shopName || 'Shop';
        setDeleteConfirmShop(null);
        if (selectedShop?._id === shop._id) {
          setSelectedShop(null);
          setShopDetailData(null);
        }
        if (editShopData?._id === shop._id) {
          setEditShopData(null);
        }
        await fetchShops();
        toast.success(`Shop "${deletedName}" deleted successfully!`, 'Shop Deleted');
      }
    } catch (err) {
      console.error('Error deleting shop:', err);
      toast.error(err.response?.data?.message || 'Failed to delete shop.', 'Delete Error');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchShops = async () => {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        shopsAPI.getAll(),
        routesAPI.getAll(),
      ]);
      if (sRes.data.success) setShops(sRes.data.shops || []);
      if (rRes.data.success) setRoutes(rRes.data.routes || []);
    } catch (err) {
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleOpenLedger = async (shop) => {
    setSelectedShop(shop);
    try {
      const res = await shopsAPI.getById(shop._id);
      if (res.data.success) {
        setShopDetailData(res.data);
      }
    } catch (err) {
      console.error('Error fetching shop ledger:', err);
    }
  };

  const handleCreateShop = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        routeId: formData.routeId || null,
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 150000,
        latitude: parseFloat(formData.latitude) || 22.8123,
        longitude: parseFloat(formData.longitude) || 70.8354,
      };
      const res = await shopsAPI.create(payload);
      if (res.data.success) {
        setCreatedCredentials(res.data.credentials);
        await fetchShops();
        toast.success(`Shop "${formData.shopName}" registered successfully!`, 'Shop Registered');
      }
    } catch (err) {
      console.error('Error creating shop:', err);
      toast.error(err.response?.data?.message || 'Failed to register shop. Check if phone number already exists.', 'Registration Error');
    }
  };

  const filteredShops = shops.filter(
    (s) =>
      s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Shops Directory & Dual Book Ledgers
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Separated GST & Rough balances, credit limits, GPS locations, and auto-generated shop owner credentials.
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedCredentials(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-900/20 transition-all active:scale-95 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Shop</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search by shop name, city, owner, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Shops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredShops.map((shop) => {
          const totalDue = (shop.gstBalance || 0) + (shop.nonGstBalance || 0);
          return (
            <div
              key={shop._id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {shop.shopName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Prop: {shop.ownerName}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 text-[11px] font-semibold">
                      {shop.city}
                    </span>
                    <button
                      onClick={() => handleEditShopClick(shop)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Change Beat or Shop Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmShop(shop)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title={`Delete ${shop.shopName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Assigned Beat Badge */}
                <div className="mb-3">
                  {(() => {
                    const assignedRoute = shop.routeId
                      ? (typeof shop.routeId === 'object' ? shop.routeId : routes.find(r => r._id === shop.routeId))
                      : routes.find(r => r.cities?.some(c => c.toLowerCase() === shop.city?.toLowerCase()));
                    return (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px]">
                        <span className="text-sky-400 font-semibold">📍 Beat:</span>
                        <span className="text-white font-bold">
                          {assignedRoute?.name || `${shop.city} General Beat`}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-1 text-xs text-slate-400 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{shop.phone}</span>
                    {shop.altPhone && <span className="text-slate-600">| {shop.altPhone}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{shop.address}</span>
                  </div>
                  {shop.location?.latitude && (
                    <a
                      href={`https://www.google.com/maps?q=${shop.location.latitude},${shop.location.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline flex items-center gap-1 text-[11px] font-semibold pt-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>GPS: {shop.location.latitude.toFixed(4)}, {shop.location.longitude.toFixed(4)}</span>
                    </a>
                  )}
                </div>

                {/* Dual Ledger Balance Box */}
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                      GST Due Balance
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      ₹{shop.gstBalance?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                      Rough / Cash Due
                    </span>
                    <span className="text-sm font-bold text-amber-400">
                      ₹{shop.nonGstBalance?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                  <span>Credit Limit: ₹{shop.creditLimit?.toLocaleString()}</span>
                  <span className="font-bold text-slate-300">
                    Total: <b className="text-white">₹{totalDue.toLocaleString()}</b>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => handleOpenLedger(shop)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ledger Statement</span>
                </button>
                <button
                  onClick={() => handleEditShopClick(shop)}
                  className="px-3 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-sky-500/30 transition-colors"
                  title="Edit details or change beat"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setDeleteConfirmShop(shop)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center justify-center border border-rose-500/30 transition-colors"
                  title={`Delete ${shop.shopName}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ledger Statement Modal */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedShop.shopName}</h3>
                <p className="text-xs text-slate-400">
                  Prop: {selectedShop.ownerName} | City: {selectedShop.city} | Phone: {selectedShop.phone}
                </p>
                {selectedShop.gstNumber && (
                  <span className="text-[11px] text-sky-400 font-mono font-semibold">
                    GSTIN: {selectedShop.gstNumber}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const shopToDel = selectedShop;
                    setSelectedShop(null);
                    setShopDetailData(null);
                    setDeleteConfirmShop(shopToDel);
                  }}
                  className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Delete this shop"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Shop</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedShop(null);
                    setShopDetailData(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Balances Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-emerald-400">GST Book Balance</div>
                <div className="text-xl font-extrabold text-white">
                  ₹{selectedShop.gstBalance?.toLocaleString()}
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-amber-400">Rough / Cash Balance</div>
                <div className="text-xl font-extrabold text-white">
                  ₹{selectedShop.nonGstBalance?.toLocaleString()}
                </div>
              </div>
              <div className="bg-sky-500/10 border border-sky-500/30 p-3 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-sky-400">Total Outstanding</div>
                <div className="text-xl font-extrabold text-white">
                  ₹{((selectedShop.gstBalance || 0) + (selectedShop.nonGstBalance || 0)).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Orders & Payments Split Tabs */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-sky-400" />
                  <span>Recent Bills & Invoices</span>
                </h4>

                <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/40 text-slate-400 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Order / Bill #</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {(shopDetailData?.orders || []).map((o) => (
                        <tr key={o._id}>
                          <td className="py-2 px-3 font-mono font-semibold text-white">{o.orderNumber}</td>
                          <td className="py-2 px-3 text-slate-400">
                            {new Date(o.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  o.billType === 'GST'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {o.billType}
                              </span>
                              {o.isWithoutVisit || o.orderChannel === 'PHONE_ORDER' ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                                  📞 Phone
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[11px]">{o.status}</td>
                          <td className="py-2 px-3 text-right font-bold text-white">
                            ₹{o.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Receipts History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Collected Payment Receipts</span>
                </h4>

                <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/40 text-slate-400 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Receipt #</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3">Book</th>
                        <th className="py-2 px-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {(shopDetailData?.payments || []).map((p) => (
                        <tr key={p._id}>
                          <td className="py-2 px-3 font-mono font-semibold text-white">{p.receiptNumber}</td>
                          <td className="py-2 px-3 text-slate-400">
                            {new Date(p.collectedAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-300">{p.mode}</span>
                            {p.chequeNumber && (
                              <span className="text-[10px] text-slate-500 block">Chq #{p.chequeNumber}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-[11px]">
                            <div>{p.billType}</div>
                            {p.isWithoutVisit || p.collectionChannel === 'PHONE_COLLECTION' ? (
                              <span className="text-[9px] font-bold text-purple-400 block">📞 Remote (No Visit)</span>
                            ) : null}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-400">
                            ₹{p.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register New Shop Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Onboard & Register New Retail Shop
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Salesman or Admin registers shop and gives auto-generated ID & Password to the shop owner for mobile login.
            </p>

            {createdCredentials ? (
              <div className="bg-emerald-500/10 border border-emerald-500/40 p-4 rounded-xl space-y-2 mb-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Shop Registered Successfully!</span>
                </div>
                <div className="text-xs text-slate-300">
                  Give these login credentials to the shop owner for their mobile app:
                </div>
                <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-white space-y-1">
                  <div><b>Mobile Login ID:</b> {createdCredentials.phone}</div>
                  <div><b>Password:</b> {createdCredentials.password}</div>
                </div>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setCreatedCredentials(null);
                  }}
                  className="w-full mt-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateShop} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shop Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maruti Hardware & Bathware"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Owner Name:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hareshbhai"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Phone (Login ID):</label>
                    <input
                      type="text"
                      required
                      placeholder="9898012345"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">City:</label>
                    <input
                      type="text"
                      required
                      placeholder="Morbi / Wankaner"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Assign Beat / Route:</label>
                    <select
                      value={formData.routeId}
                      onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                    >
                      <option value="">-- Select Route --</option>
                      {routes.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shop Address:</label>
                  <textarea
                    rows="2"
                    required
                    placeholder="Shop address and landmark"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">GSTIN Number (Optional):</label>
                    <input
                      type="text"
                      placeholder="24AAAAA0000A1Z5"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Owner Password (Optional):</label>
                    <input
                      type="text"
                      placeholder="Auto default: last 6 digits"
                      value={formData.ownerPassword}
                      onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow"
                  >
                    Register & Generate Credentials
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Shop & Change Beat Assignment Modal */}
      {editShopData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-400" />
                <span>Edit Shop & Beat Assignment</span>
              </h3>
              <button
                onClick={() => setEditShopData(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Reassign this shop to a new beat/route, update city, owner contact, or credit limits.
            </p>

            <form onSubmit={handleSaveShopEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shop Name:</label>
                  <input
                    type="text"
                    required
                    value={editShopData.shopName}
                    onChange={(e) => setEditShopData({ ...editShopData, shopName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Owner Name:</label>
                  <input
                    type="text"
                    required
                    value={editShopData.ownerName}
                    onChange={(e) => setEditShopData({ ...editShopData, ownerName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone:</label>
                  <input
                    type="text"
                    required
                    value={editShopData.phone}
                    onChange={(e) => setEditShopData({ ...editShopData, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Alt Phone:</label>
                  <input
                    type="text"
                    value={editShopData.altPhone}
                    onChange={(e) => setEditShopData({ ...editShopData, altPhone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Beat and City Assignment */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block text-sky-300 font-bold mb-1">Assigned Beat / Route:</label>
                  <select
                    value={editShopData.routeId}
                    onChange={(e) => setEditShopData({ ...editShopData, routeId: e.target.value })}
                    className="w-full bg-slate-900 border border-sky-600/50 text-white rounded-xl p-2.5 focus:outline-none font-medium"
                  >
                    <option value="">-- Match by City --</option>
                    {routes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} ({r.cities.join(', ')})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Salesman: {routes.find(r => r._id === editShopData.routeId)?.assignedSalesman?.name || 'Auto'}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City / Region:</label>
                  <input
                    type="text"
                    required
                    value={editShopData.city}
                    onChange={(e) => setEditShopData({ ...editShopData, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    e.g. Morbi, Wankaner, Rajkot
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Shop Address:</label>
                <textarea
                  rows="2"
                  required
                  value={editShopData.address}
                  onChange={(e) => setEditShopData({ ...editShopData, address: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">GSTIN Number (Optional):</label>
                  <input
                    type="text"
                    placeholder="24AAAAA0000A1Z5"
                    value={editShopData.gstNumber}
                    onChange={(e) => setEditShopData({ ...editShopData, gstNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Credit Limit (₹):</label>
                  <input
                    type="number"
                    value={editShopData.creditLimit}
                    onChange={(e) => setEditShopData({ ...editShopData, creditLimit: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-mono text-emerald-400 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const shopToDel = shops.find((s) => s._id === editShopData._id) || editShopData;
                    setEditShopData(null);
                    setDeleteConfirmShop(shopToDel);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Shop</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditShopData(null)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow"
                  >
                    Save & Update Beat
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Shop Confirmation Modal */}
      {deleteConfirmShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Background tint glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Shop</h3>
                <p className="text-xs text-slate-400">This action will remove the shop from active operations.</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 mb-4 space-y-1.5 text-xs">
              <div className="text-white font-bold text-sm">{deleteConfirmShop.shopName}</div>
              <div className="text-slate-400">
                Proprietor: <span className="text-slate-300 font-medium">{deleteConfirmShop.ownerName}</span>
              </div>
              <div className="text-slate-400">
                City / Region: <span className="text-slate-300 font-medium">{deleteConfirmShop.city}</span>
              </div>
              <div className="text-slate-400 font-mono">
                Phone: {deleteConfirmShop.phone}
              </div>
            </div>

            {/* Outstanding Balance Warning */}
            {((deleteConfirmShop.gstBalance || 0) + (deleteConfirmShop.nonGstBalance || 0) > 0) && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 flex items-start gap-2.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-amber-300 font-bold">Outstanding Ledger Dues Warning</div>
                  <div className="text-slate-300 mt-0.5">
                    This shop currently has an unpaid balance of{' '}
                    <span className="text-white font-bold font-mono">
                      ₹{((deleteConfirmShop.gstBalance || 0) + (deleteConfirmShop.nonGstBalance || 0)).toLocaleString()}
                    </span>{' '}
                    (GST: ₹{(deleteConfirmShop.gstBalance || 0).toLocaleString()} • Rough: ₹{(deleteConfirmShop.nonGstBalance || 0).toLocaleString()}).
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Deleting this shop will remove it from salesmen's beat visits, order-taking catalogs, and deactivate the shop owner's mobile login. Historical orders and payment receipts will remain safely archived.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmShop(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteShop(deleteConfirmShop)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
