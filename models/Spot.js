const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const Spot = sequelize.define('Spot', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  area: { type: DataTypes.INTEGER, allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'spots',
  underscored: true,
  indexes: [
    { unique: true, fields: ['area', 'position'] }, // không trùng vị trí trong cùng khu
  ],
});
 return Spot;
}
