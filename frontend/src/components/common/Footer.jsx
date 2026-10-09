import { Link } from 'react-router-dom';
import { Leaf, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center"><Leaf className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-white text-lg">AgroConnect</span>
          </div>
          <p className="text-sm text-gray-400">Connecting farmers with nearby fertilizer and pesticide sellers across Maharashtra.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/products" className="hover:text-white">All Products</Link></li>
            <li><Link to="/nearby-shops" className="hover:text-white">Nearby Shops</Link></li>
            <li><Link to="/register" className="hover:text-white">Join as Seller</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Categories</h4>
          <ul className="space-y-2 text-sm">
            {['Fertilizer','Pesticide','Organic','Seeds','Equipment'].map(c => (
              <li key={c}><Link to={`/products?category_type=${c.toLowerCase()}`} className="hover:text-white">{c}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> 1800-XXX-XXXX</li>
            <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@agroconnect.in</li>
            <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Nashik, Maharashtra</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © 2024 AgroConnect. Built for farmers of Maharashtra.
      </div>
    </footer>
  );
}
