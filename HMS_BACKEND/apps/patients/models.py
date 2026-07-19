from django.db import models, transaction
from apps.core.models import TimeStampedModel, SoftDeleteModel


class BloodGroup(models.TextChoices):
    A_POS = "A+", "A+"
    A_NEG = "A-", "A-"
    B_POS = "B+", "B+"
    B_NEG = "B-", "B-"
    AB_POS = "AB+", "AB+"
    AB_NEG = "AB-", "AB-"
    O_POS = "O+", "O+"
    O_NEG = "O-", "O-"
    UNKNOWN = "unknown", "Unknown"


class Patient(SoftDeleteModel):
    """
    Clinical/administrative profile for a User with role=patient. Kept
    separate from User so accounts stays lean and this can grow (EHR module
    will hang additional detail off this same Patient record).
    """

    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="patient_profile")
    hospital = models.ForeignKey("core.Hospital", on_delete=models.CASCADE, related_name="patients")
    branch = models.ForeignKey("core.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="patients")

    mrn = models.CharField(max_length=40, unique=True, editable=False, db_index=True)  # Medical Record Number

    blood_group = models.CharField(max_length=10, choices=BloodGroup.choices, default=BloodGroup.UNKNOWN)
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relation = models.CharField(max_length=50, blank=True)

    marital_status = models.CharField(
        max_length=20,
        choices=[("single", "Single"), ("married", "Married"), ("other", "Other")],
        blank=True,
    )
    occupation = models.CharField(max_length=100, blank=True)

    known_allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)

    insurance_provider = models.CharField(max_length=150, blank=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True)

    registered_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patients_registered",
        help_text="Receptionist/staff who registered this patient, if not self-registered.",
    )

    class Meta:
        db_table = "patients_patient"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["hospital", "mrn"])]

    def __str__(self):
        return f"{self.mrn} — {self.user.get_full_name()}"

    def save(self, *args, **kwargs):
        if not self.mrn:
            self.mrn = self._generate_mrn()
        super().save(*args, **kwargs)

    def _generate_mrn(self):
        """
        Simple sequential MRN per hospital: <reg-number-suffix>-PT-00001.
        Wrapped in a transaction with select_for_update to avoid duplicate
        sequence numbers under concurrent registration.
        """
        with transaction.atomic():
            count = (
                Patient.objects.select_for_update()
                .filter(hospital=self.hospital)
                .count()
            )
            suffix = self.hospital.registration_number[-4:].upper()
            return f"{suffix}-PT-{count + 1:05d}"


class DocumentType(models.TextChoices):
    LAB_REPORT = "lab_report", "Lab Report"
    PRESCRIPTION = "prescription", "Prescription"
    ID_PROOF = "id_proof", "ID Proof"
    INSURANCE = "insurance", "Insurance Document"
    DISCHARGE_SUMMARY = "discharge_summary", "Discharge Summary"
    OTHER = "other", "Other"


def patient_document_upload_path(instance, filename):
    return f"patients/{instance.patient.hospital_id}/{instance.patient.mrn}/{filename}"


class PatientDocument(TimeStampedModel):
    """Patient-uploaded or staff-uploaded files: reports, prescriptions, ID proofs, etc."""

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="documents")
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    document_type = models.CharField(max_length=30, choices=DocumentType.choices, default=DocumentType.OTHER)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to=patient_document_upload_path)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "patients_document"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.patient.mrn})"
