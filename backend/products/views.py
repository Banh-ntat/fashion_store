from rest_framework import permissions, viewsets

from .models import Category, Promotion, Product
from .serializers import CategorySerializer, PromotionSerializer, ProductSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    search_fields = ["name"]
    ordering_fields = ["id", "name"]


class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    search_fields = ["name"]
    ordering_fields = ["id", "discount_percent", "start_date", "end_date"]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category", "promotion").all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["category", "promotion"]
    search_fields = ["name", "description"]
    ordering_fields = ["id", "price", "stock", "name"]
