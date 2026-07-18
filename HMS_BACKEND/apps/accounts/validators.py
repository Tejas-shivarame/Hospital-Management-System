import re
from django.core.exceptions import ValidationError


class ComplexPasswordValidator:
    """Requires at least one uppercase, one lowercase, one digit, one special character."""

    def validate(self, password, user=None):
        if not re.search(r"[A-Z]", password):
            raise ValidationError("Password must contain at least one uppercase letter.", code="password_no_upper")
        if not re.search(r"[a-z]", password):
            raise ValidationError("Password must contain at least one lowercase letter.", code="password_no_lower")
        if not re.search(r"\d", password):
            raise ValidationError("Password must contain at least one digit.", code="password_no_digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=]", password):
            raise ValidationError("Password must contain at least one special character.", code="password_no_special")

    def get_help_text(self):
        return "Password must include upper/lowercase letters, a digit, and a special character."
