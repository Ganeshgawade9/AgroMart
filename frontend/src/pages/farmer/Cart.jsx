import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';

import {
  getCart,
  removeFromCart,
  updateCartItem,
  clearCart
} from '../../api/products';

import {
  formatPrice,
  IMG_PLACEHOLDER
} from '../../utils/helpers';

import Spinner from '../../components/common/Spinner';
import useCartStore from '../../store/cartStore';
import toast from 'react-hot-toast';

export default function Cart() {
  const navigate = useNavigate();

  const {
    items,
    total,
    count,
    setCart: setGlobalCart,
    clear: clearGlobalCart
  } = useCartStore();

  const cart = {
    items: items || [],
    total: Number(total) || 0,
    count: Number(count) || 0
  };

  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState(null);
  const [clearing, setClearing] = useState(false);

  /* ================================
     FETCH CART
  ================================= */
  const fetchCart = async () => {
    try {
      const response = await getCart();

      const data = response?.data || {};

      setGlobalCart(
        data.items || [],
        Number(data.total) || 0,
        Number(data.count) || 0
      );
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
        'Failed to load cart'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  /* ================================
     CHANGE QUANTITY
  ================================= */
  const handleQtyChange = async (item, delta) => {
    if (!item) return;

    const newQty = Number(item.quantity) + delta;

    if (newQty < 1) {
      await handleRemove(item.id);
      return;
    }

    setUpdatingItem(item.id);

    try {
      await updateCartItem(item.id, {
        quantity: newQty
      });

      await fetchCart();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
        'Failed to update quantity'
      );
    } finally {
      setUpdatingItem(null);
    }
  };

  /* ================================
     REMOVE ITEM
  ================================= */
  const handleRemove = async (id) => {
    if (!id) return;

    setUpdatingItem(id);

    try {
      await removeFromCart(id);

      await fetchCart();

      toast.success('Removed from cart');
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
        'Failed to remove item'
      );
    } finally {
      setUpdatingItem(null);
    }
  };

  /* ================================
     CLEAR CART
  ================================= */
  const handleClear = async () => {
    if (cart.items.length === 0) return;

    const confirmed = window.confirm(
      'Are you sure you want to clear your cart?'
    );

    if (!confirmed) return;

    setClearing(true);

    try {
      await clearCart();

      clearGlobalCart();

      toast.success('Cart cleared');
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
        'Failed to clear cart'
      );
    } finally {
      setClearing(false);
    }
  };

  /* ================================
     ORDER CALCULATIONS
  ================================= */
  const gst = cart.total * 0.05;

  const delivery =
    cart.total > 500 ? 0 : 50;

  const grandTotal =
    cart.total + gst + delivery;

  /* ================================
     LOADING
  ================================= */
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  /* ================================
     PAGE
  ================================= */
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* ================================
          HEADER
      ================================= */}
      <div className="flex items-center justify-between mb-6">

        <h1 className="text-2xl font-bold text-gray-900">
          My Cart ({cart.count})
        </h1>

        {cart.items.length > 0 && (
          <button
            onClick={handleClear}
            disabled={clearing}
            className="text-red-500 text-sm hover:underline disabled:opacity-50"
          >
            {clearing ? 'Clearing...' : 'Clear all'}
          </button>
        )}

      </div>

      {/* ================================
          EMPTY CART
      ================================= */}
      {cart.items.length === 0 ? (

        <div className="text-center py-20">

          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />

          <p className="text-xl font-semibold text-gray-600 mb-2">
            Your cart is empty
          </p>

          <p className="text-sm text-gray-400">
            Add some products to your cart to continue shopping.
          </p>

          <Link
            to="/products"
            className="btn-primary inline-block mt-4"
          >
            Browse Products
          </Link>

        </div>

      ) : (

        <div className="grid md:grid-cols-3 gap-6">

          {/* ================================
              CART ITEMS
          ================================= */}
          <div className="md:col-span-2 space-y-3">

            {cart.items.map((item) => {

              const product = item?.product || {};

              const productId = product.id;

              const productName =
                product.name || 'Product';

              const productImage =
                product.image || IMG_PLACEHOLDER;

              const productPrice =
                Number(product.price) || 0;

              const quantity =
                Number(item.quantity) || 1;

              const subtotal =
                Number(item.subtotal) ||
                productPrice * quantity;

              const isUpdating =
                updatingItem === item.id;

              return (
                <div
                  key={item.id}
                  className="card flex gap-4 items-start"
                >

                  {/* ================================
                      PRODUCT IMAGE
                  ================================= */}
                  <Link
                    to={`/products/${productId}`}
                    className="flex-shrink-0"
                  >
                    <img
                      src={productImage}
                      alt={productName}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-100"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          IMG_PLACEHOLDER;
                      }}
                    />
                  </Link>

                  {/* ================================
                      PRODUCT DETAILS
                  ================================= */}
                  <div className="flex-1 min-w-0">

                    <Link
                      to={`/products/${productId}`}
                      className="font-semibold text-gray-900 hover:text-primary-600 line-clamp-2 text-sm"
                    >
                      {productName}
                    </Link>

                    {product.seller_shop_name && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {product.seller_shop_name}
                      </p>
                    )}

                    <p className="text-primary-700 font-bold mt-1">
                      {formatPrice(productPrice)}
                    </p>

                    {/* ================================
                        QUANTITY CONTROLS
                    ================================= */}
                    <div className="flex items-center gap-3 mt-2">

                      <div
                        className={`flex items-center border border-gray-200 rounded-lg ${isUpdating
                          ? 'opacity-50'
                          : ''
                          }`}
                      >

                        {/* Minus */}
                        <button
                          type="button"
                          onClick={() =>
                            handleQtyChange(item, -1)
                          }
                          disabled={isUpdating}
                          className="p-1.5 hover:bg-gray-50 disabled:cursor-not-allowed"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        {/* Quantity */}
                        <span className="px-3 text-sm font-medium min-w-[35px] text-center">
                          {quantity}
                        </span>

                        {/* Plus */}
                        <button
                          type="button"
                          onClick={() =>
                            handleQtyChange(item, 1)
                          }
                          disabled={isUpdating}
                          className="p-1.5 hover:bg-gray-50 disabled:cursor-not-allowed"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() =>
                          handleRemove(item.id)
                        }
                        disabled={isUpdating}
                        className="text-red-400 hover:text-red-600 p-1 disabled:opacity-50"
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>

                  </div>

                  {/* ================================
                      ITEM SUBTOTAL
                  ================================= */}
                  <div className="text-right flex-shrink-0">

                    <p className="font-bold text-gray-900">
                      {formatPrice(subtotal)}
                    </p>

                  </div>

                </div>
              );
            })}

          </div>

          {/* ================================
              ORDER SUMMARY
          ================================= */}
          <div>

            <div className="card sticky top-20">

              <h2 className="font-bold text-gray-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-2 text-sm mb-4">

                {/* Subtotal */}
                <div className="flex justify-between">

                  <span className="text-gray-600">
                    Subtotal
                  </span>

                  <span className="font-medium">
                    {formatPrice(cart.total)}
                  </span>

                </div>

                {/* GST */}
                <div className="flex justify-between">

                  <span className="text-gray-600">
                    GST (5%)
                  </span>

                  <span className="font-medium">
                    {formatPrice(gst)}
                  </span>

                </div>

                {/* Delivery */}
                <div className="flex justify-between">

                  <span className="text-gray-600">
                    Delivery
                  </span>

                  <span
                    className={
                      delivery === 0
                        ? 'text-green-600 font-medium'
                        : 'font-medium'
                    }
                  >
                    {delivery === 0
                      ? 'FREE'
                      : formatPrice(delivery)}
                  </span>

                </div>

                {/* Free Delivery Message */}
                {delivery > 0 && (
                  <p className="text-xs text-gray-400">
                    Free delivery on orders above ₹500
                  </p>
                )}

              </div>

              {/* ================================
                  GRAND TOTAL
              ================================= */}
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg mb-4">

                <span>
                  Total
                </span>

                <span className="text-primary-700">
                  {formatPrice(grandTotal)}
                </span>

              </div>

              {/* ================================
                  CHECKOUT
              ================================= */}
              <button
                type="button"
                onClick={() =>
                  navigate('/farmer/checkout')
                }
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                Proceed to Checkout

                <ArrowRight className="w-4 h-4" />
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}