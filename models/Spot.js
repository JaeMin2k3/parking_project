const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Spot = sequelize.define('Spot', {
    id: {
      type: DataTypes.STRING(8),   // đủ cho A1234, B12...
      primaryKey: true,
      allowNull: false,
      validate: { is: /^[A-Z]\d{1,4}$/ } // 1 chữ A-Z + 1-4 số (điều chỉnh theo nhu cầu)
    },
    spot_type: { type: DataTypes.ENUM('CAR', 'MOTORBIKE'), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'spots',
    hooks: {
      beforeValidate: (spot) => {
        if (spot.id) spot.id = spot.id.trim().toUpperCase(); // luôn chuẩn hóa về HOA
      }
    }
  });

  return Spot;
};
