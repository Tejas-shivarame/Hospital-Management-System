from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Wraps every DRF error response in a consistent envelope:
    { "success": false, "message": str, "errors": {...}, "status_code": int }
    """
    response = exception_handler(exc, context)

    if response is not None:
        errors = response.data
        message = "Request failed"
        if isinstance(errors, dict):
            if "detail" in errors:
                message = str(errors["detail"])
                errors = {k: v for k, v in errors.items() if k != "detail"} or None
            else:
                first_key = next(iter(errors), None)
                if first_key:
                    val = errors[first_key]
                    message = f"{first_key}: {val[0] if isinstance(val, list) else val}"
        response.data = {
            "success": False,
            "message": message,
            "errors": errors if errors else None,
            "status_code": response.status_code,
        }
        return response

    # Unhandled exceptions -> generic 500, never leak internals
    return Response(
        {
            "success": False,
            "message": "An unexpected error occurred. Please try again later.",
            "errors": None,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
