const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data'); // Import thư viện form-data riêng
require('dotenv').config();

module.exports = async function recognizePlate(filePath) {
  try {
    // 1. Kiểm tra file có tồn tại không để tránh lỗi vặt
    if (!fs.existsSync(filePath)) {
      throw new Error(`File không tồn tại: ${filePath}`);
    }

    // 2. Tạo form data từ thư viện 'form-data' (chuyên trị upload file trong Node.js)
    const bodyFormData = new FormData();
    bodyFormData.append('upload', fs.createReadStream(filePath)); // Stream file
    bodyFormData.append('regions', 'vn'); // Định hình vùng Việt Nam

    // 3. Gọi API bằng Axios
    const response = await axios({
      method: 'post',
      url: 'https://api.platerecognizer.com/v1/plate-reader/',
      data: bodyFormData,
      headers: {
        Authorization: `Token ${process.env.API_RECOGNITION}`,
        ...bodyFormData.getHeaders() // Quan trọng: Tự động sinh Boundary cho multipart
      },
      // Timeout 30s
      timeout: 30000 
    });

    // Axios tự ném lỗi nếu status không phải 2xx, nên không cần check !response.ok
    return response.data;

  } catch (err) {
    // Xử lý lỗi chi tiết hơn để dễ debug
    if (err.response) {
      // Lỗi từ phía Server (400, 401, 500...)
      console.error("API Error Details:", err.response.data);
      throw new Error(`Plate Recognizer API Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
    } else if (err.request) {
      // Lỗi không nhận được phản hồi (mạng lag, timeout)
      throw new Error("Không nhận được phản hồi từ API (Timeout hoặc lỗi mạng)");
    } else {
      // Lỗi code
      throw err;
    }
  }
};