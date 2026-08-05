const { Queue } = require('bullmq');

const connection = {
  host: '127.0.0.1',
  port: 6379,
};

const cancelPendingQueue = new Queue('cancelPending', { connection });
const noShowQueue = new Queue('noShow', { connection });
const emailWarningQueue = new Queue('emailWarning', { connection });
const joinReservationQueue = new Queue('joinReservation', { connection });

module.exports = {
  cancelPendingQueue,
  noShowQueue,
  emailWarningQueue,
  joinReservationQueue,
  connection
};
