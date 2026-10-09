import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Eye,
  Images
} from 'lucide-react';
import { getMyProducts, deleteProduct } from '../../api/products';
import { formatPrice, IMG_PLACEHOLDER } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

export default function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = () => {
    setLoading(true);

    getMyProducts()
      .then((r) => {
        setProducts(r.data.results || r.data || []);
      })
      .catch(() => {
        toast.error('Failed to load products');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      await deleteProduct(id);
      fetchProducts();
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          My Products ({products.length})
        </h1>

        <Link
          to="/seller/products/add"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />

          <p className="text-lg">
            No products yet
          </p>

          <Link
            to="/seller/products/add"
            className="btn-primary inline-block mt-4"
          >
            Add First Product
          </Link>
        </div>
      ) : (

        /* Products list */
        <div className="space-y-3">

          {products.map((p) => {

            const allImages = [
              p.image,
              p.image2,
              p.image3
            ].filter(Boolean);

            return (
              <div
                key={p.id}
                className="card flex items-center gap-4"
              >

                {/* Image strip */}
                <div className="flex-shrink-0 flex gap-1">

                  {/* Main image */}
                  <img
                    src={allImages[0] || IMG_PLACEHOLDER}
                    alt={p.name}
                    className="w-16 h-16 object-cover rounded-xl border border-gray-100"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = IMG_PLACEHOLDER;
                    }}
                  />

                  {/* Extra images */}
                  {allImages.length > 1 && (
                    <div className="flex flex-col gap-1">

                      {allImages.slice(1).map((img, i) => (
                        <img
                          key={i}
                          src={img || IMG_PLACEHOLDER}
                          alt=""
                          className="w-7 h-7 object-cover rounded-md border border-gray-100"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = IMG_PLACEHOLDER;
                          }}
                        />
                      ))}

                    </div>
                  )}

                </div>

                {/* Product information */}
                <div className="flex-1 min-w-0">

                  <p className="font-semibold text-gray-900 truncate">
                    {p.name}
                  </p>

                  <p className="text-xs text-gray-500">
                    {p.category_name} · {p.brand_name}
                  </p>

                  <div className="flex items-center gap-3 mt-1 flex-wrap">

                    {/* Price */}
                    <span className="font-bold text-primary-700">
                      {formatPrice(p.price)}
                    </span>

                    {/* Stock */}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : p.stock <= 5
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                    >
                      Stock: {p.stock}
                    </span>

                    {/* Number of photos */}
                    {allImages.length > 1 && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Images className="w-3 h-3" />
                        {allImages.length} photos
                      </span>
                    )}

                    {/* Active / inactive */}
                    {!p.is_active && (
                      <span className="badge-red">
                        Inactive
                      </span>
                    )}

                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">

                  {/* View */}
                  <Link
                    to={`/products/${p.id}`}
                    className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>

                  {/* Edit */}
                  <Link
                    to={`/seller/products/edit/${p.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>

              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}