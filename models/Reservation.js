const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    dateIn: {type: DataTypes.DATEONLY, allowNull: false},
    dateOut: {type: DataTypes.DATEONLY, allowNull: true},
    startBlock: {type: DataTypes.INTEGER.UNSIGNED, allowNull: true},
    blockCount: {type: DataTypes.INTEGER.UNSIGNED, allowNull: true}, 
    status: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED','CHECKIN', 'CHECKOUT', 'NOSHOW'),
    allowNull: false,
    defaultValue: 'PENDING'
    },
    channel: {type: DataTypes.ENUM('ONLINE', 'OFFLINE'),allowNull: false},
    plate: {type: DataTypes.STRING(13), allowNull: false},
    vehicleType: {type: DataTypes.ENUM('CAR', 'MOTORBIKE')},
    isOverNight: {type: DataTypes.BOOLEAN, default: false}
  }
  , {
  tableName: 'reservations',
  index: [
    {unique: true, fields: ['dateIn', 'startBlock', 'plate', 'vehicleType']},
    // Thứ tự ưu tiên: plate (định danh duy nhất) -> status -> date
    {fields: ['plate', 'status', 'dateIn', 'dateOut']},
    // Index hỗ trợ tìm kiếm check-out (lúc này status là CHECKIN)
    {fields: ['plate', 'vehicleType']}]
  },
 
);
  return Reservation;
};

