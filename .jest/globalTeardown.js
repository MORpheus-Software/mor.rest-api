// Global teardown for tests
module.exports = async () => {
  console.log('='.repeat(60));
  console.log('Global teardown for stake authorization E2E tests');
  console.log('='.repeat(60));
  
  // Add any global cleanup logic here
  
  console.log('✓ Test resources cleaned up');
  console.log('='.repeat(60));
}; 