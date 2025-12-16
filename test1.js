// const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    
//     // Format YYYY-MM-DD
//     const year = nowVN.getFullYear();
//     const month = String(nowVN.getMonth() + 1).padStart(2, '0');
//     const day = String(nowVN.getDate()).padStart(2, '0');
//     const dateString = `${year}-${month}-${day}`; 
    
//     // Lấy giờ hiện tại VN (0-23)
//     const hours = nowVN.getHours();
//     console.log(dateString)


let dateTimeIn = "2025-12-13";
let dateTimeOut = "2025-12-14";
let timeIn = 13
let timeOut = 15
const moment = require("moment-timezone")
const startTime = moment.tz(dateTimeIn, "YYYY-MM-DD", "Asia/Ho_Chi_Minh") .hour(timeIn).minute(0).second(0);
  const endTime = moment.tz(dateTimeOut, "YYYY-MM-DD", "Asia/Ho_Chi_Minh").hour(timeOut).minute(0).second(0);
  let diffMs = endTime - startTime;
  const dateIn = new Date('2025-12-13 16:00:00')
    // const dateOut = new Date(reservation.dateOut).getDate();
      const tomorrow = moment().tz("Asia/Ho_Chi_Minh").add(1, 'days').format("YYYY-MM-DD");
    console.log(tomorrow)