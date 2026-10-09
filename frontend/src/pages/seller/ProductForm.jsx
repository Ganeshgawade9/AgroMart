import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, X, ImagePlus } from 'lucide-react';
import { createProduct, updateProduct, getMyProducts, getCategories, getBrands } from '../../api/products';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

// Single image upload zone component
function ImageUploadZone({ label, preview, inputId, onChange, onClear, required }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="relative group">
        <div
          className={`border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all
            ${preview
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50'
            }`}
          style={{ aspectRatio: '1/1' }}
          onClick={() => document.getElementById(inputId).click()}
        >
          {preview ? (
            <img
              src={preview}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-3 min-h-[100px]">
              <ImagePlus className="w-8 h-8 text-gray-300 mb-1" />
              <p className="text-xs text-gray-400 text-center">Click to upload</p>
            </div>
          )}
        </div>
        {preview && onClear && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-1 right-1 bg-white rounded-full shadow p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
        required={required}
      />
    </div>
  );
}

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Image state: file objects (null = no new file) & previews (string URLs)
  const [images, setImages] = useState({ image: null, image2: null, image3: null });
  const [previews, setPreviews] = useState({ image: null, image2: null, image3: null });

  const [form, setForm] = useState({
    name: '', description: '', price: '', mrp: '', stock: '', unit: 'kg', weight: '',
    category: '', brand: '', ingredients: '', usage_instructions: '',
    is_organic: false, has_free_delivery: false, is_featured: false, is_active: true,
  });

  useEffect(() => {
    getCategories().then(r => setCategories(r.data.results || r.data)).catch(() => {});
    getBrands().then(r => setBrands(r.data.results || r.data)).catch(() => {});
    if (isEdit) {
      getMyProducts().then(r => {
        const prod = (r.data.results || r.data).find(p => p.id == id);
        if (prod) {
          const { image, image2, image3, ...rest } = prod;
          setForm(f => ({ ...f, ...rest }));
          setPreviews({ image: image || null, image2: image2 || null, image3: image3 || null });
        }
        setLoading(false);
      });
    }
  }, []);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageChange = (key, file) => {
    if (!file) return;
    setImages(prev => ({ ...prev, [key]: file }));
    setPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
  };

  const clearImage = (key) => {
    setImages(prev => ({ ...prev, [key]: null }));
    setPreviews(prev => ({ ...prev, [key]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      // Append text fields
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      // Append image files only if new ones are selected
      ['image', 'image2', 'image3'].forEach(key => {
        if (images[key]) fd.append(key, images[key]);
      });

      if (isEdit) await updateProduct(id, fd);
      else await createProduct(fd);
      toast.success(isEdit ? 'Product updated!' : 'Product added!');
      navigate('/seller/products');
    } catch (err) {
      const errors = err.response?.data;
      if (errors) toast.error(Object.values(errors).flat().join(', '));
      else toast.error('Failed to save product');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Product' : 'Add New Product'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Images */}
        <div className="card">
          <label className="text-sm font-medium text-gray-700 block mb-3">
            Product Images
            <span className="text-gray-400 font-normal ml-2 text-xs">(Main image required · up to 3 photos)</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <ImageUploadZone
              label="Main Image *"
              preview={previews.image}
              inputId="imgInput1"
              onChange={e => { const f = e.target.files[0]; if (f) handleImageChange('image', f); }}
              onClear={null}   /* main image can't be cleared once set */
              required={!isEdit && !previews.image}
            />
            <ImageUploadZone
              label="Image 2"
              preview={previews.image2}
              inputId="imgInput2"
              onChange={e => { const f = e.target.files[0]; if (f) handleImageChange('image2', f); }}
              onClear={() => clearImage('image2')}
            />
            <ImageUploadZone
              label="Image 3"
              preview={previews.image3}
              inputId="imgInput3"
              onChange={e => { const f = e.target.files[0]; if (f) handleImageChange('image3', f); }}
              onClear={() => clearImage('image3')}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 Adding more images helps buyers see your product better.
          </p>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Product Name *</label>
            <input className="input" placeholder="e.g. Urea Fertilizer 50kg" value={form.name} onChange={e => setField('name', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Description *</label>
            <textarea className="input resize-none" rows={3} placeholder="Describe the product..." value={form.description} onChange={e => setField('description', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
              <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Brand</label>
              <select className="input" value={form.brand || ''} onChange={e => setField('brand', e.target.value)}>
                <option value="">Select brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Price (₹) *</label>
              <input className="input" type="number" placeholder="0.00" value={form.price} onChange={e => setField('price', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">MRP (₹)</label>
              <input className="input" type="number" placeholder="0.00" value={form.mrp} onChange={e => setField('mrp', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Stock *</label>
              <input className="input" type="number" placeholder="0" value={form.stock} onChange={e => setField('stock', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Unit</label>
              <select className="input" value={form.unit} onChange={e => setField('unit', e.target.value)}>
                {['kg', 'litre', 'bag', 'packet', 'bottle', 'box', 'piece'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Weight/Size</label>
              <input className="input" placeholder="e.g. 1kg, 500ml" value={form.weight} onChange={e => setField('weight', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Ingredients</label>
            <textarea className="input resize-none" rows={2} value={form.ingredients} onChange={e => setField('ingredients', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Usage Instructions</label>
            <textarea className="input resize-none" rows={2} value={form.usage_instructions} onChange={e => setField('usage_instructions', e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-4">
            {[['is_organic', '🌿 Organic'], ['has_free_delivery', '🚚 Free Delivery'], ['is_featured', '⭐ Featured'], ['is_active', '✓ Active']].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                <input type="checkbox" checked={form[k]} onChange={e => setField(k, e.target.checked)} className="accent-primary-600 w-4 h-4 rounded" /> {l}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
            {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
          </button>
          <button type="button" onClick={() => navigate('/seller/products')} className="btn-secondary px-6">Cancel</button>
        </div>
      </form>
    </div>
  );
}
