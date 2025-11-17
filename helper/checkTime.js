module.exports = async function checkTime(reservation) {
  const now = new Date();
  //Dùng locale của Thụy Điển (sv-SE) để lấy format YYYY-MM-DD tại vì javascript không giống với java hay python có thể format YYYY-MM-DD 
  const currentDate = now.toLocaleDateString('sv-SE');
  const currentTime = now.getHours()+ now.getMinutes()/60;
  if(currentDate === reservation.date){
    if(currentTime >= reservation.startBlock && currentTime < (reservation.startBlock+reservation.endBlock)){
      return true;
    }
  }
  return false;
}