import { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { getNotifications, markAllRead } from '../api/notifications';
import { formatDate } from '../utils/helpers';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';

const TYPE_ICONS = { new_order:'🛒', order_update:'📦', payment:'💳', low_stock:'⚠️', offer:'🎁' };

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => getNotifications().then(r => setNotifs(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { fetch(); }, []);

  const handleMarkAll = async () => {
    await markAllRead(); fetch(); toast.success('All marked as read');
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bell className="w-6 h-6 text-primary-600" /> Notifications</h1>
        {notifs.some(n => !n.is_read) && (
          <button onClick={handleMarkAll} className="text-sm text-primary-600 flex items-center gap-1 hover:underline"><CheckCheck className="w-4 h-4" /> Mark all read</button>
        )}
      </div>
      {notifs.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><Bell className="w-16 h-16 mx-auto mb-4 opacity-30" /><p>No notifications</p></div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${n.is_read ? 'bg-white border-gray-100' : 'bg-primary-50 border-primary-200'}`}>
              <span className="text-2xl flex-shrink-0">{TYPE_ICONS[n.notification_type] || '🔔'}</span>
              <div className="flex-1">
                <p className={`text-sm ${n.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
              </div>
              {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
