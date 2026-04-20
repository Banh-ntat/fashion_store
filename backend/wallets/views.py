from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Wallet, WalletTransaction

# View lấy dữ liệu thực từ Database
class WalletInfoView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        txs = WalletTransaction.objects.filter(wallet=wallet).order_by('-created_at')
        return Response({
            "balance": wallet.balance,
            "transactions": [
                {
                    "id": t.id,
                    "note": t.note,
                    "amount": t.amount,
                    "created_at": t.created_at.strftime("%d/%m/%Y")
                } for t in txs
            ]
        })

# Khai báo View rút tiền (Để khớp với lỗi import)
class WithdrawRequestView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        # Logic rút tiền của Huy ở đây
        return Response({"message": "Đã gửi yêu cầu rút tiền"})

# Khai báo View nạp tiền/hành động khác (Để khớp với lỗi import)
class WalletActionView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        # Logic nạp tiền MoMo của Huy ở đây
        return Response({"message": "Đang xử lý hành động"})