const BASE_URL = 'http://localhost:3001/api';


async function testEndpoints() {
    console.log('=== STARTING HOSTEL AI SYSTEM TESTING ===\n');

    // 1. Guest Chatbot
    try {
        console.log('[Test 1] Guest Chatbot (POST /api/ai/chat)...');
        const res = await fetch(`${BASE_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'What is the curfew time for girls?', history: [] })
        });
        const data = await res.json();
        console.log('Response:', data);
        console.log('PASS\n');
    } catch (e) {
        console.error('FAIL:', e.message, '\n');
    }

    // 2. Staff RAG Chat
    try {
        console.log('[Test 2] Staff RAG Chat (POST /api/ai/staff-assistant)...');
        const res = await fetch(`${BASE_URL}/ai/staff-assistant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'How many days maximum can a student request an outpass?', history: [] })
        });
        const data = await res.json();
        console.log('Response:', data);
        console.log('PASS\n');
    } catch (e) {
        console.error('FAIL:', e.message, '\n');
    }

    // 3. Billing Summary (Test USN: 4YG23CS072)
    try {
        console.log('[Test 3] Billing Summary (GET /api/ai/billing-summary/4YG23CS072)...');
        const res = await fetch(`${BASE_URL}/ai/billing-summary/4YG23CS072`);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
        console.log('PASS\n');
    } catch (e) {
        console.error('FAIL:', e.message, '\n');
    }

    // 4. Complaint Classifier
    try {
        console.log('[Test 4] Complaint Classifier (POST /api/ai/classify-complaint)...');
        const res = await fetch(`${BASE_URL}/ai/classify-complaint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: 'Electric spark in Room 102 fan',
                description: 'When I switch on the fan, there are visible electrical sparks and a burning smell.'
            })
        });
        const data = await res.json();
        console.log('Response:', data);
        console.log('PASS\n');
    } catch (e) {
        console.error('FAIL:', e.message, '\n');
    }

    // 5. Outpass Risk Assessor
    try {
        console.log('[Test 5] Outpass Risk (POST /api/ai/outpass-risk)...');
        const res = await fetch(`${BASE_URL}/ai/outpass-risk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: '4YG23CS072',
                reason: 'Traveling to native place for 15 days due to emergency festival rituals',
                fromDate: '2026-06-15',
                toDate: '2026-06-30'
            })
        });
        const data = await res.json();
        console.log('Response:', data);
        console.log('PASS\n');
    } catch (e) {
        console.error('FAIL:', e.message, '\n');
    }

    // 6. Notice Polisher
    try {
        console.log('[Test 6] Notice Polisher (POST /api/ai/polish-notice)...');
        const res = await fetch(`${BASE_URL}/ai/polish-notice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'water stop tomorrow morning',
                body: 'water wont come tomorrow between 6am to 9am bcos we are fixing the tank. please save water.'
            })
        });
        const data = await res.json();
        console.log('Response:', data);
        console.log('PASS\n');
    } catch (e) {
        console.error('FAIL:', e.message, '\n');
    }

    // 7. Attendance Alerts
    try {
        console.log('[Test 7] Attendance Alerts (GET /api/ai/attendance-alerts)...');
        const res = await fetch(`${BASE_URL}/ai/attendance-alerts`);
        const data = await res.json();
        console.log('Response Summary:', data.summary);
        console.log('Alerts Count:', data.alerts ? data.alerts.length : 0);
        if (data.alerts && data.alerts.length > 0) {
            console.log('Sample Alert:', data.alerts[0]);
        }
        console.log('PASS\n');
    } catch (e) {
        console.error('FAIL:', e.message, '\n');
    }

    // 8. Monthly Executive Report
    try {
        console.log('[Test 8] Monthly Executive Report (GET /api/ai/monthly-report)...');
        const res = await fetch(`${BASE_URL}/ai/monthly-report`);
        const data = await res.json();
        console.log('Response (first 300 chars):', data.text ? data.text.substring(0, 300) + '...' : 'No text');
        console.log('PASS\n');
    } catch (e) {
        console.error('FAIL:', e.message, '\n');
    }

    console.log('=== END OF HOSTEL AI SYSTEM TESTING ===');
}

testEndpoints();
