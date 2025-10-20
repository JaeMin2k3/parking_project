const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
  const Admin =  sequelize.define('admin', {
    username: { type: DataTypes.STRING(30), allowNull: false, unique: true, primaryKey: true }, // sđt
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(255), defaultValue: 'ADMIN' },
  },{
    tableName: 'admin',
  })
  return Admin;
}