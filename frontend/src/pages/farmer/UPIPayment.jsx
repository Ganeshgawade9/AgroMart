import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { getPaymentStatus, verifyPayment } from '../../api/orders';
import { formatPrice } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import { Smartphone, Info, ShieldCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UPIPayment() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [verifying, setVerifying] = useState(false);
  const canvasRef = useRef(null);
  const pollingInterval = useRef(null);

  // Load payment details on mount
  useEffect(() => {
    getPaymentStatus(paymentId)
      .then(res => {
        setPayment(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Payment session not found');
        navigate('/');
      });

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [paymentId]);

  // Generate QR Code once UPI URI and canvas are ready
  useEffect(() => {
    if (!loading && payment && payment.status !== 'paid' && payment.status !== 'failed') {
      const upiId = payment.upi_data?.upi_id || 'agrimart@demo';
      const merchant = payment.upi_data?.merchant_name || 'AgriMart';
      const amount = payment.amount;
      const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchant)}&am=${amount}&cu=INR`;

      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, upiUri, {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#111827',
            light: '#ffffff'
          }
        }, (err) => {
          if (err) console.error('Error generating QR code', err);
        });
      }
    }
  }, [loading, payment]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      toast.error('Payment session expired');
      navigate('/farmer/checkout');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Polling payment status
  useEffect(() => {
    if (!loading && payment && payment.status !== 'paid' && payment.status !== 'failed') {
      pollingInterval.current = setInterval(() => {
        getPaymentStatus(paymentId)
          .then(res => {
            const currentStatus = res.data.status;
            if (currentStatus !== payment.status) {
              setPayment(res.data);
            }
            if (currentStatus === 'paid') {
              clearInterval(pollingInterval.current);
              toast.success('Payment Received! Redirecting...');
              setTimeout(() => {
                navigate(`/farmer/order-success/${res.data.order_id}`);
              }, 2000);
            } else if (currentStatus === 'failed') {
              clearInterval(pollingInterval.current);
              navigate(`/farmer/payment-failed/${paymentId}`);
            }
          })
          .catch(() => {});
      }, 3000);
    }

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [loading, payment, paymentId]);

  // Handle Demo mode bypass / Instant verify
  const handleInstantVerify = () => {
    setVerifying(true);
    verifyPayment(paymentId)
      .then(res => {
        toast.success('Payment Verified!');
        navigate(`/farmer/order-success/${res.data.order_id}`);
      })
      .catch(() => {
        toast.error('Verification failed');
      })
      .finally(() => {
        setVerifying(false);
      });
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-primary-600 px-6 py-6 text-center text-white">
          <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-90 animate-bounce" />
          <h2 className="text-xl font-bold">Scan & Pay with UPI</h2>
          <p className="text-xs opacity-75 mt-1">Multi-Vendor Secure Payment Request</p>
        </div>

        <div className="p-6 space-y-6 text-center">
          
          {/* Shop branding */}
          <div className="flex items-center justify-center gap-3 border-b border-gray-50 pb-4">
            {payment.upi_data?.shop_logo ? (
              <img 
                src={payment.upi_data.shop_logo} 
                alt={payment.upi_data.shop_name} 
                className="w-10 h-10 rounded-full object-cover border border-gray-100" 
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                {payment.upi_data?.shop_name?.charAt(0) || 'S'}
              </div>
            )}
            <div className="text-left">
              <h3 className="font-bold text-gray-900 text-sm">{payment.upi_data?.shop_name || 'Seller'}</h3>
              <p className="text-[11px] text-gray-500">UPI ID: {payment.upi_data?.upi_id}</p>
            </div>
          </div>

          {/* Amount and Timer */}
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Amount to Pay</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{formatPrice(payment.amount)}</p>
            
            <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full mt-3">
              <Clock className="w-3.5 h-3.5" />
              <span>Session Expires in {formattedTime}</span>
            </div>
          </div>

          {/* QR Code Canvas */}
          <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-4 border border-gray-100 relative">
            <canvas ref={canvasRef} className="rounded-lg shadow-sm border border-gray-200" />
            <p className="text-[10px] text-gray-400 mt-2 font-medium">Scan QR using GPay, PhonePe, BHIM, or Paytm</p>
          </div>

          {/* Payment Status Animation */}
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
              </span>
              <p className="text-sm font-bold text-gray-700">Waiting for payment confirmation...</p>
            </div>
            <p className="text-xs text-gray-400 px-6">
              Please do not refresh or press back button. Simulating verification after 10-15 seconds.
            </p>
          </div>

          {/* Action buttons (Demo Mode Bypass) */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <button 
              onClick={handleInstantVerify}
              disabled={verifying}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifying ? <Spinner /> : <ShieldCheck className="w-5 h-5" />}
              <span>Verify Payment Instantly (Demo)</span>
            </button>
            <div className="flex gap-2 items-center justify-center text-xs text-gray-400">
              <Info className="w-3.5 h-3.5" />
              <span>AgriMart Payment Verification Sandbox</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
