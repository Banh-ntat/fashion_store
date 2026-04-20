from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Wallet, WalletTransaction
from .serializers import TransactionSerializer
from decimal import Decimal

class WalletInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        # Lấy 20 giao dịch gần nhất
        transactions = wallet.transactions.all().order_by('-created_at')[:20]
        return Response({
            "balance": wallet.balance,
            "transactions": TransactionSerializer(transactions, many=True).data
        })

class WithdrawRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            amount_raw = request.data.get('amount')
            momo_phone = request.data.get('momo_phone')
            
            if not amount_raw or not momo_phone:
                return Response({"error": "Thiếu số tiền hoặc số điện thoại"}, status=400)

            amount = Decimal(str(amount_raw))
            wallet = Wallet.objects.get(user=request.user)

            if amount < 10000:
                return Response({"error": "Số tiền rút tối thiểu là 10,000 VNĐ"}, status=400)

            if wallet.balance < amount:
                return Response({"error": "Số dư ví không đủ"}, status=400)

            with transaction.atomic():
                # Trừ tiền ngay lập tức (trạng thái chờ duyệt)
                wallet.balance -= amount
                wallet.save()

                WalletTransaction.objects.create(
                    wallet=wallet,
                    amount=amount,
                    type='withdrawal',
                    status='pending',
                    description=f"Rút về MoMo: {momo_phone}"
                )

            return Response({"message": "Yêu cầu rút tiền đã được gửi thành công"})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class WalletActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # API dùng cho thanh toán đơn hàng (pay) hoặc hoàn tiền (refund)
        action_type = request.data.get('type') # 'pay' hoặc 'refund'
        amount = Decimal(str(request.data.get('amount', 0)))
        description = request.data.get('description', '')
        wallet = Wallet.objects.get(user=request.user)

        with transaction.atomic():
            if action_type == 'pay':
                if wallet.balance < amount:
                    return Response({"error": "Không đủ tiền"}, status=400)
                wallet.balance -= amount
                type_db = 'payment'
            else:
                wallet.balance += amount
                type_db = 'refund'
            
            wallet.save()
            WalletTransaction.objects.create(
                wallet=wallet, amount=amount, type=type_db, status='completed', description=description
            )
        return Response({"new_balance": wallet.balance})