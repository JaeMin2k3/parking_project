module.exports = async function convertTime(){
  const dateTime = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
  return dateTime;
}