import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Star,
  Flame,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Image as ImageIcon,
  UploadCloud,
  ShieldCheck,
  Truck,
  Info,
  Sliders,
  FileText,
  Tag,
  Clock,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { adminApi, categoryApi } from '../../services/api';
import { FALLBACK_PRODUCTS } from '../../data/products';
import { broadcastCatalogUpdate } from '../../utils/catalogEvents';
import {
  cacheProduct,
  cacheProductsList,
  getCachedProductsList,
} from '../../utils/productCache';
import './AdminProducts.css';

/**
 * Extracts a normalized, deduplicated list of image URLs from any product object.
 */
function extractProductImageUrls(prod) {
  if (!prod) return [];
  const urls = [];
  if (Array.isArray(prod.images)) {
    prod.images.forEach((img) => {
      if (typeof img === 'string' && img.trim()) {
        urls.push(img.trim());
      } else if (img && typeof img === 'object' && img.image_url) {
        urls.push(img.image_url.trim());
      }
    });
  }
  if (Array.isArray(prod.image_urls)) {
    prod.image_urls.forEach((u) => {
      if (typeof u === 'string' && u.trim() && !urls.includes(u.trim())) {
        urls.push(u.trim());
      }
    });
  }
  const primary = prod.primary_image_url || prod.image;
  if (primary && typeof primary === 'string' && primary.trim() && !urls.includes(primary.trim())) {
    urls.unshift(primary.trim());
  }
  return urls.length > 0 ? urls : [primary || '/products/1/1.jpeg'];
}

const DEFAULT_RETURN_POLICY =
  "Jewels 'n' Joys follows a strict no refund, return, or exchange policy once an order is placed. Damaged or incorrect items must be reported within 24 hours with uncut 360° unboxing video.";

const DEFAULT_CARE_TEXT = [
  'Avoid direct contact with harsh perfumes and chemicals.',
  'Store in the provided jewellery pouch when not in use.',
  'Clean gently with a soft dry cloth.',
].join('\n');

const POPULAR_STYLE_TAGS = [
  'Minimalist',
  'Everyday Luxury',
  'Party Wear',
  'Statement Piece',
  'Bridal & Festive',
  'Layered',
  'Modern Classic',
  'Vintage Charm',
];

const AVAILABLE_FEATURE_TAGS = [
  'Anti-tarnish',
  'Waterproof',
  'PVD Plated',
  '18K Gold Plated',
  'Hypoallergenic',
  'Nickel Free',
  'Sweat Proof',
  'Eco Titanium Steel',
];

