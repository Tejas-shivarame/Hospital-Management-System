"""Service layer for apps.patients — notification dispatch kept out of views."""


def dispatch_patient_registration_notice(user):
    """
    New patient registered by staff: send them a password-reset link (they
    never chose their own password) so they can set one and log in.
    """
    from apps.accounts.services import issue_password_reset_token
    issue_password_reset_token(user)
