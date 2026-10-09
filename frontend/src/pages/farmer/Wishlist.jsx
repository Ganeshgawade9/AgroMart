import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { getWishlist, removeFromWishlist } from '../../api/products';
import ProductCard from '../../components/products/ProductCard';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = () => {
    getWishlist().then(r => setItems(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchWishlist(); }, []);

  const handleRemove = async (id) => {
    try { await removeFromWishlist(id); fetchWishlist(); toast.success('Removed from wishlist'); } catch {}
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Heart className="w-6 h-6 text-red-500" /> My Wishlist</h1>
      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Heart className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No items in wishlist</p>
          <Link to="/products" className="btn-primary inline-block mt-4">Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="relative">
              <ProductCard product={item.product} onCartUpdate={() => {}} />
              <button onClick={() => handleRemove(item.id)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
