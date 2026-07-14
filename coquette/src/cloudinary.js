// cloudinary.js
const CLOUD_NAME = 'drcihwinh'; // Your cloud name
const UPLOAD_PRESET = 'delulu_preset'; // Your upload preset

/**
 * Upload post images/videos to Cloudinary
 */
export const uploadToCloudinary = async (file) => {
  console.log('📤 Starting upload to Cloudinary...');
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('cloud_name', CLOUD_NAME);
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Cloudinary error:', data.error);
      throw new Error(data.error.message || 'Upload failed');
    }
    
    if (data.secure_url) {
      console.log('✅ Upload successful! URL:', data.secure_url);
      return {
        url: data.secure_url,
        type: data.resource_type === 'image' ? 'image' : 'video',
        publicId: data.public_id
      };
    } else {
      throw new Error('Upload failed - no URL returned');
    }
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
};

/**
 * Upload avatar/profile picture to Cloudinary (with square crop)
 */
export const uploadAvatarToCloudinary = async (file) => {
  console.log('👤 Starting avatar upload to Cloudinary...');
  console.log('📁 File:', file.name, file.type, (file.size / 1024).toFixed(2) + 'KB');
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('cloud_name', CLOUD_NAME);
    
    // Add avatar-specific transformations (square crop, resize to 400x400)
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    
    console.log('📡 Upload URL:', uploadUrl);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    console.log('📥 Response status:', response.status);
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (data.error) {
      console.error('❌ Cloudinary error:', data.error);
      throw new Error(data.error.message || 'Avatar upload failed');
    }
    
    if (data.secure_url) {
      // Add transformations to the URL for avatar display
      // This creates a 400x400 square crop
      const avatarUrl = data.secure_url.replace('/upload/', '/upload/c_fill,g_face,w_400,h_400/');
      
      console.log('✅ Avatar uploaded successfully! URL:', avatarUrl);
      return {
        url: avatarUrl,
        publicId: data.public_id,
        originalUrl: data.secure_url
      };
    } else {
      throw new Error('Avatar upload failed - no URL returned');
    }
    
  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    throw error;
  }
};