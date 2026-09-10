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

export default function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState(() => getCachedProductsList() || []);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
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
    primary_image_url: '/products/1/1.jpeg',
    images: ['/products/1/1.jpeg'],
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
      primary_image_url: '/products/1/1.jpeg',
      images: ['/products/1/1.jpeg'],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setNewImageUrl('');
    setUploadError('');
    const allImages = extractProductImageUrls(prod);
    const primary = prod.primary_image_url || prod.image || allImages[0] || '/products/1/1.jpeg';
    if (!allImages.includes(primary)) {
      allImages.unshift(primary);
    }
    setFormData({
      name: prod.name,
      category_name: prod.category_name || prod.category || 'Necklaces',
      price: prod.price,
      original_price: prod.original_price || '',
      description: prod.description || '',
      stock_quantity: prod.stock_quantity ?? 25,
      in_stock: prod.in_stock ?? true,
      is_featured: prod.is_featured ?? false,
      is_bestseller: prod.is_bestseller ?? false,
      primary_image_url: primary,
      images: allImages,
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

  // Image actions
  const handleSetPrimaryImage = (url) => {
    if (!url) return;
    setFormData((prev) => ({
      ...prev,
      primary_image_url: url,
    }));
    showFeedback('Set as primary display photo');
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
    showFeedback('Photo added to gallery');
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

        // Client read for instant preview and offline fallback
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

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    try {
      setSaveLoading(true);
      const qty = parseInt(formData.stock_quantity, 10);
      const stockQty = isNaN(qty) ? 0 : Math.max(0, qty);
      const isStock = stockQty > 0 ? Boolean(formData.in_stock) : false;

      const rawImages = (formData.images && formData.images.length > 0)
        ? formData.images
        : [formData.primary_image_url || '/products/1/1.jpeg'];
      const primaryImg = formData.primary_image_url || rawImages[0] || '/products/1/1.jpeg';

      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        stock_quantity: stockQty,
        in_stock: isStock,
        primary_image_url: primaryImg,
        image: primaryImg,
        images: rawImages,
        image_urls: rawImages,
      };

      if (editingProduct) {
        const updated = await adminApi.updateProduct(editingProduct.id, payload);
        cacheProduct(updated || { ...editingProduct, ...payload });
        showFeedback('Piece updated successfully!');
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
      const rawImages = (formData.images && formData.images.length > 0)
        ? formData.images
        : [formData.primary_image_url || '/products/1/1.jpeg'];
      const primaryImg = formData.primary_image_url || rawImages[0] || '/products/1/1.jpeg';

      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        stock_quantity: stockQty,
        in_stock: isStock,
        primary_image_url: primaryImg,
        image: primaryImg,
        images: rawImages,
        image_urls: rawImages,
      };

      if (editingProduct) {
        const updatedLocal = { ...editingProduct, ...formData, ...payload };
        cacheProduct(updatedLocal);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? updatedLocal : p))
        );
        showFeedback('Updated locally!');
      } else {
        const newProd = {
          ...formData,
          ...payload,
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

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the catalog?`)) return;

    try {
      await adminApi.deleteProduct(id);
      showFeedback('Product deleted.');
      setProducts((prev) => prev.filter((p) => p.id !== id));
      broadcastCatalogUpdate();
    } catch (err) {
      console.error('Error deleting product:', err);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showFeedback('Removed locally.');
      broadcastCatalogUpdate();
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
      setProducts((prev) =>
        prev.map((p) =>
          p.id === prod.id ? updatedProd : p
        )
      );
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
            placeholder="Search piece by name or style..."
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
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Piece</th>
                <th>Category</th>
                <th>Price</th>
                <th>Inventory</th>
                <th>In Stock</th>
                <th>Badges</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((prod) => (
                <tr key={prod.id}>
                  <td>
                    <div className="admin-prod-cell">
                      <img
                        src={prod.primary_image_url || prod.image || `/products/${prod.id}/1.jpeg`}
                        onError={(e) => { e.currentTarget.src = `/products/${(prod.id % 7) + 1}/1.jpeg`; }}
                        alt={prod.name}
                        className="admin-prod-thumb"
                      />
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
                    <span className={`admin-stock-num ${(prod.stock_quantity ?? 0) < 15 ? 'admin-stock-num--low' : ''}`}>
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
                        aria-label="Edit piece"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--delete"
                        onClick={() => handleDeleteProduct(prod.id, prod.name)}
                        aria-label="Delete piece"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal__header">
              <h3 className="admin-modal__title">
                {editingProduct ? `Edit Piece: ${editingProduct.name}` : 'Add New Jewellery Piece'}
              </h3>
              <button
                type="button"
                className="admin-modal__close"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="admin-modal__form">
              <div className="admin-form-group">
                <label>Piece Title *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Emerald Blossom Choker"
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
                    {categories && categories.map((cat) => {
                      const cName = cat.name || cat;
                      if (['Necklaces', 'Earrings', 'Rings', 'Bracelets'].includes(cName)) return null;
                      return <option key={cName} value={cName}>{cName}</option>;
                    })}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleFormChange}
                    min="0"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Price (₹) *</label>
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
                  <label>Original / MRP (₹)</label>
                  <input
                    type="number"
                    name="original_price"
                    value={formData.original_price}
                    onChange={handleFormChange}
                    placeholder="999"
                  />
                </div>
              </div>

              {/* Product Photography & Image Manager */}
              <div className="admin-image-manager">
                <div className="admin-image-manager__header">
                  <div className="admin-image-manager__title-wrap">
                    <ImageIcon size={18} className="admin-gold-icon" />
                    <div>
                      <h4 className="admin-image-manager__title">Product Photography & Gallery</h4>
                      <p className="admin-image-manager__subtitle">
                        Upload or change pictures. Click any image to set it as Primary display cover photo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Image Showcase */}
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
                      <Star size={12} fill="currentColor" /> Primary Cover Photo
                    </span>
                  </div>

                  <div className="admin-primary-preview-details">
                    <div className="admin-form-group">
                      <label>Primary Image Path or URL</label>
                      <input
                        type="text"
                        name="primary_image_url"
                        value={formData.primary_image_url}
                        onChange={handleFormChange}
                        placeholder="/products/85/1.jpeg or https://..."
                      />
                    </div>
                    <p className="admin-img-helper-text">
                      This photo is displayed on shop grids, homepage highlights, category listings, and order receipts.
                    </p>
                  </div>
                </div>

                {/* Multi-angle Gallery Thumbnails */}
                <div className="admin-gallery-section">
                  <div className="admin-gallery-section__bar">
                    <label className="admin-gallery-label">
                      Product Angles & Gallery ({formData.images ? formData.images.length : 0})
                    </label>
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
                                  title="Make this the primary picture"
                                >
                                  <Star size={12} /> Primary
                                </button>
                              )}
                              <button
                                type="button"
                                className="admin-gallery-btn admin-gallery-btn--delete"
                                onClick={() => handleRemoveImage(idx)}
                                title="Remove this photo"
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
                      <span>No gallery pictures added yet.</span>
                    </div>
                  )}
                </div>

                {/* Upload from Device & Quick URL Input */}
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
                      <UploadCloud size={24} className="admin-upload-icon" />
                      <div className="admin-dropzone-text">
                        <span className="admin-dropzone-main">
                          {isUploading ? 'Uploading / reading pictures...' : 'Upload Photos from Computer / Phone'}
                        </span>
                        <span className="admin-dropzone-sub">
                          Click to browse files or drag & drop (JPG, PNG, WEBP — select single or multiple angles)
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
                      placeholder="Or enter path / URL (e.g. /products/85/2.jpeg or https://...)"
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
                      <Plus size={15} /> Add Photo
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Crafted with titanium steel and 18K gold color plating..."
                />
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

              <div className="admin-modal__footer">
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
                  {saveLoading ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Piece'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
