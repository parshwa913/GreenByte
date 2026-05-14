const express = require('express');
const { getOverview, listRequests, listRecyclers, scrutinizeRequest, payPickup, assignRecyclerToPickup, deleteRequest, updateRequestStatus } = require('../controllers/adminController');

const router = express.Router();

router.get('/overview', getOverview);
router.get('/requests', listRequests);
router.get('/recyclers', listRecyclers);
router.post('/requests/:pickupId/approve', scrutinizeRequest);
router.post('/requests/:pickupId/pay', payPickup);
router.post('/requests/:pickupId/assign', assignRecyclerToPickup);
router.patch('/requests/:pickupId/status', updateRequestStatus);
router.delete('/requests/:pickupId', deleteRequest);

module.exports = router;
