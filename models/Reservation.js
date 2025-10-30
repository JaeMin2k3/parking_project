const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    spot_id: {
      type: DataTypes.STRING(8),   // đủ cho A1234, B12...
      allowNull: false,
      validate: { is: /^[A-Z]\d{1,4}$/ } // 1 chữ A-Z + 1-4 số (điều chỉnh theo nhu cầu)
    },
    user_id: { type: DataTypes.STRING(30), allowNull: false},
    plate: { type: DataTypes.STRING(20), allowNull: false },
    vehicle_type: { type: DataTypes.ENUM('CAR','MOTORBIKE'), allowNull: false },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM('PENDING_PAYMENT','CONFIRMED','CANCELLED','EXPIRED'), allowNull: false, default: 'PENDING_PAYMENT' },
  }, {
    tableName: 'reservations',
    validate: {
      endAfterStart() {
        if (this.start_time && this.end_time && this.end_time <= this.start_time) {
          throw new Error('end_time must be after start_time');
        }
      }
    },
    hooks: {
      beforeValidate: (spot) => {
        if (spot.id) spot.id = spot.id.trim().toUpperCase(); // luôn chuẩn hóa về HOA
      }
    },
  
  });

  return Reservation;
};
