import { useState, useEffect, useRef, useCallback } from 'react';
import { Truck, MapPin, Navigation, Phone, Store, Power, Banknote, Timer, Package } from 'lucide-react';
import {
  getDuty, setDuty, pingLocation, getOffers, acceptOffer, declineOffer,
  getMyDeliveries, confirmPickup, confirmDelivery,
} from '../../api/delivery';
import { formatPrice, formatDate } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

const PING_EVERY_MS = 15000;
const OFFERS_POLL_MS = 5000;
const ORDERS_POLL_MS = 20000;

const getPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Your browser does not support location access.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.code === 1
        ? 'Location permission is blocked. Allow location access to go online.'
        : 'Could not get your location. Please try again.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });

const openMaps = (lat, lng, fallbackQuery) => {
  const destination = lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(fallbackQuery || '');
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
};

function OfferCard({ offer, onAccept, onDecline, busy }) {
  const [left, setLeft] = useState(offer.seconds_left);

  useEffect(() => {
    setLeft(offer.seconds_left);
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [offer.id, offer.seconds_left]);

  return (
    <div className="card border-2 border-primary-400 bg-primary-50/40">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-gray-900">New delivery offer</p>
        <span className={`flex items-center gap-1 text-sm font-semibold ${left <= 15 ? 'text-red-600' : 'text-primary-700'}`}>
          <Timer className="w-4 h-4" /> {left}s
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <Store className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">{offer.shop_name}</p>
            <p className="text-gray-500 text-xs">{offer.shop_address}</p>
            <p className="text-xs text-primary-700 mt-0.5">
              {offer.distance_to_shop_km} km from you · ~{offer.eta_to_shop_minutes} min
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-700">Deliver to {offer.drop_area || 'customer'}</p>
            {offer.shop_to_customer_km != null && (
              <p className="text-xs text-gray-500">{offer.shop_to_customer_km} km from the shop</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 pt-1">
          <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {offer.items_count} item(s)</span>
          <span>Order #{offer.order_number}</span>
          <span>Shop ready in ~{offer.estimated_prep_minutes} min</span>
          {offer.cash_to_collect > 0 && (
            <span className="flex items-center gap-1 text-orange-700 font-medium">
              <Banknote className="w-3.5 h-3.5" /> Collect {formatPrice(offer.cash_to_collect)}
            </span>
          )}
          {offer.earning > 0 && <span className="text-green-700 font-medium">Earn {formatPrice(offer.earning)}</span>}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={() => onDecline(offer)} disabled={busy}
          className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
          Decline
        </button>
        <button onClick={() => onAccept(offer)} disabled={busy || left === 0}
          className="flex-1 bg-primary-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
          Accept
        </button>
      </div>
    </div>
  );
}

export default function DeliveryDashboard() {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [offers, setOffers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [otpInput, setOtpInput] = useState({});
  const [busyId, setBusyId] = useState(null);

  const watchId = useRef(null);
  const lastPing = useRef(0);

  const fetchOrders = useCallback(() => {
    getMyDeliveries().then((r) => setOrders(r.data.results || r.data)).catch(() => {});
  }, []);

  const fetchOffers = useCallback(() => {
    getOffers().then((r) => setOffers(r.data.offers || [])).catch(() => {});
  }, []);

  // Restore duty state and deliveries on load
  useEffect(() => {
    Promise.all([
      getDuty().then((r) => setOnline(!!r.data.is_online)).catch(() => {}),
      getMyDeliveries().then((r) => setOrders(r.data.results || r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const activeOrders = orders.filter((o) => ['accepted', 'packed', 'out_for_delivery'].includes(o.status));
  const hasActive = activeOrders.length > 0;

  // Share live location while on duty or carrying an order
  useEffect(() => {
    if ((!online && !hasActive) || !navigator.geolocation) return undefined;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastPing.current < PING_EVERY_MS) return;
        lastPing.current = now;
        pingLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [online, hasActive]);

  // Poll for new offers while online
  useEffect(() => {
    if (!online) { setOffers([]); return undefined; }
    fetchOffers();
    const t = setInterval(fetchOffers, OFFERS_POLL_MS);
    return () => clearInterval(t);
  }, [online, fetchOffers]);

  // Keep assigned orders fresh (e.g. shop marks the order packed)
  useEffect(() => {
    const t = setInterval(fetchOrders, ORDERS_POLL_MS);
    return () => clearInterval(t);
  }, [fetchOrders]);

  const toggleDuty = async () => {
    setToggling(true);
    setLocationError('');
    try {
      if (online) {
        await setDuty({ online: false });
        setOnline(false);
        toast.success('You are offline');
      } else {
        const pos = await getPosition();
        lastPing.current = Date.now();
        await setDuty({ online: true, ...pos });
        setOnline(true);
        toast.success('You are online. Waiting for orders...');
      }
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Could not change duty status';
      setLocationError(message);
      toast.error(message);
    } finally {
      setToggling(false);
    }
  };

  const handleAccept = async (offer) => {
    setBusyId(offer.id);
    try {
      await acceptOffer(offer.id);
      toast.success('Order accepted! Head to the shop.');
      fetchOffers();
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not accept this offer');
      fetchOffers();
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (offer) => {
    setBusyId(offer.id);
    try {
      await declineOffer(offer.id);
      setOffers((list) => list.filter((o) => o.id !== offer.id));
    } catch {
      toast.error('Could not decline the offer');
    } finally {
      setBusyId(null);
    }
  };

  const handlePickup = async (order) => {
    setBusyId(order.id);
    try {
      await confirmPickup(order.id);
      toast.success('Pickup confirmed');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not confirm pickup');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeliver = async (order) => {
    const otp = otpInput[order.id];
    if (!otp || otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setBusyId(order.id);
    try {
      await confirmDelivery(order.id, otp);
      toast.success('Order delivered! ✅');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const done = orders.filter((o) => o.status === 'delivered');

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary-600" /> Delivery Dashboard
        </h1>
        <button onClick={toggleDuty} disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-60 ${online ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
          <Power className="w-4 h-4" />
          {toggling ? 'Please wait...' : online ? 'Online' : 'Go Online'}
        </button>
      </div>

      {locationError && <p className="text-sm text-red-500 mb-4">{locationError}</p>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[['Active', activeOrders.length], ['Delivered', done.length], ['Total', orders.length]].map(([label, value]) => (
          <div key={label} className="card text-center">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Incoming offers */}
      {online && offers.length > 0 && (
        <div className="space-y-4 mb-6">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onAccept={handleAccept} onDecline={handleDecline} busy={busyId === offer.id} />
          ))}
        </div>
      )}
      {online && offers.length === 0 && !hasActive && (
        <div className="card text-center py-8 text-gray-500 mb-6">
          <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-3 animate-pulse" />
          <p className="font-medium text-gray-700">You are online</p>
          <p className="text-sm">New delivery offers will appear here. Keep this page open.</p>
        </div>
      )}
      {!online && !hasActive && (
        <div className="card text-center py-8 text-gray-500 mb-6">
          <p className="font-medium text-gray-700">You are offline</p>
          <p className="text-sm">Go online to start receiving delivery offers near you.</p>
        </div>
      )}

      {/* Active deliveries */}
      {hasActive && (
        <>
          <h2 className="font-bold text-gray-900 mb-3">Active Deliveries ({activeOrders.length})</h2>
          <div className="space-y-4 mb-8">
            {activeOrders.map((order) => {
              const pickedUp = order.status === 'out_for_delivery';
              return (
                <div key={order.id} className={`card border-l-4 ${pickedUp ? 'border-l-blue-500' : 'border-l-orange-400'}`}>
                  <div className="flex justify-between mb-3">
                    <p className="font-bold text-gray-900">#{order.order_number}</p>
                    <span className={pickedUp ? 'badge-blue' : 'badge-orange'}>
                      {pickedUp ? 'Out for Delivery' : order.ready_for_pickup ? 'Ready for pickup' : 'Shop is preparing'}
                    </span>
                  </div>

                  {order.items?.length > 0 && (
                    <p className="text-xs text-gray-500 mb-3">
                      {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                    </p>
                  )}
                  {order.cash_to_collect > 0 && (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-orange-700 bg-orange-50 rounded-lg px-3 py-2 mb-3">
                      <Banknote className="w-4 h-4" /> Collect {formatPrice(order.cash_to_collect)} in cash from the customer
                    </p>
                  )}

                  {!pickedUp ? (
                    <>
                      <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm">
                        <p className="font-medium text-gray-900 flex items-center gap-1.5"><Store className="w-4 h-4 text-primary-600" /> {order.shop_name}</p>
                        <p className="text-gray-600 text-xs mt-1">{order.shop_address}</p>
                        {order.shop_phone && (
                          <a href={`tel:${order.shop_phone}`} className="text-xs text-primary-700 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {order.shop_phone}</a>
                        )}
                      </div>
                      <button onClick={() => openMaps(order.shop_latitude, order.shop_longitude, order.shop_address)}
                        className="w-full flex items-center justify-center gap-2 border border-primary-300 text-primary-700 rounded-xl py-2 text-sm font-medium hover:bg-primary-50 mb-3">
                        <Navigation className="w-4 h-4" /> Navigate to shop
                      </button>
                      <button onClick={() => handlePickup(order)} disabled={busyId === order.id || !order.ready_for_pickup}
                        className="w-full bg-primary-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
                        {order.ready_for_pickup ? 'Confirm pickup' : 'Waiting for shop to pack...'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm">
                        <p className="font-medium text-gray-900">{order.customer_name}</p>
                        <p className="text-gray-600">{order.delivery_address}{order.delivery_village && `, ${order.delivery_village}`}{order.delivery_district && `, ${order.delivery_district}`}</p>
                        <a href={`tel:${order.delivery_phone}`} className="text-xs text-primary-700 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {order.delivery_phone}</a>
                      </div>
                      <button
                        onClick={() => openMaps(order.customer_latitude, order.customer_longitude,
                          `${order.delivery_address}, ${order.delivery_village}, ${order.delivery_district}`)}
                        className="w-full flex items-center justify-center gap-2 border border-primary-300 text-primary-700 rounded-xl py-2 text-sm font-medium hover:bg-primary-50 mb-3">
                        <Navigation className="w-4 h-4" /> Navigate to customer
                      </button>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <p className="text-sm font-semibold text-green-800 mb-2">Confirm delivery (OTP from farmer)</p>
                        <div className="flex gap-2">
                          <input value={otpInput[order.id] || ''}
                            onChange={(e) => setOtpInput((p) => ({ ...p, [order.id]: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                            placeholder="6-digit OTP" maxLength={6} inputMode="numeric"
                            className="flex-1 border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-mono tracking-widest" />
                          <button onClick={() => handleDeliver(order)} disabled={busyId === order.id || otpInput[order.id]?.length !== 6}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40">
                            {busyId === order.id ? '...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <h2 className="font-bold text-gray-900 mb-3">Completed ({done.length})</h2>
          <div className="space-y-3">
            {done.slice(0, 5).map((o) => (
              <div key={o.id} className="card flex justify-between opacity-70">
                <div>
                  <p className="font-medium text-sm">#{o.order_number}</p>
                  <p className="text-xs text-gray-500">{formatDate(o.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatPrice(o.total)}</p>
                  <span className="badge-green">Delivered</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
