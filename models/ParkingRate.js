const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParkingRate = sequelize.define('ParkingRate', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    plan_type: { type: DataTypes.ENUM('HOURLY','DAILY','WEEKLY','MONTHLY'), allowNull: false },
    vehicle_type: { type: DataTypes.ENUM('CAR','MOTORBIKE'), allowNull: false, defaultValue: 'CAR' },
    currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'VND' },
    unit_price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  }, {
    tableName: 'parking_fee',
    indexes: [
      {
        name: 'idx_fee_plan', // <-- tên ngắn, tránh >64 ký tự
        using: 'BTREE',
        fields: ['plan_type','vehicle_type'],
      },
    ],
  });

  return ParkingRate;
};