export default function AdminProducts() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState(() => getCachedProductsList() || []);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Multi-selection for bulk delete
  const [selectedIds, setSelectedIds] = useState([]);

  // Delete confirmation modal states
  const [deleteTarget, setDeleteTarget] = useState(null); // { isBulk: true, ids: [...] } or single product object
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'photos' | 'policy' | 'specs'

  const [formData, setFormData] = useState({
    name: '',
    category_name: 'Necklaces',
    price: '',
    original_price: '',
    description: '',
    stock_quantity: 25,
    in_stock: true,
    is_featured: false,
    is_bestseller: false,
    style_tags: 'Waterproof, Anti-tarnish, 18K Gold Plated',
    primary_image_url: '/products/1/1.jpeg',
    images: ['/products/1/1.jpeg'],

    // Policy & Delivery
    return_policy: DEFAULT_RETURN_POLICY,
    dispatch_timeline: 'Dispatch within 1–3 working days (Mon–Fri)',
    shipping_standard: '6 to 8 days',
    shipping_express: '3 to 4 days',
    care_instructions: DEFAULT_CARE_TEXT,

    // Specifications & Craftsmanship
    spec_material: 'Titanium Stainless Steel',
    spec_finish: '18K Gold Color Plated',
    spec_plating: 'Long-lasting PVD Plated',
    spec_features: 'Anti-tarnish, Waterproof, Quality Guarantee',
    features_list: ['Anti-tarnish', 'Waterproof', 'PVD Plated', '18K Gold Plated'],
  });

  const [saveLoading, setSaveLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Image manager states
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsData, catsData] = await Promise.all([
        adminApi.getProducts(),
        categoryApi.getAll().catch(() => []),
      ]);
      if (prodsData && prodsData.length) {
        setProducts(prodsData);
        cacheProductsList(prodsData);
      } else {
        const cached = getCachedProductsList();
        setProducts(cached || FALLBACK_PRODUCTS);
      }
      setCategories(catsData);
    } catch (err) {
      console.error('Failed to load products:', err);
      const cached = getCachedProductsList();
      setProducts(cached || FALLBACK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (searchParams.get('create') === 'true') {
      openAddModal();
    }
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setNewImageUrl('');
    setUploadError('');
    setActiveTab('details');
    setFormData({
      name: '',
      category_name: 'Necklaces',
      price: '',
      original_price: '',
      description: '',
      stock_quantity: 25,
      in_stock: true,
      is_featured: false,
      is_bestseller: false,
      style_tags: 'Waterproof, Anti-tarnish, 18K Gold Plated',
      primary_image_url: '/products/1/1.jpeg',
      images: ['/products/1/1.jpeg'],

      // Policy & Delivery
      return_policy: DEFAULT_RETURN_POLICY,
      dispatch_timeline: 'Dispatch within 1–3 working days (Mon–Fri)',
      shipping_standard: '6 to 8 days',
      shipping_express: '3 to 4 days',
      care_instructions: DEFAULT_CARE_TEXT,

      // Specifications & Craftsmanship
      spec_material: 'Titanium Stainless Steel',
      spec_finish: '18K Gold Color Plated',
      spec_plating: 'Long-lasting PVD Plated',
      spec_features: 'Anti-tarnish, Waterproof, Quality Guarantee',
      features_list: ['Anti-tarnish', 'Waterproof', 'PVD Plated', '18K Gold Plated'],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setNewImageUrl('');
    setUploadError('');
    setActiveTab('details');

    const allImages = extractProductImageUrls(prod);
    const primary = prod.primary_image_url || prod.image || allImages[0] || '/products/1/1.jpeg';
    if (!allImages.includes(primary)) {
      allImages.unshift(primary);
    }

    const details = prod.details || {};
    const shipping = prod.shipping || details.shipping || {};
    const care = prod.care_instructions || details.care_instructions || [
      'Avoid direct contact with harsh perfumes and chemicals.',
      'Store in the provided jewellery pouch when not in use.',
      'Clean gently with a soft dry cloth.',
    ];
    const specs = prod.specifications || details.specifications || {};
    const features = prod.features || details.features || [
      'Anti-tarnish',
      'Waterproof',
      'PVD Plated',
      '18K Gold Plated',
    ];

    setFormData({
      name: prod.name || '',
      category_name: prod.category_name || prod.category || 'Necklaces',
      price: prod.price ?? '',
      original_price: prod.original_price || '',
      description: prod.description || '',
      stock_quantity: prod.stock_quantity ?? 25,
      in_stock: prod.in_stock ?? true,
      is_featured: prod.is_featured ?? false,
      is_bestseller: prod.is_bestseller ?? false,
      style_tags: Array.isArray(prod.style_tags)
        ? prod.style_tags.join(', ')
        : (typeof prod.style_tags === 'string' ? prod.style_tags : ''),
      primary_image_url: primary,
      images: allImages,

      // Policy & Delivery
      return_policy: prod.return_policy || details.return_policy || DEFAULT_RETURN_POLICY,
      dispatch_timeline: prod.dispatch_timeline || shipping.dispatch || 'Dispatch within 1–3 working days (Mon–Fri)',
      shipping_standard: shipping.standard || '6 to 8 days',
      shipping_express: shipping.express || '3 to 4 days',
      care_instructions: Array.isArray(care) ? care.join('\n') : String(care),

      // Specifications
      spec_material: specs.Material || 'Titanium Stainless Steel',
      spec_finish: specs.Finish || '18K Gold Color Plated',
      spec_plating: specs.Plating || 'Long-lasting PVD Plated',
      spec_features: specs.Features || 'Anti-tarnish, Waterproof, Quality Guarantee',
      features_list: Array.isArray(features) ? features : ['Anti-tarnish', 'Waterproof', 'PVD Plated', '18K Gold Plated'],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setNewImageUrl('');
    setUploadError('');
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleToggleFeatureTag = (tag) => {
    setFormData((prev) => {
      const current = prev.features_list || [];
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return { ...prev, features_list: updated };
    });
  };

  const handleAddStyleTag = (tag) => {
    setFormData((prev) => {
      const currentTags = prev.style_tags
        ? prev.style_tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      if (currentTags.includes(tag)) return prev;
      return {
        ...prev,
        style_tags: [...currentTags, tag].join(', '),
      };
    });
  };

  // Image actions
  const handleSetPrimaryImage = (url) => {
    if (!url) return;
    setFormData((prev) => ({
      ...prev,
      primary_image_url: url,
    }));
    showFeedback('Set as primary cover photo');
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => {
      const currentList = prev.images || [];
      const removedUrl = currentList[indexToRemove];
      const nextImages = currentList.filter((_, idx) => idx !== indexToRemove);
      let nextPrimary = prev.primary_image_url;
      if (removedUrl === prev.primary_image_url) {
        nextPrimary = nextImages[0] || '';
      }
      return {
        ...prev,
        images: nextImages,
        primary_image_url: nextPrimary,
      };
    });
  };

  const handleClearAllImages = () => {
    if (!window.confirm('Clear all photos from this product?')) return;
    setFormData((prev) => ({
      ...prev,
      images: [],
      primary_image_url: '',
    }));
    showFeedback('Cleared all photos');
  };

  const handleAddImageUrl = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    setFormData((prev) => {
      const currentList = prev.images || [];
      const updated = currentList.includes(trimmed) ? currentList : [...currentList, trimmed];
      return {
        ...prev,
        images: updated,
        primary_image_url: prev.primary_image_url || trimmed,
      };
    });
    setNewImageUrl('');
    showFeedback('Picture added to angles');
  };

  const handleFilesUpload = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError('');

    try {
      const fileList = Array.from(files);
      const addedUrls = [];

      for (const file of fileList) {
        if (!file.type.startsWith('image/')) {
          continue;
        }

        // Client read for instant preview
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let finalUrl = dataUrl;

        // Try server upload to backend media storage
        try {
          const res = await adminApi.uploadProductImage(file);
          if (res && res.url) {
            finalUrl = res.url;
          }
        } catch (uploadErr) {
          console.warn('Server upload not reachable, using local preview:', uploadErr);
        }

        addedUrls.push(finalUrl);
      }

      if (addedUrls.length > 0) {
        setFormData((prev) => {
          const currentList = prev.images || [];
          const combined = [...currentList, ...addedUrls];
          return {
            ...prev,
            images: combined,
            primary_image_url: prev.primary_image_url || addedUrls[0],
          };
        });
        showFeedback(`${addedUrls.length} picture${addedUrls.length > 1 ? 's' : ''} added!`);
      } else {
        setUploadError('Please choose valid image files (JPG, PNG, WEBP).');
      }
    } catch (err) {
      console.error('Failed to process image files:', err);
      setUploadError('Error uploading image. Please try again.');
    } finally {
      setIsUploading(false);
      setDragActive(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  // Preset policies application
  const applyPolicyPreset = (type) => {
    if (type === 'strict') {
      setFormData((prev) => ({
        ...prev,
        return_policy:
          "Jewels 'n' Joys follows a strict no refund, return, or exchange policy once an order is placed. Damaged or incorrect items must be reported within 24 hours with uncut 360° unboxing video.",
        dispatch_timeline: 'Dispatch within 1–3 working days (Mon–Fri)',
        shipping_standard: '6 to 8 days',
        shipping_express: '3 to 4 days',
      }));
      showFeedback('Applied Strict No-Return & 24h Replacement policy');
    } else if (type === 'exchange') {
      setFormData((prev) => ({
        ...prev,
        return_policy:
          "Hassle-free 7-day exchange guarantee. In case of size issues or dissatisfaction, initiate an exchange within 7 days of delivery with tag and seal intact.",
        dispatch_timeline: 'Dispatch within 24–48 hours',
        shipping_standard: '5 to 7 days',
        shipping_express: '2 to 3 days',
      }));
      showFeedback('Applied 7-Day Exchange policy');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      setActiveTab('details');
      return;
    }

    try {
      setSaveLoading(true);
      const qty = parseInt(formData.stock_quantity, 10);
      const stockQty = isNaN(qty) ? 0 : Math.max(0, qty);
      const isStock = stockQty > 0 ? Boolean(formData.in_stock) : false;

      const rawImages =
        formData.images && formData.images.length > 0
          ? formData.images
          : [formData.primary_image_url || '/products/1/1.jpeg'];
      const primaryImg = formData.primary_image_url || rawImages[0] || '/products/1/1.jpeg';

      const careList = formData.care_instructions
        ? formData.care_instructions.split('\n').map((s) => s.trim()).filter(Boolean)
        : [
            'Avoid direct contact with harsh perfumes and chemicals.',
            'Store in the provided jewellery pouch when not in use.',
            'Clean gently with a soft dry cloth.',
          ];

      const styleTagsArray = formData.style_tags
        ? formData.style_tags.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const detailsObj = {
        return_policy: formData.return_policy,
        dispatch_timeline: formData.dispatch_timeline,
        shipping: {
          standard: formData.shipping_standard || '6 to 8 days',
          express: formData.shipping_express || '3 to 4 days',
          dispatch: formData.dispatch_timeline || 'Dispatch within 1–3 working days (Mon–Fri)',
          free_threshold: 999,
        },
        care_instructions: careList,
        specifications: {
          Material: formData.spec_material || 'Titanium Stainless Steel',
          Finish: formData.spec_finish || '18K Gold Color Plated',
          Plating: formData.spec_plating || 'Long-lasting PVD Plated',
          Features: formData.spec_features || 'Anti-tarnish, Waterproof, Quality Guarantee',
        },
        features: formData.features_list || ['Anti-tarnish', 'Waterproof', 'PVD Plated', '18K Gold Plated'],
      };

      const payload = {
        name: formData.name.trim(),
        category_name: formData.category_name,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        description: formData.description,
        stock_quantity: stockQty,
        in_stock: isStock,
        is_featured: Boolean(formData.is_featured),
        is_bestseller: Boolean(formData.is_bestseller),
        style_tags: styleTagsArray,
        primary_image_url: primaryImg,
        image: primaryImg,
        images: rawImages,
        image_urls: rawImages,

        // Direct policy & spec fields
        return_policy: formData.return_policy,
        dispatch_timeline: formData.dispatch_timeline,
        shipping: detailsObj.shipping,
        care_instructions: careList,
        specifications: detailsObj.specifications,
        features: detailsObj.features,
        details: detailsObj,
      };

      if (editingProduct) {
        const updated = await adminApi.updateProduct(editingProduct.id, payload);
        cacheProduct(updated || { ...editingProduct, ...payload });
        showFeedback('Piece & policies updated successfully!');
      } else {
        const created = await adminApi.createProduct(payload);
        if (created) cacheProduct(created);
        showFeedback('New piece added to catalog!');
      }

      broadcastCatalogUpdate();
      await loadData();
      closeModal();
    } catch (err) {
      console.error('Error saving product:', err);
      // Fallback local update
      const qty = parseInt(formData.stock_quantity, 10);
      const stockQty = isNaN(qty) ? 0 : Math.max(0, qty);
      const isStock = stockQty > 0 ? Boolean(formData.in_stock) : false;

      const rawImages =
        formData.images && formData.images.length > 0
          ? formData.images
          : [formData.primary_image_url || '/products/1/1.jpeg'];
      const primaryImg = formData.primary_image_url || rawImages[0] || '/products/1/1.jpeg';

      const careList = formData.care_instructions
        ? formData.care_instructions.split('\n').map((s) => s.trim()).filter(Boolean)
        : [];
      const styleTagsArray = formData.style_tags
        ? formData.style_tags.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const fallbackPayload = {
        ...formData,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        stock_quantity: stockQty,
        in_stock: isStock,
        style_tags: styleTagsArray,
        primary_image_url: primaryImg,
        image: primaryImg,
        images: rawImages,
        image_urls: rawImages,
        return_policy: formData.return_policy,
        dispatch_timeline: formData.dispatch_timeline,
        shipping: {
          standard: formData.shipping_standard || '6 to 8 days',
          express: formData.shipping_express || '3 to 4 days',
          dispatch: formData.dispatch_timeline || 'Dispatch within 1–3 working days (Mon–Fri)',
        },
        care_instructions: careList,
        specifications: {
          Material: formData.spec_material || 'Titanium Stainless Steel',
          Finish: formData.spec_finish || '18K Gold Color Plated',
          Plating: formData.spec_plating || 'Long-lasting PVD Plated',
          Features: formData.spec_features || 'Anti-tarnish, Waterproof, Quality Guarantee',
        },
        features: formData.features_list || ['Anti-tarnish', 'Waterproof', 'PVD Plated', '18K Gold Plated'],
      };

      if (editingProduct) {
        const updatedLocal = { ...editingProduct, ...fallbackPayload };
        cacheProduct(updatedLocal);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? updatedLocal : p))
        );
        showFeedback('Updated locally!');
      } else {
        const newProd = {
          ...fallbackPayload,
          id: Date.now(),
        };
        cacheProduct(newProd);
        setProducts((prev) => [newProd, ...prev]);
        showFeedback('Created locally!');
      }
      broadcastCatalogUpdate();
      closeModal();
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete Handlers
  const openDeleteConfirm = (target) => {
    setDeleteTarget(target);
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
    setDeleteLoading(false);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      if (deleteTarget.isBulk) {
        // Bulk delete
        const idsToDelete = deleteTarget.ids || [];
        try {
          await adminApi.deleteProducts(idsToDelete);
        } catch {
          // Fallback delete individually
          await Promise.all(idsToDelete.map((id) => adminApi.deleteProduct(id).catch(() => {})));
        }
        setProducts((prev) => prev.filter((p) => !idsToDelete.includes(p.id)));
        setSelectedIds([]);
        showFeedback(`${idsToDelete.length} piece${idsToDelete.length > 1 ? 's' : ''} deleted.`);
      } else {
        // Single piece delete
        const idToDelete = deleteTarget.id;
        await adminApi.deleteProduct(idToDelete);
        setProducts((prev) => prev.filter((p) => p.id !== idToDelete));
        setSelectedIds((prev) => prev.filter((id) => id !== idToDelete));
        showFeedback(`"${deleteTarget.name}" deleted from catalog.`);
        if (editingProduct && editingProduct.id === idToDelete) {
          closeModal();
        }
      }
      broadcastCatalogUpdate();
      closeDeleteConfirm();
      await loadData();
    } catch (err) {
      console.error('Error deleting:', err);
      if (deleteTarget.isBulk) {
        const idsToDelete = deleteTarget.ids || [];
        setProducts((prev) => prev.filter((p) => !idsToDelete.includes(p.id)));
        setSelectedIds([]);
        showFeedback(`${idsToDelete.length} piece(s) removed.`);
      } else {
        const idToDelete = deleteTarget.id;
        setProducts((prev) => prev.filter((p) => p.id !== idToDelete));
        setSelectedIds((prev) => prev.filter((id) => id !== idToDelete));
        showFeedback(`Removed locally.`);
        if (editingProduct && editingProduct.id === idToDelete) {
          closeModal();
        }
      }
      broadcastCatalogUpdate();
      closeDeleteConfirm();
    } finally {
      setDeleteLoading(false);
    }
  };

  // Multi-selection handlers
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleToggleStock = async (prod) => {
    const nextState = !prod.in_stock;
    const nextQty = nextState ? (prod.stock_quantity > 0 ? prod.stock_quantity : 25) : 0;
    const updatedProd = { ...prod, in_stock: nextState, stock_quantity: nextQty };
    cacheProduct(updatedProd);
    try {
      await adminApi.updateProduct(prod.id, {
        in_stock: nextState,
        stock_quantity: nextQty,
      });
      setProducts((prev) => prev.map((p) => (p.id === prod.id ? updatedProd : p)));
      broadcastCatalogUpdate();
      showFeedback(`Product ${nextState ? 'marked In Stock' : 'marked Out of Stock'}`);
    } catch (err) {
      console.error('Could not toggle stock on server:', err);
      showFeedback('Could not update stock on server');
    }
  };

  const handleToggleBadge = async (prod, field) => {
    const nextVal = !prod[field];
    try {
      await adminApi.updateProduct(prod.id, { [field]: nextVal });
      broadcastCatalogUpdate();
    } catch (err) {
      console.error('Could not toggle badge:', err);
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, [field]: nextVal } : p))
    );
  };

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const filteredProducts = products.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const cat = (p.category_name || p.category || '').toLowerCase();
    const catMatch = selectedCategory === 'All' || cat === selectedCategory.toLowerCase();
    return nameMatch && catMatch;
  });

  // Calculate discount preview in form
  const priceVal = parseFloat(formData.price);
  const origPriceVal = parseFloat(formData.original_price);
  const discountPercent =
    origPriceVal && priceVal && origPriceVal > priceVal
      ? Math.round(((origPriceVal - priceVal) / origPriceVal) * 100)
      : 0;

  return (
    <div className="admin-products-page">
      {feedbackMsg && (
        <div className="admin-feedback-toast">
          <Sparkles size={16} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="admin-products-bar">
        <div className="admin-products-bar__search">
          <Search size={18} className="admin-products-bar__icon" />
          <input
            type="text"
            placeholder="Search piece by name, style or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-input"
          />
        </div>

        <div className="admin-products-bar__filters">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="admin-select"
          >
            <option value="All">All Categories</option>
            <option value="Necklaces">Necklaces</option>
            <option value="Earrings">Earrings</option>
            <option value="Rings">Rings</option>
            <option value="Bracelets">Bracelets</option>
          </select>

          {selectedIds.length > 0 && (
            <div className="admin-bulk-bar">
              <span className="admin-bulk-badge">{selectedIds.length} selected</span>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={() =>
                  openDeleteConfirm({
                    isBulk: true,
                    ids: selectedIds,
                    count: selectedIds.length,
                  })
                }
                title="Delete all selected pieces"
              >
                <Trash2 size={15} />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={openAddModal}
          >
            <Plus size={16} />
            <span>Add New Piece</span>
          </button>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="admin-card admin-products-card">
        <div className="admin-card__header">
          <div>
            <h2 className="admin-card__title">Catalog Inventory</h2>
            <p className="admin-card__subtitle">
              Showing {filteredProducts.length} of {products.length} registered jewellery items
            </p>
          </div>
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => setSelectedIds([])}
            >
              Clear selection
            </button>
          )}
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    className="admin-table-checkbox"
                    checked={
                      selectedIds.length === filteredProducts.length &&
                      filteredProducts.length > 0
                    }
                    onChange={toggleSelectAll}
                    title="Select / deselect all visible pieces"
                  />
                </th>
                <th>Piece &amp; Angles</th>
                <th>Category</th>
                <th>Price</th>
                <th>Inventory</th>
                <th>In Stock</th>
                <th>Badges</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((prod) => {
                const imgUrls = extractProductImageUrls(prod);
                const isSelected = selectedIds.includes(prod.id);
                return (
                  <tr key={prod.id} className={isSelected ? 'admin-row--selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        className="admin-table-checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(prod.id)}
                        title={`Select ${prod.name}`}
                      />
                    </td>
                    <td>
                      <div className="admin-prod-cell">
                        <div className="admin-prod-thumb-wrap">
                          <img
                            src={prod.primary_image_url || prod.image || `/products/${prod.id}/1.jpeg`}
                            onError={(e) => {
                              e.currentTarget.src = `/products/${(prod.id % 7) + 1}/1.jpeg`;
                            }}
                            alt={prod.name}
                            className="admin-prod-thumb"
                          />
                          {imgUrls.length > 1 && (
                            <span className="admin-angle-count-pill" title={`${imgUrls.length} photo angles`}>
                              {imgUrls.length} pics
                            </span>
                          )}
                        </div>
                        <div className="admin-prod-info">
                          <span className="admin-prod-name">{prod.name}</span>
                          <span className="admin-prod-sku">ID #{prod.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-cat-pill">
                        {prod.category_name || prod.category || 'Necklaces'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-price-cell">
                        <span className="admin-price-main">₹{prod.price}</span>
                        {prod.original_price && (
                          <span className="admin-price-orig">₹{prod.original_price}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`admin-stock-num ${(prod.stock_quantity ?? 0) < 15 ? 'admin-stock-num--low' : ''}`}
                      >
                        {prod.stock_quantity ?? 0} units
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleStock(prod)}
                        className={`admin-toggle ${prod.in_stock ? 'admin-toggle--on' : ''}`}
                        title="Toggle availability"
                      >
                        <span className="admin-toggle__thumb" />
                      </button>
                    </td>
                    <td>
                      <div className="admin-badge-toggles">
                        <button
                          type="button"
                          onClick={() => handleToggleBadge(prod, 'is_featured')}
                          className={`admin-badge-btn ${prod.is_featured ? 'admin-badge-btn--gold' : ''}`}
                          title="Toggle Featured on Homepage"
                        >
                          <Star size={13} fill={prod.is_featured ? 'currentColor' : 'none'} />
                          <span>Featured</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBadge(prod, 'is_bestseller')}
                          className={`admin-badge-btn ${prod.is_bestseller ? 'admin-badge-btn--rose' : ''}`}
                          title="Toggle Bestseller Badge"
                        >
                          <Flame size={13} fill={prod.is_bestseller ? 'currentColor' : 'none'} />
                          <span>Bestseller</span>
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="admin-action-icons">
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--edit"
                          onClick={() => openEditModal(prod)}
                          aria-label="Edit piece & policies"
                          title="Edit piece, policies & photography"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--delete"
                          onClick={() => openDeleteConfirm(prod)}
                          aria-label="Delete piece"
                          title="Delete piece from catalog"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal with Tabs */}
      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-modal--large">
            <div className="admin-modal__header">
              <div>
                <h3 className="admin-modal__title">
                  {editingProduct ? `Edit Piece: ${editingProduct.name}` : 'Add New Jewellery Piece'}
                </h3>
                <p className="admin-modal__subtitle">
                  Configure piece pricing, high-res photos, customized return/shipping policies, and specifications.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal__close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="admin-modal__tabs">
              <button
                type="button"
                className={`admin-modal__tab ${activeTab === 'details' ? 'admin-modal__tab--active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                <Sliders size={16} />
                <span>1. Details &amp; Pricing</span>
              </button>
              <button
                type="button"
                className={`admin-modal__tab ${activeTab === 'photos' ? 'admin-modal__tab--active' : ''}`}
                onClick={() => setActiveTab('photos')}
              >
                <ImageIcon size={16} />
                <span>2. Photos &amp; Angles ({formData.images?.length || 0})</span>
              </button>
              <button
                type="button"
                className={`admin-modal__tab ${activeTab === 'policy' ? 'admin-modal__tab--active' : ''}`}
                onClick={() => setActiveTab('policy')}
              >
                <ShieldCheck size={16} />
                <span>3. Policies &amp; Delivery</span>
              </button>
              <button
                type="button"
                className={`admin-modal__tab ${activeTab === 'specs' ? 'admin-modal__tab--active' : ''}`}
                onClick={() => setActiveTab('specs')}
              >
                <Tag size={16} />
                <span>4. Specs &amp; Craftsmanship</span>
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="admin-modal__form">
              {/* TAB 1: DETAILS & PRICING */}
              {activeTab === 'details' && (
                <div className="admin-modal-tab-pane">
                  <div className="admin-form-group">
                    <label>Piece Title / Model Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="e.g. Emerald Blossom Choker Necklace"
                      required
                    />
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Category</label>
                      <select
                        name="category_name"
                        value={formData.category_name}
                        onChange={handleFormChange}
                      >
                        <option value="Necklaces">Necklaces</option>
                        <option value="Earrings">Earrings</option>
                        <option value="Rings">Rings</option>
                        <option value="Bracelets">Bracelets</option>
                        {categories &&
                          categories.map((cat) => {
                            const cName = cat.name || cat;
                            if (['Necklaces', 'Earrings', 'Rings', 'Bracelets'].includes(cName))
                              return null;
                            return (
                              <option key={cName} value={cName}>
                                {cName}
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label>Inventory Stock Quantity</label>
                      <input
                        type="number"
                        name="stock_quantity"
                        value={formData.stock_quantity}
                        onChange={handleFormChange}
                        min="0"
                        placeholder="25"
                      />
                    </div>
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Selling Price (₹) *</label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleFormChange}
                        placeholder="799"
                        required
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>
                        Original MRP (₹)
                        {discountPercent > 0 && (
                          <span className="admin-discount-preview-pill">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        name="original_price"
                        value={formData.original_price}
                        onChange={handleFormChange}
                        placeholder="1199"
                      />
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>Description &amp; Highlights</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      rows={3}
                      placeholder="Crafted with hypoallergenic 316L titanium steel, 18K gold color vacuum plating, anti-tarnish..."
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Style Tags (comma separated)</label>
                    <input
                      type="text"
                      name="style_tags"
                      value={formData.style_tags}
                      onChange={handleFormChange}
                      placeholder="e.g. Waterproof, Minimalist, Everyday Luxury"
                    />
                    <div className="admin-tag-suggestions">
                      <span className="admin-tag-suggestions-label">Quick suggestions:</span>
                      {POPULAR_STYLE_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="admin-tag-pill"
                          onClick={() => handleAddStyleTag(tag)}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="admin-checkbox-row">
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        name="in_stock"
                        checked={formData.in_stock}
                        onChange={handleFormChange}
                      />
                      <span>Available In Stock</span>
                    </label>

                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        name="is_featured"
                        checked={formData.is_featured}
                        onChange={handleFormChange}
                      />
                      <span>Feature on Homepage</span>
                    </label>

                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        name="is_bestseller"
                        checked={formData.is_bestseller}
                        onChange={handleFormChange}
                      />
                      <span>Mark as Bestseller</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: PHOTOGRAPHY & PICS ("pics add etc...") */}
              {activeTab === 'photos' && (
                <div className="admin-modal-tab-pane">
                  <div className="admin-tab-intro">
                    <div className="admin-tab-intro__title">
                      <ImageIcon size={18} className="admin-gold-icon" />
                      <h4>Product Photography &amp; Multi-Angle Gallery</h4>
                    </div>
                    <p className="admin-tab-intro__desc">
                      Upload high-resolution photos or paste URLs. Click <strong>Set as Cover</strong> on any picture to designate it as the piece’s primary storefront showcase photo.
                    </p>
                  </div>

                  {/* Primary Cover Showcase Card */}
                  <div className="admin-primary-preview-card">
                    <div className="admin-primary-preview-media">
                      {formData.primary_image_url ? (
                        <img
                          src={formData.primary_image_url}
                          alt={formData.name || 'Primary product view'}
                          className="admin-primary-img"
                          onError={(e) => {
                            e.currentTarget.src = '/products/1/1.jpeg';
                          }}
                        />
                      ) : (
                        <div className="admin-img-placeholder">
                          <ImageIcon size={32} />
                          <span>No image</span>
                        </div>
                      )}
                      <span className="admin-primary-badge">
                        <Star size={12} fill="currentColor" /> Primary Display Cover
                      </span>
                    </div>

                    <div className="admin-primary-preview-details">
                      <div className="admin-form-group">
                        <label>Primary Cover Image Path / URL</label>
                        <input
                          type="text"
                          name="primary_image_url"
                          value={formData.primary_image_url}
                          onChange={handleFormChange}
                          placeholder="/products/85/1.jpeg or https://..."
                        />
                      </div>
                      <p className="admin-img-helper-text">
                        ★ This photo is used as the primary display on catalog grids, homepage carousels, search results, and checkout summaries.
                      </p>
                    </div>
                  </div>

                  {/* Multi-angle Gallery Grid */}
                  <div className="admin-gallery-section">
                    <div className="admin-gallery-section__bar">
                      <label className="admin-gallery-label">
                        All Image Angles ({formData.images ? formData.images.length : 0})
                      </label>
                      <div className="admin-gallery-actions-top">
                        {formData.images && formData.images.length > 0 && (
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost admin-clear-photos-btn"
                            onClick={handleClearAllImages}
                            title="Remove all gallery photos"
                          >
                            <Trash2 size={13} />
                            <span>Clear All Photos</span>
                          </button>
                        )}
                        <span className="admin-gallery-hint">
                          Click any picture below to switch it to Cover
                        </span>
                      </div>
                    </div>

                    {formData.images && formData.images.length > 0 ? (
                      <div className="admin-gallery-grid">
                        {formData.images.map((imgUrl, idx) => {
                          const isPrimary = imgUrl === formData.primary_image_url;
                          return (
                            <div
                              key={idx}
                              className={`admin-gallery-item ${isPrimary ? 'admin-gallery-item--primary' : ''}`}
                            >
                              <img
                                src={imgUrl}
                                alt={`Angle ${idx + 1}`}
                                className="admin-gallery-thumb"
                                onClick={() => handleSetPrimaryImage(imgUrl)}
                                onError={(e) => {
                                  e.currentTarget.src = '/products/1/1.jpeg';
                                }}
                              />
                              <span className="admin-angle-tag">Angle #{idx + 1}</span>

                              {isPrimary && (
                                <span className="admin-gallery-primary-tag">
                                  <Star size={11} fill="currentColor" /> Cover
                                </span>
                              )}

                              <div className="admin-gallery-item__actions">
                                {!isPrimary && (
                                  <button
                                    type="button"
                                    className="admin-gallery-btn admin-gallery-btn--make-primary"
                                    onClick={() => handleSetPrimaryImage(imgUrl)}
                                    title="Make this the primary display photo"
                                  >
                                    <Star size={12} /> Set as Cover
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="admin-gallery-btn admin-gallery-btn--delete"
                                  onClick={() => handleRemoveImage(idx)}
                                  title="Remove this photo from angles"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="admin-no-images-notice">
                        <span>No gallery photos added yet. Upload or add photo URLs below.</span>
                      </div>
                    )}
                  </div>

                  {/* Upload from Computer / Phone & URL Adder */}
                  <div className="admin-image-uploader-box">
                    <div
                      className={`admin-dropzone ${dragActive ? 'admin-dropzone--active' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        id="admin-product-file-input"
                        className="admin-hidden-file-input"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFilesUpload(e.target.files)}
                      />
                      <label htmlFor="admin-product-file-input" className="admin-dropzone-label">
                        <UploadCloud size={26} className="admin-upload-icon" />
                        <div className="admin-dropzone-text">
                          <span className="admin-dropzone-main">
                            {isUploading ? 'Uploading & saving pictures...' : 'Upload Photos from Computer or Mobile'}
                          </span>
                          <span className="admin-dropzone-sub">
                            Click to select files or drag &amp; drop (JPG, PNG, WEBP — select multiple angle shots together)
                          </span>
                        </div>
                      </label>
                    </div>

                    {uploadError && (
                      <div className="admin-upload-error">
                        <AlertCircle size={14} /> {uploadError}
                      </div>
                    )}

                    {/* Add by Path / URL */}
                    <div className="admin-add-url-row">
                      <input
                        type="text"
                        placeholder="Or add via URL / path (e.g. /products/85/2.jpeg or https://images...)"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        className="admin-add-url-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddImageUrl(e);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-add-photo-btn"
                        onClick={handleAddImageUrl}
                        disabled={!newImageUrl.trim()}
                      >
                        <Plus size={15} /> Add Angle Photo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: POLICY & DELIVERY ("policy change") */}
              {activeTab === 'policy' && (
                <div className="admin-modal-tab-pane">
                  <div className="admin-tab-intro">
                    <div className="admin-tab-intro__title">
                      <ShieldCheck size={18} className="admin-gold-icon" />
                      <h4>Product Policy &amp; Delivery Timelines</h4>
                    </div>
                    <p className="admin-tab-intro__desc">
                      Customize the Return &amp; Replacement policy, dispatch window, and shipping timelines for this piece. These update live in the product’s <strong>Shipping &amp; Returns Policy</strong> accordion.
                    </p>
                  </div>

                  {/* Policy Presets */}
                  <div className="admin-policy-presets">
                    <span className="admin-policy-presets__label">Quick Policy Presets:</span>
                    <button
                      type="button"
                      className="admin-policy-preset-btn"
                      onClick={() => applyPolicyPreset('strict')}
                    >
                      <ShieldCheck size={13} /> Strict No-Return (24h Unboxing Video Replacement)
                    </button>
                    <button
                      type="button"
                      className="admin-policy-preset-btn"
                      onClick={() => applyPolicyPreset('exchange')}
                    >
                      <Clock size={13} /> 7-Day Replacement Guarantee
                    </button>
                  </div>

                  <div className="admin-form-group">
                    <label>Return &amp; Replacement Policy Notice for this piece</label>
                    <textarea
                      name="return_policy"
                      value={formData.return_policy}
                      onChange={handleFormChange}
                      rows={3}
                      placeholder="Specify return and exchange rules for this jewellery piece..."
                    />
                    <span className="admin-field-tip">
                      Displayed under “Shipping &amp; Returns Policy” on the customer product page.
                    </span>
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Dispatch Timeframe</label>
                      <input
                        type="text"
                        name="dispatch_timeline"
                        value={formData.dispatch_timeline}
                        onChange={handleFormChange}
                        placeholder="e.g. Dispatch within 1–3 working days (Mon–Fri)"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Standard Shipping Duration</label>
                      <input
                        type="text"
                        name="shipping_standard"
                        value={formData.shipping_standard}
                        onChange={handleFormChange}
                        placeholder="e.g. 6 to 8 days"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Express Shipping Duration</label>
                      <input
                        type="text"
                        name="shipping_express"
                        value={formData.shipping_express}
                        onChange={handleFormChange}
                        placeholder="e.g. 3 to 4 days"
                      />
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>Jewellery Care Instructions (one per line)</label>
                    <textarea
                      name="care_instructions"
                      value={formData.care_instructions}
                      onChange={handleFormChange}
                      rows={4}
                      placeholder="Avoid contact with harsh perfumes&#10;Store in provided pouch&#10;Clean with soft cloth"
                    />
                    <span className="admin-field-tip">
                      Each line appears as a bullet point under “Care Instructions” on the storefront.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 4: SPECS & CRAFTSMANSHIP */}
              {activeTab === 'specs' && (
                <div className="admin-modal-tab-pane">
                  <div className="admin-tab-intro">
                    <div className="admin-tab-intro__title">
                      <Tag size={18} className="admin-gold-icon" />
                      <h4>Specifications &amp; Quality Guarantee</h4>
                    </div>
                    <p className="admin-tab-intro__desc">
                      Configure materials, plating, and quality guarantee badges shown in the product specifications accordion.
                    </p>
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Material</label>
                      <input
                        type="text"
                        name="spec_material"
                        value={formData.spec_material}
                        onChange={handleFormChange}
                        placeholder="e.g. Titanium Stainless Steel"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Finish</label>
                      <input
                        type="text"
                        name="spec_finish"
                        value={formData.spec_finish}
                        onChange={handleFormChange}
                        placeholder="e.g. 18K Gold Color Plated"
                      />
                    </div>
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Plating Technology</label>
                      <input
                        type="text"
                        name="spec_plating"
                        value={formData.spec_plating}
                        onChange={handleFormChange}
                        placeholder="e.g. Long-lasting Vacuum PVD Plated"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Quality Features</label>
                      <input
                        type="text"
                        name="spec_features"
                        value={formData.spec_features}
                        onChange={handleFormChange}
                        placeholder="e.g. Anti-tarnish, Waterproof, Quality Guarantee"
                      />
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>Quality Badges (Click to enable/disable for this product)</label>
                    <div className="admin-badges-selector">
                      {AVAILABLE_FEATURE_TAGS.map((tag) => {
                        const active = (formData.features_list || []).includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`admin-feature-toggle-pill ${active ? 'admin-feature-toggle-pill--active' : ''}`}
                            onClick={() => handleToggleFeatureTag(tag)}
                          >
                            {active ? <Check size={13} /> : <Plus size={13} />}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer with Delete Option */}
              <div className="admin-modal__footer">
                <div className="admin-modal__footer-left">
                  {editingProduct && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger-outline"
                      onClick={() => openDeleteConfirm(editingProduct)}
                      title="Permanently remove this piece from store"
                    >
                      <Trash2 size={15} />
                      <span>Delete Piece</span>
                    </button>
                  )}

                  {activeTab !== 'details' && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      onClick={() => {
                        const tabs = ['details', 'photos', 'policy', 'specs'];
                        const prevIdx = tabs.indexOf(activeTab) - 1;
                        if (prevIdx >= 0) setActiveTab(tabs[prevIdx]);
                      }}
                    >
                      Back
                    </button>
                  )}
                  {activeTab !== 'specs' && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={() => {
                        const tabs = ['details', 'photos', 'policy', 'specs'];
                        const nextIdx = tabs.indexOf(activeTab) + 1;
                        if (nextIdx < tabs.length) setActiveTab(tabs[nextIdx]);
                      }}
                    >
                      <span>Next Tab</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>

                <div className="admin-modal__footer-right">
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="admin-btn admin-btn--primary"
                  >
                    {saveLoading
                      ? 'Saving piece...'
                      : editingProduct
                      ? 'Save Piece & Policies'
                      : 'Create Piece'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="admin-modal-backdrop">
          <div className="admin-confirm-dialog">
            <div className="admin-confirm-header">
              <div className="admin-confirm-icon-wrap">
                <AlertTriangle size={22} />
              </div>
              <h3 className="admin-confirm-title">
                {deleteTarget.isBulk
                  ? `Delete ${deleteTarget.count} Selected Pieces?`
                  : `Delete Piece: ${deleteTarget.name}?`}
              </h3>
            </div>

            <div className="admin-confirm-body">
              {deleteTarget.isBulk ? (
                <p>
                  You are about to permanently delete{' '}
                  <span className="admin-confirm-highlight">
                    {deleteTarget.count} jewellery pieces
                  </span>{' '}
                  from the catalog.
                </p>
              ) : (
                <p>
                  Are you sure you want to permanently delete{' '}
                  <span className="admin-confirm-highlight">
                    &quot;{deleteTarget.name}&quot;
                  </span>{' '}
                  (ID #{deleteTarget.id})?
                </p>
              )}
              <div className="admin-confirm-warning-note">
                <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                This will delete the piece, all its angle photographs, and customized policies from both the database and live storefront. This action cannot be undone.
              </div>
            </div>

            <div className="admin-confirm-footer">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={closeDeleteConfirm}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={executeDelete}
                disabled={deleteLoading}
              >
                <Trash2 size={15} />
                <span>
                  {deleteLoading
                    ? 'Deleting...'
                    : deleteTarget.isBulk
                    ? `Yes, Delete ${deleteTarget.count} Pieces`
                    : 'Yes, Delete Piece'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
