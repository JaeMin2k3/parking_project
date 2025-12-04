module.exports = async function checkTime(reservation) {
  const now = new Date();
  const currentDate = now.toLocaleDateString('sv-SE');
  const currentTime = now.getHours()+ now.getMinutes()/60;
  console.log(currentTime + "currentTime")
  if(reservation.isOverNight){
    const endTime = reservation.startTime + reservation.blockCount - 24;
    if(currentDate === reservation.dateIn && reservations.startTime <= currentTime) return true;
    else {
      if(currentTime <  endTime) return true;
    }
  }else{
    if(currentTime >= reservation.startTime && currentTime < (reservation.startTime+reservation.blockCount) ) return true;
  } 
  return false
}