import { useState, useEffect } from 'react';
import { Truck, Phone, Navigation, Loader2, Store } from 'lucide-react';
import { getOrderTracking } from '../../api/delivery';

const POLL_MS = 10000;
const TRACKED = ['accepted', 'packed', 'out_for_delivery'];

// Shows dispatch / rider progress for an order: finding a rider -> rider assigned -> on the way.
// `viewer` is 'farmer' or 'seller'; the seller also sees dispatch details.
export default function DeliveryTracking({ orderId, orderStatus, viewer = 'farmer', onChange }) {
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    if (!TRACKED.includes(orderStatus)) { setTracking(null); return undefined; }
    let cancelled = false;
    let previousStage = null;

    const load = () =>
      getOrderTracking(orderId)
        .then((r) => {
          if (cancelled) return;
          setTracking(r.data);
          if (previousStage && previousStage !== r.data.stage) onChange?.(r.data);
          previousStage = r.data.stage;
        })
        .catch(() => {});

    load();
    const t = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [orderId, orderStatus]);

  if (!tracking || !['finding_rider', 'rider_assigned', 'on_the_way'].includes(tracking.stage)) return null;

  const { stage, rider, offer } = tracking;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
        <Truck className="w-4 h-4 text-primary-600" /> Delivery
      </h2>

      {stage === 'finding_rider' && (
        <div className="flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-primary-600 animate-spin flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-gray-900">Finding a delivery partner nearby...</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {viewer === 'seller' && offer
                ? `Offer sent to ${offer.partner_name}. If they do not respond it goes to the next nearest rider.`
                : viewer === 'seller'
                  ? 'No rider is available right now. We keep retrying, or you can assign one manually.'
                  : 'We will show your delivery partner here as soon as one accepts.'}
            </p>
          </div>
        </div>
      )}

      {(stage === 'rider_assigned' || stage === 'on_the_way') && rider && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              {stage === 'rider_assigned' ? <Store className="w-5 h-5 text-primary-700" /> : <Truck className="w-5 h-5 text-primary-700" />}
            </div>
            <div className="text-sm flex-1">
              <p className="font-medium text-gray-900">{rider.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {stage === 'rider_assigned'
                  ? (viewer === 'seller' ? 'is heading to your shop to pick up the order' : 'will pick up your order from the shop')
                  : 'is on the way with your order'}
              </p>
              {rider.distance_km != null && (
                <p className="text-primary-700 text-xs font-medium mt-1">
                  {rider.distance_km} km away · about {rider.eta_minutes} min
                  {rider.heading_to === 'shop' ? ' from the shop' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {rider.phone && (
              <a href={`tel:${rider.phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 border border-primary-300 text-primary-700 rounded-lg py-2 text-sm font-medium hover:bg-primary-50">
                <Phone className="w-4 h-4" /> Call
              </a>
            )}
            {rider.latitude != null && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${rider.latitude},${rider.longitude}`} target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700">
                <Navigation className="w-4 h-4" /> View rider on map
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
