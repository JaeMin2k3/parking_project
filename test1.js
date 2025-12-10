// const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    
//     // Format YYYY-MM-DD
//     const year = nowVN.getFullYear();
//     const month = String(nowVN.getMonth() + 1).padStart(2, '0');
//     const day = String(nowVN.getDate()).padStart(2, '0');
//     const dateString = `${year}-${month}-${day}`; 
    
//     // Lấy giờ hiện tại VN (0-23)
//     const hours = nowVN.getHours();
//     console.log(dateString)


  const date = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
   const hours = new Date().getHours(); 
   const dateString = date.toString();
   const currentYear = new Date().getFullYear();;
   const startOfYear = new Date(currentYear, 0, 1); // 0 là tháng 1
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59); // 11 là tháng 12
    console.log(startOfYear);
    console.log(endOfYear);
