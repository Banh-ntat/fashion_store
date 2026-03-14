from rest_framework import permissions, viewsets, status
from rest_framework.response import Response

from core.permissions import is_admin, IsOwnerOrAdmin
from .models import Review, Comment
from .serializers import ReviewSerializer, CommentSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["product", "rating"]

    def get_queryset(self):
        return Review.objects.select_related("user", "product").all().order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Allow admin to delete any review, others can only delete their own"""
        instance = self.get_object()
        if is_admin(request.user) or instance.user == request.user:
            return super().destroy(request, *args, **kwargs)
        return Response(
            {"detail": "You do not have permission to delete this review."},
            status=status.HTTP_403_FORBIDDEN
        )


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["product"]

    def get_queryset(self):
        return Comment.objects.select_related("user", "product").all().order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Allow admin to delete any comment, others can only delete their own"""
        instance = self.get_object()
        if is_admin(request.user) or instance.user == request.user:
            return super().destroy(request, *args, **kwargs)
        return Response(
            {"detail": "You do not have permission to delete this comment."},
            status=status.HTTP_403_FORBIDDEN
        )
