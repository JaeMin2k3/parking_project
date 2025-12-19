const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
  const ReservationBlock = sequelize.define('ReservationBlock', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  plate: {type: DataTypes.STRING(13), allowNull: false},
  vehicleType: {type: DataTypes.ENUM('CAR', 'MOTORBIKE')},
  blockIndex: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, 
  expireTime: {type: DataTypes.DATE, allowNull: false},
  status: {type: DataTypes.ENUM('CONFIRMED', 'CANCELLED', 'PENDING','NOSHOW', 'CHECKIN','CHECKOUT'), default: 'PENDING'}
}, {
  tableName: 'reservationBlocks',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['spotId', 'date', 'blockIndex'] },
    { unique: true, fields: ['reservationId', 'blockIndex'] },
  ],
});
  return ReservationBlock;
}