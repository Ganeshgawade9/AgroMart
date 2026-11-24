from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, FileResponse
from django.views.static import serve as static_serve
import os

dist_dir = getattr(settings, 'FRONTEND_DIST_DIR', None)


def root_index(request):
    if dist_dir:
        index_file = dist_dir / 'index.html'
        if index_file.exists():
            return FileResponse(open(index_file, 'rb'))
    return JsonResponse({
        'name': 'AgroConnect API',
        'status': 'online',
        'server': 'pythonanywhere',
        'version': '1.0',
        'endpoints': {
            'admin': '/admin/',
            'auth': '/api/auth/',
            'products': '/api/products/',
            'orders': '/api/orders/',
            'maps': '/api/maps/',
            'notifications': '/api/notifications/',
            'ai': '/api/ai/',
        }
    })


def spa_fallback(request, path=''):
    if dist_dir:
        index_file = dist_dir / 'index.html'
        if index_file.exists():
            return FileResponse(open(index_file, 'rb'))
    return JsonResponse({'error': 'Page not found', 'path': path}, status=404)


urlpatterns = [
    path('', root_index, name='root_index'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/maps/', include('maps.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/ai/', include('ai_chat.urls')),
]

if dist_dir and (dist_dir / 'assets').exists():
    urlpatterns += [
        re_path(r'^assets/(?P<path>.*)$', static_serve, {'document_root': dist_dir / 'assets'}),
    ]

urlpatterns += [
    re_path(r'^(?!admin|api|static|media|assets).*$', spa_fallback),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

