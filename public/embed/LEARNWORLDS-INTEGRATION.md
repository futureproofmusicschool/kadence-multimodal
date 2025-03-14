# Adding Kadence Voice to LearnWorlds Images

This guide explains how to add Kadence voice functionality to an **existing image** in your LearnWorlds course.

## Method 1: Using Your Existing Image (Recommended)

This method detects and enhances your existing Kadence image on the page, so you don't need to add a new element.

1. Go to your LearnWorlds course page
2. Add a **Custom Code** element (found in the "Add Elements" menu)
3. Paste the following code:

```html
<script>
(function() {
  // Configuration
  const KADENCE_API_ENDPOINT = 'https://kadence-multimodal.vercel.app/api/gemini-proxy';
  const DEFAULT_WELCOME_MESSAGE = 'Hi there! I\'m Kadence, your AI music tutor. How can I help you today?';
  
  // Find your image(s) - modify this selector as needed for your specific image
  const TARGET_IMAGE_SELECTOR = 'img[src*="kadence"], img[alt*="kadence"], img[alt*="Kadence"], img[class*="kadence"], img.ai-assistant, img.voice-assistant';
  
  // Rest of the code (implementation details)...
  // [Code continues as in the learnworlds-existing-image.html file]
})();
</script>
```

> **IMPORTANT**: For Method 1 to work, your image must contain "kadence" in its filename, alt text, or class. If it doesn't, you'll need to modify the `TARGET_IMAGE_SELECTOR` in the code above to match your specific image.

## Method 2: Adding a New Interactive Image

This method adds a completely new interactive element (with an image) to your LearnWorlds page:

1. Go to your LearnWorlds course page
2. Add a **Custom Code** element (found in the "Add Elements" menu)
3. Paste the following code:

```html
<div id="kadence-voice-container" style="width: 100%; max-width: 500px; margin: 0 auto; position: relative; cursor: pointer;">
  <!-- You can replace this image URL with your own -->
  <img id="kadence-voice-image" src="https://placehold.co/500x300/1a73e8/ffffff?text=Talk+to+Kadence" alt="Click to talk to Kadence" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
  
  <!-- Status indicator overlay -->
  <div id="kadence-status" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; border-radius: 50%; background-color: rgba(234, 67, 53, 0.6); z-index: 10;"></div>
</div>

<!-- Kadence Voice Assistant Script -->
<script>
  // [Insert complete script from learnworlds-element.html here]
</script>
```

## Troubleshooting

If the integration isn't working with your existing image, try these solutions:

1. **Make sure your image is identifiable**: Rename your image file to include "kadence" or add "kadence" to the alt text or class of your image.

2. **Add a custom selector**: If you can't modify your image, you'll need to use a more specific selector. Inspect your image in the browser (right-click → Inspect) to find a unique way to identify it, then modify the `TARGET_IMAGE_SELECTOR` accordingly.

3. **Use Method 2 instead**: If you can't get Method 1 working, switch to Method 2 which adds a completely new element.

## How It Works

When a user clicks on the enabled image:
1. A microphone permission request will appear (first time only)
2. A subtle red pulse overlay will appear on the image
3. The user can speak naturally to Kadence
4. Kadence will respond with voice

## Notes

- The page must be loaded over HTTPS for microphone access to work
- This works best in Chrome, Edge, and Firefox browsers
- The script automatically tries to detect the student's name from LearnWorlds 