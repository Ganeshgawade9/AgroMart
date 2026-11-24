import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { IMG_PLACEHOLDER } from '../../utils/helpers';
import { getHomeCategories } from '../../api/products';

const CATEGORIES_DATA = [
  {
    id: 'offers',
    titleKey: 'cat.offers',
    defaultTitle: 'Offers',
    image: '/categories/offers.png',
    bgColor: '#d1fae5', // pastel mint
    link: '/products?min_discount=10',
  },
  {
    id: 'urban_gardening',
    titleKey: 'cat.urban_gardening',
    defaultTitle: 'Urban Gardening',
    image: '/categories/urban_gardening.png',
    bgColor: '#cffafe', // pastel cyan
    link: '/products?category_type=organic',
  },
  {
    id: 'sprayers',
    titleKey: 'cat.sprayers',
    defaultTitle: 'Sprayers',
    image: '/categories/sprayers.png',
    bgColor: '#fed7aa', // pastel warm peach/amber
    link: '/products?category_type=equipment&search=sprayer',
  },
  {
    id: 'insecticides',
    titleKey: 'cat.insecticides',
    defaultTitle: 'Insecticides',
    image: '/categories/insecticides.png',
    bgColor: '#ccfbf1', // pastel teal
    link: '/products?category_type=pesticide',
  },
  {
    id: 'herbicides',
    titleKey: 'cat.herbicides',
    defaultTitle: 'Herbicides',
    image: '/categories/herbicides.png',
    bgColor: '#fef08a', // pastel yellow
    link: '/products?category_type=herbicide',
  },
  {
    id: 'nutrients',
    titleKey: 'cat.nutrients',
    defaultTitle: 'Nutrients',
    image: '/categories/nutrients.png',
    bgColor: '#fbcfe8', // pastel pink
    link: '/products?category_type=fertilizer',
  },
  {
    id: 'fungicides',
    titleKey: 'cat.fungicides',
    defaultTitle: 'Fungicides',
    image: '/categories/fungicides.png',
    bgColor: '#bfdbfe', // pastel light blue
    link: '/products?category_type=fungicide',
  },
  {
    id: 'vegetable_seeds',
    titleKey: 'cat.vegetable_seeds',
    defaultTitle: 'Vegetable & Fruit Seeds',
    image: '/categories/vegetable_seeds.png',
    bgColor: '#dcfce7', // pastel green
    link: '/products?category_type=seeds',
  },
  {
    id: 'growth_promoters',
    titleKey: 'cat.growth_promoters',
    defaultTitle: 'Growth Promoters',
    image: '/categories/growth_promoters.png',
    bgColor: '#e9d5ff', // pastel purple
    link: '/products?category_type=organic',
  },
  {
    id: 'farm_machinery',
    titleKey: 'cat.farm_machinery',
    defaultTitle: 'Farm Machinery',
    image: '/categories/farm_machinery.png',
    bgColor: '#ecfccb', // pastel lime
    link: '/products?category_type=equipment',
  },
  {
    id: 'flower_seeds',
    titleKey: 'cat.flower_seeds',
    defaultTitle: 'Flower Seeds',
    image: '/categories/flower_seeds.png',
    bgColor: '#ffedd5', // pastel peach
    link: '/products?category_type=seeds&search=flower',
  },
  {
    id: 'animal_husbandry',
    titleKey: 'cat.animal_husbandry',
    defaultTitle: 'Animal Husbandry',
    image: '/categories/animal_husbandry.png',
    bgColor: '#fef9c3', // pastel warm yellow
    link: '/products?category_type=equipment&search=cutter',
  },
];

export default function CategoriesGrid() {
  const { t } = useT();
  const [categories, setCategories] = useState(CATEGORIES_DATA);

  useEffect(() => {
    getHomeCategories()
      .then((res) => {
        const data = res.data?.results || res.data;
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map((item) => {
            const fallback = CATEGORIES_DATA.find((c) => c.id === item.slug) || {};
            return {
              id: item.slug || item.id,
              titleKey: item.title_key || fallback.titleKey || `cat.${item.slug}`,
              defaultTitle: item.name || fallback.defaultTitle,
              image: item.image || item.default_image || fallback.image,
              bgColor: item.bg_color || fallback.bgColor || '#f3f4f6',
              link: item.link_url || fallback.link || '/products',
            };
          });
          setCategories(merged);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-xs">
      {/* Centered Heading with right-aligned "View All" */}
      <div className="relative flex items-center justify-between mb-8 pb-1">
        <div className="w-full text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {t('home.categories')}
          </h2>
        </div>
        <div className="absolute right-0">
          <Link
            to="/products"
            className="inline-flex items-center justify-center border border-gray-800 text-gray-800 hover:bg-gray-900 hover:text-white px-3.5 py-1 sm:px-4 sm:py-1.5 rounded text-xs sm:text-sm font-semibold transition-colors"
          >
            {t('home.view_all')}
          </Link>
        </div>
      </div>

      {/* Two rows of 6 circular category tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-y-7 gap-x-3 sm:gap-x-6">
        {categories.map((cat) => {
          const title = t(cat.titleKey) || cat.defaultTitle;
          return (
            <Link
              key={cat.id}
              to={cat.link}
              className="flex flex-col items-center group text-center cursor-pointer"
            >
              {/* Circular Tile with Custom Pastel Background */}
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center p-3 relative overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-2xs group-hover:shadow-md"
                style={{ backgroundColor: cat.bgColor }}
              >
                <img
                  src={cat.image}
                  alt={title}
                  className="w-full h-full object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = IMG_PLACEHOLDER;
                  }}
                />
              </div>

              {/* Category Title */}
              <span className="mt-2.5 text-xs sm:text-sm font-medium text-gray-800 group-hover:text-primary-700 transition-colors leading-tight line-clamp-2 max-w-[130px] mx-auto">
                {title}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
