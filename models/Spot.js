const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const Spot = sequelize.define('Spot', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  area: { type: DataTypes.CHAR(1), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, // check trangj thai cua spot xe offline da co ai do chua
  vehicleType: {type: DataTypes.ENUM('CAR', 'MOTORBIKE')},
  slotType: { type: DataTypes.ENUM('ONLINE', 'OFFLINE'), allowNull: false, defaultValue: 'OFFLINE' },
  status: {type: DataTypes.BOOLEAN, defaultValue: true} // do admin quan ly
}, {
  tableName: 'spots',
  indexes: [
    { unique: true, fields: ['area', 'position'] }, 
    { fields: ['status','isActive', 'vehicleType', 'slotType'] }
  ],
});
 return Spot;
}
