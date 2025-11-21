const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ticket = sequelize.define('Ticket', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    reservationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, unique: true },
    spotId: {type: DataTypes.BIGINT.UNSIGNED,allowNull: false},
    date: {type: DataTypes.DATEONLY, allowNull: false},
    plate: { type: DataTypes.STRING(20), allowNull: false },
    vehicleType: { type: DataTypes.ENUM('CAR','MOTORBIKE'), allowNull: false },
    bookedStart: {type: DataTypes.INTEGER.UNSIGNED, allowNull: true},
    bookedEnd: {type: DataTypes.INTEGER.UNSIGNED, allowNull: true},
    startTime: { type: DataTypes.DATE, allowNull: false },
    finishTime: {type: DataTypes.DATE, allowNull:true},
    status: {type: DataTypes.ENUM('active','inactive'), allowNull: false, default: 'active'},
    urlCloudinaryCheckIn: {type: DataTypes.STRING(100), allowNull: false}
  }, {
    tableName: 'tickets',
    index: [
      {unique: true, fields: ['plate', 'vehicleType']},
      {fields: ['plate', 'vehicleType', 'status']}
    ]
  });

  return Ticket;
};

