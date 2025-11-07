const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const Spot = sequelize.define('Spot', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  area: { type: DataTypes.CHAR(1), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  type: {type: DataTypes.ENUM('CAR', 'MOTORBIKE')}
}, {
  tableName: 'spots',
  underscored: true,
  indexes: [
    { unique: true, fields: ['area', 'position'] }, 
  ],
});
 return Spot;
}
