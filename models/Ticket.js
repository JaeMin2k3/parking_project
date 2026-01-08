const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ticket = sequelize.define('Ticket', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    reservationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, unique: true },
    spotId: {type: DataTypes.BIGINT.UNSIGNED,allowNull: false},
    date: {type: DataTypes.DATEONLY, allowNull: false},
    plate: { type: DataTypes.STRING(20), allowNull: false },
    vehicleType: { type: DataTypes.ENUM('CAR','MOTORBIKE'), allowNull: false },
    startTime: { type: DataTypes.DATE, allowNull: false },
    finishTime: {type: DataTypes.DATE, allowNull:true},
    status: {type: DataTypes.ENUM('active','inactive'), allowNull: false, default: 'active'},
    urlCloudinaryCheckIn: {type: DataTypes.STRING(100), allowNull: true},
  }, {
    tableName: 'tickets',
    timestamps: false,
    index: [
      {fields: ['plate', 'vehicleType', 'status']},
      //tìm xe đang "active"  nhanh
      {fields: ['plate', 'status']},
      //  thống kê doanh thu theo ngày
      {fields: ['date']}
    ]
  });

  return Ticket;
};

