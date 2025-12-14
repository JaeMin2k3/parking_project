const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
  const Bill =  sequelize.define('Bill', {
    idBill: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    channel: {type: DataTypes.ENUM('ONLINE', 'OFFLINE'),allowNull: false},
    payedMoney: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    startTime: { type: DataTypes.DATE, allowNull: false },
    finishTime: {type: DataTypes.DATE, allowNull: false},
    totalPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    urlCloudinaryCheckIn: {type: DataTypes.STRING(100), allowNull: true},
    urlCloudinaryCheckOut: {type: DataTypes.STRING(100), allowNull: true}
  },{
    tableName: 'bill',
     timestamps: false,
  })
  return Bill;
}