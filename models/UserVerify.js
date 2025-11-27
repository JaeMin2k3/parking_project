const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserVerify = sequelize.define('UserVerify', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    gmailCustomer: { type: DataTypes.STRING(255), allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true }, 
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'user_verifies',
    underscored: true,
    indexes: [
      { fields: ['gmail_Customer'] },
      { fields: ['expires_at'] },
      { unique: true, fields: ['token_hash'] },
    ],
  });
  return UserVerify;
};
