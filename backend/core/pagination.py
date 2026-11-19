from rest_framework.pagination import PageNumberPagination


class StandardResultsPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 50


def page_params(request, default_size: int = 20) -> tuple[int, int]:
    """Safely parse page/page_size for manually paginated APIViews."""
    try:
        page = int(request.query_params.get("page", 1))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = int(request.query_params.get("page_size", default_size))
    except (TypeError, ValueError):
        page_size = default_size
    return max(page, 1), min(max(page_size, 1), 50)
