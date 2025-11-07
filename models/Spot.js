const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const Spot = sequelize.define('Spot', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  area: { type: DataTypes.CHAR(1), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  vehicleType: {type: DataTypes.ENUM('CAR', 'MOTORBIKE')},
  slotType: { type: DataTypes.ENUM('ONLINE', 'OFFLINE'), allowNull: false, defaultValue: 'OFFLINE' }
}, {
  tableName: 'spots',
  indexes: [
    { unique: true, fields: ['area', 'position'] }, 
    { fields: ['isActive', 'vehicleType', 'slotType'] }
  ],
});
 return Spot;
}
