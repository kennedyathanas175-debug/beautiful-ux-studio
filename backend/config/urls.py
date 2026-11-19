from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny

from core.views import HealthView

admin.site.site_header = "TIE Platform administration"
admin.site.site_title = "TIE Platform"
admin.site.index_title = "Operations"

handler404 = "core.views.not_found"
handler500 = "core.views.server_error"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", HealthView.as_view(), name="health-check"),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/", include("ecosystem.urls")),
    path("api/v1/", include("opportunities.urls")),
    path("api/v1/", include("core.urls")),
    path(
        "api/schema/",
        SpectacularAPIView.as_view(permission_classes=[AllowAny]),
        name="schema",
    ),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[AllowAny]),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema", permission_classes=[AllowAny]),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
