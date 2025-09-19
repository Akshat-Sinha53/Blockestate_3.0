// Simple test to debug the frontend API issue

async function testFrontendAPI() {
    console.log('🔧 Testing Frontend to Backend Connection...');
    
    try {
        const response = await fetch('http://localhost:8000/verify/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ aadhaar: '752901193601' })
        });
        
        console.log('✅ Response Status:', response.status);
        console.log('✅ Response OK:', response.ok);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Response Data:', data);
        } else {
            const errorText = await response.text();
            console.log('❌ Error Response:', errorText);
        }
        
    } catch (error) {
        console.log('❌ Fetch Error:', error.message);
        console.log('❌ Error Details:', error);
    }
}

// Run the test
testFrontendAPI();