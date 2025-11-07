
const fs = require('fs')

require('dotenv').config();
module.exports = async function recognizePlate(filePath) {
  try{
    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    formData.append("upload", new Blob([fileBuffer]), "image.jpg");
    const response = await fetch("https://api.platerecognizer.com/v1/plate-reader/", {
      method: "POST",
      headers: { Authorization: `Token ${process.env.API_RECOGNITION}` },
      body: formData
    });

    if(!response.ok) throw new Error(`appi error: ${response.status}`);
    const data = await response.json();
    return data;
  }catch(err){
    console.log(err);
    throw(err);
  }
}

