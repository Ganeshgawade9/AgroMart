import { useState, useEffect } from 'react';
import { User, MapPin, Save, Navigation } from 'lucide-react';

import { getProfile, updateProfile, updateLocation } from '../api/auth';
import useAuthStore from '../store/authStore';
import useLocationStore from '../store/locationStore';
import { reverseGeocodeDetails } from '../utils/geocode';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';

export default function Profile() {
  const { updateUser } = useAuthStore();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    getProfile().then(r => setForm(r.data)).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetecting(true);
    const toastId = toast.loading('Detecting your GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          toast.loading('Fetching address details...', { id: toastId });
          const details = await reverseGeocodeDetails(lat, lng);

          setForm((prev) => {
            const updated = {
              ...prev,
              latitude: lat,
              longitude: lng,
            };
            if (details) {
              if (details.village) updated.village = details.village;
              if (details.taluka) updated.taluka = details.taluka;
              if (details.district) updated.district = details.district;
              if (details.pincode) updated.pincode = details.pincode;
              if (details.state) updated.state = details.state;
              if (details.address) updated.address = details.address;
            }
            return updated;
          });

          // Sync coordinates with backend
          updateLocation(lat, lng).catch(() => {});

          // Sync with global location store so navbar and nearby shops update too
          const label = [details?.village || details?.taluka, details?.district].filter(Boolean).join(', ') || 'Current location';
          if (useLocationStore.getState().setManual) {
            useLocationStore.getState().setManual({ lat, lng, label });
          }

          const summary = [details?.village, details?.taluka, details?.district].filter(Boolean).join(', ');
          toast.success(`Location auto-detected${summary ? `: ${summary}` : '!' }`, { id: toastId });
        } catch (err) {
          console.error('Auto-detect error:', err);
          toast.error('Location detected, but address details could not be loaded.', { id: toastId });
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        let msg = 'Could not get your location.';
        if (err.code === 1) msg = 'Location permission was denied. Please allow location in your browser.';
        else if (err.code === 2) msg = 'Location unavailable. Please try again.';
        else if (err.code === 3) msg = 'Location request timed out. Please try again.';
        toast.error(msg, { id: toastId });
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };


  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfile(form);
      updateUser(res.data);
      toast.success('Profile updated!');
    } catch (err) {
      const errors = err.response?.data;
      const message = errors && typeof errors === 'object' ? Object.values(errors).flat().join(', ') : '';
      toast.error(message || 'Failed to update');
    } finally { setSaving(false); }
  };

  if (loading || !form) return <div className="flex justify-center py-20"><Spinner /></div>;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><User className="w-6 h-6 text-primary-600" /> My Profile</h1>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar */}
        <div className="card flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {form.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{form.full_name}</p>
            <span className="badge-green capitalize">{form.role}</span>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-bold text-gray-900">Personal Info</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
              <input className="input" value={form.full_name || ''} onChange={e => set('full_name', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mobile number</label>
              <input className="input" type="tel" inputMode="numeric" placeholder="9876543210" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">OTPs are sent to this number.</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input className="input bg-gray-50" value={form.email || ''} disabled />
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary-600" /> Location</h2>
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={detecting}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 hover:underline disabled:opacity-50 transition-colors"
            >
              <Navigation className={`w-3.5 h-3.5 ${detecting ? 'animate-spin text-primary-700' : ''}`} />
              {detecting ? 'Auto-detecting...' : 'Auto-detect'}
            </button>

          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Address</label>
            <textarea className="input resize-none" rows={2} value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Full address" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['village', 'Village'], ['taluka', 'Taluka'], ['district', 'District']].map(([k, l]) => (
              <div key={k}>
                <label className="text-sm font-medium text-gray-700 block mb-1">{l}</label>
                <input className="input" value={form[k] || ''} onChange={e => set(k, e.target.value)} placeholder={l} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Pincode</label>
              <input className="input" value={form.pincode || ''} onChange={e => set('pincode', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">State</label>
              <input className="input" value={form.state || 'Maharashtra'} onChange={e => set('state', e.target.value)} />
            </div>
          </div>
          {(form.latitude || form.longitude) && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-green-500" /> GPS: {form.latitude}, {form.longitude}
            </p>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {form.role === 'seller' && (
        <div className="mt-6 text-center">
          <a href="/seller/shop-profile" className="text-sm text-primary-600 hover:underline font-medium">
            Manage your Shop Profile →
          </a>
        </div>
      )}
    </div>
  );
}