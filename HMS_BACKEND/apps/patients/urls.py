from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.patients.views import PatientRegistrationView, PatientViewSet, PatientDocumentViewSet

app_name = "patients"

router = DefaultRouter()
router.register("documents", PatientDocumentViewSet, basename="patient-document")
router.register("", PatientViewSet, basename="patient")

urlpatterns = [
    path("register/", PatientRegistrationView.as_view(), name="register"),
    path("", include(router.urls)),
]
