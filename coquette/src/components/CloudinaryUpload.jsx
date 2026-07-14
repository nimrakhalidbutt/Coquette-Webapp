import { useState, useRef } from 'react';
import { uploadToCloudinary } from '../cloudinary';

export default function CloudinaryUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Compress image before upload
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.8);
        };
      };
      reader.onerror = reject;
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    setUploadedFile(null);

    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Compress if it's an image
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        if (file.size > 1024 * 1024) {
          console.log('📦 Compressing image...');
          fileToUpload = await compressImage(file);
        }
      }

      const result = await uploadToCloudinary(fileToUpload);
      console.log('✅ Upload successful:', result);
      
      // Store the uploaded file info
      setUploadedFile(result);
      
      // Send to parent component
      onUploadComplete(result);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removePreview = () => {
    setPreview(null);
    setUploadedFile(null);
    setError(null);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Tell parent that media was removed
    onUploadComplete(null);
  };

  const uploadNewPhoto = () => {
    removePreview();
    // Small delay to ensure state is cleared before opening file picker
    setTimeout(() => {
      triggerFileInput();
    }, 50);
  };

  return (
    <div className="cloudinary-upload-container">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*"
        style={{ display: 'none' }}
      />

      {error && (
        <div className="upload-error">
          <span className="error-icon">😿</span>
          <span className="error-text">{error}</span>
          <button onClick={() => setError(null)} className="error-close">✕</button>
        </div>
      )}

      {/* No preview - show upload button */}
      {!preview && !uploading && (
        <button
          type="button"
          onClick={triggerFileInput}
          className="cloudinary-upload-btn"
        >
          <span className="btn-icon">📸</span>
          <span className="btn-text">add photo</span>
          <span className="btn-bow">🎀</span>
        </button>
      )}

      {/* Uploading state */}
      {uploading && (
        <div className="uploading-container">
          <div className="preview-container">
            {preview && (
              <img src={preview} alt="Preview" className="upload-preview" />
            )}
          </div>
          <div className="cloudinary-progress">
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: '70%' }} />
            </div>
            <span className="progress-text">✨ uploading...</span>
          </div>
        </div>
      )}

      {/* Preview with uploaded file - STAYS UNTIL USER REMOVES */}
      {!uploading && preview && uploadedFile && (
        <div className="preview-success">
          <div className="preview-header">
            <span className="preview-title">✅ photo ready!</span>
            <div className="preview-actions">
              <button onClick={uploadNewPhoto} className="preview-change" title="upload different photo">
                🔄
              </button>
              <button onClick={removePreview} className="preview-remove" title="remove photo">
                ✕
              </button>
            </div>
          </div>
          <img src={preview} alt="Preview" className="success-preview" />
          <p className="preview-note">📸 click ✕ to remove • click 🔄 to change</p>
        </div>
      )}
    </div>
  );
}