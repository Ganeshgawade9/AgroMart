import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  CreditCard,
  Truck,
  Check,
  Percent,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

import { getCart } from '../../api/products';
import { initiatePayment } from '../../api/orders';
import { getProfile } from '../../api/auth';

import {
  formatPrice,
  IMG_PLACEHOLDER
} from '../../utils/helpers';

import Spinner from '../../components/common/Spinner';
import useCartStore from '../../store/cartStore';
import toast from 'react-hot-toast';


/* =========================================
   PAYMENT METHODS
========================================= */

const PAYMENT_METHODS = [
  {
    value: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay cash when products are delivered',
    icon: '💵'
  },
  {
    value: 'upi',
    label: 'UPI QR Payment',
    description: 'Pay dynamically using any UPI app (GPay, PhonePe, Paytm)',
    icon: '📱'
  },
  {
    value: 'razorpay',
    label: 'Razorpay Payment Gateway',
    description: 'Pay via Cards, Net Banking, or Wallets (Demo Mode)',
    icon: '💳'
  }
];


/* =========================================
   DEMO COUPONS
========================================= */

const DEMO_COUPONS = {
  AGRI50: {
    type: 'flat',
    value: 50,
    minAmount: 300,
    description: 'Flat ₹50 off on orders above ₹300'
  },

  GROW10: {
    type: 'percent',
    value: 10,
    minAmount: 500,
    description: '10% off on orders above ₹500'
  }
};


/* =========================================
   CHECKOUT COMPONENT
========================================= */

