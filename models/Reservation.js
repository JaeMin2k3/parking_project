const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    date: {type: DataTypes.DATEONLY, allowNull: false},
    startBlock: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false},
    blockCount: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false}, 
    status: { type: DataTypes.ENUM('HOLD','CONFIRMED','CANCELLED'), allowNull: false, defaultValue: 'CONFIRMED' },
  }
  , {
  tableName: 'reservations',
  }
);
  return Reservation;
};
