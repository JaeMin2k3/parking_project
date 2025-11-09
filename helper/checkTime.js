module.exports = async function checkTime(reservation, res) {
  const now = new Date();
  const currentDate = now.toISOString.split('T')[0];
  const currentTime = now.getHours()+ now.getMinutes()/60;
  if(currentDate === reservation.date){
    if(currentTime >= reservation.startBlock && currentTime < (reservation.startBlock+reservation.endBlock)){
      console.log("thời gian hợp lệ")
    }else{
      res.status(400).json({
        message: `thời gian đỗ xe của bạn vào ngày${reservation.date} từ ${reservation.startBlock} đến ${(reservation.startBlock+reservation.endBlock)}`
      })
    }
  }
}