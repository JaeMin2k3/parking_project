const sequelize  = require('../util/database');

const Staff        = require('./Staff')(sequelize);
const Spot         = require('./Spot')(sequelize);
const ParkingFee   = require('./ParkingRate')(sequelize);
const Reservation  = require('./Reservation')(sequelize);
const Ticket       = require('./Ticket')(sequelize);
const Payment      = require('./Payment')(sequelize);
const Admin        = require('./Admin')(sequelize);
const Customer     = require('./Customer')(sequelize);
const Bill         = require('./Bill')(sequelize);
// Associations (FKs)
Staff.hasMany(Ticket, { foreignKey: 'username' });

Customer.hasMany(Reservation, { foreignKey: 'username' });
Reservation.hasMany(Payment, { foreignKey: 'reservationID' });
Reservation.hasOne(Ticket, { foreignKey: 'reservationID' } );
Reservation.belongsTo(Spot, { foreignKey: 'spotID' });

Ticket.hasOne(Bill, { foreignKey: 'tiketID' });

Spot.belongsTo(ParkingFee, { foreignKey: 'parkingFeeId' });
Spot.hasOne(Ticket, { foreignKey: 'spotID' });
Spot.belongsTo(Reservation, {foreignKey: 'reservationID'} );

module.exports = {
  sequelize,
  Staff,
  Admin,
  Customer,
  Spot,
  ParkingFee,
  Reservation,
  Ticket,
  Payment,
};
