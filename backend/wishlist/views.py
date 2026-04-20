from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import WishlistItem
from products.models import Product
# Import Wallet từ app wallets để lấy dữ liệu thực
from wallets.models import Wallet, WalletTransaction 

class WishlistProductIdsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        ids = WishlistItem.objects.filter(user=request.user).values_list('product_id', flat=True)
        return Response(list(ids))

class WishlistToggleView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        product_id = request.data.get('product_id')
        wishlist_item = WishlistItem.objects.filter(user=request.user, product_id=product_id)
        if wishlist_item.exists():
            wishlist_item.delete()
            return Response({"message": "Removed from wishlist"}, status=status.HTTP_200_OK)
        WishlistItem.objects.create(user=request.user, product_id=product_id)
        return Response({"message": "Added to wishlist"}, status=status.HTTP_201_CREATED)

class WishlistSyncView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        # Logic đồng bộ wishlist của bạn
        return Response({"message": "Synced"})