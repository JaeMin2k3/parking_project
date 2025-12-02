const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Staff = sequelize.define('Staff', {
    username: { type: DataTypes.STRING(30), allowNull: false, unique: true, primaryKey: true }, // sđt
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    name: {type: DataTypes.STRING(255), allowNull: false},
    date: {type: DataTypes.DATEONLY, allowNull: false},
    role: { type: DataTypes.ENUM('staff', 'admin'), defaultValue: 'staff' },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
   
  }, {
    tableName: 'staff',
     paranoid: true,
  });

  return Staff;
};
