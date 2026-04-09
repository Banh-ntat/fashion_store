from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Profile
from core.permissions import RoleChoices


class ProfileRolePermissionTests(TestCase):
    """Đảm bảo chỉ admin/superuser mới PATCH được field role."""

    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username="cust",
            email="cust@example.com",
            password="secret12345",
        )
        self.customer_profile = Profile.objects.get(user=self.customer)

        self.other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="secret12345",
        )
        self.other_profile = Profile.objects.get(user=self.other)

        self.admin_user = User.objects.create_user(
            username="adm",
            email="adm@example.com",
            password="secret12345",
        )
        p = Profile.objects.get(user=self.admin_user)
        p.role = RoleChoices.ADMIN
        p.save()

        self.pm_user = User.objects.create_user(
            username="pm",
            email="pm@example.com",
            password="secret12345",
        )
        p2 = Profile.objects.get(user=self.pm_user)
        p2.role = RoleChoices.PRODUCT_MANAGER
        p2.save()

    def test_customer_cannot_patch_own_role(self):
        self.client.force_authenticate(user=self.customer)
        url = f"/api/accounts/profiles/{self.customer_profile.id}/"
        res = self.client.patch(url, {"role": RoleChoices.ADMIN}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", res.data)
        self.customer_profile.refresh_from_db()
        self.assertEqual(self.customer_profile.role, RoleChoices.CUSTOMER)

    def test_customer_can_patch_phone_without_role(self):
        self.client.force_authenticate(user=self.customer)
        url = f"/api/accounts/profiles/{self.customer_profile.id}/"
        res = self.client.patch(url, {"phone": "0909123456"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.customer_profile.refresh_from_db()
        self.assertEqual(self.customer_profile.phone, "0909123456")
        self.assertEqual(self.customer_profile.role, RoleChoices.CUSTOMER)

    def test_product_manager_cannot_patch_own_role(self):
        self.client.force_authenticate(user=self.pm_user)
        pm_profile = Profile.objects.get(user=self.pm_user)
        url = f"/api/accounts/profiles/{pm_profile.id}/"
        res = self.client.patch(url, {"role": RoleChoices.ADMIN}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        pm_profile.refresh_from_db()
        self.assertEqual(pm_profile.role, RoleChoices.PRODUCT_MANAGER)

    def test_admin_can_patch_other_user_role(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/accounts/profiles/{self.other_profile.id}/"
        res = self.client.patch(
            url, {"role": RoleChoices.ORDER_MANAGER}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.other_profile.refresh_from_db()
        self.assertEqual(self.other_profile.role, RoleChoices.ORDER_MANAGER)

    def test_current_user_is_admin_flag(self):
        self.client.force_authenticate(user=self.customer)
        r = self.client.get("/api/auth/user/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertFalse(r.data.get("is_admin"))

        self.client.force_authenticate(user=self.admin_user)
        r = self.client.get("/api/auth/user/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(r.data.get("is_admin"))

    def test_superuser_can_patch_role_without_profile_admin(self):
        su = User.objects.create_superuser(
            username="su",
            email="su@example.com",
            password="secret12345",
        )
        Profile.objects.filter(user=su).update(role=RoleChoices.CUSTOMER)
        self.client.force_authenticate(user=su)
        url = f"/api/accounts/profiles/{self.customer_profile.id}/"
        res = self.client.patch(
            url, {"role": RoleChoices.CUSTOMER_SUPPORT}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.customer_profile.refresh_from_db()
        self.assertEqual(
            self.customer_profile.role, RoleChoices.CUSTOMER_SUPPORT
        )


class PasswordResetConfirmTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="reset_u",
            email="reset_u@example.com",
            password="OldSecret12345",
        )

    def test_confirm_valid_token_changes_password(self):
        token = default_token_generator.make_token(self.user)
        res = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "user_id": self.user.id,
                "token": token,
                "new_password": "NewSecret12345",
                "new_password_confirm": "NewSecret12345",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewSecret12345"))

    def test_confirm_invalid_token_rejected(self):
        res = self.client.post(
            "/api/auth/password/reset/confirm/",
            {
                "user_id": self.user.id,
                "token": "invalid-token",
                "new_password": "NewSecret12345",
                "new_password_confirm": "NewSecret12345",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldSecret12345"))
