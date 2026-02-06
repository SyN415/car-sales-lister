import React, { useState } from 'react';
import { useWatchlists, useCreateWatchlist, useUpdateWatchlist, useDeleteWatchlist } from '../hooks/useWatchlists';
import { formatCurrency } from '../lib/utils';
import type { CarWatchlist, Platform } from '../types';

const MAKES = ['', 'Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz', 'Audi', 'Nissan', 'Hyundai', 'Kia', 'Subaru', 'Volkswagen', 'Mazda', 'Jeep', 'Tesla', 'Lexus'];

const emptyForm = {
  name: '', make: '', model: '', min_year: undefined as number | undefined,
  max_year: undefined as number | undefined, min_price: undefined as number | undefined,
  max_price: undefined as number | undefined, max_mileage: undefined as number | undefined,
  platforms: [] as Platform[], location: '', search_radius_miles: 50,
  notify_email: true, notify_push: true, is_active: true,
};

const Watchlists: React.FC = () => {
  const { data: watchlists, isLoading } = useWatchlists();
  const createMutation = useCreateWatchlist();
  const updateMutation = useUpdateWatchlist();
  const deleteMutation = useDeleteWatchlist();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const handleEdit = (wl: CarWatchlist) => {
    setEditingId(wl.id);
    setForm({
      name: wl.name, make: wl.make || '', model: wl.model || '',
      min_year: wl.min_year, max_year: wl.max_year, min_price: wl.min_price,
      max_price: wl.max_price, max_mileage: wl.max_mileage,
      platforms: wl.platforms || [], location: wl.location || '',
      search_radius_miles: wl.search_radius_miles || 50,
      notify_email: wl.notify_email, notify_push: wl.notify_push, is_active: wl.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { ...form };
    Object.keys(data).forEach(k => { if (data[k] === '' || data[k] === undefined) delete data[k]; });

    if (editingId) {
      updateMutation.mutate({ id: editingId, data }, {
        onSuccess: () => { setShowForm(false); setEditingId(null); setForm(emptyForm); },
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => { setShowForm(false); setForm(emptyForm); },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this watchlist?')) deleteMutation.mutate(id);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Watchlists</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ New Watchlist'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Edit Watchlist' : 'Create Watchlist'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Make</label>
              <select value={form.make} onChange={(e) => setForm(f => ({ ...f, make: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {MAKES.map(m => <option key={m} value={m}>{m || 'Any Make'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
              <input type="text" value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} placeholder="e.g. Camry"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Year</label>
              <input type="number" value={form.min_year || ''} onChange={(e) => setForm(f => ({ ...f, min_year: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Price</label>
              <input type="number" value={form.max_price || ''} onChange={(e) => setForm(f => ({ ...f, max_price: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Mileage</label>
              <input type="number" value={form.max_mileage || ''} onChange={(e) => setForm(f => ({ ...f, max_mileage: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <input type="text" value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, State"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="md:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.notify_email} onChange={(e) => setForm(f => ({ ...f, notify_email: e.target.checked }))} />
                Email Notifications
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.notify_push} onChange={(e) => setForm(f => ({ ...f, notify_push: e.target.checked }))} />
                Push Notifications
              </label>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium">
              {editingId ? 'Update' : 'Create'} Watchlist
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : !watchlists?.length ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow">
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-4">No watchlists yet</p>
          <button onClick={() => setShowForm(true)} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Create Your First Watchlist
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {watchlists.map((wl) => (
            <div key={wl.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{wl.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {[wl.make, wl.model, wl.min_year && `${wl.min_year}+`].filter(Boolean).join(' ') || 'All cars'}
                    {wl.max_price ? ` • Under ${formatCurrency(wl.max_price)}` : ''}
                    {wl.max_mileage ? ` • Under ${wl.max_mileage.toLocaleString()} mi` : ''}
                    {wl.location ? ` • ${wl.location}` : ''}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${wl.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                  {wl.is_active ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => handleEdit(wl)} className="text-sm text-primary-600 hover:underline">Edit</button>
                <button onClick={() => handleDelete(wl.id)} className="text-sm text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Watchlists;
