from django.db import models
from django.utils import timezone


class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True) 

    def __str__(self):
        return self.name
class Promotion(models.Model):
    name = models.CharField(max_length=100)
    discount_percent = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()

    def __str__(self):
        return self.name

    @property
    def is_active(self) -> bool:
        today = timezone.localdate()
        return self.start_date <= today <= self.end_date


class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    price = models.IntegerField()
    promotion = models.ForeignKey(Promotion, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        # Tránh UnorderedObjectListWarning khi phân trang; thứ tự ổn định giữa các request
        ordering = ["-id"]

    def __str__(self):
        return self.name

class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    image = models.ImageField(upload_to="products/")
    def __str__(self):
        return self.product.name

class Color(models.Model):
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=10)
    def __str__(self):
        return self.name

class Size(models.Model):
    name = models.CharField(max_length=10)
    def __str__(self):
        return self.name

class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    color = models.ForeignKey(Color, on_delete=models.CASCADE)
    size = models.ForeignKey(Size, on_delete=models.CASCADE)
    stock = models.IntegerField()
    def __str__(self):
        return self.product.name + " - " + self.color.name + " - " + self.size.name
