import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrder, downloadInvoice } from '../../api/orders';
import { formatPrice, formatDate } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import { CheckCircle2, ShoppingBag, Download, ArrowRight, MapPin, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    getOrder(orderId)
      .then(res => {
        setOrder(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Order details could not be loaded');
        setLoading(false);
      });
  }, [orderId]);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      const res = await downloadInvoice(order.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${order.order_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice downloaded successfully!');
    } catch {
      toast.error('Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!order) return <div className="text-center py-20 text-red-500">Order not found.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center space-y-8">
        
        {/* Animated Checkmark Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle2 className="w-12 h-12 text-green-600 animate-scale" />
            </div>
            {/* Soft decorative elements */}
            <div className="absolute top-0 right-0 w-3 h-3 bg-primary-400 rounded-full animate-bounce"></div>
            <div className="absolute bottom-1 left-0 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Order Confirmed!</h1>
          <p className="text-sm text-gray-500 mt-1">Thank you for shopping. Your order has been successfully placed.</p>
        </div>

        {/* Order Info Card */}
        <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-4 border border-gray-100">
          <div className="flex justify-between items-center pb-3 border-b border-gray-200/60 text-xs text-gray-500 font-semibold">
            <span>ORDER ID: #{order.order_number}</span>
            <span>{formatDate(order.created_at)}</span>
          </div>

          <div className="space-y-3">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 font-medium">{item.product_name} × {item.quantity}</span>
                <span className="text-gray-900 font-bold">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200/60 pt-3 flex justify-between items-center text-sm font-bold text-gray-900">
            <span>Total Paid</span>
            <span className="text-primary-700 text-base">{formatPrice(order.total)}</span>
          </div>

          {/* Payment metadata */}
          {order.payment_details && (
            <div className="border-t border-gray-200/60 pt-3 text-xs space-y-1.5 text-gray-500 font-medium">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="text-gray-700 uppercase">{order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="text-gray-700 font-mono">{order.payment_details.transaction_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Reference/UTR:</span>
                <span className="text-gray-700 font-mono">{order.payment_details.reference_number || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Delivery Details */}
        <div className="bg-primary-50/50 rounded-2xl p-5 border border-primary-100/50 text-left flex gap-3.5">
          <div className="p-2 bg-primary-100 rounded-xl flex-shrink-0 h-fit text-primary-700">
            <Truck className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <p className="font-bold text-primary-900">Delivery Information</p>
            <p className="text-primary-700 leading-relaxed">{order.delivery_address}</p>
            <p className="text-primary-500 font-semibold mt-1">OTP will be required on delivery: {order.delivery_otp}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button 
            onClick={handleDownloadInvoice}
            disabled={downloading}
            className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold py-3.5 px-5 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>{downloading ? 'Downloading...' : 'Download Invoice'}</span>
          </button>
          
          <Link 
            to="/farmer/orders"
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 px-5 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Track Orders</span>
          </Link>
        </div>

        <Link 
          to="/products"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

      </div>
    </div>
  );
}
