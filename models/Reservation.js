const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    date: {type: DataTypes.DATEONLY, allowNull: false},
    startBlock: {type: DataTypes.INTEGER.UNSIGNED, allowNull: true},
    blockCount: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false}, 
    status: { type: DataTypes.ENUM('PENDING','CONFIRMED','CANCELLED'), allowNull: false, defaultValue: 'PENDING' },
    ticketType: {type: DataTypes.ENUM('on', 'off'), allowNull: false},
    startTime: {type: DataTypes.DATE, allowNull: true},
    plate: {type: DataTypes.STRING(13), allowNull: false}
  }
  , {
  tableName: 'reservations',
  },
 
);
  return Reservation;
};
