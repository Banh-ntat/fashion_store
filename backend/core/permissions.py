from rest_framework import permissions


class RoleChoices:
    """Role constants for the application"""
    CUSTOMER = 'customer'
    ADMIN = 'admin'
    PRODUCT_MANAGER = 'product_manager'
    ORDER_MANAGER = 'order_manager'
    CUSTOMER_SUPPORT = 'customer_support'

    CHOICES = [
        (CUSTOMER, 'Customer'),
        (ADMIN, 'Admin'),
        (PRODUCT_MANAGER, 'Product Manager'),
        (ORDER_MANAGER, 'Order Manager'),
        (CUSTOMER_SUPPORT, 'Customer Support'),
    ]


def get_user_role(user):
    """Get the role of a user (from Profile)."""
    if not user.is_authenticated:
        return None
    try:
        # Truy vấn trực tiếp tránh lỗi RelatedObjectDoesNotExist / truy cập profile lạ
        from accounts.models import Profile

        role = Profile.objects.filter(user_id=user.pk).values_list("role", flat=True).first()
        if role is None:
            return RoleChoices.CUSTOMER
        return role
    except Exception:
        return RoleChoices.CUSTOMER


def is_admin(user):
    """Check if user is admin"""
    return user.is_authenticated and get_user_role(user) == RoleChoices.ADMIN


def is_staff(user):
    """Quyền nhân viên: superuser Django, cờ is_staff Django, hoặc Profile.role khách hàng."""
    if not user.is_authenticated:
        return False
    if getattr(user, "is_superuser", False):
        return True
    # Tài khoản được tick "Staff" trong Django Admin vẫn vào được API nội bộ
    if getattr(user, "is_staff", False):
        return True
    role = get_user_role(user)
    return role != RoleChoices.CUSTOMER and role is not None


def is_product_manager(user):
    """Check if user can manage products"""
    if not user.is_authenticated:
        return False
    role = get_user_role(user)
    return role in [RoleChoices.ADMIN, RoleChoices.PRODUCT_MANAGER]


def is_order_manager(user):
    """Check if user can manage orders"""
    if not user.is_authenticated:
        return False
    role = get_user_role(user)
    return role in [RoleChoices.ADMIN, RoleChoices.ORDER_MANAGER]


def is_customer_support(user):
    """Check if user can provide customer support"""
    if not user.is_authenticated:
        return False
    role = get_user_role(user)
    return role in [RoleChoices.ADMIN, RoleChoices.CUSTOMER_SUPPORT]


def is_order_staff(user):
    """Admin, order_manager hoặc customer_support — được cập nhật trạng thái đơn."""
    if not user.is_authenticated:
        return False
    role = get_user_role(user)
    return role in (
        RoleChoices.ADMIN,
        RoleChoices.ORDER_MANAGER,
        RoleChoices.CUSTOMER_SUPPORT,
    )


class IsOrderStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return is_order_staff(request.user)


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allow anyone to read, but only admins can write
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return is_admin(request.user)


class IsAdmin(permissions.BasePermission):
    """
    Only allow admin users
    """
    def has_permission(self, request, view):
        return is_admin(request.user)


class IsAdminOrStaff(permissions.BasePermission):
    """
    Allow admin or any staff member
    """
    def has_permission(self, request, view):
        return is_staff(request.user)


class IsProductManager(permissions.BasePermission):
    """
    Allow admin or product manager
    """
    def has_permission(self, request, view):
        return is_product_manager(request.user)


class IsOrderManager(permissions.BasePermission):
    """
    Allow admin or order manager
    """
    def has_permission(self, request, view):
        return is_order_manager(request.user)


class IsCustomerSupport(permissions.BasePermission):
    """
    Allow admin or customer support
    """
    def has_permission(self, request, view):
        return is_customer_support(request.user)


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allow owners to edit their own objects, or admin to edit any
    """
    def has_object_permission(self, request, view, obj):
        if is_admin(request.user):
            return True
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'profile') and hasattr(obj.profile, 'user'):
            return obj.profile.user == request.user
        return False


class IsAuthenticatedOrReadOnlyForCustomer(permissions.BasePermission):
    """
    Allow unauthenticated users to read
    Allow authenticated users to read and create
    Allow only staff/admin to modify (PUT, PATCH, DELETE)
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return is_staff(request.user)
        return True
