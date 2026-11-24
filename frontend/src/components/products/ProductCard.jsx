import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, MapPin, Truck } from 'lucide-react';
import { formatPrice, IMG_PLACEHOLDER } from '../../utils/helpers';
import { addToCart, toggleWishlist, getCart } from '../../api/products';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import { addRecentlyViewed } from '../../utils/recentlyViewed';
import { useT } from '../../i18n';
import toast from 'react-hot-toast';

const LOW_STOCK = 5;

export default function ProductCard({ product, onCartUpdate, onWishlistUpdate }) {
  const { t, tOr, unit } = useT();
  const { isAuthenticated, user } = useAuthStore();
  const isFarmer = user?.role === 'farmer';

  const discount =
    product.mrp && product.price < product.mrp
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : product.discount_percent;

  const inWishlistStore = useWishlistStore((state) => state.isInWishlist(product.id));
  const [isWishlisted, setIsWishlisted] = useState(inWishlistStore || Boolean(product.is_wishlisted));

  useEffect(() => {
    setIsWishlisted(inWishlistStore || Boolean(product.is_wishlisted));
  }, [inWishlistStore, product.is_wishlisted]);

  const handleAddToCart = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error(t('card.login_first'));
      return;
    }

    if (!isFarmer) return;

    try {
      await addToCart({
        product_id: product.id,
        quantity: 1
      });

      toast.success(t('card.added_cart'));

      getCart()
        .then((r) =>
          useCartStore
            .getState()
            .setCart(r.data.items, r.data.total, r.data.count)
        )
        .catch(() => { });

      onCartUpdate?.();
    } catch {
      toast.error(t('card.add_cart_failed'));
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error(t('card.login_first') || 'Please login first');
      return;
    }

    try {
      const res = await toggleWishlist(product.id);
      const nextState = Boolean(res.data.in_wishlist);
      setIsWishlisted(nextState);
      useWishlistStore.getState().toggleItem(product.id, nextState);
      if (nextState) {
        toast.success(t('card.added_wishlist') || 'Added to wishlist!');
      } else {
        toast.success('Removed from wishlist');
      }
      onWishlistUpdate?.(product.id, nextState);
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  return (
    <Link
      to={`/products/${product.id}`}
      onClick={() => addRecentlyViewed(product)}
      className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      {/* Image area - 480x600 (4:5 aspect ratio) matching e-commerce catalog */}
      <div className="relative overflow-hidden bg-white aspect-[4/5] flex items-center justify-center p-3 border-b border-gray-100">
        <img
          src={product.image || IMG_PLACEHOLDER}
          alt={product.name}
          className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-sm ${product.is_in_stock ? '' : 'grayscale opacity-75'}`}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = IMG_PLACEHOLDER;
          }}
        />

        {/* Badge: SOLD OUT replaces the offer badge in the exact same top-left position */}
        {!product.is_in_stock ? (
          <span className="absolute top-2.5 left-2.5 bg-gray-900/90 text-white text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-md shadow-md z-10">
            {t('card.sold_out')}
          </span>
        ) : discount > 0 ? (
          <span className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm z-10">
            {t('card.off', { n: discount })}
          </span>
        ) : null}

        {/* Limited stock warning */}
        {product.is_in_stock && product.stock > 0 && product.stock <= LOW_STOCK && (
          <span className="absolute bottom-2 left-2 bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full z-10">
            {t('card.only_left', { n: product.stock })}
          </span>
        )}

        {/* Wishlist button */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full shadow-sm border transition-all z-10 ${
            isWishlisted
              ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-500 scale-105'
              : 'bg-white/90 hover:bg-white border-gray-200/80 text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart className={`w-4 h-4 transition-transform ${isWishlisted ? 'fill-red-500 text-red-500 scale-110' : ''}`} />
        </button>


      </div>

      {/* Product information */}
      <div className="p-3 flex flex-col flex-1">
        {/* Rating pill badge like Image 3 */}
        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-700 text-white rounded text-[11px] font-semibold w-fit mb-1.5">
          <span>{Number(product.rating || 0).toFixed(1)}</span>
          <Star className="w-2.5 h-2.5 fill-white" />
          <span className="opacity-80 font-normal border-l border-white/30 pl-1 ml-0.5">
            {product.total_reviews || 0}
          </span>
        </div>

        {product.category_name && (
          <span className="text-[11px] text-primary-600 font-medium mb-0.5">
            {tOr(`cat.${String(product.category_name).toLowerCase()}`, product.category_name)}
          </span>
        )}

        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">
          {product.name}
        </h3>

        {product.brand_name && (
          <p className="text-xs text-gray-500 mb-1.5">
            {product.brand_name}
          </p>
        )}

        {/* Seller shop */}
        {product.seller_shop_name && (
          <div className="flex items-center gap-1.5 mb-1 text-xs text-gray-500">
            {product.seller_shop_logo && (
              <img
                src={product.seller_shop_logo}
                alt={product.seller_shop_name}
                className="w-3.5 h-3.5 rounded-full object-cover border border-gray-200"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <span className="truncate">{product.seller_shop_name}</span>
          </div>
        )}

        {/* Distance */}
        {product.distance_km != null && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <MapPin className="w-3 h-3 text-primary-600" />
            {t('card.km_away', { n: product.distance_km })}
          </div>
        )}

        {/* Price & Unit */}
        <div className="mt-auto pt-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>

            {product.is_in_stock && product.mrp && product.mrp > product.price && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.mrp)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            {product.has_free_delivery && (
              <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium">
                <Truck className="w-3 h-3" />
                {t('card.free')}
              </span>
            )}

            {product.unit && (
              <span className="text-xs text-gray-500">
                / {product.weight || unit(product.unit)}
              </span>
            )}
          </div>

          {/* Add to Cart / Sold Out button */}
          {!product.is_in_stock ? (
            <button
              type="button"
              disabled
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="w-full flex items-center justify-center gap-1.5 bg-gray-200 text-gray-500 py-1.5 rounded-lg text-sm font-semibold cursor-not-allowed"
            >
              {t('card.sold_out')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full flex items-center justify-center gap-1.5 border border-primary-600 text-primary-700 bg-white hover:bg-primary-50 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {t('card.add_to_cart')}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}