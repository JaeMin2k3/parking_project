const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ticket = sequelize.define('Ticket', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    spot_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    reservation_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, unique: true }, 
    plate: { type: DataTypes.STRING(20), allowNull: false },
    vehicle_type: { type: DataTypes.ENUM('CAR','MOTORBIKE'), allowNull: false },
    booked_start: { type: DataTypes.DATE, allowNull: true },
    booked_end: { type: DataTypes.DATE, allowNull: true },
    start_time: { type: DataTypes.DATE, allowNull: false },
    finish_time: {type: DataTypes.DATE, allowNull:true},
    status: {type: DataTypes.ENUM('active','inactive'), allowNull: false, default: 'active'}
  }, {
    tableName: 'tickets',
  });

  return Ticket;
};
