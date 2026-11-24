import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { getWishlist } from '../../api/products';
import ProductCard from '../../components/products/ProductCard';
import Spinner from '../../components/common/Spinner';
import useWishlistStore from '../../store/wishlistStore';

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = () => {
    getWishlist()
      .then((r) => {
        const list = r.data.results || r.data || [];
        setItems(list);
        useWishlistStore.getState().setWishlist(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleWishlistUpdate = (productId, inWishlist) => {
    if (!inWishlist) {
      setItems((prev) =>
        prev.filter((item) => (item.product?.id || item.product_id) !== productId)
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          My Wishlist
        </h1>
        {items.length > 0 && (
          <span className="text-sm text-gray-500 font-medium">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Heart className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No items in wishlist</p>
          <Link to="/products" className="btn-primary inline-block mt-4">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              product={{ ...item.product, is_wishlisted: true }}
              onWishlistUpdate={handleWishlistUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
