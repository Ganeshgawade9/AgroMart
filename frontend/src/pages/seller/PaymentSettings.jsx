import { useState, useEffect } from 'react';
import { getSellerPaymentSettings, updateSellerPaymentSettings } from '../../api/orders';
import Spinner from '../../components/common/Spinner';
import { CreditCard, Save, CheckCircle, Info, Landmark, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSellerPaymentSettings()
      .then(res => {
        setSettings(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load payment configurations');
        setLoading(false);
      });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (settings.upi_enabled && !settings.upi_id) {
      toast.error('UPI ID is required if UPI payments are enabled');
      return;
    }

    if (settings.upi_id && !settings.upi_id.includes('@')) {
      toast.error('Please enter a valid UPI ID (e.g. name@bank)');
      return;
    }

    setSaving(true);
    try {
      await updateSellerPaymentSettings(settings);
      toast.success('Payment settings updated successfully! 🎉');
    } catch {
      toast.error('Failed to update payment settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Configuration</h1>
          <p className="text-xs text-gray-500 mt-1">Configure accepted payment methods and vendor banking setups</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Card 1: Payment Methods Toggles */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-3">
            <CreditCard className="w-4 h-4 text-primary-600" />
            <span>Supported Payment Methods</span>
          </h2>

          <div className="divide-y divide-gray-100">
            {/* Cash on Delivery */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Cash on Delivery (COD)</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Accept cash payments upon product delivery</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.cod_enabled} 
                  onChange={e => setSettings({...settings, cod_enabled: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* UPI QR Payment */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Instant UPI Payments</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Generate dynamic QR codes using your shop UPI ID</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.upi_enabled} 
                  onChange={e => setSettings({...settings, upi_enabled: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Razorpay Gateways */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-gray-800">Razorpay Payment Gateway</h3>
                  <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Demo Gateway</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Accept Credit/Debit Cards, Net Banking, and Wallet payments</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.razorpay_enabled} 
                  onChange={e => setSettings({...settings, razorpay_enabled: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* PhonePe - Future Integration */}
            <div className="py-4 flex items-center justify-between opacity-55">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-gray-600">PhonePe Gateway</h3>
                  <span className="bg-purple-50 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Future Ready</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Direct PhonePe SDK Integration</p>
              </div>
              <label className="relative inline-flex items-center cursor-not-allowed">
                <input type="checkbox" disabled className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 transition-all"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Card 2: UPI Configuration Details */}
        {settings.upi_enabled && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4 transition-all">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-3">
              <span className="text-lg">📱</span>
              <span>UPI Settlement Configuration</span>
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Merchant Display Name *</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-gray-800" 
                  placeholder="e.g. Ganesh Agro Center" 
                  value={settings.merchant_display_name || ''} 
                  onChange={e => setSettings({...settings, merchant_display_name: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">UPI ID / Virtual Payment Address *</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-mono text-gray-800" 
                  placeholder="e.g. ganeshagro@upi" 
                  value={settings.upi_id || ''} 
                  onChange={e => setSettings({...settings, upi_id: e.target.value})} 
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1">Settlement Mobile Number (Linked to UPI)</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-gray-800" 
                  placeholder="e.g. 9876543210" 
                  value={settings.payment_phone || ''} 
                  onChange={e => setSettings({...settings, payment_phone: e.target.value})} 
                />
              </div>
            </div>

            <div className="bg-primary-50 rounded-xl p-4 flex gap-3 text-xs text-primary-800 border border-primary-100/50">
              <Info className="w-5 h-5 flex-shrink-0 text-primary-600" />
              <p className="leading-relaxed">
                AgriMart constructs checkout UPI QR codes instantly based on the configurations above. Ensure your UPI ID is valid to receive settlements successfully.
              </p>
            </div>
          </div>
        )}

        {/* Card 3: Bank Account Configuration (Optional) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-3">
            <Landmark className="w-4 h-4 text-primary-600" />
            <span>Bank Settlement Details (Optional)</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Beneficiary Bank Account Name</label>
              <input 
                type="text" 
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-gray-800" 
                placeholder="Name as in Bank Passbook" 
                value={settings.bank_account_name || ''} 
                onChange={e => setSettings({...settings, bank_account_name: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Bank Account Number</label>
              <input 
                type="text" 
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-mono text-gray-800" 
                placeholder="Account Number" 
                value={settings.bank_account || ''} 
                onChange={e => setSettings({...settings, bank_account: e.target.value})} 
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">IFSC Code</label>
              <input 
                type="text" 
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all uppercase font-mono text-gray-800" 
                placeholder="e.g. SBIN0001234" 
                value={settings.ifsc_code || ''} 
                onChange={e => setSettings({...settings, ifsc_code: e.target.value})} 
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 px-8 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {saving ? <Spinner /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving Settings...' : 'Save Configuration'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
