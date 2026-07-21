import factory
from apps.doctors.models import Specialization, Doctor
from apps.accounts.tests.factories import UserFactory
from apps.accounts.models import Role
from apps.core.tests.factories import HospitalFactory, BranchFactory


class SpecializationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Specialization
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"Specialization {n}")


class DoctorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Doctor

    hospital = factory.SubFactory(HospitalFactory)
    branch = factory.SubFactory(BranchFactory)
    user = factory.SubFactory(UserFactory, role=Role.DOCTOR, hospital=factory.SelfAttribute("..hospital"))
    license_number = factory.Sequence(lambda n: f"LIC-{n:06d}")
