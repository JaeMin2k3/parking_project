const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParkingRate = sequelize.define('ParkingRate', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    vehicle_type: { type: DataTypes.ENUM('CAR','MOTORBIKE'), allowNull: false, defaultValue: 'CAR' },
    currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'VND' },
    unit_price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  }, {
    tableName: 'parking_rate',
  });

  return ParkingRate;
};
