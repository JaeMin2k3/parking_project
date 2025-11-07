const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
  const Bill =  sequelize.define('Bill', {
    idBill: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    payed_money: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    start_time: { type: DataTypes.DATE, allowNull: false },
    finish_time: {type: DataTypes.DATE, allowNull: false},
    totalPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  },{
    tableName: 'bill'
  })
  return Bill;
}