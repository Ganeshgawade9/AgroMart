import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPaymentStatus, verifyPayment } from '../../api/orders';
import { formatPrice } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import { CreditCard, ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RazorpayPayment() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Connecting, 2: Simulated Checkout, 3: Processing
  const [verifying, setVerifying] = useState(false);
  const pollingInterval = useRef(null);

  useEffect(() => {
    getPaymentStatus(paymentId)
      .then(res => {
        setPayment(res.data);
        setLoading(false);
        // Progress to Checkout after 1.5 seconds
        setTimeout(() => setStep(2), 1500);
      })
      .catch(() => {
        toast.error('Payment session not found');
        navigate('/');
      });

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [paymentId]);

  // Polling payment status if processing
  useEffect(() => {
    if (step === 3 && payment && payment.status !== 'paid') {
      pollingInterval.current = setInterval(() => {
        getPaymentStatus(paymentId)
          .then(res => {
            if (res.data.status === 'paid') {
              clearInterval(pollingInterval.current);
              toast.success('Razorpay Payment Confirmed! ✅');
              setTimeout(() => {
                navigate(`/farmer/order-success/${res.data.order_id}`);
              }, 2000);
            } else if (res.data.status === 'failed') {
              clearInterval(pollingInterval.current);
              navigate(`/farmer/payment-failed/${paymentId}`);
            }
          })
          .catch(() => {});
      }, 2500);
    }

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [step, payment, paymentId]);

  const handleSimulatePayment = () => {
    setStep(3);
    // Call verify to auto-complete in backend after simulated processing
    verifyPayment(paymentId)
      .then(res => {
        // Verification success
      })
      .catch(() => {
        toast.error('Simulated payment failed');
        navigate(`/farmer/payment-failed/${paymentId}`);
      });
  };

  const handleCancelPayment = () => {
    toast.error('Payment cancelled');
    navigate('/farmer/checkout');
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300">
        
        {/* Step 1: Connecting to Gateway */}
        {step === 1 && (
          <div className="p-8 text-center space-y-6">
            <Spinner className="w-12 h-12 mx-auto text-primary-600 animate-spin" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Connecting to Razorpay...</h2>
              <p className="text-xs text-gray-400 mt-1">Initializing secure sandbox checkout environment</p>
            </div>
          </div>
        )}

        {/* Step 2: Simulated Checkout Modal */}
        {step === 2 && (
          <div>
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg font-bold text-xs">R</div>
                <div>
                  <h2 className="text-sm font-bold">Razorpay checkout</h2>
                  <p className="text-[10px] text-gray-400">AgriMart Demo Marketplace</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Amount</p>
                <p className="text-base font-bold text-blue-400">{formatPrice(payment.amount)}</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <CreditCard className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-blue-900 text-xs">Demo Gateway Activated</h3>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Clicking "Pay Now" simulates a successful Razorpay gateway transaction, generating a sandbox payment ID, order ID, and verification signature.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-100 rounded-xl p-3 flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">Merchant:</span>
                  <span className="font-bold text-gray-800">{payment.metadata?.shop_name || 'AgriMart Seller'}</span>
                </div>
                <div className="border border-gray-100 rounded-xl p-3 flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">Payment ID:</span>
                  <span className="font-mono text-gray-600">{payment.payment_id}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleCancelPayment}
                  className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSimulatePayment}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pay Now</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Processing Payment */}
        {step === 3 && (
          <div className="p-8 text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin absolute" />
              <div className="w-16 h-16 rounded-full border-4 border-dashed border-blue-100"></div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Processing Payment...</h2>
              <p className="text-xs text-gray-400 mt-1">Completing sandbox validation with Razorpay servers</p>
            </div>
            <p className="text-[11px] text-gray-400 font-medium px-4">
              Do not close this window or refresh the page. Your order will be placed automatically once confirmed.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
