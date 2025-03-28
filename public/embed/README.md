# Kadence Voice Embed

This directory contains files for embedding the Kadence Voice Assistant directly into LearnWorlds or other websites.

## Available Files

- **kadence-voice.js**: The main voice widget that handles audio recording, WebSocket communication, and voice playback.
- **kadence-audio.js**: Audio processing module that handles microphone access and audio data conversion.
- **kadence-button.js**: Creates a customizable button that can activate the voice widget when clicked.
- **kadence-inline.js**: Attaches voice functionality to existing elements like images or buttons.
- **embed-example.html**: Example implementation showing how to embed the voice assistant.
- **image-example.html**: Example showing how to add voice to an existing image.

## Integration Options

### Option 1: Attach to an Existing Image (Recommended)

Add voice functionality to an existing image or element on your page:

```html
<!-- 1. Load the required script -->
<script src="https://kadence-multimodal.vercel.app/embed/kadence-inline.js"></script>

<!-- 2. Initialize on your image (after your image in the page) -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  window.initKadenceOnElement('#yourImageId', {
    statusPosition: 'overlay',
    statusStyle: 'pulse'
  });
});
</script>
```

### Option 2: Button Integration

Add a button that activates the voice assistant when clicked:

```html
<!-- 1. Add a container where the button should appear -->
<div class="kadence-button-container" data-text="Talk to Kadence AI"></div>

<!-- 2. Load the Kadence button script -->
<script src="https://kadence-multimodal.vercel.app/embed/kadence-button.js"></script>
```

### Option 3: Direct Widget Integration

Directly embed the voice assistant widget (appears as a floating microphone button):

```html
<!-- Simply load the Kadence voice script -->
<script src="https://kadence-multimodal.vercel.app/embed/kadence-voice.js"></script>
```

## Inline Integration Customization

The `initKadenceOnElement` function accepts these options:

```javascript
window.initKadenceOnElement('#elementSelector', {
  // Where to place the status indicator
  statusPosition: 'overlay',  // 'overlay', 'after', 'before'
  
  // Style of the status indicator
  statusStyle: 'pulse',       // 'pulse', 'dot', 'indicator'
  
  // Start automatically without waiting for click
  autoStart: false            // true, false
});
```

## Button Customization

For developers who want more control over the button appearance:

```javascript
// After loading kadence-button.js:
window.KadenceButton.create({
  text: 'Ask Your AI Tutor',      // Custom button text
  target: '#my-container',        // CSS selector or DOM element 
  position: 'beforeend'           // DOM insertion position
});
```

## Username Detection

The voice assistant will attempt to detect the user's name from:

1. LearnWorlds user data (if available)
2. URL parameters (`?username=John`)
3. DOM elements with specific class names

If no name is found, it defaults to "student".

## Technical Details

- The voice widget uses the Web Audio API for recording audio
- WebSocket communication with the Gemini API happens through the serverless proxy
- Audio is processed in real-time and streamed to the API
- The API's audio responses are played back through the browser's audio system
- All processing happens without page reloads or opening new windows

## Browser Support

- **Recommended**: Chrome, Edge, Firefox on desktop
- **Limited Support**: Safari, mobile browsers

## Requirements

- HTTPS connection (required for microphone access)
- User permission for microphone access
- Modern browser with Web Audio API support

## Troubleshooting

If users encounter issues:

1. Ensure the browser has granted microphone permissions
2. Check that the user is on a secure (HTTPS) connection
3. Verify the browser supports the Web Audio API
4. Check browser console for any error messages 