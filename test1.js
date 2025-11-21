let dateTime = new Date().toLocaleString("sv-SE");
console.log(dateTime)
const date = dateTime.split(" ")[0];
const hour = dateTime.split(" ")[1];
const tineEven = hour.split(":")[0];
console.log(hour);
console.log(date);
console.log(tineEven);