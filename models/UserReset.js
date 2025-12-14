const {DataTypes} = require('sequelize');


module.exports = (sequelize) =>{
  const UserReset = sequelize.define('UserReset', {
    id: {type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true},
    tokenHash: {type: DataTypes.STRING(64), allowNull: false, unique: true},
    expiresAt: {type: DataTypes.DATE, allowNull: false},
    useAt: {type: DataTypes.DATE, allowNull: true}
  },{
    tableName: 'UserReset',
     timestamps: false,
  })

  return UserReset;
}