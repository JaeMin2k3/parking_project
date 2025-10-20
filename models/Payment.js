const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    cost_parking: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'VND' },
    status: { type: DataTypes.ENUM('SUCCEEDED','FAILED','PENDING'), defaultValue: 'PENDING' },
  }, {
    tableName: 'payments'
  });

  // Enforce XOR: chỉ 1 trong 2 trường có giá trị
  Payment.addHook('beforeValidate', (p) => {
    const hasTicket = !!p.ticket_id;
    const hasResv = !!p.reservation_id;
    if (hasTicket === hasResv) {
      throw new Error('Payment must link to either ticket OR reservation');
    }
  });

  return Payment;
};
