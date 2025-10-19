const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Spot = sequelize.define('Spot', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    spot_type: { type: DataTypes.ENUM('CAR', 'MOTORBIKE'), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'spots'
  });

  return Spot;
};
