import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  MapPin,
  Camera,
  Wallet,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
  Clock,
  UserCheck,
  RefreshCw,
  UserPlus,
  Edit2,
  Key,
  Plus,
  Trash2,
} from 'lucide-react';
import { visitsAPI, authAPI, paymentsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export const SalesmanTrackingPage = () => {
  const { toast } = useToast();
  const [salesmen, setSalesmen] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settleModalSalesman, setSettleModalSalesman] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');

  // User management modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'SALESMAN',
    activeCities: 'Morbi, Wankaner',
  });

  const [editUserData, setEditUserData] = useState(null);
  const [deleteConfirmSalesman, setDeleteConfirmSalesman] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, vRes] = await Promise.all([
        authAPI.getUsers('SALESMAN'),
        visitsAPI.getAll(),
      ]);
      if (uRes.data.success) setSalesmen(uRes.data.users || []);
      if (vRes.data.success) setVisits(vRes.data.visits || []);
    } catch (err) {
      console.error('Error fetching salesman audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSalesman = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newUserData,
        activeCities: typeof newUserData.activeCities === 'string'
          ? newUserData.activeCities.split(',').map((c) => c.trim()).filter(Boolean)
          : newUserData.activeCities,
      };
      const res = await authAPI.createUser(payload);
      if (res.data.success) {
        const name = newUserData.name;
        setIsAddModalOpen(false);
        setNewUserData({
          name: '',
          phone: '',
          password: '',
          role: 'SALESMAN',
          activeCities: 'Morbi, Wankaner',
        });
        await fetchData();
        toast.success(`Salesman "${name}" created successfully! They can now log in via the mobile app.`, 'Salesman Created');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(err.response?.data?.message || 'Failed to create user. Check if phone number already exists.', 'Creation Error');
    }
  };

  const handleUpdateSalesman = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: editUserData.name,
        phone: editUserData.phone,
        activeCities: typeof editUserData.activeCities === 'string'
          ? editUserData.activeCities.split(',').map((c) => c.trim()).filter(Boolean)
          : editUserData.activeCities,
      };
      if (editUserData.password) {
        payload.password = editUserData.password;
      }
      const res = await authAPI.updateUser(editUserData._id, payload);
      if (res.data.success) {
        const name = editUserData.name;
        setEditUserData(null);
        await fetchData();
        toast.success(`Salesman "${name}" credentials updated successfully!`, 'Salesman Updated');
      }
    } catch (err) {
      console.error('Error updating salesman:', err);
      toast.error(err.response?.data?.message || 'Failed to update credentials.', 'Update Error');
    }
  };

  const handleSettleCash = async (salesmanId) => {
    try {
      await paymentsAPI.settleCash(salesmanId, settleAmount ? parseFloat(settleAmount) : undefined);
      setSettleModalSalesman(null);
      setSettleAmount('');
      await fetchData();
      toast.success('Salesman cash collected & settled with warehouse desk!', 'Cash Settled');
    } catch (err) {
      console.error('Error settling cash:', err);
      toast.error(err.response?.data?.message || 'Failed to settle salesman cash', 'Settlement Error');
    }
  };

  const handleResetDevice = async (userId) => {
    if (window.confirm('Reset device binding for this salesman? They will be able to log in on a new device.')) {
      try {
        await authAPI.resetDevice(userId);
        await fetchData();
        toast.success('Device binding cleared. Salesman can now log in on a new phone.', 'Device Reset');
      } catch (err) {
        console.error('Error resetting device binding:', err);
        toast.error('Failed to reset device binding.', 'Reset Error');
      }
    }
  };

  const handleDeleteSalesman = async (salesman) => {
    if (!salesman || !salesman._id) return;
    setIsDeleting(true);
    try {
      const res = await authAPI.deleteUser(salesman._id);
      if (res.data.success) {
        const name = salesman.name || 'Salesman';
        setDeleteConfirmSalesman(null);
        if (editUserData?._id === salesman._id) {
          setEditUserData(null);
        }
        await fetchData();
        toast.success(`Salesman "${name}" deleted successfully.`, 'Salesman Deleted');
      }
    } catch (err) {
      console.error('Error deleting salesman:', err);
      toast.error(err.response?.data?.message || 'Failed to delete salesman.', 'Delete Error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Salesmen ID & Staff Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create salesman accounts, reset mobile passwords, manage device locks, and settle daily cash drawers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-900/30 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create Salesman ID</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sales Team Cash Drawer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {salesmen.map((salesman) => (
          <div
            key={salesman._id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 text-sm">
                    {salesman.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{salesman.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{salesman.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    ACTIVE
                  </span>
                  <button
                    onClick={() => setDeleteConfirmSalesman(salesman)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title={`Delete Salesman ${salesman.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Cash Wallet Box */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px]">
                    Today's Cash in Hand
                  </span>
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">
                  ₹{salesman.cashInHand?.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Physical cash collected from retail shops awaiting warehouse handover.
                </div>
              </div>

              {/* Device Binding Info */}
              <div className="text-xs text-slate-400 space-y-1 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Registered Phone:</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {salesman.deviceId ? salesman.deviceId.slice(0, 16) + '...' : 'First login pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Active Cities:</span>
                  <span className="font-medium text-slate-300">
                    {salesman.activeCities?.join(', ') || 'Morbi, Wankaner'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
              <button
                disabled={!salesman.cashInHand || salesman.cashInHand <= 0}
                onClick={() => {
                  setSettleModalSalesman(salesman);
                  setSettleAmount(salesman.cashInHand.toString());
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Accept Cash Handover
              </button>
              <button
                onClick={() =>
                  setEditUserData({
                    _id: salesman._id,
                    name: salesman.name,
                    phone: salesman.phone,
                    password: '',
                    activeCities: salesman.activeCities?.join(', ') || 'Morbi, Wankaner',
                  })
                }
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors"
                title="Change Password / Details"
              >
                <Key className="w-4 h-4" />
              </button>
              {salesman.deviceId && (
                <button
                  onClick={() => handleResetDevice(salesman._id)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white transition-colors"
                  title="Reset device binding (phone changed)"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setDeleteConfirmSalesman(salesman)}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition-colors"
                title={`Delete Salesman ${salesman.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Geofence Visit Verification Audit Trail */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-400" />
              <span>Shop Visit Verification Logs (Anti-Fraud GPS Audit)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live checks performed when salesman arrives at shop. Validates distance against registered shop coordinates.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{visits.length} Total Visits Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Salesman</th>
                <th className="py-3 px-4">Visited Shop & City</th>
                <th className="py-3 px-4 text-center">Distance from Shop</th>
                <th className="py-3 px-4 text-center">GPS Geofence Status</th>
                <th className="py-3 px-4 text-center">Storefront Photo</th>
                <th className="py-3 px-4">Check-In Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {visits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No visit check-ins recorded yet. Salesmen will record check-ins via mobile app.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{v.salesman?.name}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{v.shop?.shopName}</div>
                      <div className="text-[11px] text-slate-500">{v.shop?.city}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-slate-300">
                        {v.distanceMeters !== undefined ? `${v.distanceMeters}m away` : 'Within 50m'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {v.isGeofenceVerified ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>VERIFIED ON-SITE</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>OUTSIDE GEOFENCE</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {v.photoProofUrl ? (
                        <a
                          href={v.photoProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 hover:underline font-semibold"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>View Photo</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 text-[11px]">GPS Verified</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(v.checkInTime).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Salesman Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-sky-400" />
              <span>Create New Salesman User</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set up credentials for field executive to log into the mobile app.
            </p>

            <form onSubmit={handleCreateSalesman} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mobile Number (Login ID):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9898033333"
                  value={newUserData.phone}
                  onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Login Password:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sales123"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Active Cities (Comma separated):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Morbi, Wankaner, Rajkot"
                  value={newUserData.activeCities}
                  onChange={(e) => setNewUserData({ ...newUserData, activeCities: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-medium text-sky-300"
                />
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Salesman Modal */}
      {editUserData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Key className="w-5 h-5 text-sky-400" />
              <span>Update Credentials ({editUserData.name})</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update password or assigned cities for this salesman.
            </p>

            <form onSubmit={handleUpdateSalesman} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mobile Number (Login ID):
                </label>
                <input
                  type="text"
                  required
                  value={editUserData.phone}
                  onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  New Password (leave blank to keep current):
                </label>
                <input
                  type="text"
                  placeholder="Enter new password"
                  value={editUserData.password}
                  onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Active Cities (Comma separated):
                </label>
                <input
                  type="text"
                  required
                  value={editUserData.activeCities}
                  onChange={(e) => setEditUserData({ ...editUserData, activeCities: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none font-medium text-sky-300"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const smToDel = salesmen.find((s) => s._id === editUserData._id) || editUserData;
                    setEditUserData(null);
                    setDeleteConfirmSalesman(smToDel);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Salesman</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditUserData(null)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Handover Confirmation Modal */}
      {settleModalSalesman && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Confirm Physical Cash Settlement
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Salesman <b>{settleModalSalesman.name}</b> is handing over physical cash to the warehouse/uncle.
            </p>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Cash in Hand:</span>
                <span className="font-extrabold text-white text-sm">
                  ₹{settleModalSalesman.cashInHand?.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-700">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Settled Handover Amount (₹):
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-emerald-400 rounded-xl p-2.5 font-bold text-base focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSettleModalSalesman(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSettleCash(settleModalSalesman._id)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
              >
                Clear Cash Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Salesman Confirmation Modal */}
      {deleteConfirmSalesman && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Background tint glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Salesman Account</h3>
                <p className="text-xs text-slate-400">Revoke mobile access and staff credentials.</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 mb-4 space-y-1.5 text-xs">
              <div className="text-white font-bold text-sm">{deleteConfirmSalesman.name}</div>
              <div className="text-slate-400">
                Phone (Login ID): <span className="text-slate-200 font-mono font-medium">{deleteConfirmSalesman.phone}</span>
              </div>
              <div className="text-slate-400">
                Active Cities:{' '}
                <span className="text-slate-300 font-medium">
                  {Array.isArray(deleteConfirmSalesman.activeCities)
                    ? deleteConfirmSalesman.activeCities.join(', ')
                    : deleteConfirmSalesman.activeCities || 'Morbi, Wankaner'}
                </span>
              </div>
              <div className="text-slate-400">
                Device Binding:{' '}
                <span className="text-slate-300 font-mono text-[11px]">
                  {deleteConfirmSalesman.deviceId ? 'Locked to Device' : 'No device locked'}
                </span>
              </div>
            </div>

            {/* Outstanding Cash Warning */}
            {deleteConfirmSalesman.cashInHand > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 flex items-start gap-2.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-amber-300 font-bold">Unsettled Cash in Hand Warning</div>
                  <div className="text-slate-300 mt-0.5">
                    This salesman currently has{' '}
                    <span className="text-white font-bold font-mono">
                      ₹{deleteConfirmSalesman.cashInHand.toLocaleString()}
                    </span>{' '}
                    in collected cash in hand. Please settle this cash before deleting the account.
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Deleting this account will immediately revoke their mobile app login and unassign them from any assigned beat routes. Historical order punches, GPS visits, and receipts remain safely archived.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmSalesman(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteSalesman(deleteConfirmSalesman)}
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
