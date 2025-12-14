const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
  const Customer =  sequelize.define('Customers', {
    username: { type: DataTypes.STRING(30), allowNull: false, primaryKey: true }, 
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    gmail: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    role: { type: DataTypes.STRING(255), defaultValue: 'customer' },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    },{
    tableName: 'customer',
    timestamps: false,
  })
  return Customer
}