const { DataTypes, ENUM } = require('sequelize');

module.exports = (sequelize) => {
  const ParkingRate = sequelize.define('ParkingRate', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    vehicleType: { type: DataTypes.ENUM('CAR','MOTORBIKE'), allowNull: false, defaultValue: 'CAR' },
    currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'VND' },
    unitPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    ticketType: {type: DataTypes.ENUM("STANDARD", "OVERTIME")},
    block: { type: DataTypes.INTEGER, defaultValue: 1},
    status: {type: DataTypes.ENUM("active", "inactive")},
    gracePeriod: { type: DataTypes.INTEGER, defaultValue: 15 }
  }, {
    tableName: 'parkingRate',
    index: [
      {fields: ['status', 'ticketType', 'vehicleType']}
    ]
  });

  return ParkingRate;
};
