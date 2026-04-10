from django.contrib.auth.models import User
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.core.mail import send_mail
from urllib.parse import quote, urlencode

import requests
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

from core.permissions import is_admin, is_staff, RoleChoices
from .models import Profile
from .serializers import (
    ProfileSerializer,
    RegisterSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


def _facebook_profile_picture_url(userinfo: dict) -> str:
    """
    Graph API có thể trả picture: null hoặc cấu trúc khác — không dùng chuỗi .get lồng trực tiếp
    (ví dụ userinfo.get('picture', {}) trả None nếu key tồn tại với giá trị null).
    """
    raw = userinfo.get("picture")
    if not isinstance(raw, dict):
        return ""
    data = raw.get("data")
    if not isinstance(data, dict):
        return ""
    url = (data.get("url") or "").strip()
    return url[:500]


class CustomTokenObtainPairView(TokenObtainPairView):
    """Đăng nhập bằng username hoặc email; trả về lỗi tiếng Việt."""
    serializer_class = CustomTokenObtainPairSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user) or getattr(user, "is_superuser", False):
            return Profile.objects.all()
        return Profile.objects.filter(user=user)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Đăng ký thành công!",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return Response({"message": "Đổi mật khẩu thành công!"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = Profile.objects.get(user=user)
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": profile.phone,
            "address": profile.address,
            "role": profile.role,
            "can_access_admin": is_staff(request.user),
            "is_admin": is_admin(request.user),
        })


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.get(email=email)

            # Generate password reset token
            from django.contrib.auth.tokens import default_token_generator
            token = default_token_generator.make_token(user)

            frontend = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:5173").rstrip("/")
            reset_url = f"{frontend}/reset-password?{urlencode({'token': token, 'user_id': str(user.id)})}"

            # Send email
            try:
                send_mail(
                    subject='Đặt lại mật khẩu - FashionStore',
                    message=f'''
                    Xin chào {user.username},

                    Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản FashionStore của mình.

                    Nhấp vào liên kết bên dưới để đặt lại mật khẩu:
                    {reset_url}

                    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

                    Trân trọng,
                    FashionStore
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception as e:
                return Response({
                    "message": f"Lỗi gửi email: {str(e)}. Vui lòng thử lại sau."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "message": f"Liên kết đặt lại mật khẩu đã được gửi đến {email}"
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["_user"]
            user.set_password(serializer.validated_data["new_password"])
            user.save()
            return Response(
                {
                    "message": "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới."
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GoogleAuthUrlView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Generate Google OAuth2 authorization URL"""
        client_id = settings.GOOGLE_CLIENT_ID
        redirect_uri = settings.GOOGLE_REDIRECT_URI

        if not client_id:
            return Response({
                "error": "Google OAuth chưa được cấu hình"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Google OAuth2 authorization URL
        scope = "openid email profile"
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope={scope}&"
            f"access_type=offline&"
            f"prompt=select_account"
        )

        return Response({
            "auth_url": auth_url
        })


class GoogleCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Exchange authorization code for tokens and authenticate user"""
        code = request.data.get('code')

        if not code:
            return Response({
                "error": "Thiếu mã authorization"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Exchange code for tokens
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            }

            token_response = requests.post(token_url, data=token_data)
            token_response.raise_for_status()
            tokens = token_response.json()

            # Get user info from Google
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            userinfo_headers = {"Authorization": f"Bearer {tokens['access_token']}"}
            userinfo_response = requests.get(userinfo_url, headers=userinfo_headers)
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()

            # Find or create user
            email = userinfo.get('email')
            google_id = userinfo.get('id')

            if not email:
                return Response({
                    "error": "Không thể lấy thông tin email từ Google"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Try to find existing user by email
            user = User.objects.filter(email=email).first()

            if user:
                # Update existing user with Google info
                profile = Profile.objects.get(user=user)
                profile.google_id = google_id
                profile.save()
            else:
                # Create new user
                username = email.split('@')[0]
                # Ensure username is unique
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=userinfo.get('given_name', ''),
                    last_name=userinfo.get('family_name', ''),
                )

                Profile.objects.create(
                    user=user,
                    google_id=google_id,
                    phone='',
                    address='',
                    role=RoleChoices.CUSTOMER
                )

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                }
            })

        except requests.exceptions.RequestException as e:
            return Response({
                "error": f"Lỗi kết nối với Google: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "error": f"Lỗi xác thực Google: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Handle Google ID token verification (alternative method)"""
        id_token = request.data.get('id_token')

        if not id_token:
            return Response({
                "error": "Thiếu ID token"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify Google ID token
            verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
            verify_response = requests.get(verify_url)
            verify_response.raise_for_status()
            userinfo = verify_response.json()

            # Extract user info
            email = userinfo.get('email')
            google_id = userinfo.get('sub')

            if not email:
                return Response({
                    "error": "Không thể lấy thông tin email từ Google"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Find or create user
            user = User.objects.filter(email=email).first()

            if user:
                profile = Profile.objects.get(user=user)
                profile.google_id = google_id
                profile.save()
            else:
                username = email.split('@')[0]
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=userinfo.get('given_name', ''),
                    last_name=userinfo.get('family_name', ''),
                )

                Profile.objects.create(
                    user=user,
                    google_id=google_id,
                    phone='',
                    address='',
                    role=RoleChoices.CUSTOMER
                )

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                }
            })

        except requests.exceptions.RequestException as e:
            return Response({
                "error": f"Lỗi xác thực Google: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "error": f"Lỗi xử lý: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class FacebookAuthUrlView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Generate Facebook OAuth2 authorization URL"""
        app_id = settings.FACEBOOK_APP_ID
        redirect_uri = settings.FACEBOOK_REDIRECT_URI

        if not app_id:
            return Response({
                "error": "Facebook OAuth chưa được cấu hình"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Chỉ dùng public_profile (tránh lỗi Invalid Scopes: email); email xử lý trong callback nếu thiếu
        scope = "public_profile"
        auth_url = (
            f"https://www.facebook.com/v21.0/dialog/oauth?"
            f"client_id={app_id}&"
            f"redirect_uri={quote(redirect_uri, safe='')}&"
            f"scope={scope}&"
            f"response_type=code&"
            f"state=facebook"
        )

        return Response({
            "auth_url": auth_url
        })


class FacebookCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Exchange authorization code for access token and authenticate user"""
        code = request.data.get('code')

        if not code:
            return Response({
                "error": "Thiếu mã authorization"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Exchange code for access token (redirect_uri phải khớp chính xác với Facebook App)
            token_url = "https://graph.facebook.com/v21.0/oauth/access_token"
            token_params = {
                "client_id": settings.FACEBOOK_APP_ID,
                "client_secret": settings.FACEBOOK_APP_SECRET,
                "code": code,
                "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
            }

            token_response = requests.get(token_url, params=token_params)
            tokens = token_response.json()

            if 'error' in tokens:
                err = tokens['error']
                msg = err.get('message', 'Lỗi xác thực Facebook')
                return Response({
                    "error": f"Facebook: {msg}. Kiểm tra Redirect URI trong Facebook App có đúng http://localhost:5173/auth/facebook/callback không."
                }, status=status.HTTP_400_BAD_REQUEST)

            access_token = tokens.get('access_token')
            if not access_token:
                return Response({
                    "error": "Không nhận được access token từ Facebook"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get user info from Facebook
            userinfo_url = "https://graph.facebook.com/v21.0/me"
            userinfo_params = {
                "fields": "id,name,email,first_name,last_name,picture",
                "access_token": access_token,
            }
            userinfo_response = requests.get(userinfo_url, params=userinfo_params)
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()

            if 'error' in userinfo:
                err = userinfo.get('error')
                if isinstance(err, dict):
                    msg = err.get('message', 'Lỗi lấy thông tin Facebook')
                else:
                    msg = str(err) if err else 'Lỗi lấy thông tin Facebook'
                return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

            # Extract user info (email có thể None nếu chỉ request public_profile)
            facebook_id = userinfo.get('id')
            if not facebook_id:
                return Response({
                    "error": "Facebook không trả id người dùng."
                }, status=status.HTTP_400_BAD_REQUEST)

            email = userinfo.get('email') or f"fb_{facebook_id}@placeholder.local"
            first_name = userinfo.get('first_name') or ''
            last_name = userinfo.get('last_name') or ''
            picture = _facebook_profile_picture_url(userinfo)

            # Find or create user (ưu tiên tìm theo facebook_id, rồi email)
            profile_row = Profile.objects.filter(facebook_id=facebook_id).first()
            user = profile_row.user if profile_row else None
            if not user and email:
                user = User.objects.filter(email=email).first()

            if user:
                profile, _ = Profile.objects.get_or_create(
                    user=user,
                    defaults={
                        "phone": "",
                        "address": "",
                        "role": RoleChoices.CUSTOMER,
                    },
                )
                profile.facebook_id = facebook_id
                if picture:
                    profile.avatar = picture
                profile.save()
            else:
                base_username = (email.split('@')[0] if '@' in email else f"fb_{facebook_id}").replace('.', '_')[:30]
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"[:30]
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )

                Profile.objects.create(
                    user=user,
                    facebook_id=facebook_id,
                    avatar=picture,
                    phone='',
                    address='',
                    role=RoleChoices.CUSTOMER
                )

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                }
            })

        except requests.exceptions.RequestException as e:
            return Response({
                "error": f"Lỗi kết nối với Facebook: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "error": f"Lỗi xác thực Facebook: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class FacebookLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Handle Facebook access token verification"""
        access_token = request.data.get('access_token')

        if not access_token:
            return Response({
                "error": "Thiếu access token"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify access token
            debug_url = "https://graph.facebook.com/debug_token"
            debug_params = {
                "input_token": access_token,
                "access_token": f"{settings.FACEBOOK_APP_ID}|{settings.FACEBOOK_APP_SECRET}",
            }

            debug_response = requests.get(debug_url, params=debug_params)
            debug_response.raise_for_status()
            debug_data = debug_response.json()

            if not debug_data.get('data', {}).get('is_valid'):
                return Response({
                    "error": "Access token không hợp lệ"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get user info from Facebook
            userinfo_url = "https://graph.facebook.com/v21.0/me"
            userinfo_params = {
                "fields": "id,name,email,first_name,last_name,picture",
                "access_token": access_token,
            }
            userinfo_response = requests.get(userinfo_url, params=userinfo_params)
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()

            facebook_id = userinfo.get('id')
            if not facebook_id:
                return Response({
                    "error": "Facebook không trả id người dùng."
                }, status=status.HTTP_400_BAD_REQUEST)

            email = userinfo.get('email') or f"fb_{facebook_id}@placeholder.local"
            first_name = userinfo.get('first_name') or ''
            last_name = userinfo.get('last_name') or ''
            picture = _facebook_profile_picture_url(userinfo)

            # Find or create user (ưu tiên facebook_id, rồi email)
            profile_obj = Profile.objects.filter(facebook_id=facebook_id).first()
            user = profile_obj.user if profile_obj else (User.objects.filter(email=email).first() if email else None)

            if user:
                profile, _ = Profile.objects.get_or_create(
                    user=user,
                    defaults={
                        "phone": "",
                        "address": "",
                        "role": RoleChoices.CUSTOMER,
                    },
                )
                profile.facebook_id = facebook_id
                if picture:
                    profile.avatar = picture
                profile.save()
            else:
                base_username = (email.split('@')[0] if '@' in email else f"fb_{facebook_id}").replace('.', '_')[:30]
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"[:30]
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )

                Profile.objects.create(
                    user=user,
                    facebook_id=facebook_id,
                    avatar=picture,
                    phone='',
                    address='',
                    role=RoleChoices.CUSTOMER
                )

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                }
            })

        except requests.exceptions.RequestException as e:
            return Response({
                "error": f"Lỗi xác thực Facebook: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "error": f"Lỗi xử lý: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
