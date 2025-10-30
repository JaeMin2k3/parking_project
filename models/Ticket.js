const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ticket = sequelize.define('Ticket', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    spot_id: {
      type: DataTypes.STRING(8),   // đủ cho A1234, B12...
      primaryKey: true,
      allowNull: false,
      validate: { is: /^[A-Z]\d{1,4}$/ } // 1 chữ A-Z + 1-4 số (điều chỉnh theo nhu cầu)
    },
    reservation_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, unique: true }, // 1 reservation -> tối đa 1 ticket
    plate: { type: DataTypes.STRING(20), allowNull: false },
    vehile_type: { type: DataTypes.ENUM('CAR','MOTORBIKE'), allowNull: false },
    booked_start: { type: DataTypes.DATE, allowNull: true },
    booked_end: { type: DataTypes.DATE, allowNull: true },
    start_time: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'tickets',
  });

  return Ticket;
};
