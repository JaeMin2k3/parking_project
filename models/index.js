const sequelize  = require('../config/database');

const Staff = require('./Staff')(sequelize);
const Spot  = require('./Spot')(sequelize);
const ParkingRate = require('./ParkingRate')(sequelize);
const Reservation = require('./Reservation')(sequelize);
const Ticket = require('./Ticket')(sequelize);
const Payment = require('./Payment')(sequelize);
const Customer = require('./Customer')(sequelize);
const Bill = require('./Bill')(sequelize);
const UserVerify   = require('./UserVerify')(sequelize);
const ReservationBlock = require('./ReservationBlock')(sequelize)
const UserReset = require('./UserReset')(sequelize)
// Staff — Ticket
Staff.hasMany(Ticket, { foreignKey: 'staffUsername', sourceKey: 'username', onDelete: "set null" });
Ticket.belongsTo(Staff, { foreignKey: 'staffUsername', targetKey: 'username', onDelete: "Set null" });

// Customer — Reservation
Customer.hasMany(Reservation, {
  foreignKey: 'userId',
  sourceKey: 'username',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
Reservation.belongsTo(Customer, {
  foreignKey: 'userId',
  targetKey: 'username',
});

// Spot — Reservation  
Spot.hasMany(Reservation, { foreignKey: 'spotId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Reservation.belongsTo(Spot,  { foreignKey: 'spotId' });

// Reservation — Payment
Reservation.hasMany(Payment, { foreignKey: 'reservationId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Payment.belongsTo(Reservation,{ foreignKey: 'reservationId' });

// Reservation — Ticket (1–1)
Reservation.hasOne(Ticket, { foreignKey: 'reservationId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Ticket.belongsTo(Reservation, { foreignKey: 'reservationId' }); 

// Spot — Ticket 
Spot.hasMany(Ticket, { foreignKey: 'spotId', onUpdate: 'CASCADE', sourceKey: 'id' });
Ticket.belongsTo(Spot, { foreignKey: 'spotId', targetKey: 'id'  });


// Ticket — Bill (1–1)
Ticket.hasOne(Bill, { foreignKey: 'ticketId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Bill.belongsTo(Ticket, { foreignKey: 'ticketId' });

// Customer - UserVerify
Customer.hasMany(UserVerify, {foreignKey: 'gmailCustomer', onDelete: 'CASCADE', sourceKey: 'gmail'});
UserVerify.belongsTo(Customer, {foreignKey: 'gmailCustomer', targetKey: 'gmail'})

// Reservattion - ReservationBlock
Reservation.hasMany(ReservationBlock, { foreignKey: { name: 'reservationId', allowNull: false }, sourceKey: 'id' });
ReservationBlock.belongsTo(Reservation, { foreignKey: { name: 'reservationId', allowNull: false }, targetKey: 'id'});

// Spot - ReservationBlock
Spot.hasMany(ReservationBlock, { foreignKey: { name: 'spotId', allowNull: false }, sourceKey: 'id' });
ReservationBlock.belongsTo(Spot, { foreignKey: { name: 'spotId', allowNull: false }, targetKey: 'id' });

// Customer - UserReset

Customer.hasMany(UserReset, {foreignKey: 'gmail', sourceKey: 'gmail' });
UserReset.belongsTo(Customer, {foreignKey: 'gmail',targetKey: 'gmail'})
module.exports = {
  Staff,
  Customer,
  Spot,
  ParkingRate,
  Reservation,
  Ticket,
  Payment,
  Bill,
  UserVerify,
  UserReset, 
  ReservationBlock
};
