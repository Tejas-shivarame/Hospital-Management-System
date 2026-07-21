from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.doctors.views import (
    SpecializationViewSet, DoctorProfileCreateView, DoctorViewSet,
    DoctorAvailabilityViewSet, DoctorTimeOffViewSet,
)

app_name = "doctors"

router = DefaultRouter()
router.register("specializations", SpecializationViewSet, basename="specialization")
router.register("availability", DoctorAvailabilityViewSet, basename="doctor-availability")
router.register("time-off", DoctorTimeOffViewSet, basename="doctor-time-off")
router.register("", DoctorViewSet, basename="doctor")

urlpatterns = [
    path("profiles/", DoctorProfileCreateView.as_view(), name="profile_create"),
    path("", include(router.urls)),
]
