const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

/**
 * Scan src/pages/ and return HtmlWebpackPlugin instances for every .html file.
 * Files at src/pages/<section>/index.html → output filename: <section>/index.html
 * Files at src/pages/home/index.html → output filename: index.html  (root entry)
 * Supports nested directories (e.g., src/pages/solutions/fast-food/)
 */
function buildHtmlPlugins() {
  const pagesDir = path.join(__dirname, 'src/pages');
  const plugins = [];

  // Directories excluded from production build (internal/marketing assets)
  const EXCLUDED_SECTIONS = new Set(['emails', 'linkedin', 'applications']);

  function scanDir(dir, relativePath) {
    for (const entry of fs.readdirSync(dir)) {
      const entryPath = path.join(dir, entry);
      const entryRelativePath = relativePath ? `${relativePath}/${entry}` : entry;
      const stat = fs.statSync(entryPath);

      if (stat.isDirectory()) {
        // Skip excluded directories
        if (EXCLUDED_SECTIONS.has(entry)) continue;
        // Recursively scan subdirectories
        scanDir(entryPath, entryRelativePath);
      } else if (entry.endsWith('.html')) {
        const template = `./src/pages/${entryRelativePath}`;
        const filename = `pages/${entryRelativePath}`;
        plugins.push(new HtmlWebpackPlugin({ template, filename, inject: false }));
      }
    }
  }

  scanDir(pagesDir, '');
  return plugins;
}

