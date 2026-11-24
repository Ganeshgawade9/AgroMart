# +-------------------------------------------------------------------------------+
# | AgroConnect - PythonAnywhere WSGI Configuration File                         |
# | Target user: Ganeshpatil007                                                   |
# | Web app: https://Ganeshpatil007.pythonanywhere.com                          |
# | Destination on PythonAnywhere:                                                |
# |   /var/www/ganeshpatil007_pythonanywhere_com_wsgi.py                          |
# +-------------------------------------------------------------------------------+

import os
import sys

# 1. Project path: Points to the backend directory where manage.py and core/ live
project_home = '/home/Ganeshpatil007/agroconnect/backend'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# 2. Django settings module
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'

# 3. Optional: activate virtual environment if not using the Web tab virtualenv field
# (Setting the virtualenv in PythonAnywhere Web Tab to:
#  /home/Ganeshpatil007/.virtualenvs/agroconnect-venv  is recommended)
activate_env = '/home/Ganeshpatil007/.virtualenvs/agroconnect-venv/bin/activate_this.py'
if os.path.exists(activate_env):
    with open(activate_env) as f:
        exec(f.read(), dict(__file__=activate_env))

# 4. Import and create the WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
