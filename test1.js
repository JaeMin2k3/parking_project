 const now = new Date();
  //Dùng locale của Thụy Điển (sv-SE) để lấy format YYYY-MM-DD tại vì javascript không giống với java hay python có thể format YYYY-MM-DD 
    const currentDate = now.toLocaleDateString('sv-SE');
const hour = now.getHours();
console.log(hour);
console.log(currentDate);
  
