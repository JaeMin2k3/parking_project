// const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    
//     // Format YYYY-MM-DD
//     const year = nowVN.getFullYear();
//     const month = String(nowVN.getMonth() + 1).padStart(2, '0');
//     const day = String(nowVN.getDate()).padStart(2, '0');
//     const dateString = `${year}-${month}-${day}`; 
    
//     // Lấy giờ hiện tại VN (0-23)
//     const hours = nowVN.getHours();
//     console.log(dateString)


  let dateTime = new Date().toLocaleString("sv-SE");
    const date = dateTime.split(" ")[0];
    const hour = dateTime.split(" ")[1];
    const tineEven = hour.split(":")[0];
    console.log(tineEven);
