from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, PromotionViewSet, ProductViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'promotions', PromotionViewSet, basename='promotion')
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = router.urls
