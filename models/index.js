const sequelize  = require('../util/database');

const Staff        = require('./Staff')(sequelize);
const Spot         = require('./Spot')(sequelize);
const ParkingFee   = require('./ParkingRate')(sequelize);
const Reservation  = require('./Reservation')(sequelize);
const Ticket       = require('./Ticket')(sequelize);
const Payment      = require('./Payment')(sequelize);

const Customer     = require('./Customer')(sequelize);
const Bill         = require('./Bill')(sequelize);
const UserVerify   = require('./UserVerify')(sequelize);
// Staff — Ticket
Staff.hasMany(Ticket, { foreignKey: 'staffUsername', sourceKey: 'username' });
Ticket.belongsTo(Staff, { foreignKey: 'staffUsername', targetKey: 'username' });

// Customer — Reservation
Customer.hasMany(Reservation, {
  foreignKey: 'user_id',
  sourceKey: 'username',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Reservation.belongsTo(Customer, {
  foreignKey: 'user_id',
  targetKey: 'username',
});

// Spot — Reservation  (FK ở Reservation.spotId)
Spot.hasMany(Reservation, { foreignKey: 'spotId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Reservation.belongsTo(Spot,  { foreignKey: 'spotId' });

// Reservation — Payment
Reservation.hasMany(Payment, { foreignKey: 'reservationId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Payment.belongsTo(Reservation,{ foreignKey: 'reservationId' });

// Reservation — Ticket (1–1)
Reservation.hasOne(Ticket, { foreignKey: 'reservationId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Ticket.belongsTo(Reservation, { foreignKey: 'reservationId' }); // thêm UNIQUE ở migration

// Spot — Ticket (để lưu lịch sử vé theo chỗ)
Spot.hasMany(Ticket, { foreignKey: 'spotId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Ticket.belongsTo(Spot, { foreignKey: 'spotId' });

// ParkingFee — Spot
ParkingFee.hasMany(Spot, { foreignKey: 'parkingFeeId', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Spot.belongsTo(ParkingFee, { foreignKey: 'parkingFeeId' });

// Ticket — Bill (1–1)
Ticket.hasOne(Bill, { foreignKey: 'ticketId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Bill.belongsTo(Ticket, { foreignKey: 'ticketId' });

// Customer - UserVerify
Customer.hasMany(UserVerify, {foreignKey: 'gmailCustomer', onDelete: 'CASCADE', sourceKey: 'gmail'});
UserVerify.belongsTo(Customer, {foreignKey: 'gmailCustomer', targetKey: 'gmail'})

module.exports = {
  Staff,
  Customer,
  Spot,
  ParkingFee,
  Reservation,
  Ticket,
  Payment,
  Bill,
  UserVerify
};
