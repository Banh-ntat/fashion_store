from django.contrib import admin
from .models import Category, Promotion, Product, ProductImage, Color, Size, ProductVariant


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('name', 'discount_percent', 'start_date', 'end_date')
    list_filter = ('start_date', 'end_date')
    search_fields = ('name',)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ('image',)


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ('color', 'size', 'stock')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price')
    list_filter = ('category', 'promotion')
    search_fields = ('name', 'description')
    inlines = [ProductImageInline, ProductVariantInline]


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ('name', 'code')
    search_fields = ('name',)


@admin.register(Size)
class SizeAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
