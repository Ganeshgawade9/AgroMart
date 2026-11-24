#!/bin/bash
# ==============================================================================
# AgroMart Automatic Setup Script for PythonAnywhere (Free Tier Optimized)
# User: Ganeshpatil007
# Domain: https://Ganeshpatil007.pythonanywhere.com
# ==============================================================================

set -e

echo "🚀 Starting AgroMart deployment setup on PythonAnywhere..."

# 1. Clean cache and unnecessary tracked files to free maximum disk space
echo "🧹 Reclaiming disk space..."
rm -rf ~/.cache/pip ~/.cache/*
rm -rf /home/Ganeshpatil007/.virtualenvs/agroconnect-venv
# Remove old Windows venv if it exists in agroconnect directory
rm -rf /home/Ganeshpatil007/agroconnect/backend/venv
rm -rf /home/Ganeshpatil007/agroconnect/venv

VENV_DIR="/home/Ganeshpatil007/.virtualenvs/agroconnect-venv"

# 2. Create ultra-lightweight virtualenv inheriting PythonAnywhere pre-installed Django & Pillow
echo "📦 Creating lightweight virtual environment (with --system-site-packages)..."
python3.10 -m venv --system-site-packages "$VENV_DIR"

# 3. Activate virtual environment
echo "🔄 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# 4. Install only missing lightweight packages (< 5MB total!)
echo "📥 Installing only the missing lightweight packages..."
pip install --no-cache-dir django-cors-headers django-filter python-decouple djangorestframework-simplejwt razorpay

# 5. Configure .env file
if [ ! -f .env ]; then
    echo "⚙️ Creating .env from .env.pythonanywhere template..."
    cp .env.pythonanywhere .env
else
    echo "ℹ️ .env already exists. Skipping overwrite."
fi

# 6. Database migrations
echo "🗄️ Running database migrations..."
python manage.py migrate

# 7. Seed demo shops, categories, crops, and products
echo "🌱 Seeding initial products, shops, and categories..."
python manage.py seed_data

# 8. Collect static files for Django Admin & REST Framework
echo "🎨 Collecting static files..."
python manage.py collectstatic --noinput

echo "========================================================"
echo "✅ Backend & Database setup completed successfully!"
echo "👉 Next steps:"
echo "   1. Create an admin superuser: python manage.py createsuperuser"
echo "   2. Configure your Web tab at https://www.pythonanywhere.com/user/Ganeshpatil007/webapps/"
echo "   3. Click 'Reload Ganeshpatil007.pythonanywhere.com'"
echo "========================================================"
