const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect } = require('../middleware/auth');
const { validateRequest, depositSchema, withdrawSchema } = require('../middleware/validation');

router.get('/', protect, walletController.getWallet);
router.get('/ttx/fee-info', protect, walletController.getTTXFeeInfo);
router.get('/transactions', protect, walletController.getTransactions);
router.get('/withdrawal/check', protect, walletController.checkWithdrawal);
router.get('/:tokenId', protect, walletController.getWalletByToken);
router.post('/deposit', protect, validateRequest(depositSchema), walletController.deposit);
router.post('/withdraw', protect, validateRequest(withdrawSchema), walletController.withdraw);

module.exports = router;
