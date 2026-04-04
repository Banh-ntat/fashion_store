from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.admin_views import AdminDashboardStatsView

urlpatterns = [
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("dashboard/stats/", AdminDashboardStatsView.as_view(), name="admin-dashboard-stats"),
]
