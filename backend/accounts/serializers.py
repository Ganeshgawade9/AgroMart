from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SellerProfile, FarmerProfile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)
    shop_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password2', 'full_name', 'phone', 'role',
                  'village', 'taluka', 'district', 'pincode', 'address', 'shop_name']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        if attrs.get('role') == User.SELLER and not attrs.get('shop_name'):
            raise serializers.ValidationError({'shop_name': 'Shop name is required for sellers'})
        return attrs

    def create(self, validated_data):
        shop_name = validated_data.pop('shop_name', '')
        validated_data.pop('password2')
        password = validated_data.pop('password')

        # Sellers need admin approval
        if validated_data.get('role') == User.SELLER:
            validated_data['is_approved'] = False

        user = User.objects.create_user(password=password, **validated_data)

        if user.role == User.SELLER:
            SellerProfile.objects.create(user=user, shop_name=shop_name)
        elif user.role == User.FARMER:
            FarmerProfile.objects.create(user=user)

        return user


class UserSerializer(serializers.ModelSerializer):
    seller_profile = serializers.SerializerMethodField()
    farmer_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone', 'role', 'profile_picture',
                  'is_approved', 'latitude', 'longitude', 'address', 'village',
                  'taluka', 'district', 'state', 'pincode', 'created_at',
                  'seller_profile', 'farmer_profile']
        read_only_fields = ['id', 'email', 'role', 'is_approved', 'created_at']

    def get_seller_profile(self, obj):
        if obj.role == User.SELLER and hasattr(obj, 'seller_profile'):
            return SellerProfileSerializer(obj.seller_profile, context=self.context).data
        return None

    def get_farmer_profile(self, obj):
        if obj.role == User.FARMER and hasattr(obj, 'farmer_profile'):
            return FarmerProfileSerializer(obj.farmer_profile).data
        return None


class SellerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = ['id', 'user', 'shop_name', 'shop_description', 'shop_logo',
                  'gst_number', 'bank_account', 'ifsc_code', 'total_earnings',
                  'rating', 'total_reviews', 'is_verified', 'created_at',
                  'merchant_display_name', 'upi_id', 'payment_phone',
                  'bank_account_name', 'cod_enabled', 'upi_enabled',
                  'razorpay_enabled']
        read_only_fields = ['user', 'total_earnings', 'rating', 'total_reviews']


class FarmerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerProfile
        fields = '__all__'
        read_only_fields = ['user']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match'})
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    identifier = serializers.CharField(help_text='Registered email or mobile number')


class ResetPasswordSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    otp = serializers.RegexField(r'^\d{6}$', error_messages={'invalid': 'OTP must be 6 digits'})
    new_password = serializers.CharField(min_length=6)
    new_password2 = serializers.CharField()

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match'})
        return attrs
