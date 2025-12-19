// const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    
//     // Format YYYY-MM-DD
//     const year = nowVN.getFullYear();
//     const month = String(nowVN.getMonth() + 1).padStart(2, '0');
//     const day = String(nowVN.getDate()).padStart(2, '0');
//     const dateString = `${year}-${month}-${day}`; 
    
//     // Lấy giờ hiện tại VN (0-23)
//     const hours = nowVN.getHours();
//     console.log(dateString)

const moment = require('moment-timezone')

     const hour = Number(moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss").split(":")[0]);
     
    console.log(hour+1)