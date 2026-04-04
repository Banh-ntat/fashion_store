from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product
from .models import WishlistItem


class WishlistProductIdsView(APIView):
    """GET — danh sách product_id yêu thích của user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ids = list(
            WishlistItem.objects.filter(user=request.user)
            .values_list('product_id', flat=True)
            .order_by('-created_at')
        )
        return Response({'product_ids': ids})


class WishlistToggleView(APIView):
    """POST { product_id } — thêm hoặc bỏ yêu thích, trả về trạng thái mới."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            product_id = int(request.data.get('product_id'))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'product_id không hợp lệ.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not Product.objects.filter(pk=product_id).exists():
            return Response(
                {'detail': 'Sản phẩm không tồn tại.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        item = WishlistItem.objects.filter(
            user=request.user, product_id=product_id
        ).first()
        if item:
            item.delete()
            in_wishlist = False
        else:
            WishlistItem.objects.create(user=request.user, product_id=product_id)
            in_wishlist = True

        product_ids = list(
            WishlistItem.objects.filter(user=request.user)
            .values_list('product_id', flat=True)
            .order_by('-created_at')
        )
        return Response(
            {
                'in_wishlist': in_wishlist,
                'product_ids': product_ids,
            }
        )


class WishlistSyncView(APIView):
    """
    POST { product_ids: number[] } — đồng bộ từ localStorage lên server (merge, không xóa mục đã có).
    Chỉ thêm các id chưa có trong wishlist.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        raw = request.data.get('product_ids')
        if not isinstance(raw, list):
            return Response(
                {'detail': 'product_ids phải là mảng.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ids = []
        for x in raw:
            try:
                ids.append(int(x))
            except (TypeError, ValueError):
                continue
        ids = list(dict.fromkeys(ids))
        valid_ids = set(
            Product.objects.filter(pk__in=ids).values_list('pk', flat=True)
        )
        for pid in valid_ids:
            WishlistItem.objects.get_or_create(
                user=request.user, product_id=pid
            )
        product_ids = list(
            WishlistItem.objects.filter(user=request.user)
            .values_list('product_id', flat=True)
            .order_by('-created_at')
        )
        return Response({'product_ids': product_ids})
