# Smart Popup Component Guide

## Overview

The Smart Popup Component is a reusable, dynamically-loadable consultation popup that can be integrated into any page. It provides an intelligent lead capture form with behavioral tracking and auto-trigger capabilities.

## Architecture

### Component Structure

```
src/assets/templates/smart-popup-component.html  # HTML template with styles
src/assets/js/ui/smart-popup-loader.js           # Component loader
src/assets/js/ui/smart-popup.js                  # Core logic (existing)
```

### Key Features

- **Dynamic Loading**: Load popup on-demand without bloating initial page load
- **Reusable Template**: Single source of truth for popup HTML/CSS
- **Smart Initialization**: Automatic integration with smart-popup.js
- **Test Mode**: Built-in debugging capabilities
- **Dark Mode Support**: Automatic dark mode styling
- **Responsive Design**: Mobile-optimized layout

## Usage

### Method 1: Component Loader (Recommended)

#### Basic Implementation

```html
<!-- 1. Include required scripts -->
<script src="/assets/js/ui/smart-popup-loader.js"></script>
<script src="/assets/js/ui/smart-popup.js"></script>

<!-- 2. Add container (optional, will be created automatically) -->
<div id="smart-popup-container"></div>

<!-- 3. Initialize and load component -->
<script>
  // Option A: Use SmartPopupComponent loader
  SmartPopupComponent.init().then(function(success) {
    if (success) {
      console.log('Smart Popup loaded successfully');
    }
  });

  // Option B: Use smartPopup with component support
  smartPopup.initWithComponent().then(function(success) {
    if (success) {
      console.log('Smart Popup initialized with component');
    }
  });
</script>
```

#### Manual Trigger

```javascript
// Show popup on button click
document.getElementById('consultation-btn').addEventListener('click', function() {
  SmartPopupComponent.show('manual-click', { manual: true });
});

// Show popup programmatically
SmartPopupComponent.show('custom-trigger', { 
  manual: true,
  customData: { source: 'header' }
});

// Close popup
SmartPopupComponent.close({ dismissed: true });
```

#### Auto-Show on Page Load

```javascript
SmartPopupComponent.init().then(function(success) {
  if (success) {
    // Auto-show after 5 seconds
    setTimeout(function() {
      SmartPopupComponent.show('timed-auto', { manual: false });
    }, 5000);
  }
});
```

### Method 2: Traditional Direct Integration

For pages that already have the popup HTML embedded:

```html
<!-- Include smart-popup.js only -->
<script src="/assets/js/ui/smart-popup.js"></script>

<!-- Initialize directly -->
<script>
  smartPopup.init();
</script>
```

## API Reference

### SmartPopupComponent

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `init()` | None | `Promise<boolean>` | Load and initialize the component |
| `show(triggerReason, options)` | `triggerReason: string`, `options: object` | `void` | Show the popup |
| `close(options)` | `options: object` | `void` | Close the popup |
| `isLoaded()` | None | `boolean` | Check if component is loaded |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `config.templatePath` | `string` | Path to the HTML template |
| `config.containerId` | `string` | ID of the container element |
| `state.loaded` | `boolean` | Whether component is loaded |
| `state.loading` | `boolean` | Whether component is currently loading |

### smartPopup

#### Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `init()` | None | Initialize smart popup |
| `initWithComponent()` | None | Initialize with component loader support |
| `showPopup(triggerReason, options)` | `triggerReason: string`, `options: object` | Show popup |
| `closePopup(options)` | `options: object` | Close popup |

## Integration with Existing Pages

### Migration Steps

1. **Remove inline popup HTML** from your pages
2. **Add component loader script**:
   ```html
   <script src="/assets/js/ui/smart-popup-loader.js"></script>
   ```
3. **Initialize on page load**:
   ```javascript
   document.addEventListener('DOMContentLoaded', function() {
     SmartPopupComponent.init();
   });
   ```

### Example: PDP Page Integration

```html
<!-- In src/pages/pdp/index-pc.html -->

<!-- At the end of body, before closing </main> -->
<script src="/assets/js/ui/smart-popup-loader.js"></script>
<script src="/assets/js/ui/smart-popup.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Load Smart Popup component
    SmartPopupComponent.init().then(function(success) {
      if (success) {
        console.log('Smart Popup loaded on PDP page');
      }
    });
    
    // Bind to consultation button
    var consultBtn = document.getElementById('consultation-trigger');
    if (consultBtn) {
      consultBtn.addEventListener('click', function() {
        SmartPopupComponent.show('product-consultation', { manual: true });
      });
    }
  });
</script>
```

## Testing

### Test Page

A test page is available at:
```
/src/pages/test-smart-popup-component.html
```

### Manual Testing

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Open test page**:
   ```
   http://localhost:5000/pages/test-smart-popup-component.html
   ```

### Test Scenarios

1. **Component Loading**: Verify template loads correctly
2. **Manual Trigger**: Click button to show popup
3. **Auto-trigger**: Test behavioral auto-trigger
4. **Form Submission**: Submit test data
5. **Close Behavior**: Test close button and overlay click
6. **Multiple Pages**: Verify component works across different pages

## Configuration

### Customizing Template Path

```javascript
// Override default template path
SmartPopupComponent.config.templatePath = '/custom/path/to/template.html';

// Then initialize
SmartPopupComponent.init();
```

### Modifying Popup Behavior

Edit `src/assets/js/ui/smart-popup.js`:

```javascript
// Adjust scoring thresholds
scoreThresholdDesktop: 40,  // Default: 50
scoreThresholdMobile: 50,    // Default: 60

// Adjust timing
delayDesktopSeconds: 15,     // Default: 20
delayMobileSeconds: 20,      // Default: 25
```

## Browser Support

- Modern browsers (Chrome 60+, Firefox 60+, Safari 12+, Edge 79+)
- Requires `fetch` API support
- Requires `Promise` support

For older browsers, include polyfills:

```html
<script src="https://cdn.polyfill.io/v3/polyfill.min.js?features=fetch,Promise"></script>
```

## Troubleshooting

### Component Not Loading

**Symptoms**: Popup doesn't appear, console shows errors

**Solutions**:
1. Verify template file exists at configured path
2. Check browser console for fetch errors
3. Ensure scripts are loaded in correct order
4. Verify server is running and serving files

### Popup Not Showing

**Symptoms**: Component loads but popup doesn't display

**Solutions**:
1. Check if `smartPopup` object is available
2. Verify `showPopup` method is being called
3. Check engagement score thresholds
4. Review auto-popup conditions in smart-popup.js

### Styles Not Applied

**Symptoms**: Popup appears but looks broken

**Solutions**:
1. Verify CSS is included in template
2. Check for CSS conflicts with page styles
3. Ensure dark mode styles are applied correctly
4. Verify responsive breakpoints

## Performance Considerations

### Lazy Loading

The component loader implements lazy loading:

```javascript
// Load only when needed
function onUserInteraction() {
  SmartPopupComponent.init();
  // Remove listener after first interaction
  document.removeEventListener('click', onUserInteraction);
}
document.addEventListener('click', onUserInteraction);
```

### Bundle Size

- `smart-popup-loader.js`: ~3KB (minified)
- `smart-popup.js`: ~15KB (minified)
- `smart-popup-component.html`: ~5KB (gzipped)

Total: ~23KB additional load (loaded on-demand)

## Future Enhancements

- [ ] A/B testing support
- [ ] Custom template variants
- [ ] Advanced analytics integration
- [ ] Multi-step form support
- [ ] Conditional field display
- [ ] Integration with CRM systems

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all required files are included
3. Test on the provided test page
4. Review smart-popup.js documentation
