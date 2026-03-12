from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import OrderViewSet, OrderItemViewSet

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'order-items', OrderItemViewSet, basename='orderitem')

urlpatterns = router.urls
