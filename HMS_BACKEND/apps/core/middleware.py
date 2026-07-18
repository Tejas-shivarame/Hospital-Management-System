from django.utils.deprecation import MiddlewareMixin


class AuditLogMiddleware(MiddlewareMixin):
    """
    Records every state-changing request (POST/PUT/PATCH/DELETE) made by an
    authenticated user into AuditLog. Read-only GETs are not logged to keep
    the table lean; extend via AUDIT_LOG_ALL_METHODS if full read auditing
    is required for compliance.
    """

    AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    def process_response(self, request, response):
        try:
            if request.method in self.AUDITED_METHODS and getattr(request, "user", None) and request.user.is_authenticated:
                from apps.core.models import AuditLog

                AuditLog.objects.create(
                    user=request.user,
                    hospital=getattr(request.user, "hospital", None),
                    action=f"{request.method} {request.path}",
                    method=request.method,
                    path=request.path,
                    status_code=response.status_code,
                    ip_address=self._get_client_ip(request),
                    user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
                )
        except Exception:
            # Audit logging must never break the actual request/response cycle.
            pass
        return response

    @staticmethod
    def _get_client_ip(request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
