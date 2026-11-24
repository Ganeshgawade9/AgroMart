import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPaymentStatus, verifyPayment } from '../../api/orders';
import RazorpayModal from '../../components/payment/RazorpayModal';
import useCartStore from '../../store/cartStore';
import toast from 'react-hot-toast';

export default function RazorpayPayment() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getPaymentStatus(paymentId)
      .then((res) => {
        if (!isMounted) return;
        setPayment(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        toast.error(err?.response?.data?.error || 'Payment session not found');
        navigate('/farmer/checkout');
      });

    return () => {
      isMounted = false;
    };
  }, [paymentId, navigate]);

  const handlePaymentSuccess = async (payload) => {
    try {
      const res = await verifyPayment(paymentId, payload);
      useCartStore.getState().clear();
      toast.success('Razorpay Payment Confirmed! 🎉');
      
      const orderId = res?.data?.order_id || payment?.order_id;
      if (orderId) {
        setTimeout(() => {
          navigate(`/farmer/order-success/${orderId}`);
        }, 3200);
      } else {
        setTimeout(() => {
          navigate('/farmer/orders');
        }, 3200);
      }
      return res.data;
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Payment verification failed');
      throw error;
    }
  };

  const handlePaymentFailure = () => {
    toast.error('Payment was not completed');
  };

  const handleClose = () => {
    toast('Payment cancelled', { icon: 'ℹ️' });
    navigate('/farmer/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
          <span className="absolute font-bold text-blue-400 text-lg">R</span>
        </div>
        <div className="text-center">
          <h2 className="text-base font-bold text-slate-100">Connecting to Razorpay...</h2>
          <p className="text-xs text-slate-400 mt-1">Initializing secure sandbox checkout environment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 relative flex items-center justify-center p-4">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0c2340]/60 to-slate-950 pointer-events-none" />

      {/* Razorpay Modal with All Animations */}
      <RazorpayModal
        payment={payment}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        onClose={handleClose}
      />
    </div>
  );
}
