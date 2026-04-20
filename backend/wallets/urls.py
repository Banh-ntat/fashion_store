from django.urls import path
from .views import WalletInfoView, WithdrawRequestView, WalletActionView

urlpatterns = [
    path('info/', WalletInfoView.as_view(), name='wallet-info'),
    path('withdraw/', WithdrawRequestView.as_view(), name='wallet-withdraw'),
    path('action/', WalletActionView.as_view(), name='wallet-action'),
]