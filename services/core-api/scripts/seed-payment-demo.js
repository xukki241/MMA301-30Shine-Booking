// Adds fresh demo appointments; never resets existing paid appointments.
const mongoose = require('mongoose');
const { createModels } = require('../src/models');
async function main() {
  if (process.env.SEPAY_MODE !== 'sandbox' || !process.env.DEMO_CUSTOMER_ID) throw new Error('Sandbox and DEMO_CUSTOMER_ID required');
  const connection = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
  try {
    const models = createModels(connection);
    const branch = await models.Branch.findOneAndUpdate({ name: '30Shine Sandbox' }, { $setOnInsert: { address: 'Sandbox demo branch' } }, { upsert: true, returnDocument: 'after', runValidators: true });
    const service = await models.Service.findOneAndUpdate({ name: 'Cắt tóc thử nghiệm', branchId: branch._id }, { $setOnInsert: { price: 10000, durationMinutes: 30 } }, { upsert: true, returnDocument: 'after', runValidators: true });
    const stylistId = new mongoose.Types.ObjectId();
    const appointmentId = new mongoose.Types.ObjectId();
    await models.Calendar.create({ _id: stylistId, appointments: [{ _id: appointmentId, customerId: process.env.DEMO_CUSTOMER_ID, stylistId, branchId: branch._id, serviceId: service._id, status: 'completed', startTime: new Date(Date.now() - 3600000), endTime: new Date(Date.now() - 1800000) }] });
    console.log('Created completed sandbox appointment: ' + appointmentId);
  } finally { await connection.close(); }
}
main().catch(() => { console.error('Sandbox seed failed; check database and customer configuration'); process.exitCode = 1; });
