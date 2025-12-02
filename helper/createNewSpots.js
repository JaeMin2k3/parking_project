const model = require('../models/index')
module.exports = async function createNewSpots(area, slotNumber, vehicleType, slotType, numbers, transaction) {
  const blocks = [];
  for(let i = 0; i < slotNumber ; i++){
    blocks.push({
      area: area,
      position: numbers + i + 1,
      isActive: 1,
      vehicleType: vehicleType,
      slotType: slotType,
      status: 1
    })
  }
  await model.Spot.bulkCreate(blocks, {transaction});
}