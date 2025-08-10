from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from .models import Order
from .serializers import OrderSerializer
from .supabase_client import get_supabase_client


class IsAdminOrOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'is_admin', False):
            return True
        return obj.created_by == request.user.email


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAdminOrOwner]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user.email)

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_admin', False):
            return Order.objects.all()
        return Order.objects.filter(created_by=user.email)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    data = {
        'email': request.user.email,
        'username': getattr(request.user, 'username', None),
        'role': getattr(request.user, 'role', None),
        'is_admin': getattr(request.user, 'is_admin', False),
    }
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_file(request):
    parser_classes = (MultiPartParser, FormParser)
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({'detail': 'No file provided'}, status=400)
    sb = get_supabase_client()
    bucket = 'uploads'
    path = f"{request.user.id}/{file_obj.name}"
    res = sb.storage.from_(bucket).upload(path, file_obj, {
        'contentType': file_obj.content_type or 'application/octet-stream',
        'upsert': True
    })
    if res.get('error'):
        return Response({'detail': str(res['error'])}, status=400)
    return Response({'path': f"{bucket}/{path}"})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_url(request):
    path = request.query_params.get('path')
    if not path:
        return Response({'detail': 'Missing path'}, status=400)
    sb = get_supabase_client()
    bucket, key = path.split('/', 1)
    # Signed URL for 60 minutes
    res = sb.storage.from_(bucket).create_signed_url(key, 3600)
    if res.get('error'):
        return Response({'detail': str(res['error'])}, status=400)
    return Response({'url': res['signedURL']})
