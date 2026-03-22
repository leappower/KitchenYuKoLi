/**
 * image-assets.js — Image path mapping (IIFE build for src/ static HTML)
 * Synced from: src/assets/image-assets.js
 * Global: window.ImageAssets
 *
 * ⚠️  NOTE: In the original src/ build, this module imports image-manifest.json
 *     at webpack build time to auto-discover product images. In this static
 *     version, product images from the manifest are NOT auto-populated.
 *
 *     If you need product images in src/, either:
 *       a) Manually add keys to productImages below, OR
 *       b) Fetch /images/image-manifest.json at runtime and call
 *          window.ImageAssets.loadFromManifest() after page load.
 *
 * Usage: <script src="../../assets/js/image-assets.js"></script>
 * Then:  window.ImageAssets.IMAGE_ASSETS.logo  // → "images/logo_html.webp"
 *        window.ImageAssets.resolveImage('logo_html')  // → "images/logo_html.webp"
 */
(function (global) {
  'use strict';

  var IMAGE_PATH_PREFIX = 'images';

  /** Return WebP image path for a key */
  function resolveImage(key) {
    return IMAGE_PATH_PREFIX + '/' + key + '.webp';
  }

  /** Generate <img> tag HTML */
  function imgTag(key, altText, cssClass, extraAttrs) {
    if (altText === undefined) altText = '';
    if (cssClass === undefined) cssClass = '';
    if (extraAttrs === undefined) extraAttrs = '';
    var src = IMAGE_PATH_PREFIX + '/' + key + '.webp';
    return '<img src="' + src + '" alt="' + altText + '" class="' + cssClass + '" ' + extraAttrs + ' loading="lazy" decoding="async">';
  }

  // ─── Static image assets (non-product, paths are fixed) ──────────────────────
  var IMAGE_ASSETS = {
    logo:                  IMAGE_PATH_PREFIX + '/logo_html.webp',
    logo_dark:             IMAGE_PATH_PREFIX + '/logo_html_2.webp',
    hero_bg:               IMAGE_PATH_PREFIX + '/workshop_bgm.webp',
    hero_main:             IMAGE_PATH_PREFIX + '/hero_main.webp',
    factory_video_poster:  IMAGE_PATH_PREFIX + '/factory_video_poster.webp',
    factory_gallery_1:     IMAGE_PATH_PREFIX + '/factory_gallery_1.webp',
    factory_gallery_2:     IMAGE_PATH_PREFIX + '/factory_gallery_2.webp',
    factory_gallery_3:     IMAGE_PATH_PREFIX + '/factory_gallery_3.webp',
    factory_gallery_4:     IMAGE_PATH_PREFIX + '/factory_gallery_4.webp',
    cert_1:                IMAGE_PATH_PREFIX + '/cert_1.webp',
    cert_2:                IMAGE_PATH_PREFIX + '/cert_2.webp',
    cert_3:                IMAGE_PATH_PREFIX + '/cert_3.webp',
    cert_4:                IMAGE_PATH_PREFIX + '/cert_4.webp',
    cert_5:                IMAGE_PATH_PREFIX + '/cert_5.webp',
    cert_6:                IMAGE_PATH_PREFIX + '/cert_6.webp',
    product_compact:       IMAGE_PATH_PREFIX + '/product_compact.webp',
    product_professional:  IMAGE_PATH_PREFIX + '/product_professional.webp',
    product_industrial:    IMAGE_PATH_PREFIX + '/product_industrial.webp',
    // Product images are populated at runtime via loadFromManifest()
    // See the ⚠️ note at the top of this file for details.
  };

  /**
   * Load product image keys from /images/image-manifest.json at runtime.
   * Call this after the page has loaded if you need product images:
   *   window.ImageAssets.loadFromManifest().then(() => { ... });
   */
  function loadFromManifest() {
    var NON_PRODUCT_KEYS = new Set([
      'logo_html', 'logo_html_2', 'workshop_bgm', 'hero_main', 'factory_video_poster',
      'factory_gallery_1', 'factory_gallery_2', 'factory_gallery_3', 'factory_gallery_4',
      'cert_1', 'cert_2', 'cert_3', 'cert_4', 'cert_5', 'cert_6',
      'product_compact', 'product_professional', 'product_industrial'
    ]);

    return fetch('/images/image-manifest.json').then(function (res) {
      if (!res.ok) throw new Error('Failed to load image-manifest.json');
      return res.json();
    }).then(function (manifest) {
      var images = manifest.images || [];
      images.forEach(function (key) {
        if (!NON_PRODUCT_KEYS.has(key)) {
          IMAGE_ASSETS[key] = IMAGE_PATH_PREFIX + '/' + key + '.webp';
        }
      });
    }).catch(function (err) {
      console.warn('[ImageAssets] Could not load image-manifest.json:', err.message);
    });
  }

  global.ImageAssets = {
    IMAGE_ASSETS:      IMAGE_ASSETS,
    resolveImage:      resolveImage,
    imgTag:            imgTag,
    loadFromManifest:  loadFromManifest
  };

}(window));
