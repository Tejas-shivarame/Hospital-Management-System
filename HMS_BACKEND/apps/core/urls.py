from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.core.views import HospitalViewSet, BranchViewSet, DepartmentViewSet, StaffAssignView

app_name = "core"

router = DefaultRouter()
router.register("hospitals", HospitalViewSet, basename="hospital")
router.register("branches", BranchViewSet, basename="branch")
router.register("departments", DepartmentViewSet, basename="department")

urlpatterns = [
    path("staff/assign/", StaffAssignView.as_view(), name="staff_assign"),
    path("", include(router.urls)),
]
