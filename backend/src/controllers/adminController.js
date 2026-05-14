const asyncHandler = require('../utils/asyncHandler');
const validate = require('../utils/validate');
const { adminRequestQuerySchema } = require('../validators/pickupValidators');
const { listAllRequests, adminAcceptPrice } = require('../services/pickupService');
const { listRecyclerProfiles } = require('../services/recyclerService');
const { getAdminOverview } = require('../services/adminService');

const getOverview = asyncHandler(async (req, res) => {
  const overview = await getAdminOverview();

  res.json({
    success: true,
    data: overview
  });
});

const listRequests = asyncHandler(async (req, res) => {
  const filters = validate(adminRequestQuerySchema, req.query);
  const requests = await listAllRequests(filters);

  res.json({
    success: true,
    data: requests
  });
});

const listRecyclers = asyncHandler(async (req, res) => {
  const recyclers = await listRecyclerProfiles();

  res.json({
    success: true,
    data: recyclers
  });
});

const scrutinizeRequest = asyncHandler(async (req, res) => {
  const { pickupId } = req.params;
  const { finalPrice, note, isNegotiation } = req.body;

  if (!pickupId || !/^[a-f0-9]{24}$/i.test(pickupId)) {
    return res.status(400).json({ success: false, message: 'Invalid pickup ID' });
  }

  const priceNum = parseFloat(finalPrice);
  if (isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({ success: false, message: 'finalPrice must be a valid non-negative number' });
  }

  const pickup = await adminAcceptPrice(pickupId, priceNum, note, isNegotiation);
  
  res.json({
    success: true,
    data: pickup
  });
});

const payPickup = asyncHandler(async (req, res) => {
  const { pickupId } = req.params;
  const { note, adminId } = req.body;
  const pickup = await require('../services/pickupService').adminPayPickup(pickupId, adminId, note);
  
  res.json({
    success: true,
    data: pickup
  });
});

const assignRecyclerToPickup = asyncHandler(async (req, res) => {
  const { pickupId } = req.params;
  const { recyclerId, adminId, note } = req.body;

  if (!pickupId || !/^[a-f0-9]{24}$/i.test(pickupId)) {
    return res.status(400).json({ success: false, message: 'Invalid pickup ID' });
  }

  if (!recyclerId || !/^[a-f0-9]{24}$/i.test(recyclerId)) {
    return res.status(400).json({ success: false, message: 'Invalid recycler ID' });
  }

  const pickup = await require('../services/pickupService').adminAssignRecycler(pickupId, adminId, recyclerId, note);

  res.json({
    success: true,
    data: pickup
  });
});

const deleteRequest = asyncHandler(async (req, res) => {
  const { pickupId } = req.params;

  if (!pickupId || !/^[a-f0-9]{24}$/i.test(pickupId)) {
    return res.status(400).json({ success: false, message: 'Invalid pickup ID' });
  }

  await require('../services/pickupService').adminForceDeletePickup(pickupId);

  res.json({
    success: true,
    message: 'Request deleted successfully'
  });
});

const updateRequestStatus = asyncHandler(async (req, res) => {
  const { pickupId } = req.params;
  const { status } = req.body;

  if (!pickupId || !/^[a-f0-9]{24}$/i.test(pickupId)) {
    return res.status(400).json({ success: false, message: 'Invalid pickup ID' });
  }

  const { updatePickupStatus } = require('../services/pickupService');
  const pickup = await updatePickupStatus(pickupId, status);

  res.json({
    success: true,
    data: pickup
  });
});

module.exports = {
  getOverview,
  listRequests,
  listRecyclers,
  scrutinizeRequest,
  payPickup,
  assignRecyclerToPickup,
  deleteRequest,
  updateRequestStatus
};
