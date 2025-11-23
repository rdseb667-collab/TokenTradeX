const axios = require('axios');

async function testWithdrawalRejection() {
  try {
    // First, let's create a new withdrawal request for testing
    console.log('Creating a new withdrawal request for testing...');
    
    // For now, let's just test with a fake transaction ID to see if the endpoint works
    const response = await axios.post(
      'http://localhost:3000/api/admin/withdrawals/non-existent-id/reject',
      { reason: 'Test rejection' },
      {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQyN2RmYmFiLTU2OTMtNGVlNS1iMjViLTU1NmJiNmUyMmEyMCIsImVtYWlsIjoibWFpbmVsZXcyNUBnbWFpbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3NjM4NzkwNjgsImV4cCI6MTc2Mzk2NTQ2OH0.GOL3mSjwhAzDor0kbXt2wo7trUujNzLKIYUoGaeCTMg',
          'X-2FA-Token': '886494',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testWithdrawalRejection();