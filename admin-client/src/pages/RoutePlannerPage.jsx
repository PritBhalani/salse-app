import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  PhoneCall,
  Clock,
  Building2,
} from 'lucide-react';
import { routesAPI, authAPI } from '../services/api';

export const RoutePlannerPage = ({ onNavigateToCallSheet }) => {
  const [routes, setRoutes] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRoute, setEditRoute] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    cities: '',
    assignedSalesman: '',
    scheduleDays: ['Monday', 'Thursday'],
    nextVisitDate: '',
    description: '',
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const fetchRoutesAndSalesmen = async () => {
    setLoading(true);
    try {
      const [rRes, uRes] = await Promise.all([
        routesAPI.getAll(),
        authAPI.getUsers('SALESMAN'),
      ]);
      if (rRes.data.success) setRoutes(rRes.data.routes || []);
      if (uRes.data.success) setSalesmen(uRes.data.users || []);
    } catch (err) {
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutesAndSalesmen();
  }, []);

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cities: typeof formData.cities === 'string'
          ? formData.cities.split(',').map((c) => c.trim()).filter(Boolean)
          : formData.cities,
        assignedSalesman: formData.assignedSalesman || null,
        nextVisitDate: formData.nextVisitDate || null,
      };

      if (editRoute) {
        await routesAPI.update(editRoute._id, payload);
      } else {
        await routesAPI.create(payload);
      }

      setIsModalOpen(false);
      setEditRoute(null);
      await fetchRoutesAndSalesmen();
      alert('✅ Beat / Route saved successfully!');
    } catch (err) {
      console.error('Error saving route:', err);
      alert(err.response?.data?.message || 'Failed to save route. Please check inputs.');
    }
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => {
      const exists = prev.scheduleDays.includes(day);
      return {
        ...prev,
        scheduleDays: exists
          ? prev.scheduleDays.filter((d) => d !== day)
          : [...prev.scheduleDays, day],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Field Beat & Multi-City Route Planner
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Group 2-3 cities per day, schedule fixed date visits, and assign salesmen. Boss can adjust dates anytime.
          </p>
        </div>

        <button
          onClick={() => {
            setEditRoute(null);
            setFormData({
              name: '',
              cities: 'Morbi, Wankaner',
              assignedSalesman: salesmen[0]?._id || '',
              scheduleDays: ['Monday', 'Thursday'],
              nextVisitDate: '',
              description: '',
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Beat / Route</span>
        </button>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {routes.map((route) => (
          <div
            key={route._id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{route.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{route.description || 'Standard wholesale beat'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditRoute(route);
                      setFormData({
                        name: route.name,
                        cities: route.cities.join(', '),
                        assignedSalesman: route.assignedSalesman?._id || route.assignedSalesman || '',
                        scheduleDays: route.scheduleDays || [],
                        nextVisitDate: route.nextVisitDate ? route.nextVisitDate.slice(0, 10) : '',
                        description: route.description || '',
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Adjust Schedule / Salesman"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Covered Cities Tag Cloud */}
              <div className="mb-4">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Covered Cities (2-3 in 1 Day):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {route.cities.map((city) => (
                    <span
                      key={city}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/30 text-xs font-semibold"
                    >
                      📍 {city}
                    </span>
                  ))}
                </div>
              </div>

              {/* Info Matrix */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned Salesman:</span>
                  <span className="font-bold text-slate-200">
                    {route.assignedSalesman?.name || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Shops on Beat:</span>
                  <span className="font-bold text-emerald-400">
                    {route.shopCount || 0} Registered Shops
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Fixed Schedule Days:</span>
                  <span className="font-medium text-amber-300">
                    {route.scheduleDays?.join(', ') || 'Flexible'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Next Visit Date:</span>
                  <span className="font-bold text-sky-400">
                    {route.nextVisitDate
                      ? new Date(route.nextVisitDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          weekday: 'short',
                        })
                      : 'Not Set'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <button
                onClick={() => onNavigateToCallSheet(route._id)}
                className="w-full py-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-bold border border-sky-500/30 flex items-center justify-center gap-2 transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Open Pre-Visit Call Sheet for this Beat</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Route Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              {editRoute ? 'Adjust Beat Schedule & Salesman' : 'Create New Multi-City Beat'}
            </h3>

            <form onSubmit={handleSaveRoute} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Beat Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morbi - Wankaner Ceramic Beat"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Cities (Comma separated, 2-3 together in 1 day):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Morbi, Wankaner"
                  value={formData.cities}
                  onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-sky-500 font-medium text-sky-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assign Salesman:</label>
                  <select
                    value={formData.assignedSalesman}
                    onChange={(e) => setFormData({ ...formData, assignedSalesman: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="">-- Select Salesman --</option>
                    {salesmen.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Next Visit Date (Boss Adjustable):</label>
                  <input
                    type="date"
                    value={formData.nextVisitDate}
                    onChange={(e) => setFormData({ ...formData, nextVisitDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Schedule Days:</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => {
                    const isSelected = formData.scheduleDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleDayToggle(day)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow"
                >
                  Save Beat Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
