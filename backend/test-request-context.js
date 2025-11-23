/**
 * Test script for request context middleware
 */

const express = require('express');
const requestContext = require('./src/middleware/requestContext');

// Create a simple Express app for testing
const app = express();

// Use the request context middleware
app.use(requestContext);

// Test endpoint
app.get('/test', (req, res) => {
  // Check if request ID is added to the request
  if (req.requestId) {
    res.json({
      success: true,
      message: 'Request context middleware is working',
      requestId: req.requestId
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Request ID not found in request'
    });
  }
});

// Error endpoint for testing error responses
app.get('/error', (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Test error response'
  });
});

// Start the test server
const port = 3001;
const server = app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
  
  // Run tests
  runTests();
});

async function runTests() {
  console.log('\n🧪 Testing Request Context Middleware...\n');
  
  try {
    // Test 1: Normal request
    console.log('Test 1: Normal request');
    const response1 = await fetch(`http://localhost:${port}/test`);
    const data1 = await response1.json();
    
    console.log('Status:', response1.status);
    console.log('Response:', data1);
    
    if (data1.success && data1.requestId) {
      console.log('Result: ✅ PASS\n');
    } else {
      console.log('Result: ❌ FAIL\n');
    }
    
    // Test 2: Error response with request ID
    console.log('Test 2: Error response with request ID');
    const response2 = await fetch(`http://localhost:${port}/error`);
    const data2 = await response2.json();
    
    console.log('Status:', response2.status);
    console.log('Response:', data2);
    
    if (data2.requestId) {
      console.log('Result: ✅ PASS\n');
    } else {
      console.log('Result: ❌ FAIL\n');
    }
    
    // Test 3: Check response headers
    console.log('Test 3: Check response headers');
    const response3 = await fetch(`http://localhost:${port}/test`);
    const requestId = response3.headers.get('X-Request-ID');
    
    console.log('X-Request-ID header:', requestId);
    
    if (requestId) {
      console.log('Result: ✅ PASS\n');
    } else {
      console.log('Result: ❌ FAIL\n');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Close the server
    server.close(() => {
      console.log('✅ Request context middleware tests completed!');
    });
  }
}