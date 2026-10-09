from rest_framework import generics, status, permissions
from rest_framework import serializers as drf_serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, ChangePasswordSerializer, SellerProfileSerializer
from .models import SellerProfile

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except Exception as e:
            raise e

        user = self.user

        # Only block unapproved sellers
        if user.role == 'seller' and not user.is_approved:
            raise drf_serializers.ValidationError(
                'Seller account pending admin approval.'
            )

        data['user'] = UserSerializer(user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Account created successfully',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UpdateSellerProfileView(APIView):
    """Sellers can update their shop profile (logo, name, GST, bank info)."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can update shop profile'}, status=403)
        try:
            profile = request.user.seller_profile
        except SellerProfile.DoesNotExist:
            profile = SellerProfile.objects.create(user=request.user, shop_name=request.user.full_name)

        serializer = SellerProfileSerializer(profile, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class UpdateLocationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        if not lat or not lng:
            return Response({'error': 'latitude and longitude required'}, status=400)
        user.latitude = lat
        user.longitude = lng
        user.save(update_fields=['latitude', 'longitude'])
        return Response({'message': 'Location updated', 'latitude': lat, 'longitude': lng})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Old password is incorrect'}, status=400)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully'})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=400)


class SellerListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.filter(role=User.SELLER)


class ApproveSeller(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, seller_id):
        try:
            seller = User.objects.get(id=seller_id, role=User.SELLER)
            seller.is_approved = True
            seller.save()
            return Response({'message': f'{seller.full_name} approved'})
        except User.DoesNotExist:
            return Response({'error': 'Seller not found'}, status=404)


class FarmerListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.filter(role=User.FARMER)
    search_fields = ['full_name', 'email', 'village', 'district']


from .admin_views import AdminDashboardStatsView, AdminUserListView, AdminToggleUserView, AdminProductListView
#EOF
#echo "views.py rewritten"