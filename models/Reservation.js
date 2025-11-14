const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    date: {type: DataTypes.DATEONLY, allowNull: false},
    startBlock: {type: DataTypes.INTEGER.UNSIGNED, allowNull: true},
    blockCount: {type: DataTypes.INTEGER.UNSIGNED, allowNull: true}, 
    status: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'PENDING'
    },
    channel: {type: DataTypes.ENUM('ONLINE', 'OFFLINE'),allowNull: false},
    plate: {type: DataTypes.STRING(13), allowNull: false}
  }
  , {
  tableName: 'reservations',
  },
 
);
  return Reservation;
};

