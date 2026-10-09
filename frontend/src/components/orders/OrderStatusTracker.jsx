import { CheckCircle, Circle, Clock, Package, Truck, Home } from 'lucide-react';

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle },
  { key: 'packed', label: 'Packed', icon: Package },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

const ORDER = ['pending', 'accepted', 'packed', 'out_for_delivery', 'delivered'];

export default function OrderStatusTracker({ status }) {
  const currentIdx = ORDER.indexOf(status);

  return (
    <div className="flex items-start justify-between relative">
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 z-0" />
      <div className="absolute top-4 left-4 h-0.5 bg-primary-500 z-0 transition-all duration-500"
        style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }} />

      {STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex flex-col items-center gap-1 z-10 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${done ? 'bg-primary-600' : 'bg-gray-200'}`}>
              <Icon className={`w-4 h-4 ${done ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <span className={`text-xs text-center font-medium leading-tight ${done ? 'text-primary-700' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