module.exports = (env = {}, argv = {}) => {
  const isProduction = argv.mode === 'production';
  // devBuild: production pipeline (minify + copy) but fixed filenames (no contenthash).
  // Triggered via --env devBuild, used by build:dev / build:dev:pack for daily testing.
  // This avoids the hash churn that causes sw.js / dist cache de-sync during development.
  const isDevBuild = Boolean(env.devBuild);

  return {
    mode: isProduction || isDevBuild ? 'production' : 'development',
    entry: './src/index.js',
    optimization: (isProduction || isDevBuild) ? {
      // runtimeChunk: isolates webpack runtime so contenthash of main bundle stays stable.
      // Only needed for production (where contenthash matters); devBuild has no hash so skip it.
      ...(isProduction ? { runtimeChunk: 'single' } : {}),
      // splitChunks: split product-data into its own chunk to avoid blocking main bundle parse.
      // devBuild disables this to prevent "Multiple chunks → same filename" conflict
      // (no contenthash means all initial chunks would collide on bundle.js).
      ...(isProduction ? {
        splitChunks: {
          chunks: 'all',
          // Only split modules larger than 40 KB (e.g. product-data-table.js ~332 KB)
          minSize: 40_000,
          cacheGroups: {
            // product-data-table goes into its own named chunk so the main
            // bundle is not blocked by parsing 332 KB of static product data.
            productData: {
              test: /[\\/]product-data-table\.js$/,
              name: 'product-data',
              chunks: 'all',
              enforce: true,
            },
          },
        },
      } : {}),
    } : {},
    output: {
      // Production: contenthash for long-term cache busting.
      // devBuild:   fixed filenames (no hash) to prevent sw.js / dist cache de-sync during testing.
      // Development (serve): always fixed filenames (in-memory, no dist output).
      filename: isProduction ? 'bundle.[contenthash:8].js' : 'bundle.js',
      chunkFilename: isProduction ? '[name].[contenthash:8].js' : '[name].js',
      path: path.resolve(__dirname, 'dist'),
      // Explicit root-relative publicPath — prevents 'auto' mis-detection
      // when the page is served from a non-root path (Nginx, Docker, etc.)
      publicPath: '/',
      clean: true,
    },
    module: {
      rules: [
        // Dev mode: tailwind.css is served directly from src/assets/css (no webpack processing)
        // Release mode: all CSS files are processed through postcss-loader (Tailwind compilation)
        ...((!isProduction && !isDevBuild)
          ? [
            // Dev: exclude tailwind.css from webpack (served directly by devServer)
            {
              test: /\.css$/i,
              exclude: /tailwind\.css$/i,
              use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
          ]
          : [
            // Production/DevBuild: process all CSS files
            {
              test: /\.css$/i,
              use: [
                MiniCssExtractPlugin.loader,
                'css-loader',
                'postcss-loader',
              ],
            },
          ]),
      ],
    },
    plugins: [
      // Inject development mode variable for Service Worker
      new webpack.DefinePlugin({
        __DEVELOPMENT__: JSON.stringify(!isProduction && !isDevBuild),
      }),
      ...buildHtmlPlugins(),
      ...((isProduction || isDevBuild)
        ? [
          new MiniCssExtractPlugin({
            filename: isProduction ? 'styles.[contenthash:8].css' : 'styles.css',
          }),
          new CopyWebpackPlugin({
            patterns: [
              // Copy runtime JS files — pages reference /assets/js/*.js (root-absolute)
              // MUST be in dist for production server (server.js only serves dist/).
              {
                from: 'src/assets/js',
                to: 'assets/js',
                filter: (resourcePath) => {
                  // Skip webpack-only / dead-code modules (see src/index.js deprecation header)
                  const skip = [
                    'common.js', 'image-assets.js', 'init.js', 'main.js',
                    'navigation.js', 'sidebar.js', 'utils.js', 'media-queries.js',
                    'product-list.js', 'product-data-table.js', 'products.js',
                    'smart-popup.js', // Moved to assets/js/ui/smart-popup.js
                    'max-display-header.js', // Moved to assets/js/ui/max-display-header.js
                    'min-display-footer.js', // Moved to assets/js/ui/min-display-footer.js
                    'pc-header.js', // Moved to assets/js/ui/pc-header.js
                    'back-to-top.js', // Moved to assets/js/ui/back-to-top.js
                  ];
                  return !skip.includes(path.basename(resourcePath));
                },
                noErrorOnMissing: true,
              },
              // Copy utility JS files (e.g. device-utils.js)
              {
                from: 'src/assets/js/utils',
                to: 'assets/js/utils',
                noErrorOnMissing: true,
              },
              // Copy UI component JS files
              {
                from: 'src/assets/js/ui',
                to: 'assets/js/ui',
                noErrorOnMissing: true,
              },
              // Copy all CSS files from src/assets/css into dist/assets/css
              // (includes styles.css, tailwind.css, z-index-system.css,
              // performance-optimized.css, etc.)
              {
                from: 'src/assets/css/*.css',
                to: 'assets/css/[name][ext]',
                noErrorOnMissing: true,
              },
              // Copy self-hosted fonts (woff2 + local-fonts.css)
              {
                from: 'src/assets/fonts',
                to: 'assets/fonts',
                noErrorOnMissing: true,
              },
              // Copy images — optimize-images.js 直接输出到 src/assets/images（含 WebP + 压缩 PNG）
              {
                from: 'src/assets/images',
                to: 'assets/images',
                noErrorOnMissing: true,
              },
              {
                from: 'src/sw.js',
                to: 'sw.js',
                noErrorOnMissing: true,
                transform(content) {
                  // Inject build-time SW env flags so the copied sw.js can
                  // behave correctly in development / test / production.
                  const swEnv = process.env.SW_ENV || (isProduction ? 'production' : 'development');
                  const isTest = String(swEnv).toLowerCase() === 'test';
                  const devFlag = (!isProduction && !isDevBuild) ? true : false;
                  const header = `/* injected by webpack: SW env */\nconst __SW_ENV__ = ${JSON.stringify(swEnv)};\nconst __DEVELOPMENT__ = ${JSON.stringify(devFlag)};\nconst __TEST__ = ${JSON.stringify(isTest)};\n`;
                  return Buffer.from(header + content.toString('utf8'));
                }
              },
              // GitHub Pages custom domain files
              {
                from: 'CNAME',
                to: 'CNAME',
                noErrorOnMissing: true,
              },
              {
                from: 'www.CNAME',
                to: 'www.CNAME',
                noErrorOnMissing: true,
              },
              // GitHub Pages SPA fallback — 404.html redirects unknown paths to index.html
              {
                from: 'src/404.html',
                to: '404.html',
                noErrorOnMissing: true,
              },
              // Copy factory tour video if it exists in project root or src/assets/
              {
                from: 'factory-tour.mp4',
                to: 'factory-tour.mp4',
                noErrorOnMissing: true,
              },
              {
                from: 'src/assets/factory-tour.mp4',
                to: 'factory-tour.mp4',
                noErrorOnMissing: true,
              },
              // Copy SPA entry point (SSG root entry with device redirect)
              {
                from: 'src/index.html',
                to: 'index.html',
                noErrorOnMissing: true,
              },
            ],
          }),
        ]
        : []),
    ],
    devServer: {
      // SPA fallback: serve index.html for any route that doesn't match a static file
      // This allows clean URL testing (/home/, /catalog/) in development
      historyApiFallback: true,
      static: [
        // Serve src/index.html at root
        {
          directory: path.join(__dirname, 'src'),
          publicPath: '/',
        },
        // SPA router fetches /home/index-pc.html, /catalog/index-pc.html etc.
        // (no /pages/ prefix). Map src/pages/ → / so these resolve without a build.
        // staticOptions.index:false prevents directory URLs like /home/ from serving
        // index.html (the Responsive Entry), which would cause a full-page redirect
        // instead of falling through to historyApiFallback → src/index.html (SPA shell).
        // serveIndex:false disables the directory listing page.
        {
          directory: path.join(__dirname, 'src/pages'),
          publicPath: '/',
          serveIndex: false,
          staticOptions: {
            index: false,
          },
        },
        // CSS — pages reference /assets/css/styles.css (root-absolute)
        {
          directory: path.join(__dirname, 'src/assets/css'),
          publicPath: '/assets/css',
        },
        // JS — pages reference /assets/js/router.js (root-absolute)
        {
          directory: path.join(__dirname, 'src/assets/js'),
          publicPath: '/assets/js',
        },
        // JS UI Components — pages reference /assets/js/ui/*.js
        {
          directory: path.join(__dirname, 'src/assets/js/ui'),
          publicPath: '/assets/js/ui',
        },
        // Fonts — self-hosted woff2 + local-fonts.css (no external CDN)
        {
          directory: path.join(__dirname, 'src/assets/fonts'),
          publicPath: '/assets/fonts',
        },
        // Serve image files from src/assets/images (development) or dist/images (production)
        {
          directory: path.join(__dirname, 'dist/images'),
          publicPath: '/images',
        },
        {
          directory: path.join(__dirname, 'src/assets/images'),
          publicPath: '/images',
        },
        // Page HTML files — serve src/pages/ and src/internal/ so in-page links
        // like /pages/support/iot-index-pc.html work in dev without a full build
        {
          directory: path.join(__dirname, 'src/pages'),
          publicPath: '/pages',
        },
        {
          directory: path.join(__dirname, 'src/internal'),
          publicPath: '/internal',
        },
        // UI-i18n merged JSON (used by translations.js)
        {
          directory: path.join(__dirname, 'src/assets'),
          publicPath: '/assets',
        },
      ],
      compress: true,
      port: 5000,
      headers: {
        'Service-Worker-Allowed': '/',
        // Prevent browser from caching dev-server responses (avoids stale-code issues)
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  };
};
