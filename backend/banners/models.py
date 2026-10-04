import uuid
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class PromotionalBanner(models.Model):
    """
    Authoritative promotional campaign banner configuration.
    Persisted in Supabase PostgreSQL (via Django ORM).
    """
    STATUS_DRAFT = 'draft'
    STATUS_SCHEDULED = 'scheduled'
    STATUS_PUBLISHED = 'published'
    STATUS_ARCHIVED = 'archived'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_SCHEDULED, 'Scheduled'),
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_ARCHIVED, 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, help_text="Internal campaign name, e.g. 'BYOS ₹799 Weekend Sale'")
    slug = models.SlugField(max_length=220, unique=True, blank=True)

    # Promotional copy
    title = models.CharField(max_length=200, blank=True, default='', help_text="Main heading e.g. 'BYOS'")
    subtitle = models.CharField(max_length=200, blank=True, default='', help_text="e.g. 'pick any 3 at'")
    price_text = models.CharField(max_length=100, blank=True, default='', help_text="e.g. '₹799/-'")
    supporting_text = models.TextField(blank=True, default='', help_text="e.g. '+ free shipping\\n+ free gift'")
    cta_text = models.CharField(max_length=100, blank=True, default='SHOP NOW')
    cta_url = models.CharField(max_length=500, blank=True, default='/shop')

    # Media assets
    desktop_image_url = models.CharField(max_length=1000, blank=True, default='', help_text="Desktop artwork URL")
    mobile_image_url = models.CharField(max_length=1000, blank=True, default='', help_text="Mobile artwork URL")
    background_image_url = models.CharField(max_length=1000, blank=True, default='', help_text="Optional background")

    # Lifecycle & status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    priority = models.IntegerField(default=10, db_index=True, help_text="Higher number = higher precedence")

    # Timezone-aware scheduling
    start_at = models.DateTimeField(null=True, blank=True, db_index=True)
    end_at = models.DateTimeField(null=True, blank=True, db_index=True)
    display_order = models.IntegerField(default=0, db_index=True)

    # Composable layers configuration (JSON payload for modular layer compositions)
    layer_config = models.JSONField(default=dict, blank=True)

    # Auditing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=150, blank=True, default='')
    updated_by = models.CharField(max_length=150, blank=True, default='')

    class Meta:
        db_table = 'promotional_banners'
        ordering = ['-priority', 'display_order', '-created_at']
        indexes = [
            models.Index(
                fields=['status', 'is_active', 'start_at', 'end_at', 'priority'],
                name='idx_promo_banner_active'
            ),
            models.Index(
                fields=['priority', 'display_order'],
                name='idx_promo_banner_prio_ord'
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name or self.title or 'campaign') or 'banner'
            slug = base_slug
            counter = 1
            while PromotionalBanner.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        # Automatic status transition based on scheduling
        now = timezone.now()
        if self.status == self.STATUS_SCHEDULED:
            if self.start_at and self.start_at <= now:
                if not self.end_at or self.end_at >= now:
                    self.status = self.STATUS_PUBLISHED
            elif self.end_at and self.end_at < now:
                self.status = self.STATUS_ARCHIVED
        elif self.status == self.STATUS_PUBLISHED and self.end_at and self.end_at < now:
            self.status = self.STATUS_ARCHIVED

        super().save(*args, **kwargs)

    def is_currently_active(self, now=None):
        if now is None:
            now = timezone.now()
        if not self.is_active or self.status != self.STATUS_PUBLISHED:
            return False
        if self.start_at and self.start_at > now:
            return False
        if self.end_at and self.end_at < now:
            return False
        return True

    def __str__(self):
        return f"{self.name} [{self.status.upper()}] (prio={self.priority})"


class PromotionalBannerAsset(models.Model):
    """
    Individual layered visual assets for composable banners.
    """
    ASSET_HERO = 'hero'
    ASSET_BACKGROUND = 'background'
    ASSET_PRODUCT = 'product'
    ASSET_DECORATION = 'decoration'
    ASSET_MODEL = 'model'
    ASSET_BADGE = 'badge'
    ASSET_MOBILE = 'mobile'
    ASSET_DESKTOP = 'desktop'

    ASSET_TYPE_CHOICES = [
        (ASSET_HERO, 'Hero'),
        (ASSET_BACKGROUND, 'Background'),
        (ASSET_PRODUCT, 'Product'),
        (ASSET_DECORATION, 'Decoration'),
        (ASSET_MODEL, 'Model'),
        (ASSET_BADGE, 'Badge'),
        (ASSET_MOBILE, 'Mobile Artwork'),
        (ASSET_DESKTOP, 'Desktop Artwork'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    banner = models.ForeignKey(
        PromotionalBanner,
        related_name='assets',
        on_delete=models.CASCADE
    )
    asset_type = models.CharField(max_length=50, choices=ASSET_TYPE_CHOICES, default=ASSET_HERO)
    asset_url = models.CharField(max_length=1000)
    storage_path = models.CharField(max_length=500, blank=True, default='')
    alt_text = models.CharField(max_length=255, blank=True, default='')
    display_order = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'promotional_banner_assets'
        ordering = ['display_order', 'created_at']

    def __str__(self):
        return f"{self.banner.name} - {self.asset_type} ({self.id})"
