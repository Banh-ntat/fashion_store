from django.urls import path
from .views import WishlistProductIdsView, WishlistToggleView, WishlistSyncView

urlpatterns = [
    path('ids/', WishlistProductIdsView.as_view(), name='wishlist-ids'),
    path('toggle/', WishlistToggleView.as_view(), name='wishlist-toggle'),
    path('sync/', WishlistSyncView.as_view(), name='wishlist-sync'),
]