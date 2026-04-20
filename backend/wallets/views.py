from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Wallet, WalletTransaction

# - Cấu trúc class dựa trên hình ảnh code bạn đã cung cấp
class WalletInfoView(APIView):
    """
    View để lấy thông tin số dư ví của người dùng hiện tại.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        return Response({
            "balance": wallet.balance
        }, status=status.HTTP_200_OK)

class WalletActionView(APIView):
    """
    View xử lý nạp tiền (deposit) và rút tiền (withdraw).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action_type = request.data.get('type')  # 'deposit' hoặc 'withdraw'
        try:
            amount = int(request.data.get('amount', 0))
        except (ValueError, TypeError):
            return Response({"error": "Số tiền không hợp lệ"}, status=status.HTTP_400_BAD_REQUEST)

        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        if amount <= 0:
            return Response({"error": "Số tiền phải lớn hơn 0"}, status=status.HTTP_400_BAD_REQUEST)

        if action_type == 'withdraw':
            if wallet.balance < amount:
                return Response({"error": "Số dư không đủ để rút"}, status=status.HTTP_400_BAD_REQUEST)
            wallet.balance -= amount
            note = "Rút tiền về tài khoản ngân hàng/MoMo"
        elif action_type == 'deposit':
            wallet.balance += amount
            note = "Nạp tiền vào ví qua cổng thanh toán"
        else:
            return Response({"error": "Hành động không hợp lệ"}, status=status.HTTP_400_BAD_REQUEST)

        wallet.save()

        # Lưu lịch sử giao dịch
        WalletTransaction.objects.create(
            wallet=wallet,
            amount=amount,
            transaction_type=action_type,
            note=note
        )

        return Response({
            "balance": wallet.balance,
            "message": "Giao dịch thành công!"
        }, status=status.HTTP_200_OK)

class WithdrawRequestView(APIView):
    """
    View xử lý yêu cầu rút tiền riêng biệt (nếu cần mở rộng logic sau này).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Hiện tại có thể dùng chung logic ở WalletActionView hoặc viết riêng tại đây
        return Response({"message": "Yêu cầu rút tiền đã được ghi nhận và đang chờ xử lý."}, status=status.HTTP_202_ACCEPTED)