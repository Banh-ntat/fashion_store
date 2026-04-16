from django.urls import path
from .views import WalletDetailView

urlpatterns = [
    path('info/', WalletDetailView.as_view(), name='wallet-info'),
]