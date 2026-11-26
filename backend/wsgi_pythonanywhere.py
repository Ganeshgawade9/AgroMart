# +-------------------------------------------------------------------------------+
# | AgroConnect - PythonAnywhere WSGI Configuration File                         |
# | Target user: Ganeshpatil007                                                   |
# | Web app: https://Ganeshpatil007.pythonanywhere.com                          |
# | Destination on PythonAnywhere:                                                |
# |   /var/www/ganeshpatil007_pythonanywhere_com_wsgi.py                          |
# +-------------------------------------------------------------------------------+

import os
import site
import sys

# 1. Project path: Points to the backend directory where manage.py and core/ live
project_home = '/home/Ganeshpatil007/agroconnect/backend'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# 2. Django settings module
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'

# 3. Activate virtual environment
# (Also set Virtualenv in PythonAnywhere Web Tab to /home/Ganeshpatil007/.virtualenvs/agroconnect-venv)
venv_dir = '/home/Ganeshpatil007/.virtualenvs/agroconnect-venv'
activate_env = f'{venv_dir}/bin/activate_this.py'
if os.path.exists(activate_env):
    with open(activate_env) as f:
        exec(f.read(), dict(__file__=activate_env))
else:
    venv_site = f'{venv_dir}/lib/python{sys.version_info.major}.{sys.version_info.minor}/site-packages'
    if os.path.isdir(venv_site) and venv_site not in sys.path:
        site.addsitedir(venv_site)

# 4. Import and create the WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
