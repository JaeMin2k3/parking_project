const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ticket = sequelize.define('Ticket', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    reservationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, unique: true }, 
    plate: { type: DataTypes.STRING(20), allowNull: false },
    vehicleType: { type: DataTypes.ENUM('CAR','MOTORBIKE'), allowNull: false },
    bookedStart: { type: DataTypes.DATE, allowNull: true },
    bookedEnd: { type: DataTypes.DATE, allowNull: true },
    startTime: { type: DataTypes.DATE, allowNull: false },
    finishTime: {type: DataTypes.DATE, allowNull:true},
    status: {type: DataTypes.ENUM('active','inactive'), allowNull: false, default: 'active'},
    urlCloudinary: {type: DataTypes.STRING(100), allowNull: false}
  }, {
    tableName: 'tickets',
  });

  return Ticket;
};