export default function Checkout() {
  const navigate = useNavigate();

  /* =========================================
     STATE
  ========================================= */

  const [cart, setCart] = useState({
    items: [],
    total: 0
  });

  const [loading, setLoading] = useState(true);

  const [placing, setPlacing] = useState(false);

  const [payment, setPayment] = useState('cod');

  const [addr, setAddr] = useState({
    address: '',
    village: '',
    taluka: '',
    district: '',
    pincode: '',
    phone: ''
  });

  // 1 = Address
  // 2 = Summary
  // 3 = Payment
  const [step, setStep] = useState(1);

  /* =========================================
     COUPON STATE
  ========================================= */

  const [couponCode, setCouponCode] = useState('');

  const [appliedCoupon, setAppliedCoupon] =
    useState(null);

  const [discountAmount, setDiscountAmount] =
    useState(0);


  /* =========================================
     LOAD CART + PROFILE
  ========================================= */

  useEffect(() => {
    let mounted = true;

    const loadCheckoutData = async () => {
      try {
        const [cartRes, profileRes] =
          await Promise.all([
            getCart(),
            getProfile()
          ]);

        if (!mounted) return;

        const cartData = cartRes?.data || {};

        const profileData =
          profileRes?.data || {};

        setCart({
          items: Array.isArray(cartData.items)
            ? cartData.items
            : [],

          total: Number(cartData.total) || 0
        });

        setAddr({
          address:
            profileData.address || '',

          village:
            profileData.village || '',

          taluka:
            profileData.taluka || '',

          district:
            profileData.district || '',

          pincode:
            profileData.pincode || '',

          phone:
            profileData.phone || ''
        });

      } catch (error) {
        if (!mounted) return;

        toast.error(
          error?.response?.data?.error ||
          'Failed to load checkout details'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCheckoutData();

    return () => {
      mounted = false;
    };
  }, []);


  /* =========================================
     CALCULATIONS
  ========================================= */

  const subtotal =
    Number(cart.total) || 0;

  const discountedSubtotal = Math.max(
    0,
    subtotal - Number(discountAmount || 0)
  );

  const gst =
    discountedSubtotal * 0.05;

  const delivery =
    discountedSubtotal > 500
      ? 0
      : 50;

  const finalTotal = Math.max(
    0,
    discountedSubtotal +
    gst +
    delivery
  );


  /* =========================================
     ADDRESS CHANGE
  ========================================= */

  const handleAddressChange = (field, value) => {
    setAddr((previous) => ({
      ...previous,
      [field]: value
    }));
  };


  /* =========================================
     APPLY COUPON
  ========================================= */

  const applyCoupon = () => {
    const code =
      couponCode.trim().toUpperCase();

    if (!code) {
      toast.error(
        'Please enter a coupon code'
      );
      return;
    }

    const coupon =
      DEMO_COUPONS[code];

    if (!coupon) {
      toast.error(
        'Invalid coupon code'
      );
      return;
    }

    if (subtotal < coupon.minAmount) {
      toast.error(
        `Minimum order value of ${formatPrice(
          coupon.minAmount
        )} required`
      );
      return;
    }

    let discount = 0;

    if (coupon.type === 'flat') {
      discount = coupon.value;
    } else {
      discount =
        (subtotal * coupon.value) / 100;
    }

    // Never allow discount to exceed subtotal
    discount = Math.min(
      discount,
      subtotal
    );

    setAppliedCoupon(coupon);

    setDiscountAmount(discount);

    setCouponCode(code);

    toast.success(
      'Coupon applied successfully! 🎉'
    );
  };


  /* =========================================
     REMOVE COUPON
  ========================================= */

  const removeCoupon = () => {
    setAppliedCoupon(null);

    setDiscountAmount(0);

    setCouponCode('');

    toast.success(
      'Coupon removed'
    );
  };


  /* =========================================
     VALIDATE ADDRESS
  ========================================= */

  const validateAddress = () => {
    const address =
      addr.address.trim();

    const phone =
      addr.phone.trim();

    const pincode =
      addr.pincode.trim();

    if (!address) {
      toast.error(
        'Full address is required'
      );
      return false;
    }

    if (!phone) {
      toast.error(
        'Phone number is required'
      );
      return false;
    }

    const phoneRegex =
      /^[6-9]\d{9}$/;

    if (!phoneRegex.test(phone)) {
      toast.error(
        'Please enter a valid 10-digit mobile number'
      );
      return false;
    }

    if (pincode) {
      const pincodeRegex =
        /^\d{6}$/;

      if (!pincodeRegex.test(pincode)) {
        toast.error(
          'Please enter a valid 6-digit pincode'
        );
        return false;
      }
    }

    return true;
  };


  /* =========================================
     NEXT STEP
  ========================================= */

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateAddress()) {
        return;
      }

      setStep(2);

      return;
    }

    if (step === 2) {
      setStep(3);
    }
  };


  /* =========================================
     PREVIOUS STEP
  ========================================= */

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(
        (previous) =>
          previous - 1
      );
    }
  };


  /* =========================================
     PLACE ORDER
  ========================================= */

  const handlePlaceOrder = async () => {
    if (placing) return;

    if (!validateAddress()) {
      setStep(1);
      return;
    }

    if (!cart.items.length) {
      toast.error(
        'Your cart is empty'
      );

      navigate('/farmer/cart');

      return;
    }

    setPlacing(true);

    try {
      /* -------------------------------
         Prepare cart items
      -------------------------------- */

      const items = cart.items
        .filter(
          (item) =>
            item?.product?.id &&
            Number(item.quantity) > 0
        )
        .map((item) => ({
          product_id:
            item.product.id,

          quantity:
            Number(item.quantity)
        }));

      if (!items.length) {
        toast.error(
          'No valid items found in cart'
        );

        return;
      }


      /* -------------------------------
         Prepare payload
      -------------------------------- */

      const payload = {
        items,

        payment_method:
          payment,

        delivery_address:
          addr.address.trim(),

        delivery_village:
          addr.village.trim(),

        delivery_taluka:
          addr.taluka.trim(),

        delivery_district:
          addr.district.trim(),

        delivery_pincode:
          addr.pincode.trim(),

        delivery_phone:
          addr.phone.trim(),

        coupon_code:
          appliedCoupon
            ? couponCode.trim().toUpperCase()
            : '',

        discount:
          Number(discountAmount) || 0
      };


      /* -------------------------------
         Initiate payment/order
      -------------------------------- */

      const response =
        await initiatePayment(
          payload
        );

      const responseData =
        response?.data || {};

      const payments =
        Array.isArray(
          responseData.payments
        )
          ? responseData.payments
          : [];

      const paymentData =
        payments[0];


      if (!paymentData) {
        throw new Error(
          'Invalid payment response from server'
        );
      }


      /* =================================
         CASH ON DELIVERY
      ================================= */

      if (payment === 'cod') {
        toast.success(
          'Order placed successfully! 🎉'
        );

        useCartStore
          .getState()
          .clear();

        if (paymentData.order_id) {
          navigate(
            `/farmer/order-success/${paymentData.order_id}`
          );
        } else {
          navigate('/farmer/orders');
        }

        return;
      }


      /* =================================
         UPI
      ================================= */

      if (payment === 'upi') {
        if (!paymentData.payment_id) {
          throw new Error(
            'UPI payment ID was not returned by server'
          );
        }

        navigate(
          `/farmer/payment/upi/${paymentData.payment_id}`
        );

        return;
      }


      /* =================================
         RAZORPAY
      ================================= */

      if (payment === 'razorpay') {
        if (!paymentData.payment_id) {
          throw new Error(
            'Razorpay payment ID was not returned by server'
          );
        }

        navigate(
          `/farmer/payment/razorpay/${paymentData.payment_id}`
        );

        return;
      }

    } catch (error) {
      console.error(
        'Checkout error:',
        error
      );

      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to initiate checkout'
      );
    } finally {
      setPlacing(false);
    }
  };


  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }


  /* =========================================
     EMPTY CART
  ========================================= */

  if (!cart.items.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">

        <ShoppingBagFallback />

        <h2 className="text-xl font-bold text-gray-800 mt-4">
          Your cart is empty
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Add products to your cart before checkout.
        </p>

        <button
          onClick={() =>
            navigate('/farmer/cart')
          }
          className="btn-primary mt-5 px-6 py-3"
        >
          Go to Cart
        </button>

      </div>
    );
  }


  /* =========================================
     UI
  ========================================= */

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* =====================================
          PROGRESS INDICATOR
      ===================================== */}

      <div className="mb-8">

        <div className="flex items-center justify-between max-w-lg mx-auto">

          {[1, 2, 3].map((s) => (

            <div
              key={s}
              className="flex items-center flex-1 last:flex-initial"
            >

              <div
                className={`
                  flex items-center justify-center
                  w-10 h-10 rounded-full
                  font-semibold border-2
                  transition-all
                  ${step >= s
                    ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                    : 'bg-white border-gray-300 text-gray-500'
                  }
                `}
              >
                {step > s ? (
                  <Check className="w-5 h-5" />
                ) : (
                  s
                )}
              </div>

              <span
                className={`
                  ml-2 text-xs sm:text-sm
                  font-medium
                  ${step >= s
                    ? 'text-gray-900'
                    : 'text-gray-400'
                  }
                `}
              >
                {s === 1
                  ? 'Address'
                  : s === 2
                    ? 'Summary'
                    : 'Payment'}
              </span>

              {s < 3 && (
                <div
                  className={`
                    h-0.5 flex-1 mx-4
                    transition-colors
                    ${step > s
                      ? 'bg-primary-600'
                      : 'bg-gray-200'
                    }
                  `}
                />
              )}

            </div>

          ))}

        </div>

      </div>


      {/* =====================================
          MAIN GRID
      ===================================== */}

      <div className="grid md:grid-cols-5 gap-6">

        {/* ===================================
            MAIN CONTENT
        =================================== */}

        <div className="md:col-span-3 space-y-6">


          {/* =================================
              STEP 1 - DELIVERY ADDRESS
          ================================= */}

          {step === 1 && (

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

              <div className="flex items-center gap-2 mb-6">

                <div className="p-2 bg-primary-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900 text-lg">
                    Delivery Address
                  </h2>

                  <p className="text-xs text-gray-500">
                    Specify where you want the order delivered
                  </p>
                </div>

              </div>


              <div className="space-y-4">

                {/* Full Address */}

                <div>

                  <label className="text-sm font-semibold text-gray-700 block mb-1">
                    Full Address *
                  </label>

                  <textarea
                    rows={3}
                    placeholder="House/Plot No, Street name, Landmark..."
                    value={addr.address}
                    onChange={(e) =>
                      handleAddressChange(
                        'address',
                        e.target.value
                      )
                    }
                    className="
                      w-full border border-gray-200
                      rounded-xl px-4 py-3
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary-500
                      focus:border-transparent
                      transition-all
                      resize-none
                    "
                  />

                </div>


                {/* Village / Taluka / District */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {[
                    ['village', 'Village'],
                    ['taluka', 'Taluka'],
                    ['district', 'District']
                  ].map(([field, label]) => (

                    <div key={field}>

                      <label className="text-xs font-semibold text-gray-600 block mb-1">
                        {label}
                      </label>

                      <input
                        type="text"
                        placeholder={label}
                        value={addr[field]}
                        onChange={(e) =>
                          handleAddressChange(
                            field,
                            e.target.value
                          )
                        }
                        className="
                          w-full border border-gray-200
                          rounded-xl px-3 py-2
                          text-sm
                          focus:outline-none
                          focus:ring-2
                          focus:ring-primary-500
                          transition-all
                        "
                      />

                    </div>

                  ))}

                </div>


                {/* Pincode / Phone */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  <div>

                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      Pincode
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="e.g. 411001"
                      value={addr.pincode}
                      onChange={(e) =>
                        handleAddressChange(
                          'pincode',
                          e.target.value.replace(
                            /\D/g,
                            ''
                          )
                        )
                      }
                      className="
                        w-full border border-gray-200
                        rounded-xl px-3 py-2
                        text-sm
                        focus:outline-none
                        focus:ring-2
                        focus:ring-primary-500
                        transition-all
                      "
                    />

                  </div>


                  <div>

                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      Phone Number *
                    </label>

                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={addr.phone}
                      onChange={(e) =>
                        handleAddressChange(
                          'phone',
                          e.target.value.replace(
                            /\D/g,
                            ''
                          )
                        )
                      }
                      className="
                        w-full border border-gray-200
                        rounded-xl px-3 py-2
                        text-sm
                        focus:outline-none
                        focus:ring-2
                        focus:ring-primary-500
                        transition-all
                      "
                    />

                  </div>

                </div>

              </div>


              {/* Continue */}

              <div className="mt-8 flex justify-end">

                <button
                  onClick={handleNextStep}
                  className="
                    bg-primary-600
                    hover:bg-primary-700
                    text-white
                    font-semibold
                    px-6 py-3
                    rounded-xl
                    flex items-center gap-2
                    transition-all
                    duration-200
                    shadow-md
                    hover:shadow-lg
                  "
                >
                  Continue to Summary

                  <ArrowRight className="w-4 h-4" />
                </button>

              </div>

            </div>
          )}


          {/* =================================
              STEP 2 - SUMMARY
          ================================= */}

          {step === 2 && (

            <div className="space-y-6">


              {/* Review Items */}

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                <div className="flex items-center gap-2 mb-6">

                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Truck className="w-5 h-5 text-primary-600" />
                  </div>

                  <div>

                    <h2 className="font-bold text-gray-900 text-lg">
                      Review Items
                    </h2>

                    <p className="text-xs text-gray-500">
                      Confirm the products in your order
                    </p>

                  </div>

                </div>


                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto pr-2">

                  {cart.items.map((item) => {

                    const product =
                      item?.product || {};

                    const image =
                      product.image ||
                      IMG_PLACEHOLDER;

                    return (

                      <div
                        key={item.id}
                        className="py-4 flex gap-4 items-center"
                      >

                        {/* Product Image */}

                        <img
                          src={image}
                          alt={
                            product.name ||
                            'Product'
                          }
                          className="
                            w-16 h-16
                            object-cover
                            rounded-xl
                            border border-gray-100
                            flex-shrink-0
                          "
                          onError={(e) => {
                            e.currentTarget.onerror =
                              null;

                            e.currentTarget.src =
                              IMG_PLACEHOLDER;
                          }}
                        />


                        {/* Product Details */}

                        <div className="flex-1 min-w-0">

                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {product.name ||
                              'Product'}
                          </h4>

                          <p className="text-xs text-gray-500 mt-0.5">
                            Qty: {item.quantity}{' '}
                            ×{' '}
                            {formatPrice(
                              Number(
                                product.price
                              ) || 0
                            )}
                          </p>

                        </div>


                        {/* Subtotal */}

                        <span className="font-bold text-gray-900 text-sm">
                          {formatPrice(
                            Number(
                              item.subtotal
                            ) || 0
                          )}
                        </span>

                      </div>

                    );

                  })}

                </div>

              </div>


              {/* Coupon */}

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                <div className="flex items-center gap-2 mb-4">

                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Percent className="w-5 h-5 text-amber-600" />
                  </div>

                  <div>

                    <h3 className="font-bold text-gray-900 text-sm">
                      Apply Coupon
                    </h3>

                    <p className="text-xs text-gray-500">
                      Use promo codes for additional savings
                    </p>

                  </div>

                </div>


                {appliedCoupon ? (

                  <div className="
                    bg-green-50
                    border border-green-200
                    rounded-xl p-4
                    flex items-center
                    justify-between
                  ">

                    <div>

                      <p className="text-sm font-bold text-green-800">
                        Coupon APPLIED:{' '}
                        {couponCode.toUpperCase()}
                      </p>

                      <p className="text-xs text-green-600 mt-0.5">
                        {appliedCoupon.description}
                      </p>

                    </div>

                    <button
                      onClick={removeCoupon}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 underline"
                    >
                      Remove
                    </button>

                  </div>

                ) : (

                  <div className="space-y-4">

                    <div className="flex gap-2">

                      <input
                        type="text"
                        placeholder="Enter coupon (e.g. AGRI50, GROW10)"
                        value={couponCode}
                        onChange={(e) =>
                          setCouponCode(
                            e.target.value
                              .toUpperCase()
                          )
                        }
                        className="
                          flex-1
                          border border-gray-200
                          rounded-xl px-4 py-2.5
                          text-sm
                          focus:outline-none
                          focus:ring-2
                          focus:ring-primary-500
                          uppercase
                          font-semibold
                        "
                      />

                      <button
                        onClick={applyCoupon}
                        className="
                          bg-primary-600
                          hover:bg-primary-700
                          text-white
                          text-sm
                          font-bold
                          px-5 py-2.5
                          rounded-xl
                          transition-all
                        "
                      >
                        Apply
                      </button>

                    </div>


                    <div className="flex gap-4 flex-wrap">

                      {Object.keys(
                        DEMO_COUPONS
                      ).map((code) => (

                        <button
                          key={code}
                          onClick={() =>
                            setCouponCode(code)
                          }
                          className="
                            border border-dashed
                            border-primary-400
                            bg-primary-50/50
                            hover:bg-primary-50
                            rounded-lg
                            px-3 py-1.5
                            text-xs
                            text-primary-700
                            font-bold
                          "
                        >
                          {code}
                        </button>

                      ))}

                    </div>

                  </div>

                )}

              </div>


              {/* Navigation */}

              <div className="flex justify-between mt-8 gap-3">

                <button
                  onClick={handlePrevStep}
                  className="
                    border border-gray-200
                    hover:bg-gray-50
                    text-gray-700
                    font-semibold
                    px-5 py-3
                    rounded-xl
                    flex items-center gap-2
                    transition-all
                  "
                >
                  <ArrowLeft className="w-4 h-4" />

                  Back to Address
                </button>


                <button
                  onClick={handleNextStep}
                  className="
                    bg-primary-600
                    hover:bg-primary-700
                    text-white
                    font-semibold
                    px-6 py-3
                    rounded-xl
                    flex items-center gap-2
                    transition-all
                    shadow-md
                    hover:shadow-lg
                  "
                >
                  Proceed to Payment

                  <ArrowRight className="w-4 h-4" />
                </button>

              </div>

            </div>
          )}


          {/* =================================
              STEP 3 - PAYMENT
          ================================= */}

          {step === 3 && (

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

              <div className="flex items-center gap-2 mb-6">

                <div className="p-2 bg-primary-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                </div>

                <div>

                  <h2 className="font-bold text-gray-900 text-lg">
                    Payment Methods
                  </h2>

                  <p className="text-xs text-gray-500">
                    Choose your preferred payment method
                  </p>

                </div>

              </div>


              <div className="space-y-4">

                {PAYMENT_METHODS.map((method) => (

                  <label
                    key={method.value}
                    className={`
                      flex items-start gap-4
                      p-4 rounded-2xl
                      border-2 cursor-pointer
                      transition-all
                      ${payment === method.value
                        ? 'border-primary-600 bg-primary-50/60 shadow-sm'
                        : 'border-gray-100 hover:border-primary-200'
                      }
                    `}
                  >

                    <input
                      type="radio"
                      name="payment"
                      value={method.value}
                      checked={
                        payment ===
                        method.value
                      }
                      onChange={() =>
                        setPayment(
                          method.value
                        )
                      }
                      className="accent-primary-600 mt-1"
                    />

                    <span className="text-3xl flex-shrink-0">
                      {method.icon}
                    </span>

                    <div className="min-w-0 flex-1">

                      <p className="font-bold text-gray-900 text-sm">
                        {method.label}
                      </p>

                      <p className="text-xs text-gray-500 mt-0.5">
                        {method.description}
                      </p>

                    </div>

                  </label>

                ))}

              </div>


              {/* Navigation */}

              <div className="flex justify-between mt-8 gap-3">

                <button
                  onClick={handlePrevStep}
                  disabled={placing}
                  className="
                    border border-gray-200
                    hover:bg-gray-50
                    text-gray-700
                    font-semibold
                    px-5 py-3
                    rounded-xl
                    flex items-center gap-2
                    transition-all
                    disabled:opacity-50
                  "
                >
                  <ArrowLeft className="w-4 h-4" />

                  Back to Summary
                </button>


                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="
                    bg-primary-600
                    hover:bg-primary-700
                    text-white
                    font-bold
                    px-8 py-3
                    rounded-xl
                    flex items-center gap-2
                    transition-all
                    shadow-md
                    hover:shadow-lg
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  {placing
                    ? 'Processing...'
                    : payment === 'cod'
                      ? 'Place Order'
                      : `Pay ${formatPrice(
                        finalTotal
                      )}`}

                  {!placing && (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </button>

              </div>

            </div>
          )}

        </div>


        {/* =====================================
            BILLING SUMMARY
        ===================================== */}

        <div className="md:col-span-2">

          <div className="
            bg-white
            rounded-2xl
            p-6
            shadow-sm
            border border-gray-100
            sticky top-24
          ">

            <h3 className="
              font-bold
              text-gray-900
              text-base
              mb-4
              flex items-center gap-2
            ">
              <Truck className="w-4 h-4 text-primary-600" />

              Billing Details
            </h3>


            {/* Address Snapshot */}

            {step > 1 && addr.address && (

              <div className="
                bg-gray-50
                rounded-xl
                p-3
                mb-4
                text-xs
              ">

                <p className="font-bold text-gray-700 mb-1">
                  Delivering to:
                </p>

                <p className="text-gray-600">
                  {addr.address}
                </p>

                {addr.village && (
                  <p className="text-gray-500 mt-0.5">
                    {addr.village}
                    {addr.taluka
                      ? `, ${addr.taluka}`
                      : ''}
                  </p>
                )}

                {addr.district && (
                  <p className="text-gray-500">
                    {addr.district}
                    {addr.pincode
                      ? ` - ${addr.pincode}`
                      : ''}
                  </p>
                )}

                <p className="text-gray-500 mt-0.5">
                  {addr.phone}
                </p>

              </div>

            )}


            {/* Billing */}

            <div className="space-y-3 text-sm">

              {/* Subtotal */}

              <div className="flex justify-between text-gray-600">

                <span>
                  Items Subtotal
                </span>

                <span>
                  {formatPrice(subtotal)}
                </span>

              </div>


              {/* Discount */}

              {discountAmount > 0 && (

                <div className="flex justify-between text-green-600 font-medium">

                  <span>
                    Discount
                  </span>

                  <span>
                    -{formatPrice(
                      discountAmount
                    )}
                  </span>

                </div>

              )}


              {/* GST */}

              <div className="flex justify-between text-gray-600">

                <span>
                  GST (5%)
                </span>

                <span>
                  {formatPrice(gst)}
                </span>

              </div>


              {/* Delivery */}

              <div className="flex justify-between text-gray-600">

                <span>
                  Delivery Charges
                </span>

                <span
                  className={
                    delivery === 0
                      ? 'text-green-600 font-bold'
                      : ''
                  }
                >
                  {delivery === 0
                    ? 'FREE'
                    : formatPrice(
                      delivery
                    )}
                </span>

              </div>


              {/* Total */}

              <div className="
                border-t
                border-gray-100
                pt-3
                flex
                justify-between
                font-bold
                text-lg
                text-gray-900
                mt-2
              ">

                <span>
                  Total Amount
                </span>

                <span className="text-primary-700">
                  {formatPrice(
                    finalTotal
                  )}
                </span>

              </div>

            </div>


            {/* Secure Checkout */}

            <div className="
              mt-6
              bg-primary-50
              rounded-xl
              p-3
              text-center
              border
              border-primary-100
            ">

              <p className="text-[11px] font-medium text-primary-800">
                🌿 Safe & Secure Checkout with AgriMart
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}


/* =========================================
   EMPTY CART ICON
========================================= */

function ShoppingBagFallback() {
  return (
    <div className="
      w-16 h-16
      mx-auto
      rounded-full
      bg-gray-100
      flex items-center
      justify-center
      text-gray-400
    ">
      <Truck className="w-8 h-8" />
    </div>
  );
}