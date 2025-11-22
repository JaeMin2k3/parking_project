module.exports = async function checkTime(reservation) {
  const now = new Date();
  //Dùng locale của Thụy Điển (sv-SE) để lấy format YYYY-MM-DD 
  const currentDate = now.toLocaleDateString('sv-SE');
  const currentTime = now.getHours()+ now.getMinutes()/60;
  console.log(currentTime + "currentTime")
  if(currentDate === reservation.date){
    const lastTime = reservation.startBlock + reservation.blockCount;
    console.log(lastTime);
    if(currentTime >= reservation.startBlock && currentTime < lastTime){
      return true;
    }
  }
  return false;
}