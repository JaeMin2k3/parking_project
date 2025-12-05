module.exports = async function checkTime(reservation) {
  console.log(reservation)
  const now = new Date();
  const currentDate = now.toLocaleDateString('sv-SE');
  const currentTime = now.getHours()+ now.getMinutes()/60;
  console.log(currentTime + "currentTime")
  if(reservation.isOverNight){
    const endTime = reservation.startBlock + reservation.blockCount - 24;
    console.log(endTime + "endtime")
    if(currentDate === reservation.dateIn && reservations.startBlock <= currentTime) return true;
    else {
      if(currentTime <  endTime) return true;
    }
  }else{
    console.log(reservation.startTime);
    if(currentTime >= reservation.startBlock && currentTime < (reservation.startBlock+reservation.blockCount) ) return true;
  } 
  return false
}