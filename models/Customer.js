const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
  const Customer =  sequelize.define('Customers', {
    username: { type: DataTypes.STRING(30), allowNull: false, unique: true, primaryKey: true }, // sđt
    email: { type: DataTypes.STRING(255), unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(255), defaultValue: 'Customer' },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    email_verified: { type: DataTypes.BOOLEAN, allowNull: true },
    },{
    tableName: 'customer',
    indexes: [{ unique: true, fields: ['username'] }, { unique: true, fields: ['email'] }]
  })
  return Customer
}