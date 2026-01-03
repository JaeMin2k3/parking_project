const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data'); 
require('dotenv').config();

module.exports = async function recognizePlate(filePath) {
  try {
    //  Kiểm tra file có tồn tại không để tránh lỗi vặt
    if (!fs.existsSync(filePath)) {
      throw new Error(`File không tồn tại: ${filePath}`);
    }

   
    const bodyFormData = new FormData();
    bodyFormData.append('upload', fs.createReadStream(filePath)); 
    bodyFormData.append('regions', 'vn'); 

    
    const response = await axios({
      method: 'post',
      url: 'https://api.platerecognizer.com/v1/plate-reader/',
      data: bodyFormData,
      headers: {
        Authorization: `Token ${process.env.API_RECOGNITION}`,
        ...bodyFormData.getHeaders() 
      },
 
      timeout: 30000 
    });

   
    return response.data;

  } catch (err) {
  
    if (err.response) {
      
      console.error("API Error Details:", err.response.data);
      throw new Error(`Plate Recognizer API Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
    } else if (err.request) {
      throw new Error("Không nhận được phản hồi từ API (Timeout hoặc lỗi mạng)");
    } else {
      throw err;
    }
  }
};