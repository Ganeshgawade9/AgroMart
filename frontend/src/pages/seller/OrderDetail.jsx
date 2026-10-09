import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Phone,
  MapPin,
  Download,
  Printer
} from 'lucide-react';

import {
  getOrder,
  updateOrderStatus,
  resendPickupOtp,
  downloadInvoice
} from '../../api/orders';

import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusLabel,
  IMG_PLACEHOLDER
} from '../../utils/helpers';

import OrderStatusTracker from '../../components/orders/OrderStatusTracker';
import DeliveryTracking from '../../components/orders/DeliveryTracking';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

const NEXT_STATUS = {
  pending: 'accepted',
  accepted: 'packed',
  packed: 'out_for_delivery'
};

export default function SellerOrderDetail() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [prepMinutes, setPrepMinutes] = useState(20);

  /* ================================
     FETCH ORDER
  ================================= */
  const fetchOrder = () => {
    setLoading(true);

    getOrder(id)
      .then((r) => {
        setOrder(r.data);
      })
      .catch(() => {
        setOrder(null);
        toast.error('Failed to load order');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  /* ================================
     UPDATE ORDER STATUS
  ================================= */
  const handleUpdate = async (newStatus) => {
    if (!order) return;

    setUpdating(true);

    try {
      await updateOrderStatus(
        order.id,
        newStatus,
        undefined,
        newStatus === 'accepted' ? { prep_minutes: prepMinutes } : {}
      );

      toast.success(
        `Order marked as ${getStatusLabel(newStatus)}`
      );

      fetchOrder();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        'Failed to update order status'
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleResendPickupOtp = async () => {
    try {
      const res = await resendPickupOtp(order.id);
      toast.success(res.data.message);
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send OTP');
    }
  };

  /* ================================
     DOWNLOAD INVOICE
  ================================= */
  const handleDownload = async () => {
    if (!order) return;

    setDownloading(true);

    try {
      const res = await downloadInvoice(order.id);

      const blob = new Blob([res.data], {
        type: 'application/pdf'
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');

      link.href = url;

      link.setAttribute(
        'download',
        `Receipt_${order.order_number}.pdf`
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      // Clean up temporary URL
      window.URL.revokeObjectURL(url);

      toast.success('Receipt downloaded');
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

      const blob = new Blob([res.data], {
        type: 'application/pdf'
      });

      const url = window.URL.createObjectURL(blob);

      const printWindow = window.open(
        url,
        '_blank'
      );

      if (!printWindow) {
        toast.error(
          'Pop-up blocked. Please allow pop-ups to print the receipt.'
        );

        window.URL.revokeObjectURL(url);
        return;
      }

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };

      // Cleanup after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch {
      toast.error('Failed to print receipt');
    } finally {
      setDownloading(false);
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* ================================
          BACK TO ORDERS
      ================================= */}
      <Link
        to="/seller/orders"
        className="flex items-center gap-1 text-gray-500 hover:text-primary-600 text-sm mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to orders
      </Link>

      {/* ================================
          ORDER HEADER
      ================================= */}
      <div className="flex items-center justify-between mb-4">

        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Order #{order.order_number}
          </h1>

          <p className="text-sm text-gray-500">
            {formatDate(order.created_at)}
          </p>
        </div>

        <span className={getStatusColor(order.status)}>
          {getStatusLabel(order.status)}
        </span>

      </div>

      {/* ================================
          ORDER STATUS TRACKER
      ================================= */}
      {order.status !== 'cancelled' && (
        <div className="card mb-4">
          <OrderStatusTracker
            status={order.status}
          />
        </div>
      )}

      {/* ================================
          CUSTOMER INFORMATION
      ================================= */}
      <div className="card mb-4">

        <h2 className="font-semibold text-gray-900 mb-3">
          Customer
        </h2>

        <p className="font-medium text-gray-800">
          {order.farmer_name}
        </p>

        {/* Phone */}
        {order.delivery_phone && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
            <Phone className="w-3 h-3" />

            <span>
              {order.delivery_phone}
            </span>
          </div>
        )}

        {/* Address */}
        <div className="flex items-start gap-1 text-sm text-gray-500 mt-1">

          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />

          <span>
            {order.delivery_address}

            {order.delivery_village &&
              `, ${order.delivery_village}`}

            {order.delivery_taluka &&
              `, ${order.delivery_taluka}`}

            {order.delivery_district &&
              `, ${order.delivery_district}`}

            {order.delivery_pincode &&
              ` - ${order.delivery_pincode}`}
          </span>

        </div>

      </div>

      {/* ================================
          ORDER ITEMS
      ================================= */}
      <div className="card mb-4">

        <h2 className="font-semibold text-gray-900 mb-3">
          Items
        </h2>

        <div className="space-y-3">

          {order.items?.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3"
            >

              {/* Product Image */}
              <img
                src={
                  item.product_image ||
                  IMG_PLACEHOLDER
                }
                alt={item.product_name || 'Product'}
                className="w-12 h-12 object-cover rounded-lg border border-gray-100 flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    IMG_PLACEHOLDER;
                }}
              />

              {/* Product Information */}
              <div className="flex-1 min-w-0">

                <p className="font-medium text-sm text-gray-900 truncate">
                  {item.product_name}
                </p>

                <p className="text-xs text-gray-500">
                  Qty: {item.quantity} ×{' '}
                  {formatPrice(item.product_price)}
                </p>

              </div>

              {/* Subtotal */}
              <span className="font-semibold text-sm flex-shrink-0">
                {formatPrice(item.subtotal)}
              </span>

            </div>
          ))}

        </div>

        {/* ================================
            ORDER TOTAL
        ================================= */}
        <div className="border-t border-gray-100 mt-4 pt-3 space-y-2 text-sm">

          <div className="flex justify-between">
            <span className="text-gray-600">
              Subtotal
            </span>

            <span>
              {formatPrice(order.subtotal)}
            </span>
          </div>

          {/* GST */}
          {order.gst_amount !== undefined &&
            order.gst_amount !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  GST
                </span>

                <span>
                  {formatPrice(order.gst_amount)}
                </span>
              </div>
            )}

          {/* Delivery Charge */}
          {order.delivery_charge !== undefined &&
            order.delivery_charge !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Delivery Charge
                </span>

                <span>
                  {formatPrice(
                    order.delivery_charge
                  )}
                </span>
              </div>
            )}

          {/* Total */}
          <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-3">

            <span>
              Total
            </span>

            <span className="text-primary-700">
              {formatPrice(order.total)}
            </span>

          </div>

        </div>

      </div>

      {/* ================================
          DELIVERY DISPATCH
      ================================= */}
      <div className="mb-4">
        <DeliveryTracking
          orderId={order.id}
          orderStatus={order.status}
          viewer="seller"
          onChange={fetchOrder}
        />
      </div>

      {/* Preparation time (used to plan rider pickup) */}
      {order.status === 'pending' && (
        <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 mb-3 text-sm">
          <label htmlFor="prep" className="text-gray-700 font-medium">
            Time to prepare this order
          </label>
          <select
            id="prep"
            value={prepMinutes}
            onChange={(e) => setPrepMinutes(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {[10, 15, 20, 30, 45, 60, 120].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </div>
      )}

      {/* ================================
          PICKUP OTP (shop -> delivery partner)
      ================================= */}
      {order.status === 'packed' && order.pickup_otp && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
          <p className="text-sm font-semibold text-amber-900">Pickup OTP</p>
          <p className="text-2xl font-mono font-bold tracking-widest text-amber-900 my-1">{order.pickup_otp}</p>
          <p className="text-xs text-amber-800">
            Also sent to your mobile. Give it to the delivery partner only when they collect the order.
          </p>
          <button onClick={handleResendPickupOtp} className="text-xs font-semibold text-amber-900 underline mt-2">
            Send a new OTP
          </button>
        </div>
      )}

      {/* ================================
          ORDER STATUS ACTIONS
      ================================= */}
      {NEXT_STATUS[order.status] &&
        !(order.status === 'packed' && order.delivery_partner) && (
        <button
          onClick={() =>
            handleUpdate(
              NEXT_STATUS[order.status]
            )
          }
          disabled={updating}
          className="btn-primary w-full py-3 disabled:opacity-50"
        >
          {updating
            ? 'Updating...'
            : `Mark as ${getStatusLabel(
              NEXT_STATUS[order.status]
            )}`}
        </button>
      )}

      {/* Reject / Cancel */}
      {order.status === 'pending' && (
        <button
          onClick={() =>
            handleUpdate('cancelled')
          }
          disabled={updating}
          className="btn-danger w-full py-2 mt-2 disabled:opacity-50"
        >
          {updating
            ? 'Updating...'
            : 'Reject / Cancel Order'}
        </button>
      )}

      {/* ================================
          DOCUMENT ACTIONS
      ================================= */}
      <div className="mt-4 flex flex-col sm:flex-row gap-3">

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="w-5 h-5" />

          {downloading
            ? 'Processing...'
            : 'Download Receipt (PDF)'}
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          disabled={downloading}
          className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Printer className="w-5 h-5" />

          Print Receipt
        </button>

      </div>

    </div>
  );
}