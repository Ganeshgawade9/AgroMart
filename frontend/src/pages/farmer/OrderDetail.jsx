import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Phone,
  Download,
  Printer,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

import {
  getOrder,
  downloadInvoice,
  initiatePayment
} from '../../api/orders';

import {
  formatPrice,
  formatDate,
  getStatusLabel,
  getStatusColor,
  IMG_PLACEHOLDER
} from '../../utils/helpers';

import OrderStatusTracker from '../../components/orders/OrderStatusTracker';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setLoading(true);

    getOrder(id)
      .then((r) => setOrder(r.data))
      .catch(() => {
        setOrder(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  /* ================================
     DOWNLOAD INVOICE
  ================================= */
  const handleDownload = async () => {
    if (!order) return;

    setDownloading(true);

    try {
      const res = await downloadInvoice(order.id);

      const url = window.URL.createObjectURL(
        new Blob([res.data])
      );

      const link = document.createElement('a');

      link.href = url;
      link.setAttribute(
        'download',
        `Receipt_${order.order_number}.pdf`
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success('Invoice downloaded!');
    } catch {
      toast.error('Failed to download receipt');
    } finally {
      setDownloading(false);
    }
  };

  /* ================================
     PRINT INVOICE
  ================================= */
  const handlePrint = async () => {
    if (!order) return;

    setDownloading(true);

    try {
      const res = await downloadInvoice(order.id);

      const url = window.URL.createObjectURL(
        new Blob([res.data], {
          type: 'application/pdf'
        })
      );

      const printWindow = window.open(url);

      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        toast.error(
          'Pop-up blocked. Enable pop-ups to print invoice.'
        );
      }
    } catch {
      toast.error('Failed to print receipt');
    } finally {
      setDownloading(false);
    }
  };

  /* ================================
     RETRY PAYMENT
  ================================= */
  const handleRetryPayment = async () => {
    if (!order) return;

    setRetrying(true);

    try {
      const items = order.items.map((item) => ({
        product_id: item.product,
        quantity: item.quantity
      }));

      const payload = {
        items,
        payment_method: order.payment_method,
        delivery_address: order.delivery_address,
        delivery_village: order.delivery_village || '',
        delivery_taluka: order.delivery_taluka || '',
        delivery_district: order.delivery_district || '',
        delivery_pincode: order.delivery_pincode || '',
        delivery_phone: order.delivery_phone,
        notes: order.notes || ''
      };

      const res = await initiatePayment(payload);

      const resData = res.data.payments[0];

      if (order.payment_method === 'upi') {
        navigate(
          `/farmer/payment/upi/${resData.payment_id}`
        );
      } else if (order.payment_method === 'razorpay') {
        navigate(
          `/farmer/payment/razorpay/${resData.payment_id}`
        );
      }
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        'Failed to retry payment'
      );
    } finally {
      setRetrying(false);
    }
  };

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
     ORDER NOT FOUND
  ================================= */
  if (!order) {
    return (
      <div className="text-center py-20 text-gray-400">
        Order not found
      </div>
    );
  }

  const isFailedPayment =
    order.payment_status !== 'paid' &&
    order.payment_method !== 'cod';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Back to Orders */}
      <Link
        to="/farmer/orders"
        className="flex items-center gap-1 text-gray-500 hover:text-primary-600 text-xs mb-2 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to orders
      </Link>

      {/* ================================
          MAIN ORDER CARD
      ================================= */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">

        <div className="flex items-center justify-between">

          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Order #{order.order_number}
            </h1>

            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(order.created_at)}
            </p>
          </div>

          <span className={getStatusColor(order.status)}>
            {getStatusLabel(order.status)}
          </span>

        </div>

        {/* Failed Payment Alert */}
        {isFailedPayment && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">

            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />

            <div className="space-y-2">

              <div>
                <h4 className="text-xs font-bold text-red-900">
                  Payment Required
                </h4>

                <p className="text-[11px] text-red-700 leading-relaxed">
                  Your payment status is pending or failed.
                  Complete payment to confirm your order
                  and begin processing.
                </p>
              </div>

              <button
                onClick={handleRetryPayment}
                disabled={retrying}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''
                    }`}
                />

                <span>
                  {retrying
                    ? 'Initializing...'
                    : 'Retry Payment Now'}
                </span>
              </button>

            </div>
          </div>
        )}

      </div>

      {/* ================================
          ORDER STATUS TRACKER
      ================================= */}
      {order.status !== 'cancelled' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

          <h2 className="font-semibold text-gray-900 mb-6 text-sm">
            Order Progress
          </h2>

          <OrderStatusTracker
            status={order.status}
          />

        </div>
      )}

      {/* ================================
          ORDER ITEMS
      ================================= */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

        <h2 className="font-semibold text-gray-900 mb-4 text-sm">
          Items Ordered
        </h2>

        <div className="space-y-4 divide-y divide-gray-50">

          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 pt-4 first:pt-0"
            >

              {/* Product Image */}
              <img
                src={
                  item.product_image ||
                  IMG_PLACEHOLDER
                }
                alt={item.product_name}
                className="w-12 h-12 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = IMG_PLACEHOLDER;
                }}
              />

              <div className="flex-1 min-w-0">

                <p className="font-semibold text-gray-900 text-sm truncate">
                  {item.product_name}
                </p>

                <p className="text-[11px] text-gray-400 mt-0.5">
                  Qty: {item.quantity} ×{' '}
                  {formatPrice(item.product_price)}
                </p>

              </div>

              <span className="font-bold text-gray-950 text-sm">
                {formatPrice(item.subtotal)}
              </span>

            </div>
          ))}

        </div>

        {/* Order Summary */}
        <div className="border-t border-gray-100 mt-6 pt-4 space-y-2 text-xs">

          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>
              {formatPrice(order.subtotal)}
            </span>
          </div>

          <div className="flex justify-between text-gray-500">
            <span>GST</span>
            <span>
              {formatPrice(order.gst_amount)}
            </span>
          </div>

          <div className="flex justify-between text-gray-500">
            <span>Delivery Charge</span>
            <span>
              {formatPrice(order.delivery_charge)}
            </span>
          </div>

          <div className="flex justify-between font-extrabold text-sm border-t border-gray-100 pt-3 text-gray-900">

            <span>Total amount</span>

            <span className="text-primary-700">
              {formatPrice(order.total)}
            </span>

          </div>

        </div>

      </div>

      {/* ================================
          SELLER & DELIVERY DETAILS
      ================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Seller Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">

          <div className="space-y-3">

            <h2 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">
              Seller Details
            </h2>

            <div className="flex items-center gap-3">

              {/* Seller Logo */}
              {order.seller_shop_logo ? (
                <img
                  src={order.seller_shop_logo}
                  alt={
                    order.seller_shop_name ||
                    'Seller'
                  }
                  className="w-10 h-10 rounded-full object-cover border border-gray-100"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display =
                      'none';
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs">
                  {order.seller_shop_name?.charAt(0) ||
                    'S'}
                </div>
              )}

              <div>

                <p className="text-sm font-bold text-gray-800">
                  {order.seller_shop_name ||
                    order.seller_name}
                </p>

                <p className="text-[11px] text-gray-400 mt-0.5">
                  {order.seller_name}
                </p>

              </div>

            </div>

          </div>

          {/* Payment Details */}
          <div className="mt-6 border-t border-gray-50 pt-4 space-y-1.5 text-xs text-gray-500">

            <div className="flex justify-between">
              <span>Payment Type:</span>

              <span className="text-gray-700 font-bold uppercase">
                {order.payment_method}
              </span>
            </div>

            <div className="flex justify-between">

              <span>Payment Status:</span>

              <span
                className={`font-bold ${order.payment_status === 'paid'
                  ? 'text-green-600'
                  : 'text-yellow-600'
                  }`}
              >
                {order.payment_status?.toUpperCase()}
              </span>

            </div>

            {order.payment_details && (
              <>
                <div className="flex justify-between">

                  <span>Transaction ID:</span>

                  <span className="text-gray-700 font-mono">
                    {order.payment_details.transaction_id ||
                      'N/A'}
                  </span>

                </div>

                <div className="flex justify-between">

                  <span>Reference/UTR:</span>

                  <span className="text-gray-700 font-mono">
                    {order.payment_details.reference_number ||
                      'N/A'}
                  </span>

                </div>

                {order.payment_details.paid_at && (
                  <div className="flex justify-between">

                    <span>Payment Time:</span>

                    <span className="text-gray-700">
                      {new Date(
                        order.payment_details.paid_at
                      ).toLocaleString('en-IN')}
                    </span>

                  </div>
                )}

              </>
            )}

          </div>

        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">

          <h2 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">
            Delivery Address
          </h2>

          <div className="text-xs text-gray-600 space-y-1">

            <p className="font-semibold text-gray-800">
              {order.farmer_name}
            </p>

            <p className="leading-relaxed">
              {order.delivery_address}
            </p>

            {order.delivery_village && (
              <p>
                {order.delivery_village},{' '}
                {order.delivery_taluka}
              </p>
            )}

            <p>
              {order.delivery_district} -{' '}
              {order.delivery_pincode}
            </p>

            <div className="flex items-center gap-1.5 mt-3 text-gray-500 font-medium">

              <Phone className="w-3.5 h-3.5 text-gray-400" />

              <span>
                {order.delivery_phone}
              </span>

            </div>

          </div>

          {/* Delivery OTP */}
          <div className="bg-primary-50 rounded-xl p-3 border border-primary-100/50">

            <p className="text-[10px] text-primary-700 leading-relaxed font-semibold">

              Delivery OTP:

              <span className="text-primary-900 text-sm ml-1 font-mono tracking-wider">
                {order.delivery_otp}
              </span>

            </p>

          </div>

        </div>

      </div>

      {/* ================================
          INVOICE ACTIONS
      ================================= */}
      {order.payment_status === 'paid' && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2">

          {/* Download Invoice */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow-md transition-all disabled:opacity-50"
          >

            <Download className="w-4 h-4" />

            <span>
              {downloading
                ? 'Downloading...'
                : 'Download Invoice (PDF)'}
            </span>

          </button>

          {/* Print Invoice */}
          <button
            onClick={handlePrint}
            disabled={downloading}
            className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow-md transition-all disabled:opacity-50"
          >

            <Printer className="w-4 h-4 text-gray-500" />

            <span>
              Print Invoice
            </span>

          </button>

        </div>
      )}

    </div>
  );
}