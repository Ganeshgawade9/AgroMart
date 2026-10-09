import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPaymentStatus, initiatePayment } from '../../api/orders';
import { formatPrice } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import { XCircle, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentFailed() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    getPaymentStatus(paymentId)
      .then(res => {
        setPayment(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Payment session details not found');
        navigate('/');
      });
  }, [paymentId]);

  const handleRetryPayment = async () => {
    if (!payment) return;
    setRetrying(true);
    try {
      // Re-initiate payment using stored checkout data
      const items = payment.checkout_data?.items?.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity
      })) || [];

      const payload = {
        items,
        payment_method: payment.payment_method,
        delivery_address: payment.checkout_data?.delivery_address || '',
        delivery_village: payment.checkout_data?.delivery_village || '',
        delivery_taluka: payment.checkout_data?.delivery_taluka || '',
        delivery_district: payment.checkout_data?.delivery_district || '',
        delivery_pincode: payment.checkout_data?.delivery_pincode || '',
        delivery_phone: payment.checkout_data?.delivery_phone || '',
        notes: payment.checkout_data?.notes || '',
      };

      const res = await initiatePayment(payload);
      const resData = res.data.payments[0];

      toast.success('Retry payment initialized');
      if (payment.payment_method === 'upi') {
        navigate(`/farmer/payment/upi/${resData.payment_id}`);
      } else if (payment.payment_method === 'razorpay') {
        navigate(`/farmer/payment/razorpay/${resData.payment_id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to retry payment');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!payment) return <div className="text-center py-20 text-red-500">Payment record not found.</div>;

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center space-y-8">
        
        {/* Animated Error Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
            <XCircle className="w-11 h-11 text-red-500" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payment Failed</h1>
          <p className="text-xs text-gray-500 mt-1">We couldn't process your payment. Don't worry, your money is safe.</p>
        </div>

        {/* Error Details */}
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 text-left flex gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-red-900">Failure Reason</p>
            <p className="text-red-700 leading-relaxed">
              {payment.error_message || 'Verification timed out. The merchant was unable to verify the UPI payment or authorization was declined.'}
            </p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-gray-50 rounded-2xl p-5 text-left text-xs space-y-2 border border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Session ID:</span>
            <span className="font-mono text-gray-700 font-semibold">{payment.payment_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Payment Method:</span>
            <span className="text-gray-700 font-bold uppercase">{payment.payment_method}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200/50 pt-2 font-bold mt-2 text-sm text-gray-900">
            <span>Total Amount:</span>
            <span className="text-red-600 font-extrabold">{formatPrice(payment.amount)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={handleRetryPayment}
            disabled={retrying}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Initializing...' : 'Retry Payment'}</span>
          </button>
          
          <Link 
            to="/farmer/checkout"
            className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
            <span>Choose Different Method</span>
          </Link>
        </div>

        <p className="text-[10px] text-gray-400">
          If your bank account was debited, it will be automatically refunded within 3-5 business days.
        </p>

      </div>
    </div>
  );
}
