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
          Use this interface to make an audio call with Kadence. <br></br>
          Click the play button to start.
        </p>
        <p className="note">
          <strong>Note:</strong> there is a 15-minute limit for audio sessions.
        </p>
      </div>
    </div>
  );
};

export default InfoPanel; 