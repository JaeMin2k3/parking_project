const fs = require('fs');
const cloudinary = require('../config/cloudinary')
module.exports = async function uploadAndCleanup(filePath) {
  const uploadResult = await cloudinary.uploader.upload(filePath, {folder: 'parking'});
  if(uploadResult){
    try {
      await fs.unlinkSync(filePath);
    } catch (error) {
      console.log(error)
    }
  }
  return uploadResult;
}