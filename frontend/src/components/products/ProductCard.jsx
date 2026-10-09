import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, MapPin, Truck } from 'lucide-react';
import { formatPrice, IMG_PLACEHOLDER } from '../../utils/helpers';
import { addToCart, addToWishlist, getCart } from '../../api/products';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';
import toast from 'react-hot-toast';

export default function ProductCard({ product, onCartUpdate }) {
  const { isAuthenticated, user } = useAuthStore();
  const isFarmer = user?.role === 'farmer';

  const discount =
    product.mrp && product.price < product.mrp
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : product.discount_percent;

  // All available images
  const images = [
    product.image,
    product.image2,
    product.image3
  ].filter(Boolean);

  const [activeImg, setActiveImg] = useState(0);

  const handleAddToCart = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please login first');
      return;
    }

    if (!isFarmer) return;

    try {
      await addToCart({
        product_id: product.id,
        quantity: 1
      });

      toast.success('Added to cart!');

      getCart()
        .then((r) =>
          useCartStore
            .getState()
            .setCart(r.data.items, r.data.total, r.data.count)
        )
        .catch(() => { });

      onCartUpdate?.();
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please login first');
      return;
    }

    try {
      await addToWishlist(product.id);
      toast.success('Added to wishlist!');
    } catch {
      toast.error('Already in wishlist or error occurred');
    }
  };

  return (
    <Link
      to={`/products/${product.id}`}
      className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      {/* Image area */}
      <div className="relative overflow-hidden bg-gray-50 h-48">
        <img
          src={images[activeImg] || IMG_PLACEHOLDER}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = IMG_PLACEHOLDER;
          }}
        />

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {discount}% OFF
          </span>
        )}

        {/* Out of stock overlay */}
        {!product.is_in_stock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-sm font-semibold px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}

        {/* Wishlist button */}
        {isAuthenticated && isFarmer && (
          <button
            onClick={handleWishlist}
            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Heart className="w-4 h-4" />
          </button>
        )}

        {/* Multi-image dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveImg(i);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${activeImg === i
                  ? 'bg-white w-3'
                  : 'bg-white/60'
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product information */}
      <div className="p-3 flex flex-col flex-1">
        {product.category_name && (
          <span className="text-xs text-primary-600 font-medium mb-1">
            {product.category_name}
          </span>
        )}

        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">
          {product.name}
        </h3>

        {product.brand_name && (
          <p className="text-xs text-gray-500 mb-2">
            {product.brand_name}
          </p>
        )}

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />

          <span className="text-xs text-gray-600">
            {Number(product.rating).toFixed(1)} ({product.total_reviews})
          </span>
        </div>

        {/* Seller shop */}
        {product.seller_shop_name && (
          <div className="flex items-center gap-2 mb-1">
            {product.seller_shop_logo && (
              <img
                src={product.seller_shop_logo}
                alt={product.seller_shop_name}
                className="w-4 h-4 rounded-full object-cover border border-gray-200"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}

            <p className="text-xs text-gray-500 truncate">
              {product.seller_shop_name}
            </p>
          </div>
        )}

        {/* Distance */}
        {product.distance_km && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <MapPin className="w-3 h-3" />
            {product.distance_km} km away
          </div>
        )}

        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>

            {product.mrp && product.mrp > product.price && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.mrp)}
              </span>
            )}
          </div>

          {/* Delivery and unit */}
          <div className="flex items-center gap-2">
            {product.has_free_delivery && (
              <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium">
                <Truck className="w-3 h-3" />
                Free
              </span>
            )}

            {product.unit && (
              <span className="text-xs text-gray-500">
                / {product.weight || product.unit}
              </span>
            )}
          </div>

          {/* Add to Cart */}
          {isAuthenticated &&
            isFarmer &&
            product.is_in_stock && (
              <button
                onClick={handleAddToCart}
                className="mt-2 w-full flex items-center justify-center gap-1.5 bg-primary-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
            )}
        </div>
      </div>
    </Link>
  );
}