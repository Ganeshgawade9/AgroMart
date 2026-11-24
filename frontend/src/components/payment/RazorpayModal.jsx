import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { formatPrice } from '../../utils/helpers';

/* Play subtle, pleasant payment success chime using Web Audio API */
function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    
    // First tone (E5 - 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second tone (G#5 - 830.61Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);

    // Third high tone (B5 - 987.77Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(987.77, now + 0.24);
    gain3.gain.setValueAtTime(0, now + 0.24);
    gain3.gain.linearRampToValueAtTime(0.25, now + 0.3);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 0.9);
  } catch {
    // Audio autoplay blocked or unsupported
  }
}

export default function RazorpayModal({
  payment,
  onSuccess,
  onFailure,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('upi'); // upi | card | netbanking | wallet
  const [showSummary, setShowSummary] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Flow stages: 'input' -> 'processing' -> 'otp' -> 'success' | 'failed'
  const [stage, setStage] = useState('input');
  const [processingStep, setProcessingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Form states: UPI
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [customUpiId, setCustomUpiId] = useState('');

  // Form states: Card
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('FARMER TEST USER');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [saveCard, setSaveCard] = useState(true);

  // Form states: Net Banking
  const [selectedBank, setSelectedBank] = useState('sbi');

  // Form states: OTP
  const [otp, setOtp] = useState(['1', '2', '3', '4', '5', '6']);
  const otpInputsRef = useRef([]);

  // Auto redirect timer after success
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const amount = payment?.amount || 0;
  const shopName = payment?.shop_name || payment?.metadata?.shop_name || 'AgroConnect Seller';
  const orderId = payment?.gateway_order_id || `order_${payment?.payment_id?.slice(0, 10) || 'demo'}`;

  // Card Brand Detection
  const getCardBrand = (num) => {
    const clean = num.replace(/\s+/g, '');
    if (/^4/.test(clean)) return 'visa';
    if (/^5[1-5]/.test(clean)) return 'mastercard';
    if (/^(60|65)/.test(clean)) return 'rupay';
    if (/^3[47]/.test(clean)) return 'amex';
    return 'generic';
  };
  const cardBrand = getCardBrand(cardNumber);

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Autofill Card Helpers
  const fillSuccessCard = () => {
    setCardNumber('4111 2222 3333 4444');
    setCardHolder('FARMER TEST USER');
    setCardExpiry('12/28');
    setCardCvv('789');
  };

  const fillDeclineCard = () => {
    setCardNumber('4000 0000 0000 0002');
    setCardHolder('DECLINE TEST USER');
    setCardExpiry('08/27');
    setCardCvv('000');
  };

  // Trigger Payment Simulation
  const handleInitiatePayment = (isFailureTest = false) => {
    setStage('processing');
    setProcessingStep(1);

    const isDecline = isFailureTest || cardNumber.replace(/\s+/g, '') === '4000000000000002';

    // Step 1: Network handshake (1.2s)
    setTimeout(() => {
      setProcessingStep(2);

      // Step 2: Routing with bank (1.2s)
      setTimeout(() => {
        setProcessingStep(3);

        // If card payment or user selected netbanking, show 3D Secure OTP step!
        setTimeout(() => {
          if (activeTab === 'card' || activeTab === 'netbanking') {
            setStage('otp');
          } else {
            // Direct completion for UPI / Wallets
            finalizeTransaction(isDecline);
          }
        }, 1100);
      }, 1200);
    }, 1200);
  };

  // Handle OTP Submission
  const handleOtpSubmit = (e) => {
    e?.preventDefault();
    const enteredOtp = otp.join('');
    setStage('processing');
    setProcessingStep(3);

    const isDecline = enteredOtp === '000000' || cardNumber.replace(/\s+/g, '') === '4000000000000002';

    setTimeout(() => {
      finalizeTransaction(isDecline);
    }, 1400);
  };

  // Finalize Transaction through Backend Verify API
  const finalizeTransaction = async (isDecline = false) => {
    if (isDecline) {
      setStage('failed');
      setErrorMessage('Bank declined transaction: Insufficient funds or invalid security token (Sandbox Demo).');
      if (onFailure) {
        onFailure({ reason: 'Bank declined transaction (Sandbox Demo)' });
      }
      return;
    }

    try {
      const generatedPayId = `pay_${Math.random().toString(36).substring(2, 9).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
      const payload = {
        razorpay_payment_id: generatedPayId,
        razorpay_order_id: orderId,
        razorpay_signature: `sig_${Math.random().toString(36).substring(2, 14)}`,
        payment_method: activeTab
      };

      const res = await onSuccess(payload);
      playSuccessChime();
      setSuccessData({
        paymentId: generatedPayId,
        orderId: res?.order_id || res?.data?.order_id || payment?.order_id,
        orderNumber: res?.order_number || res?.data?.order_number || 'AGR-' + Math.floor(100000 + Math.random() * 900000),
        amount
      });
      setStage('success');
    } catch (err) {
      setStage('failed');
      setErrorMessage(err?.response?.data?.error || err?.message || 'Payment confirmation failed');
    }
  };

  // Auto redirect countdown on success
  useEffect(() => {
    let timer;
    if (stage === 'success' && redirectCountdown > 0) {
      timer = setInterval(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [stage, redirectCountdown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Razorpay Main Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* ============================================================== */}
        {/* 1. ICONIC RAZORPAY HEADER */}
        {/* ============================================================== */}
        <div className="bg-[#0c2340] text-white p-4 sm:p-5 relative select-none">
          {/* Subtle Decorative Background Mesh */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-transparent to-blue-600/10 pointer-events-none" />

          {/* Test Mode Banner */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2.5 text-[11px]">
            <div className="flex items-center gap-1.5 font-medium text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Razorpay Sandbox Demo Mode</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>256-bit SSL End-to-End Encrypted</span>
            </div>
          </div>

          <div className="flex items-start justify-between relative z-10">
            {/* Left: Brand & Business Name */}
            <div className="flex items-center gap-3">
              {/* Razorpay iconic blue badge */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-xl shadow-md border border-blue-400/30 flex-shrink-0">
                <span className="tracking-tighter">R</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                    {shopName}
                  </h2>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-emerald-400/30 flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Verified
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <span>Secured by</span>
                  <span className="font-semibold text-blue-400">Razorpay</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-[11px] text-slate-300">Order: {orderId}</span>
                </p>
              </div>
            </div>

            {/* Right: Amount & Close Button */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Payable</span>
                <span className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight">
                  {formatPrice(amount)}
                </span>
              </div>

              {stage !== 'processing' && stage !== 'success' && (
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(true)}
                  aria-label="Cancel payment"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Order Summary Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <button
              type="button"
              onClick={() => setShowSummary(!showSummary)}
              className="flex items-center gap-1 text-blue-300 hover:text-blue-200 font-medium transition-colors"
            >
              <span>{showSummary ? 'Hide Order Details' : 'View Order Details'}</span>
              {showSummary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[11px] text-slate-400">
              Demo Transaction • Instant Confirmation
            </span>
          </div>

          {/* Order Details Dropdown */}
          {showSummary && (
            <div className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-2 animate-fadeIn">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{formatPrice(payment?.subtotal || amount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (5%)</span>
                <span>{formatPrice(payment?.gst || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Charge</span>
                <span>{payment?.delivery_charge ? formatPrice(payment.delivery_charge) : 'FREE'}</span>
              </div>
              <div className="border-t border-slate-700 pt-1.5 flex justify-between font-bold text-white">
                <span>Total Amount</span>
                <span className="text-emerald-400">{formatPrice(amount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 2. BODY CONTENT - BASED ON STAGE */}
        {/* ============================================================== */}
        
        {/* STAGE A: PAYMENT METHOD SELECTION & INPUT */}
        {stage === 'input' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[380px]">
            {/* Left Column: Navigation Tabs */}
            <div className="w-full md:w-56 bg-slate-50 border-r border-slate-200/80 p-2 sm:p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
              <p className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                Payment Options
              </p>

              {/* UPI Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-left transition-all ${
                  activeTab === 'upi'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <Smartphone className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">UPI Apps</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  activeTab === 'upi' ? 'bg-blue-500 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  Fast
                </span>
              </button>

              {/* Cards Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-left transition-all ${
                  activeTab === 'card'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <CreditCard className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">Cards</span>
                <span className="text-[10px] text-slate-400">Credit/Debit</span>
              </button>

              {/* Netbanking Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('netbanking')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-left transition-all ${
                  activeTab === 'netbanking'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">Netbanking</span>
                <span className="text-[10px] text-slate-400">All Banks</span>
              </button>

              {/* Wallets & Pay Later Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-left transition-all ${
                  activeTab === 'wallet'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <Wallet className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">Wallets</span>
              </button>
            </div>

            {/* Right Column: Tab Panels */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-white flex flex-col justify-between">
              {/* TAB 1: UPI */}
              {activeTab === 'upi' && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Select your preferred UPI App</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Click to simulate instant one-click approval</p>
                  </div>

                  {/* UPI App Selection Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Google Pay */}
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('gpay')}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                        selectedUpiApp === 'gpay'
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-sm shadow-xs">
                        <span className="text-blue-500">G</span>
                        <span className="text-red-500">P</span>
                        <span className="text-yellow-500">a</span>
                        <span className="text-green-500">y</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Google Pay</p>
                        <p className="text-[10px] text-slate-400">UPI Auto-Approve</p>
                      </div>
                    </button>

                    {/* PhonePe */}
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('phonepe')}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                        selectedUpiApp === 'phonepe'
                          ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        पे
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">PhonePe</p>
                        <p className="text-[10px] text-slate-400">UPI Instant</p>
                      </div>
                    </button>

                    {/* Paytm */}
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('paytm')}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                        selectedUpiApp === 'paytm'
                          ? 'border-sky-500 bg-sky-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center font-black text-[10px] shadow-xs">
                        Paytm
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Paytm UPI</p>
                        <p className="text-[10px] text-slate-400">Fast Checkout</p>
                      </div>
                    </button>

                    {/* BHIM / CRED */}
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('cred')}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                        selectedUpiApp === 'cred'
                          ? 'border-slate-900 bg-slate-100 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        C
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">CRED UPI</p>
                        <p className="text-[10px] text-slate-400">Cashback Eligible</p>
                      </div>
                    </button>
                  </div>

                  {/* Or Enter Custom UPI ID */}
                  <div className="border-t border-slate-100 pt-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Or pay using other UPI ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customUpiId}
                        onChange={(e) => setCustomUpiId(e.target.value)}
                        placeholder="farmer@okhdfcbank or 9876543210@paytm"
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
                      />
                      {customUpiId && (
                        <span className="absolute right-3 top-2.5 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Valid
                        </span>
                      )}
                    </div>
                    {/* Auto-suggest handle pills */}
                    <div className="flex gap-1.5 mt-1.5">
                      {['@okhdfcbank', '@okaxis', '@ybl', '@paytm'].map((handle) => (
                        <button
                          key={handle}
                          type="button"
                          onClick={() => setCustomUpiId((prev) => (prev.split('@')[0] || 'farmer') + handle)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono transition-colors"
                        >
                          {handle}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pay button */}
                  <button
                    type="button"
                    onClick={() => handleInitiatePayment(false)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Pay {formatPrice(amount)} via UPI</span>
                  </button>
                </div>
              )}

              {/* TAB 2: CREDIT / DEBIT CARDS */}
              {activeTab === 'card' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Interactive 3D Card Mockup */}
                  <div className="relative w-full h-40 sm:h-44 rounded-2xl p-4 sm:p-5 text-white shadow-xl overflow-hidden bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-900 border border-slate-700 flex flex-col justify-between">
                    {/* Holographic Shimmer Effect */}
                    <div className="absolute inset-0 animate-rzp-shimmer pointer-events-none" />

                    <div className="flex justify-between items-center relative z-10">
                      <div className="flex items-center gap-2">
                        {/* EMV Chip */}
                        <div className="w-8 h-6 rounded bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200 border border-yellow-500/80 shadow-xs flex items-center justify-center">
                          <div className="w-5 h-3 border border-amber-600/40 rounded-xs" />
                        </div>
                        {/* Contactless symbol */}
                        <span className="text-slate-300 text-xs font-mono tracking-tighter rotate-90 inline-block">)))</span>
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        {cardBrand === 'visa' && 'VISA'}
                        {cardBrand === 'mastercard' && 'MASTERCARD'}
                        {cardBrand === 'rupay' && 'RuPay'}
                        {cardBrand === 'amex' && 'AMEX'}
                        {cardBrand === 'generic' && 'DEBIT / CREDIT'}
                      </span>
                    </div>

                    {/* Card Number */}
                    <div className="relative z-10 font-mono text-base sm:text-lg tracking-widest text-slate-100 font-bold drop-shadow">
                      {cardNumber || '•••• •••• •••• ••••'}
                    </div>

                    <div className="flex justify-between items-end relative z-10">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Card Holder</span>
                        <span className="text-xs font-bold tracking-wide uppercase text-slate-200">
                          {cardHolder || 'NAME ON CARD'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Expires</span>
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {cardExpiry || 'MM/YY'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Demo Helper Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={fillSuccessCard}
                      className="flex-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-1.5 px-2.5 rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Auto-fill Test Card (Success)</span>
                    </button>
                    <button
                      type="button"
                      onClick={fillDeclineCard}
                      className="text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-1.5 px-2.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>Test Decline</span>
                    </button>
                  </div>

                  {/* Card Form Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4532 8920 1204 8821"
                        maxLength={19}
                        className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">CVV / CVC</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        placeholder="Ramesh Shinde"
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span>Securely save card for faster checkout (RBI compliant)</span>
                    </label>
                  </div>

                  {/* Pay button */}
                  <button
                    type="button"
                    onClick={() => handleInitiatePayment(false)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm mt-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Pay {formatPrice(amount)} via Card</span>
                  </button>
                </div>
              )}

              {/* TAB 3: NETBANKING */}
              {activeTab === 'netbanking' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Popular Indian Banks</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Select your bank to redirect to simulated netbanking</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'sbi', name: 'State Bank of India', short: 'SBI', color: 'bg-blue-600' },
                      { id: 'hdfc', name: 'HDFC Bank', short: 'HDFC', color: 'bg-red-700' },
                      { id: 'icici', name: 'ICICI Bank', short: 'ICICI', color: 'bg-amber-700' },
                      { id: 'axis', name: 'Axis Bank', short: 'AXIS', color: 'bg-rose-900' },
                      { id: 'kotak', name: 'Kotak Bank', short: 'KOTAK', color: 'bg-red-600' },
                      { id: 'pnb', name: 'Punjab National Bank', short: 'PNB', color: 'bg-yellow-600' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBank(b.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                          selectedBank === b.id
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${b.color} text-white flex items-center justify-center font-bold text-xs shadow-xs mb-1.5`}>
                          {b.short}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 line-clamp-1">{b.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* All other banks dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Or choose all other banks</label>
                    <select
                      className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 bg-white"
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                    >
                      <option value="sbi">State Bank of India</option>
                      <option value="hdfc">HDFC Bank</option>
                      <option value="icici">ICICI Bank</option>
                      <option value="axis">Axis Bank</option>
                      <option value="bob">Bank of Baroda</option>
                      <option value="canara">Canara Bank</option>
                      <option value="union">Union Bank of India</option>
                      <option value="idbi">IDBI Bank</option>
                      <option value="indusind">IndusInd Bank</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInitiatePayment(false)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm mt-3"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Pay {formatPrice(amount)} via Netbanking</span>
                  </button>
                </div>
              )}

              {/* TAB 4: WALLETS */}
              {activeTab === 'wallet' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Supported Digital Wallets</h3>
                    <p className="text-xs text-slate-500 mt-0.5">1-click debit from your verified wallet balance</p>
                  </div>

                  <div className="space-y-2">
                    {[
                      { id: 'paytm_w', name: 'Paytm Wallet', balance: '₹4,250.00' },
                      { id: 'phonepe_w', name: 'PhonePe Wallet', balance: '₹1,800.00' },
                      { id: 'mobikwik', name: 'MobiKwik', balance: '₹850.00' },
                      { id: 'amazon', name: 'Amazon Pay Balance', balance: '₹3,400.00' },
                    ].map((w, idx) => (
                      <label
                        key={w.id}
                        className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="wallet"
                            defaultChecked={idx === 0}
                            className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span className="text-xs font-bold text-slate-800">{w.name}</span>
                        </div>
                        <span className="text-xs font-mono text-emerald-600 font-semibold">{w.balance}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInitiatePayment(false)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm mt-4"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Pay {formatPrice(amount)} from Wallet</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE B: PROCESSING ANIMATION (RAZORPAY RADAR) */}
        {/* ============================================================== */}
        {stage === 'processing' && (
          <div className="p-8 sm:p-12 text-center space-y-6 min-h-[380px] flex flex-col items-center justify-center animate-fadeIn">
            {/* Animated Concentric Radar Pulse */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-rzp-radar" />
              <div className="absolute inset-2 rounded-full bg-blue-500/30 animate-rzp-radar [animation-delay:0.5s]" />
              <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
                <span className="font-black text-xl animate-pulse">R</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-800">Processing Payment...</h3>
              <p className="text-xs text-slate-500">Please do not refresh the page or press the back button</p>
            </div>

            {/* Step-by-Step Verification Checklist */}
            <div className="w-full max-w-sm bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                {processingStep >= 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-scaleUp" />
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-slate-300 animate-spin" />
                )}
                <span className={processingStep >= 1 ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  1. Connecting to Razorpay secure gateway
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {processingStep >= 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-scaleUp" />
                ) : (
                  <span className={`w-4 h-4 rounded-full border-2 ${processingStep === 1 ? 'border-blue-500 animate-spin' : 'border-slate-300'}`} />
                )}
                <span className={processingStep >= 2 ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  2. Authorizing with issuing bank switch
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {processingStep >= 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-scaleUp" />
                ) : (
                  <span className={`w-4 h-4 rounded-full border-2 ${processingStep === 2 ? 'border-blue-500 animate-spin' : 'border-slate-300'}`} />
                )}
                <span className={processingStep >= 3 ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  3. Verifying 3D-Secure transaction payload
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE C: BANK 3D-SECURE OTP MODAL (AUTHENTIC SIMULATION) */}
        {/* ============================================================== */}
        {stage === 'otp' && (
          <div className="p-6 sm:p-8 min-h-[380px] flex flex-col justify-between animate-fadeIn bg-slate-50">
            {/* Simulated Bank Header */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-blue-700 text-white font-black text-xs flex items-center justify-center">
                  B
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Bank 3D-Secure 2.0</h4>
                  <p className="text-[10px] text-slate-400">Authenticated Online Banking</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">{formatPrice(amount)}</span>
            </div>

            {/* Simulated SMS Toast notification */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-800 mb-4 animate-slideDown">
              <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sandbox Test SMS Received:</p>
                <p className="text-[11px] text-emerald-700">
                  Your OTP for Rs. {amount} to {shopName} is <strong className="font-mono text-emerald-900 bg-emerald-100 px-1 rounded">123456</strong>. Do not share this with anyone.
                </p>
              </div>
            </div>

            <div className="text-center space-y-4 max-w-sm mx-auto">
              <p className="text-xs text-slate-600">
                Please enter the 6-digit OTP sent to your registered mobile number ending with <strong>•••• 9876</strong>
              </p>

              {/* 6-Digit OTP Box inputs */}
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputsRef.current[index] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const newOtp = [...otp];
                      newOtp[index] = val;
                      setOtp(newOtp);
                      if (val && index < 5) {
                        otpInputsRef.current[index + 1]?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[index] && index > 0) {
                        otpInputsRef.current[index - 1]?.focus();
                      }
                    }}
                    className="w-10 h-12 text-center text-lg font-mono font-bold border-2 border-slate-300 focus:border-blue-600 rounded-xl focus:outline-none bg-white text-slate-800 shadow-xs"
                  />
                ))}
              </div>

              {/* Helpers */}
              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={() => setOtp(['1', '2', '3', '4', '5', '6'])}
                  className="text-blue-600 font-bold hover:underline"
                >
                  ⚡ Auto-fill Test OTP
                </button>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" /> Resend in 00:45
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStage('input')}
                className="flex-1 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition-colors"
              >
                Back to Methods
              </button>
              <button
                type="button"
                onClick={handleOtpSubmit}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Submit & Pay {formatPrice(amount)}</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE D: CELEBRATORY SUCCESS ANIMATION */}
        {/* ============================================================== */}
        {stage === 'success' && (
          <div className="p-8 sm:p-10 text-center space-y-6 min-h-[380px] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-white to-emerald-50/40">
            {/* Celebratory Floating Confetti Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[
                { color: 'bg-emerald-500', left: '15%', delay: '0s', size: 'w-2 h-3' },
                { color: 'bg-blue-500', left: '28%', delay: '0.2s', size: 'w-3 h-2' },
                { color: 'bg-amber-400', left: '42%', delay: '0.1s', size: 'w-2 h-2 rounded-full' },
                { color: 'bg-rose-500', left: '60%', delay: '0.3s', size: 'w-2 h-3' },
                { color: 'bg-purple-500', left: '75%', delay: '0.15s', size: 'w-3 h-2' },
                { color: 'bg-emerald-400', left: '88%', delay: '0.25s', size: 'w-2 h-2 rounded-full' },
              ].map((c, i) => (
                <div
                  key={i}
                  className={`absolute top-0 ${c.left} ${c.color} ${c.size} animate-[rzp-confetti-drop_2.5s_infinite_ease-out]`}
                  style={{ animationDelay: c.delay }}
                />
              ))}
            </div>

            {/* Checkmark SVG Bloom Animation */}
            <div className="relative w-20 h-20 flex items-center justify-center animate-rzp-pop">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping [animation-duration:2s]" />
              <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg className="w-10 h-10 text-white" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <path className="animate-rzp-check" d="M12 24 L20 32 L36 16" />
                </svg>
              </div>
            </div>

            <div className="space-y-1 relative z-10">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Payment Successful! 🎉
              </h3>
              <p className="text-xs text-slate-500">
                ₹{amount} paid securely to <strong className="text-slate-800">{shopName}</strong>
              </p>
            </div>

            {/* Transaction Receipt Pill */}
            <div className="w-full max-w-sm bg-white rounded-xl p-4 border border-emerald-100 shadow-sm text-left text-xs space-y-2 relative z-10">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment ID:</span>
                <span className="font-mono font-bold text-slate-800">{successData?.paymentId || 'pay_demo12345'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Order Reference:</span>
                <span className="font-mono font-bold text-emerald-600">{successData?.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CAPTURED & CONFIRMED
                </span>
              </div>
            </div>

            {/* Redirect Countdown Bar */}
            <div className="w-full max-w-sm space-y-1.5 relative z-10">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-1000 ease-linear" style={{ width: `${((4 - redirectCountdown) / 3) * 100}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Redirecting to your order confirmation in {redirectCountdown}s...
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE E: PAYMENT FAILED SCREEN */}
        {/* ============================================================== */}
        {stage === 'failed' && (
          <div className="p-8 sm:p-10 text-center space-y-6 min-h-[380px] flex flex-col items-center justify-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">Payment Unsuccessful</h3>
              <p className="text-xs text-rose-600 font-medium max-w-md mx-auto">
                {errorMessage}
              </p>
            </div>

            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No money has been debited. You can switch to a different payment method or re-try with valid test credentials.
            </p>

            <div className="flex gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => onClose ? onClose() : setShowExitConfirm(true)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStage('input')}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm hover:shadow transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FOOTER TRUST BADGE */}
        {/* ============================================================== */}
        <div className="bg-slate-50 border-t border-slate-200/80 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>PCI-DSS Level 1 Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by Razorpay</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Sandbox Simulation</span>
          </div>
        </div>

        {/* EXIT CONFIRMATION OVERLAY */}
        {showExitConfirm && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full text-center space-y-4 shadow-xl border border-slate-100 animate-scaleUp">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto font-bold">
                !
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Discard payment session?</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to cancel? Your order has not been placed yet.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Continue Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    if (onClose) onClose();
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Yes, Discard
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

