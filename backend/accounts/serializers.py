from rest_framework import serializers
from django.conf import settings
from django.contrib.auth import get_user_model
from notifications.sms import normalize_phone
from .models import SellerProfile, FarmerProfile
from . import otp as password_otp

User = get_user_model()

PHONE_ERROR = 'Enter a valid 10-digit Indian mobile number (starting with 6-9). OTPs are sent to this number.'


def clean_mobile(value):
    """Return the 10-digit mobile number, or raise a validation error."""
    number = normalize_phone(value)
    if not number:
        raise serializers.ValidationError(PHONE_ERROR)
    return number


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)
    shop_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, error_messages={'required': PHONE_ERROR, 'blank': PHONE_ERROR})
    otp = serializers.CharField(required=False, write_only=True, allow_blank=True)
    firebase_token = serializers.CharField(required=False, write_only=True, allow_blank=True)

    def validate_phone(self, value):
        return clean_mobile(value)

    class Meta:
        model = User
        fields = ['email', 'password', 'password2', 'full_name', 'phone', 'role',
                  'village', 'taluka', 'district', 'pincode', 'address', 'shop_name', 'otp', 'firebase_token']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        if attrs.get('role') == User.SELLER and not attrs.get('shop_name'):
            raise serializers.ValidationError({'shop_name': 'Shop name is required for sellers'})

        phone = attrs.get('phone')
        pattern = r'^\D*(?:(?:91|0)\D*)?' + r'\D*'.join(phone) + r'\D*$'
        if User.objects.filter(phone__regex=pattern, is_active=True).exists():
            raise serializers.ValidationError({'phone': 'An account with this mobile number already exists.'})

        if getattr(settings, 'REQUIRE_REGISTRATION_OTP', True):
            firebase_token = attrs.get('firebase_token', '').strip()
            submitted_otp = attrs.get('otp', '').strip()
            if firebase_token:
                from .firebase import verify_firebase_id_token
                ok, _ = verify_firebase_id_token(firebase_token, expected_phone=phone)
                if not ok:
                    raise serializers.ValidationError({'firebase_token': 'Firebase verification failed or expired.'})
            elif submitted_otp:
                if not password_otp.verify_registration_otp(phone, submitted_otp):
                    raise serializers.ValidationError({'otp': 'Invalid or expired OTP.'})
            elif not password_otp.is_registration_verified(phone):
                raise serializers.ValidationError({'otp': 'Please verify your mobile number with OTP.'})

        return attrs

    def create(self, validated_data):
        validated_data.pop('otp', None)
        validated_data.pop('firebase_token', None)
        shop_name = validated_data.pop('shop_name', '')
        validated_data.pop('password2')
        password = validated_data.pop('password')
        phone = validated_data.get('phone')


        # Sellers need admin approval
        if validated_data.get('role') == User.SELLER:
            validated_data['is_approved'] = False

        user = User.objects.create_user(password=password, **validated_data)

        if user.role == User.SELLER:
            SellerProfile.objects.create(user=user, shop_name=shop_name)
        elif user.role == User.FARMER:
            FarmerProfile.objects.create(user=user)

        password_otp.consume_registration_otp(phone)
        return user



class UserSerializer(serializers.ModelSerializer):
    seller_profile = serializers.SerializerMethodField()
    farmer_profile = serializers.SerializerMethodField()

    def validate_phone(self, value):
        # The mobile number is where OTPs go, so it cannot be blanked or set to something unusable
        return clean_mobile(value)

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
    otp = serializers.CharField(required=False, allow_blank=True)
    firebase_token = serializers.CharField(required=False, allow_blank=True)
    new_password = serializers.CharField(min_length=6)
    new_password2 = serializers.CharField()

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match'})
        if not attrs.get('otp') and not attrs.get('firebase_token'):
            raise serializers.ValidationError({'otp': 'Either OTP or Firebase verification token is required'})
        return attrs

