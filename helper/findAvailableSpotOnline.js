const model = require('../models/index')
const moment = require('moment-timezone')
const {Op} = require('sequelize')
module.exports = async function findAvailableSpotOnline(vehicleType, slotType, transaction) {
  const hour = Number(moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss").split(":")[0]);
  const day = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
  const tomorrow = moment().tz("Asia/Ho_Chi_Minh").add(1, 'days').format("YYYY-MM-DD");
  const onlineSpots = await model.Spot.findAll({
    raw: true, nest: true,
    where:{
      status: true,
      isActive: true,
      vehicleType: vehicleType,
      slotType: slotType,
      '$ReservationBlocks.id$': null
    },
    transaction,
    include: [{
      model: model.ReservationBlock,
      required: false,
      where:{
        [Op.or]: [
          {
             date: day,
            blockIndex: {[Op.between]: [hour, 23]}
          },
          {
            date: tomorrow,
            blockIndex: {[Op.between]: [0, hour]}
          }
        ]
        
      }
    }],
  })
  return onlineSpots;
} 
