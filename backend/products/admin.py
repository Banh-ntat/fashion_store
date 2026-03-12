from django.contrib import admin
from .models import Category, Promotion, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('name', 'discount_percent', 'start_date', 'end_date')
    list_filter = ('start_date', 'end_date')
    search_fields = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'old_price', 'stock')
    list_filter = ('category', 'promotion')
    search_fields = ('name', 'description')
