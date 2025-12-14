const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    costParking: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'VND' },
    status: { type: DataTypes.ENUM('SUCCEEDED','FAILED','PENDING'), defaultValue: 'PENDING' },
    vnpTxnRef: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  }, {
    tableName: 'payments',
     timestamps: false,
  });
  return Payment;
};
