#!/bin/bash
# ==============================================================================
# AgroMart Automatic Setup Script for PythonAnywhere
# User: Ganeshpatil007
# Domain: https://Ganeshpatil007.pythonanywhere.com
# ==============================================================================

set -e

echo "🚀 Starting AgroMart deployment setup on PythonAnywhere..."

# 1. Ensure Python 3.10 virtual environment exists
VENV_DIR="/home/Ganeshpatil007/.virtualenvs/agroconnect-venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment at $VENV_DIR..."
    python3.10 -m venv "$VENV_DIR"
fi

# 2. Activate virtual environment
echo "🔄 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# 3. Upgrade pip & install dependencies
echo "📥 Installing dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Configure .env file
if [ ! -f .env ]; then
    echo "⚙️ Creating .env from .env.pythonanywhere template..."
    cp .env.pythonanywhere .env
else
    echo "ℹ️ .env already exists. Skipping overwrite."
fi

# 5. Database migrations
echo "🗄️ Running database migrations..."
python manage.py migrate

# 6. Seed demo shops, categories, crops, and products
echo "🌱 Seeding initial products, shops, and categories..."
python manage.py seed_data

# 7. Collect static files for Django Admin & REST Framework
echo "🎨 Collecting static files..."
python manage.py collectstatic --noinput

echo "========================================================"
echo "✅ Backend & Database setup completed successfully!"
echo "👉 Next steps:"
echo "   1. Create an admin superuser: python manage.py createsuperuser"
echo "   2. Configure your Web tab at https://www.pythonanywhere.com/user/Ganeshpatil007/webapps/"
echo "   3. Click 'Reload Ganeshpatil007.pythonanywhere.com'"
echo "========================================================"
