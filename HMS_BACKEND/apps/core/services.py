"""Service layer for apps.core — hospital/branch/department orchestration that doesn't belong in views."""


def dispatch_hospital_admin_welcome(admin_user, hospital, temp_password_note=None):
    from apps.accounts.tasks import send_welcome_email_task
    send_welcome_email_task.delay(str(admin_user.id))


def dispatch_staff_welcome(user):
    from apps.accounts.tasks import send_welcome_email_task
    send_welcome_email_task.delay(str(user.id))
