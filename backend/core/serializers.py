from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Item, Swap

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'points', 'is_staff'] # Added is_staff

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password']
    
    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if user:
                if user.is_active:
                    data['user'] = user
                else:
                    raise serializers.ValidationError('User account is disabled.')
            else:
                raise serializers.ValidationError('Invalid email or password.')
        else:
            raise serializers.ValidationError('Must include email and password.')
        
        return data

class ItemSerializer(serializers.ModelSerializer):
    uploader = UserSerializer(read_only=True)
    
    class Meta:
        model = Item
        fields = ['id', 'title', 'description', 'image', 'featured', 'available', 'uploader', 'created_at', 'point_value', 'moderation_status'] # Added moderation_status
        read_only_fields = ['uploader', 'created_at', 'moderation_status'] # moderation_status is read-only for regular users

class SwapSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    item = ItemSerializer(read_only=True) # The item being requested
    requested_item = ItemSerializer(read_only=True) # The item being offered by the 'user'
    
    class Meta:
        model = Swap
        fields = ['id', 'user', 'item', 'requested_item', 'status', 'created_at']
        read_only_fields = ['user', 'created_at']
        # When creating, we'll pass item_id and requested_item_id directly to the view
        # so they are not part of the serializer's writable fields.
