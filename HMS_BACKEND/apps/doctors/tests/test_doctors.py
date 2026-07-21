import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.accounts.tests.factories import UserFactory
from apps.core.tests.factories import HospitalFactory, BranchFactory
from apps.doctors.models import Doctor
from apps.doctors.tests.factories import SpecializationFactory, DoctorFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def auth(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


class TestDoctorProfileCreation:
    def test_hospital_admin_can_create_doctor_profile(self, api_client):
        hospital = HospitalFactory()
        branch = BranchFactory(hospital=hospital)
        admin = UserFactory(role=Role.HOSPITAL_ADMIN, hospital=hospital, is_verified=True)
        doctor_user = UserFactory(role=Role.DOCTOR, hospital=hospital, is_verified=True)
        specialization = SpecializationFactory()
        auth(api_client, admin)

        payload = {
            "user_id": str(doctor_user.id), "branch": str(branch.id),
            "license_number": "MCI-12345", "qualification": "MBBS, MD",
            "experience_years": 8, "consultation_fee": "500.00",
            "specialization_ids": [str(specialization.id)],
        }
        response = api_client.post(reverse("doctors:profile_create"), payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["data"]["license_number"] == "MCI-12345"
        assert Doctor.objects.filter(user=doctor_user).exists()

    def test_cannot_create_duplicate_profile_for_same_user(self, api_client):
        hospital = HospitalFactory()
        branch = BranchFactory(hospital=hospital)
        admin = UserFactory(role=Role.HOSPITAL_ADMIN, hospital=hospital, is_verified=True)
        existing_doctor = DoctorFactory(hospital=hospital, branch=branch)
        auth(api_client, admin)
        payload = {"user_id": str(existing_doctor.user.id), "branch": str(branch.id), "license_number": "MCI-99999"}
        response = api_client.post(reverse("doctors:profile_create"), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_reuse_license_number(self, api_client):
        hospital = HospitalFactory()
        branch = BranchFactory(hospital=hospital)
        admin = UserFactory(role=Role.HOSPITAL_ADMIN, hospital=hospital, is_verified=True)
        DoctorFactory(hospital=hospital, branch=branch, license_number="DUPLICATE-1")
        doctor_user = UserFactory(role=Role.DOCTOR, hospital=hospital, is_verified=True)
        auth(api_client, admin)
        payload = {"user_id": str(doctor_user.id), "branch": str(branch.id), "license_number": "DUPLICATE-1"}
        response = api_client.post(reverse("doctors:profile_create"), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_doctor_cannot_create_own_profile(self, api_client):
        hospital = HospitalFactory()
        branch = BranchFactory(hospital=hospital)
        doctor_user = UserFactory(role=Role.DOCTOR, hospital=hospital, is_verified=True)
        auth(api_client, doctor_user)
        payload = {"user_id": str(doctor_user.id), "branch": str(branch.id), "license_number": "MCI-1"}
        response = api_client.post(reverse("doctors:profile_create"), payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_create_profile_for_user_outside_hospital(self, api_client):
        own_hospital = HospitalFactory()
        other_hospital = HospitalFactory()
        own_branch = BranchFactory(hospital=own_hospital)
        admin = UserFactory(role=Role.HOSPITAL_ADMIN, hospital=own_hospital, is_verified=True)
        outside_doctor_user = UserFactory(role=Role.DOCTOR, hospital=other_hospital, is_verified=True)
        auth(api_client, admin)
        payload = {"user_id": str(outside_doctor_user.id), "branch": str(own_branch.id), "license_number": "MCI-2"}
        response = api_client.post(reverse("doctors:profile_create"), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestDoctorAccess:
    def test_patient_can_browse_doctors_in_own_hospital(self, api_client):
        hospital = HospitalFactory()
        branch = BranchFactory(hospital=hospital)
        DoctorFactory.create_batch(2, hospital=hospital, branch=branch)
        patient = UserFactory(role=Role.PATIENT, hospital=hospital, is_verified=True)
        auth(api_client, patient)
        response = api_client.get(reverse("doctors:doctor-list"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["count"] == 2

    def test_cannot_see_other_hospitals_doctors(self, api_client):
        own_hospital = HospitalFactory()
        other_hospital = HospitalFactory()
        DoctorFactory.create_batch(3, hospital=other_hospital, branch=BranchFactory(hospital=other_hospital))
        receptionist = UserFactory(role=Role.RECEPTIONIST, hospital=own_hospital, is_verified=True)
        auth(api_client, receptionist)
        response = api_client.get(reverse("doctors:doctor-list"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["count"] == 0

    def test_doctor_me_endpoint(self, api_client):
        doctor = DoctorFactory()
        auth(api_client, doctor.user)
        response = api_client.get(reverse("doctors:doctor-me"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["license_number"] == doctor.license_number

    def test_doctor_can_update_own_profile(self, api_client):
        doctor = DoctorFactory()
        auth(api_client, doctor.user)
        response = api_client.patch(reverse("doctors:doctor-me"), {"bio": "15 years in cardiology."}, format="json")
        assert response.status_code == status.HTTP_200_OK
        doctor.refresh_from_db()
        assert doctor.bio == "15 years in cardiology."

    def test_doctor_cannot_edit_another_doctors_profile(self, api_client):
        hospital = HospitalFactory()
        branch = BranchFactory(hospital=hospital)
        doctor1 = DoctorFactory(hospital=hospital, branch=branch)
        doctor2 = DoctorFactory(hospital=hospital, branch=branch)
        auth(api_client, doctor1.user)
        response = api_client.patch(
            reverse("doctors:doctor-detail", args=[doctor2.id]), {"bio": "Hacked"}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestDoctorAvailability:
    def test_doctor_can_add_own_availability(self, api_client):
        doctor = DoctorFactory()
        auth(api_client, doctor.user)
        payload = {
            "branch": str(doctor.branch.id), "day_of_week": 0,
            "start_time": "09:00:00", "end_time": "13:00:00",
        }
        response = api_client.post(reverse("doctors:doctor-availability-list"), payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_invalid_time_range_rejected(self, api_client):
        doctor = DoctorFactory()
        auth(api_client, doctor.user)
        payload = {
            "branch": str(doctor.branch.id), "day_of_week": 0,
            "start_time": "13:00:00", "end_time": "09:00:00",
        }
        response = api_client.post(reverse("doctors:doctor-availability-list"), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_doctor_cannot_set_availability_for_another_doctor(self, api_client):
        hospital = HospitalFactory()
        branch = BranchFactory(hospital=hospital)
        doctor1 = DoctorFactory(hospital=hospital, branch=branch)
        doctor2 = DoctorFactory(hospital=hospital, branch=branch)
        auth(api_client, doctor1.user)
        payload = {
            "doctor": str(doctor2.id), "branch": str(branch.id), "day_of_week": 1,
            "start_time": "10:00:00", "end_time": "12:00:00",
        }
        response = api_client.post(reverse("doctors:doctor-availability-list"), payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestDoctorTimeOff:
    def test_doctor_can_record_own_time_off(self, api_client):
        doctor = DoctorFactory()
        auth(api_client, doctor.user)
        payload = {"start_date": "2026-08-01", "end_date": "2026-08-05", "reason": "Conference"}
        response = api_client.post(reverse("doctors:doctor-time-off-list"), payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_receptionist_cannot_record_time_off(self, api_client):
        hospital = HospitalFactory()
        receptionist = UserFactory(role=Role.RECEPTIONIST, hospital=hospital, is_verified=True)
        auth(api_client, receptionist)
        payload = {"start_date": "2026-08-01", "end_date": "2026-08-05"}
        response = api_client.post(reverse("doctors:doctor-time-off-list"), payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_date_range_rejected(self, api_client):
        doctor = DoctorFactory()
        auth(api_client, doctor.user)
        payload = {"start_date": "2026-08-10", "end_date": "2026-08-05"}
        response = api_client.post(reverse("doctors:doctor-time-off-list"), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
