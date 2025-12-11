// const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    
//     // Format YYYY-MM-DD
//     const year = nowVN.getFullYear();
//     const month = String(nowVN.getMonth() + 1).padStart(2, '0');
//     const day = String(nowVN.getDate()).padStart(2, '0');
//     const dateString = `${year}-${month}-${day}`; 
    
//     // Lấy giờ hiện tại VN (0-23)
//     const hours = nowVN.getHours();
//     console.log(dateString)



const now = new Date();
    const options = { timeZone: 'Asia/Ho_Chi_Minh' };
    const isoFormat = 'sv-SE';
    const date1 = now.toLocaleDateString(isoFormat, options); 
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date2 = tomorrow.toLocaleDateString(isoFormat, options);
    console.log(date1 + date2)