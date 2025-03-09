/**
 * InfoPanel component
 * Displays information about Kadence to the user
 */
import React, { useState } from 'react';
import './info-panel.scss';

// Try to import local image but have a fallback
let kadenceImage = '';
try {
  kadenceImage = require('../../assets/kadence-avatar.png');
} catch (e) {
  // If local image fails, we'll use onError handler on the img element
  console.log('Local image not found, will use fallback');
}

// Fallback image URL - replace with a publicly accessible version of the Kadence avatar
const FALLBACK_IMAGE_URL = 'https://futureproofmusicschool.com/kadence-avatar.png'; 

interface InfoPanelProps {
  username?: string;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ username = 'student' }) => {
  const [imgError, setImgError] = useState(false);
  
  const handleImageError = () => {
    console.log('Image load error, using fallback');
    setImgError(true);
  };

  return (
    <div className="info-panel">
      <div className="avatar-container">
        <div className="avatar-circle">
          <img 
            src={imgError ? FALLBACK_IMAGE_URL : kadenceImage || FALLBACK_IMAGE_URL} 
            alt="Kadence AI" 
            className="avatar-image"
            onError={handleImageError}
          />
        </div>
      </div>
      
      <div className="info-text">
        <h2>Kadence Live<span className="early-access">Early Access</span></h2>
        
        <p className="description">
          Use this interface to share your screen with Kadence and get live realtime advice on your tracks and projects.
          <br /><br />
          This version of Kadence cannot listen to your music directly, but you can share your screen and talk with it about what you're doing in your DAW or other audio software, getting advice on how to mix your project, arrange your track, or just troubleshoot software issues.
        </p>
        
        <div className="instructions">
          <p><strong>1.</strong> Click play to begin and give the app microphone access when prompted.</p>
          <p><strong>2.</strong> Click share to share your screen, and you can begin talking to Kadence (via voice).</p>
        </div>
        
        <p className="note">
          <strong>Note:</strong> this version of Kadence is still experimental and there is a 15-minute limit for screensharing + audio sessions.
        </p>
      </div>
    </div>
  );
};

export default InfoPanel; 