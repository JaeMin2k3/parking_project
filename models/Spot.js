const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const Spot = sequelize.define('Spot', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  area: { type: DataTypes.CHAR(1), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },// do admin quan ly
  vehicleType: {type: DataTypes.ENUM('CAR', 'MOTORBIKE')},
  slotType: { type: DataTypes.ENUM('ONLINE', 'OFFLINE'), allowNull: false, defaultValue: 'OFFLINE' },
  status: {type: DataTypes.BOOLEAN, defaultValue: true}, // quản lí xe đã đỗ hay chưa
}, {
  tableName: 'spots',
  indexes: [
    { unique: true, fields: ['area', 'position'] }, 
    { fields: ['status','isActive', 'vehicleType', 'slotType'] }
  ],
  paranoid: true,
});
 return Spot;
}
