const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    spot_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    plate: { type: DataTypes.STRING(20), allowNull: false },
    vehicle_type: { type: DataTypes.ENUM('CAR','MOTORBIKE'), allowNull: false },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM('PENDING_PAYMENT','CONFIRMED','CANCELLED','EXPIRED'), allowNull: false, default: 'PENDING_PAYMENT' },
  }, {
    tableName: 'reservations',
    indexes: [
      { fields: ['spot_id','start_time','end_time'] },
      { fields: ['plate','start_time','end_time'] },
      { fields: ['status'] }
    ],
    validate: {
      endAfterStart() {
        if (this.start_time && this.end_time && this.end_time <= this.start_time) {
          throw new Error('end_time must be after start_time');
        }
      }
    }
  });

  return Reservation;
};
