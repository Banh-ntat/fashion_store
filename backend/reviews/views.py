from rest_framework import permissions, viewsets

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


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["product"]

    def get_queryset(self):
        return Comment.objects.select_related("user", "product").all().order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
