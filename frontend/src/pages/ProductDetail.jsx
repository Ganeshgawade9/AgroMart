import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Heart,
  Star,
  MapPin,
  Truck,
  Shield,
  ChevronLeft,
  Plus,
  Minus
} from 'lucide-react';

import {
  getProduct,
  addToCart,
  addToWishlist,
  addReview,
  getCart
} from '../api/products';

import {
  formatPrice,
  formatDate,
  IMG_PLACEHOLDER
} from '../utils/helpers';

import Spinner from '../components/common/Spinner';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { isAuthenticated, user } = useAuthStore();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [mainImg, setMainImg] = useState(0);

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });

  const [submittingReview, setSubmittingReview] = useState(false);
  const [addingCart, setAddingCart] = useState(false);

  useEffect(() => {
    setLoading(true);

    getProduct(id)
      .then((r) => {
        setProduct(r.data);
      })
      .catch(() => {
        setProduct(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">
          Product not found
        </p>
      </div>
    );
  }

  const images = [
    product.image,
    product.image2,
    product.image3
  ].filter(Boolean);

  const isFarmer = user?.role === 'farmer';

  const discount =
    product.mrp > product.price
      ? Math.round(
        ((product.mrp - product.price) / product.mrp) * 100
      )
      : 0;

  /* ================================
     ADD TO CART
  ================================= */
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }

    setAddingCart(true);

    try {
      await addToCart({
        product_id: product.id,
        quantity: qty
      });

      toast.success('Added to cart!');

      getCart()
        .then((r) => {
          useCartStore
            .getState()
            .setCart(
              r.data.items,
              r.data.total,
              r.data.count
            );
        })
        .catch(() => { });
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingCart(false);
    }
  };

  /* ================================
     BUY NOW
  ================================= */
  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate('/farmer/cart');
  };

  /* ================================
     WISHLIST
  ================================= */
  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('Please login first');
      return;
    }

    try {
      await addToWishlist(product.id);
      toast.success('Added to wishlist!');
    } catch {
      toast.error('Already in wishlist');
    }
  };

  /* ================================
     REVIEW
  ================================= */
  const handleReview = async (e) => {
    e.preventDefault();

    setSubmittingReview(true);

    try {
      await addReview(product.id, reviewForm);

      toast.success('Review submitted!');

      const res = await getProduct(id);
      setProduct(res.data);

      setReviewForm({
        rating: 5,
        comment: ''
      });
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* Back button */}
      <Link
        to="/products"
        className="flex items-center gap-1 text-gray-500 hover:text-primary-600 text-sm mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to products
      </Link>

      {/* =========================================
          PRODUCT TOP SECTION
      ========================================== */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">

        {/* ================================
            PRODUCT IMAGES
        ================================= */}
        <div>

          {/* Main image */}
          <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square mb-3 border border-gray-100">

            <img
              src={images[mainImg] || IMG_PLACEHOLDER}
              alt={product.name}
              className="w-full h-full object-contain p-4"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = IMG_PLACEHOLDER;
              }}
            />

          </div>

          {/* Image thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2">

              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMainImg(i)}
                  className={`w-16 h-16 rounded-lg border-2 overflow-hidden ${mainImg === i
                      ? 'border-primary-500'
                      : 'border-gray-200'
                    }`}
                >

                  <img
                    src={img || IMG_PLACEHOLDER}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = IMG_PLACEHOLDER;
                    }}
                  />

                </button>
              ))}

            </div>
          )}

        </div>

        {/* ================================
            PRODUCT INFORMATION
        ================================= */}
        <div>

          {/* Category */}
          {product.category?.name && (
            <span className="badge-green mb-2 inline-block">
              {product.category.name}
            </span>
          )}

          {/* Product name */}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {product.name}
          </h1>

          {/* Brand */}
          {product.brand?.name && (
            <p className="text-gray-500 text-sm mb-3">
              by {product.brand.name}
            </p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">

            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${s <= product.rating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-200'
                  }`}
              />
            ))}

            <span className="text-sm text-gray-500">
              ({product.total_reviews} reviews)
            </span>

          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">

            <span className="text-3xl font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>

            {product.mrp > product.price && (
              <>
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(product.mrp)}
                </span>

                <span className="text-green-600 font-semibold">
                  {discount}% off
                </span>
              </>
            )}

          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 mb-4">

            <span
              className={`font-medium text-sm ${product.is_in_stock
                  ? 'text-green-600'
                  : 'text-red-500'
                }`}
            >
              {product.is_in_stock
                ? `✓ In Stock (${product.stock} ${product.unit} available)`
                : '✗ Out of Stock'}
            </span>

          </div>

          {/* Seller information */}
          {product.seller_shop_name && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4">

              <p className="text-sm text-gray-600">
                Sold by:{' '}
                <span className="font-semibold text-gray-900">
                  {product.seller_shop_name}
                </span>
              </p>

              {product.seller_location?.village && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <MapPin className="w-3 h-3" />

                  {product.seller_location.village},{' '}
                  {product.seller_location.district}
                </div>
              )}

            </div>
          )}

          {/* Delivery & verification */}
          <div className="flex items-center gap-3 mb-2 text-sm text-gray-600">

            <div className="flex items-center gap-1">
              <Truck className="w-4 h-4 text-primary-600" />
              {product.has_free_delivery
                ? 'Free delivery'
                : 'Delivery charges apply'}
            </div>

            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-primary-600" />
              Verified Seller
            </div>

          </div>

          {/* Cart section */}
          {isFarmer && product.is_in_stock && (
            <div className="mt-6 space-y-3">

              {/* Quantity */}
              <div className="flex items-center gap-3">

                <span className="text-sm font-medium text-gray-700">
                  Quantity:
                </span>

                <div className="flex items-center border border-gray-300 rounded-lg">

                  <button
                    type="button"
                    onClick={() =>
                      setQty((q) => Math.max(1, q - 1))
                    }
                    className="p-2 hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <span className="px-4 font-medium">
                    {qty}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setQty((q) =>
                        Math.min(product.stock, q + 1)
                      )
                    }
                    className="p-2 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                </div>

              </div>

              {/* Cart buttons */}
              <div className="flex gap-3">

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={addingCart}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />

                  {addingCart
                    ? 'Adding...'
                    : 'Add to Cart'}
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={addingCart}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  Buy Now
                </button>

              </div>

              {/* Wishlist */}
              <button
                type="button"
                onClick={handleWishlist}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <Heart className="w-4 h-4" />
                Save to Wishlist
              </button>

            </div>
          )}

        </div>
      </div>

      {/* =========================================
          DESCRIPTION & DETAILS
      ========================================== */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">

        {/* Description */}
        <div className="md:col-span-2">

          <div className="card">

            <h2 className="font-bold text-gray-900 mb-3">
              Product Description
            </h2>

            <p className="text-gray-600 text-sm leading-relaxed">
              {product.description}
            </p>

            {product.ingredients && (
              <div className="mt-4">

                <h3 className="font-semibold text-gray-800 mb-1">
                  Ingredients
                </h3>

                <p className="text-gray-600 text-sm">
                  {product.ingredients}
                </p>

              </div>
            )}

            {product.usage_instructions && (
              <div className="mt-4">

                <h3 className="font-semibold text-gray-800 mb-1">
                  Usage Instructions
                </h3>

                <p className="text-gray-600 text-sm">
                  {product.usage_instructions}
                </p>

              </div>
            )}

          </div>

        </div>

        {/* Product details */}
        <div>

          <div className="card">

            <h2 className="font-bold text-gray-900 mb-3">
              Product Details
            </h2>

            <dl className="space-y-2 text-sm">

              {[
                ['Unit', product.unit],
                ['Weight', product.weight],
                ['Brand', product.brand?.name],
                ['Category', product.category?.name],
                [
                  'Organic',
                  product.is_organic ? 'Yes' : 'No'
                ]
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between"
                  >
                    <dt className="text-gray-500">
                      {k}
                    </dt>

                    <dd className="font-medium text-gray-900">
                      {v}
                    </dd>
                  </div>
                ))}

            </dl>

          </div>

        </div>

      </div>

      {/* =========================================
          CUSTOMER REVIEWS
      ========================================== */}
      <div className="card">

        <h2 className="font-bold text-gray-900 text-lg mb-4">
          Customer Reviews ({product.total_reviews})
        </h2>

        {/* Existing reviews */}
        {product.reviews?.length > 0 ? (
          <div className="space-y-4 mb-6">

            {product.reviews.map((r, i) => (
              <div
                key={i}
                className="border-b border-gray-100 pb-4 last:border-0"
              >

                <div className="flex items-center gap-2 mb-1">

                  <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700">
                    {r.user_name?.[0]}
                  </div>

                  <span className="font-medium text-sm text-gray-800">
                    {r.user_name}
                  </span>

                  <div className="flex">

                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${s <= r.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-200'
                          }`}
                      />
                    ))}

                  </div>

                  <span className="text-xs text-gray-400">
                    {formatDate(r.created_at)}
                  </span>

                </div>

                {r.comment && (
                  <p className="text-sm text-gray-600 ml-9">
                    {r.comment}
                  </p>
                )}

              </div>
            ))}

          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-6">
            No reviews yet. Be the first!
          </p>
        )}

        {/* Review form */}
        {isAuthenticated && isFarmer && (
          <form
            onSubmit={handleReview}
            className="border-t border-gray-100 pt-4"
          >

            <h3 className="font-semibold text-gray-800 mb-3">
              Write a Review
            </h3>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-3">

              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setReviewForm((f) => ({
                      ...f,
                      rating: s
                    }))
                  }
                >
                  <Star
                    className={`w-6 h-6 ${s <= reviewForm.rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                      }`}
                  />
                </button>
              ))}

            </div>

            {/* Comment */}
            <textarea
              className="input mb-3 resize-none"
              rows={3}
              placeholder="Share your experience..."
              value={reviewForm.comment}
              onChange={(e) =>
                setReviewForm((f) => ({
                  ...f,
                  comment: e.target.value
                }))
              }
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={submittingReview}
              className="btn-primary"
            >
              {submittingReview
                ? 'Submitting...'
                : 'Submit Review'}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}