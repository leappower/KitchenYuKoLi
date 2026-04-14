'use strict';

function cmsApp() {
  return {
    page: 'dashboard',
    sidebarOpen: false,
    user: null,
    token: null,
    toasts: [],
    toastId: 0,
    publishing: false,

    stats: { products: 0, categories: 0, media: 0, lastPublish: null },
    auditLogs: [],
    categories: [],
    products: [],
    media: [],

    productFilter: { category_id: '', status: '', search: '' },

    categoryModal: { show: false, id: null, slug: '', i18n_key: '', sort_order: 0, is_active: true },
    productModal: { show: false, id: null, model: '', sub_category: '', category_id: '', status: '在售',
      badge: '', badge_color: '', power: '', throughput: '', average_time: '', voltage: '', frequency: '',
      material: '', product_dimensions: '', color: '', control_method: '', launch_time: '', sort_order: 0, images: [] },

    menuItems: [
      { key: 'dashboard', label: 'Dashboard', icon: '📊', badge: null },
      { key: 'categories', label: '产品系列', icon: '📦', badge: null },
      { key: 'products', label: '产品管理', icon: '🔧', badge: null },
      { key: 'media', label: '媒体库', icon: '🖼️', badge: null },
      { key: 'nav', label: '导航管理', icon: '📝', badge: null, disabled: true },
      { key: 'i18n', label: '多语言', icon: '🌐', badge: null, disabled: true },
    ],

    init() {
      this.token = localStorage.getItem('cms_token');
      try { this.user = JSON.parse(localStorage.getItem('cms_user')); } catch (e) {}

      if (!this.token) {
        window.location.href = '/admin/login.html';
        return;
      }

      this.loadDashboard();
    },

    toast(msg, type = 'success') {
      const id = ++this.toastId;
      this.toasts.push({ id, msg, type });
      setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 3000);
    },

    async api(path, options = {}) {
      const headers = { 'Content-Type': 'application/json' };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
      if (options.body && typeof options.body === 'string') {
        // already stringified
      } else if (options.body) {
        options.body = JSON.stringify(options.body);
      }
      options.headers = { ...headers, ...(options.headers || {}) };

      try {
        const res = await fetch('/api/cms' + path, options);
        const data = await res.json();
        if (res.status === 401) {
          this.logout();
          return null;
        }
        if (!res.ok) {
          this.toast(data.error || '请求失败', 'error');
          return null;
        }
        return data;
      } catch (e) {
        this.toast('网络错误', 'error');
        return null;
      }
    },

    async loadDashboard() {
      this.loadCategories();
      const p = await this.api('/products?limit=1');
      if (p) this.stats.products = p.total || 0;
      const c = await this.api('/categories');
      if (c) this.stats.categories = c.categories.length;
      const m = await this.api('/media?limit=1');
      if (m) this.stats.media = m.total || 0;

      // Get last publish from audit logs
      const audit = await this.api('/audit-log');
      // For now just show categories count
    },

    async loadCategories() {
      const data = await this.api('/categories');
      if (data) this.categories = data.categories || [];
    },

    async loadProducts() {
      const params = new URLSearchParams();
      if (this.productFilter.category_id) params.set('category_id', this.productFilter.category_id);
      if (this.productFilter.status) params.set('status', this.productFilter.status);
      if (this.productFilter.search) params.set('search', this.productFilter.search);
      const data = await this.api('/products?' + params.toString());
      if (data) this.products = data.products || [];
    },

    async loadMedia() {
      const data = await this.api('/media?limit=100');
      if (data) this.media = data.media || [];
    },

    // Watch page changes
    'page'(val) {
      if (val === 'categories') this.loadCategories();
      if (val === 'products') { this.loadCategories(); this.loadProducts(); }
      if (val === 'media') this.loadMedia();
      if (val === 'dashboard') this.loadDashboard();
    },

    // Categories CRUD
    openCategoryForm(cat = null) {
      if (cat) {
        this.categoryModal = { show: true, id: cat.id, slug: cat.slug, i18n_key: cat.i18n_key || '',
          sort_order: cat.sort_order, is_active: !!cat.is_active };
      } else {
        this.categoryModal = { show: true, id: null, slug: '', i18n_key: '', sort_order: 0, is_active: true };
      }
    },

    async saveCategory() {
      const m = this.categoryModal;
      const body = { slug: m.slug, i18n_key: m.i18n_key, sort_order: m.sort_order, is_active: m.is_active };
      let data;
      if (m.id) {
        data = await this.api('/categories/' + m.id, { method: 'PUT', body });
      } else {
        data = await this.api('/categories', { method: 'POST', body });
      }
      if (data) {
        this.toast(m.id ? '系列已更新' : '系列已创建');
        this.categoryModal.show = false;
        this.loadCategories();
      }
    },

    async deleteCategory(cat) {
      if (!confirm(`确认删除系列 "${cat.slug}"？`)) return;
      const data = await this.api('/categories/' + cat.id, { method: 'DELETE' });
      if (data) {
        this.toast('系列已删除');
        this.loadCategories();
      }
    },

    // Products CRUD
    openProductForm(p = null) {
      if (p) {
        // Load full product with images
        this.api('/products/' + p.id).then(data => {
          if (!data) return;
          const pr = data.product;
          this.productModal = {
            show: true, id: pr.id, model: pr.model, sub_category: pr.sub_category || '',
            category_id: pr.category_id || '', status: pr.status || '在售',
            badge: pr.badge || '', badge_color: pr.badge_color || '',
            power: pr.power || '', throughput: pr.throughput || '', average_time: pr.average_time || '',
            voltage: pr.voltage || '', frequency: pr.frequency || '', material: pr.material || '',
            product_dimensions: pr.product_dimensions || '', color: pr.color || '',
            control_method: pr.control_method || '', launch_time: pr.launch_time || '',
            sort_order: pr.sort_order || 0, images: pr.images || []
          };
        });
      } else {
        this.productModal = { show: true, id: null, model: '', sub_category: '', category_id: '', status: '在售',
          badge: '', badge_color: '', power: '', throughput: '', average_time: '', voltage: '', frequency: '',
          material: '', product_dimensions: '', color: '', control_method: '', launch_time: '',
          sort_order: 0, images: [] };
      }
    },

    async saveProduct() {
      const m = this.productModal;
      const body = { model: m.model, sub_category: m.sub_category, category_id: m.category_id || null,
        status: m.status, badge: m.badge, badge_color: m.badge_color,
        power: m.power, throughput: m.throughput, average_time: m.average_time,
        voltage: m.voltage, frequency: m.frequency, material: m.material,
        product_dimensions: m.product_dimensions, color: m.color,
        control_method: m.control_method, launch_time: m.launch_time, sort_order: m.sort_order };

      let data;
      if (m.id) {
        data = await this.api('/products/' + m.id, { method: 'PUT', body });
      } else {
        data = await this.api('/products', { method: 'POST', body });
      }
      if (data) {
        this.toast(m.id ? '产品已更新' : '产品已创建');
        this.productModal.show = false;
        this.loadProducts();
      }
    },

    async deleteProduct() {
      if (!confirm(`确认删除产品 "${this.productModal.model}"？`)) return;
      const data = await this.api('/products/' + this.productModal.id, { method: 'DELETE' });
      if (data) {
        this.toast('产品已删除');
        this.productModal.show = false;
        this.loadProducts();
      }
    },

    async uploadProductImage(event) {
      const files = event.target.files;
      if (!files.length || !this.productModal.id) return;

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/cms/media/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.token}` },
          body: formData
        });
        const data = await res.json();
        if (!res.ok) { this.toast(data.error || '上传失败', 'error'); continue; }

        const media = data.media[0];
        // Link image to product
        const isPrimary = this.productModal.images.length === 0;
        await this.api('/products/' + this.productModal.id + '/images', {
          method: 'POST',
          body: { file_path: media.file_path, is_primary: isPrimary, sort_order: this.productModal.images.length, alt_text: file.name }
        });
      }

      event.target.value = '';
      // Reload product images
      const fullProduct = await this.api('/products/' + this.productModal.id);
      if (fullProduct) this.productModal.images = fullProduct.product.images || [];
      this.loadProducts();
      this.toast('图片已上传');
    },

    async setImagePrimary(img) {
      await this.api('/products/' + this.productModal.id + '/images/reorder', {
        method: 'PUT',
        body: this.productModal.images.map((im, idx) => ({
          id: im.id, sort_order: idx, is_primary: im.id === img.id
        }))
      });
      const fullProduct = await this.api('/products/' + this.productModal.id);
      if (fullProduct) this.productModal.images = fullProduct.product.images || [];
      this.toast('主图已设置');
    },

    async deleteProductImage(img) {
      await this.api('/products/' + this.productModal.id + '/images/' + img.id, { method: 'DELETE' });
      this.productModal.images = this.productModal.images.filter(i => i.id !== img.id);
      this.toast('图片已删除');
    },

    // Media
    async uploadMedia(event) {
      const files = event.target.files;
      if (!files.length) return;

      const formData = new FormData();
      for (const file of files) formData.append('files', file);

      const res = await fetch('/api/cms/media/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) { this.toast(data.error || '上传失败', 'error'); return; }

      this.toast(`${data.media.length} 个文件已上传`);
      this.loadMedia();
      event.target.value = '';
    },

    async deleteMedia(m) {
      if (!confirm(`确认删除 "${m.original_name}"？`)) return;
      await this.api('/media/' + m.id, { method: 'DELETE' });
      this.loadMedia();
      this.toast('文件已删除');
    },

    // Publish
    async publishProducts() {
      if (!confirm('确认发布？将覆盖现有的 product-data-table.js')) return;
      this.publishing = true;
      const data = await this.api('/publish/products', { method: 'POST' });
      if (data) {
        this.toast(`发布成功！${data.stats.products} 个产品`);
      }
      this.publishing = false;
    },

    // Auth
    logout() {
      localStorage.removeItem('cms_token');
      localStorage.removeItem('cms_user');
      window.location.href = '/admin/login.html';
    },

    // Utils
    formatBytes(bytes) {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
  };
}
