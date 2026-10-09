import { useState, useEffect } from 'react';
import { Store, MapPin, Save, Pencil } from 'lucide-react';
import { getProfile, updateSellerProfile, updateLocation } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import LocationPicker from '../../components/maps/LocationPicker';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

export default function ShopProfile() {
    const { user, updateUser } = useAuthStore();
    const [sellerForm, setSellerForm] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [shopLat, setShopLat] = useState(null);
    const [shopLng, setShopLng] = useState(null);
    const [savingLocation, setSavingLocation] = useState(false);

    useEffect(() => {
        getProfile().then(r => {
            setShopLat(r.data.latitude);
            setShopLng(r.data.longitude);
            if (r.data.seller_profile) {
                setSellerForm(r.data.seller_profile);
            } else {
                setSellerForm({ shop_name: r.data.full_name, shop_description: '' });
            }
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const setS = (k, v) => setSellerForm(f => ({ ...f, [k]: v }));

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const formData = new FormData();
        Object.keys(sellerForm).forEach(k => {
            if (k !== 'shop_logo' && sellerForm[k] !== null && sellerForm[k] !== undefined) {
                formData.append(k, sellerForm[k]);
            }
        });
        if (logoFile) formData.append('shop_logo', logoFile);

        try {
            const res = await updateSellerProfile(formData);
            setSellerForm(res.data);
            toast.success('Shop profile updated!');
        } catch {
            toast.error('Failed to update shop profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLocationSave = async ({ lat, lng }) => {
        setSavingLocation(true);
        try {
            await updateLocation(lat, lng);
            setShopLat(lat);
            setShopLng(lng);
            toast.success('Shop location saved!');
            setPickerOpen(false);
        } catch {
            toast.error('Failed to save location');
        } finally {
            setSavingLocation(false);
        }
    };

    if (loading || !sellerForm) return <div className="flex justify-center py-20"><Spinner /></div>;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Store className="w-6 h-6 text-primary-600" /> Shop Profile
            </h1>

            <form onSubmit={handleSave} className="space-y-5">
                <div className="card space-y-4">
                    {/* Shop Image */}
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                            {logoPreview || sellerForm.shop_logo ? (
                                <img src={logoPreview || sellerForm.shop_logo} alt="Shop Logo" className="w-full h-full object-cover" />
                            ) : (
                                <Store className="w-8 h-8 text-gray-300" />
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 block mb-1">Shop Image</label>
                            <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleLogoChange}
                                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                            <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP allowed.</p>
                        </div>
                    </div>

                    {/* Shop Name */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Shop Name</label>
                        <input className="input" value={sellerForm.shop_name || ''} onChange={e => setS('shop_name', e.target.value)} required />
                    </div>

                    {/* Shop Location */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Shop Location</label>
                        <button
                            type="button"
                            onClick={() => setPickerOpen(true)}
                            className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-gray-700">
                                <MapPin className="w-4 h-4 text-primary-600" />
                                {shopLat && shopLng
                                    ? `${Number(shopLat).toFixed(5)}, ${Number(shopLng).toFixed(5)}`
                                    : 'No location set — tap to choose on map'}
                            </span>
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                    </div>
                </div>

                <button type="submit" disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Shop Profile'}
                </button>
            </form>

            {pickerOpen && (
                <LocationPicker
                    initialLat={shopLat}
                    initialLng={shopLng}
                    onSave={handleLocationSave}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </div>
    );
}