const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
  const ReservationBlock = sequelize.define('ReservationBlock', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  date:       { type: DataTypes.DATEONLY, allowNull: false },
  blockIndex: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'block_index' }, // 0..23
}, {
  tableName: 'reservation_blocks',
  underscored: true,
  indexes: [
    // 1 slot - 1 ngày - 1 giờ chỉ có 1 reservation
    { unique: true, fields: ['spot_id', 'date', 'block_index'] },
    // tránh double insert trong 1 reservation
    { unique: true, fields: ['reservation_id', 'block_index'] },
  ],
});
  return ReservationBlock;
}