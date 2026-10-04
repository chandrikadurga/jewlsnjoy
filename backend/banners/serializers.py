from rest_framework import serializers
from .models import PromotionalBanner, PromotionalBannerAsset


class PromotionalBannerAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotionalBannerAsset
        fields = [
            'id',
            'banner',
            'asset_type',
            'asset_url',
            'storage_path',
            'alt_text',
            'display_order',
            'is_visible',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PromotionalBannerSerializer(serializers.ModelSerializer):
    assets = PromotionalBannerAssetSerializer(many=True, read_only=True)
    is_currently_active = serializers.SerializerMethodField()

    class Meta:
        model = PromotionalBanner
        fields = [
            'id',
            'name',
            'slug',
            'title',
            'subtitle',
            'price_text',
            'supporting_text',
            'cta_text',
            'cta_url',
            'desktop_image_url',
            'mobile_image_url',
            'background_image_url',
            'status',
            'is_active',
            'priority',
            'start_at',
            'end_at',
            'display_order',
            'layer_config',
            'is_currently_active',
            'assets',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_is_currently_active(self, obj):
        return obj.is_currently_active()

    def validate(self, data):
        start_at = data.get('start_at', getattr(self.instance, 'start_at', None))
        end_at = data.get('end_at', getattr(self.instance, 'end_at', None))

        if start_at and end_at and end_at < start_at:
            raise serializers.ValidationError({
                'end_at': "End date must be after or equal to the campaign start date."
            })

        return data


class ActivePromotionalBannerSerializer(serializers.ModelSerializer):
    assets = serializers.SerializerMethodField()

    class Meta:
        model = PromotionalBanner
        fields = [
            'id',
            'name',
            'slug',
            'title',
            'subtitle',
            'price_text',
            'supporting_text',
            'cta_text',
            'cta_url',
            'desktop_image_url',
            'mobile_image_url',
            'background_image_url',
            'status',
            'is_active',
            'priority',
            'start_at',
            'end_at',
            'layer_config',
            'assets',
        ]

    def get_assets(self, obj):
        visible_assets = obj.assets.filter(is_visible=True).order_by('display_order', 'created_at')
        return PromotionalBannerAssetSerializer(visible_assets, many=True).data
