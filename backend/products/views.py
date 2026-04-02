from django.db.models import Q
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import filters
from datetime import datetime

from core.permissions import (
    IsAdminOrReadOnly, IsProductManager, IsAdmin
)
from rest_framework.permissions import IsAuthenticated
from .models import Category, Promotion, Product, ProductVariant, Color, Size, ProductImage
from .serializers import CategorySerializer, PromotionSerializer, ProductSerializer, ProductVariantSerializer, ColorSerializer, SizeSerializer, ProductImageSerializer


class ProductPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["name"]
    ordering_fields = ["id", "name"]
    filter_backends = []  # Disable filters

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Lấy danh sách sản phẩm theo danh mục"""
        category = self.get_object()
        products = Product.objects.filter(category=category)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)


class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["name"]
    ordering_fields = ["id", "discount_percent", "start_date", "end_date"]
    filter_backends = []  # Disable filters

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Lấy danh sách khuyến mãi đang hoạt động"""
        today = datetime.now().date()
        promotions = Promotion.objects.filter(
            start_date__lte=today,
            end_date__gte=today
        )
        serializer = self.get_serializer(promotions, many=True)
        return Response(serializer.data)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category", "promotion").all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]  # Chỉ cần đăng nhập
    pagination_class = ProductPagination
    filterset_fields = ["category", "promotion"]
    search_fields = ["name", "description"]
    ordering_fields = ["id", "price", "name"]
    filter_backends = [filters.OrderingFilter]  # Enable only ordering, search is custom

    def get_queryset(self):
        queryset = super().get_queryset()

        # Tìm kiếm nâng cao với Q objects - tìm kiếm một phần (partial matching)
        search_query = self.request.query_params.get('search', '')
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(category__name__icontains=search_query)
            )

        # Lọc theo category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Lọc theo promotion
        promotion_id = self.request.query_params.get('promotion')
        if promotion_id:
            queryset = queryset.filter(promotion_id=promotion_id)
        
        # Lọc sản phẩm có khuyến mãi
        has_promotion = self.request.query_params.get('has_promotion')
        if has_promotion == 'true':
            queryset = queryset.filter(promotion__isnull=False)
        
        # Lọc theo khoảng giá
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        return queryset

    @action(detail=False, methods=['get'], url_path='featured')
    def featured(self, request):
        """Lấy danh sách sản phẩm nổi bật (có khuyến mãi)"""
        products = self.get_queryset().filter(
            promotion__isnull=False
        ).order_by('-price')[:12]
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='hot_deals')
    def hot_deals(self, request):
        """Lấy danh sách sản phẩm hot deals (có khuyến mãi đang hoạt động)"""
        today = datetime.now().date()
        products = self.get_queryset().filter(
            promotion__start_date__lte=today,
            promotion__end_date__gte=today
        ).order_by('-promotion__discount_percent')[:8]
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='new_arrivals')
    def new_arrivals(self, request):
        """Lấy danh sách sản phẩm mới nhất"""
        products = self.get_queryset().order_by('-id')[:8]
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='related')
    def related(self, request, pk=None):
        """Lấy danh sách sản phẩm liên quan (cùng danh mục, trừ sản phẩm hiện tại)"""
        product = self.get_object()
        related_products = self.get_queryset().filter(
            category=product.category
        ).exclude(id=product.id)[:4]
        serializer = self.get_serializer(related_products, many=True)
        return Response(serializer.data)


class ColorViewSet(viewsets.ModelViewSet):
    """Quản lý màu sắc"""
    queryset = Color.objects.all()
    serializer_class = ColorSerializer
    permission_classes = [IsAuthenticated]  # Chỉ cần đăng nhập


class SizeViewSet(viewsets.ModelViewSet):
    """Quản lý kích thước"""
    queryset = Size.objects.all()
    serializer_class = SizeSerializer
    permission_classes = [IsAuthenticated]  # Chỉ cần đăng nhập


class ProductVariantViewSet(viewsets.ModelViewSet):
    """Quản lý biến thể sản phẩm (màu + size + tồn kho)"""
    queryset = ProductVariant.objects.select_related('product', 'color', 'size').all()
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAuthenticated]  # Chỉ cần đăng nhập

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset


class ProductImageViewSet(viewsets.ModelViewSet):
    """Quản lý ảnh sản phẩm"""
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer
    permission_classes = [IsAuthenticated]  # Chỉ cần đăng nhập

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset
