const fs = require('fs');
const path = require('path');

// Load credentials
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// In-memory cache for RAG embeddings
let handbookCache = [];

/**
 * Fetch embeddings from HuggingFace sentence-transformers
 */
async function getHFElembeddings(texts) {
  try {
    const response = await fetch('https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: texts })
    });
    if (!response.ok) {
      throw new Error(`HF returned status ${response.status}`);
    }
    const result = await response.json();
    return result; // Returns array of float vectors or single float vector
  } catch (error) {
    console.warn('[RAG] HuggingFace embeddings call failed:', error.message);
    return null;
  }
}

/**
 * Cosine similarity calculation between two dense vectors
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Load and embed the staff handbook into memory on startup (async)
 */
async function initializeRAG() {
  try {
    const handbookPath = path.join(__dirname, '../backend/data/staff_handbook.json');
    if (!fs.existsSync(handbookPath)) {
      console.warn(`[RAG] Handbook file not found for embedding at ${handbookPath}`);
      return;
    }
    const handbook = JSON.parse(fs.readFileSync(handbookPath, 'utf8'));
    const textsToEmbed = handbook.map(s => `${s.category} ${s.title} ${s.content}`);
    
    console.log('[RAG] Generating embeddings for handbook sections...');
    const embeddings = await getHFElembeddings(textsToEmbed);
    
    if (embeddings && embeddings.length === handbook.length) {
      handbookCache = handbook.map((section, idx) => ({
        section,
        embedding: embeddings[idx]
      }));
      console.log(`[RAG] Cached ${handbookCache.length} sections with vector embeddings.`);
    } else {
      console.warn('[RAG] Embedding generation failed. Falling back to keyword search.');
    }
  } catch (err) {
    console.error('[RAG] Initialization failed:', err.message);
  }
}

// Trigger initialization asynchronously
initializeRAG();

/**
 * Fallback keyword-based search (used if vector search fails)
 */
function retrieveHandbookContextKeyword(query) {
  try {
    const handbookPath = path.join(__dirname, '../backend/data/staff_handbook.json');
    if (!fs.existsSync(handbookPath)) return '';
    const handbook = JSON.parse(fs.readFileSync(handbookPath, 'utf8'));
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const scoredSections = handbook.map(section => {
      let score = 0;
      if (queryLower.includes(section.category.toLowerCase())) score += 10;
      if (queryLower.includes(section.title.toLowerCase())) score += 10;
      if (Array.isArray(section.keywords)) {
        section.keywords.forEach(kw => {
          if (queryLower.includes(kw.toLowerCase())) score += 5;
        });
      }
      queryWords.forEach(word => {
        if (section.title.toLowerCase().includes(word)) score += 3;
        if (section.content.toLowerCase().includes(word)) score += 1;
      });
      return { section, score };
    });
    scoredSections.sort((a, b) => b.score - a.score);
    const matches = scoredSections.filter(s => s.score > 0);
    const selected = matches.length > 0 ? matches.slice(0, 2) : scoredSections.slice(0, 2);
    return selected.map(s => `Category: ${s.section.category}\nTitle: ${s.section.title}\nContent: ${s.section.content}`).join('\n\n');
  } catch (error) {
    return '';
  }
}

/**
 * Core RAG search using Hugging Face embeddings and Cosine Similarity
 */
async function retrieveHandbookContextVector(query) {
  if (handbookCache.length === 0) {
    console.log('[RAG] Vector cache empty, using keyword matching.');
    return retrieveHandbookContextKeyword(query);
  }
  
  try {
    const queryEmbeddings = await getHFElembeddings(query);
    if (!queryEmbeddings || !Array.isArray(queryEmbeddings) || queryEmbeddings.length === 0) {
      console.log('[RAG] Failed to embed query, falling back to keyword search.');
      return retrieveHandbookContextKeyword(query);
    }
    
    // Scored sections by cosine similarity
    const scored = handbookCache.map(item => {
      const score = cosineSimilarity(queryEmbeddings, item.embedding);
      return { section: item.section, score };
    });
    
    // Sort descending
    scored.sort((a, b) => b.score - a.score);
    console.log(`[RAG Vector] Top score: ${scored[0]?.score.toFixed(4)} for section "${scored[0]?.section.title}"`);
    
    // Return top 2 matching sections
    const selected = scored.slice(0, 2);
    return selected.map(s => {
      return `Category: ${s.section.category}\nTitle: ${s.section.title}\nContent: ${s.section.content}\n(Vector Similarity: ${s.score.toFixed(4)})`;
    }).join('\n\n');
  } catch (error) {
    console.warn('[RAG Vector] Vector search error, using keyword fallback:', error.message);
    return retrieveHandbookContextKeyword(query);
  }
}

/**
 * Standard call to Groq Chat Completion API
 */
async function callGroqAPI(systemPrompt, userMessage, history = [], maxTokens = 1000) {
  const isKeyInvalid = !GROQ_API_KEY || 
                       GROQ_API_KEY.includes('your-actual-api-key') || 
                       GROQ_API_KEY.trim() === '';

  if (isKeyInvalid) {
    return { text: getMockResponse(systemPrompt, userMessage), isMock: true };
  }

  try {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(history)) {
      history.forEach(msg => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      isMock: false
    };
  } catch (error) {
    console.error('[Groq API] call failed:', error.message);
    return {
      text: getMockResponse(systemPrompt, userMessage) + '\n\n*(Demo response due to server connection issues)*',
      isMock: true
    };
  }
}

/**
 * Groq Structured JSON Mode caller
 */
async function callGroqJSONAPI(systemPrompt, userMessage, maxTokens = 1000) {
  const isKeyInvalid = !GROQ_API_KEY || 
                       GROQ_API_KEY.includes('your-actual-api-key') || 
                       GROQ_API_KEY.trim() === '';

  if (isKeyInvalid) {
    return { text: getMockJSONResponse(systemPrompt, userMessage), isMock: true };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq JSON API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      isMock: false
    };
  } catch (error) {
    console.error('[Groq JSON API] call failed:', error.message);
    return {
      text: getMockJSONResponse(systemPrompt, userMessage),
      isMock: true
    };
  }
}

/**
 * Mock responses for standard text endpoints
 */
function getMockResponse(systemPrompt, userMessage) {
  const query = userMessage.toLowerCase();
  
  if (systemPrompt.includes('Guest Chatbot')) {
    if (query.includes('sharing') || query.includes('room') || query.includes('price') || query.includes('fees')) {
      return `We offer several sharing options:
- **Double Sharing**: INR 1,09,000 per year (attached bathrooms, hot water).
- **Four Sharing**: INR 90,000 per year.
- **Five Sharing**: INR 90,000 per year.
We require a 50% deposit before room keys are issued.`;
    }
    if (query.includes('wifi') || query.includes('food') || query.includes('mess') || query.includes('facility')) {
      return `Our facilities include:
1. High-speed Wi-Fi throughout all rooms.
2. In-house mess serving breakfast, lunch, snacks, and dinner.
3. Quiet library study spaces.
4. Campus medical center with a resident nurse.`;
    }
    return `Hello! I am the Guest Chatbot for Navkis College of Engineering Hostel. You can ask me about room sharing options, fees, facilities, or curfew rules (9:00 PM girls / 9:30 PM boys).`;
  }
  
  if (systemPrompt.includes('Staff Assistant')) {
    return `### 📘 Hostel Staff AI Assistant
I have searched the Staff Handbook. Please ask me about:
1. **Curfew and gate locking times** (9:00 PM girls / 9:30 PM boys).
2. **Outpass verification rules** (parent phone confirmation, 5-day limit).
3. **Maintenance complaint resolution SLAs** (12h electrical, 24h plumbing, 48h Wi-Fi).
4. **Medical emergency contacts and procedures**.`;
  }

  if (systemPrompt.includes('Monthly Report')) {
    return `# HOSTEL MONTHLY EXECUTIVE REPORT
**Generated: June 2026**

### 1. Occupancy & Residency Overview
- **Total Residents**: 48 active students.
- **Occupied Rooms**: 22 rooms active.
- **Floor Occupancy**: Ground floor is at 80% capacity, First floor is at 60% capacity.

### 2. Financial Standing
- **Total Revenue Target**: INR 4,80,000
- **Dues Recovered**: INR 3,90,000 (81.25% collected)
- **Outstanding Balances**: INR 90,000 pending clearance.

### 3. Facilities & Maintenance
- **Complaints Received**: 15 complaints filed this month.
- **Resolved complaints**: 14 tickets completed within standard SLAs.
- **Pending tickets**: 1 plumbing ticket (active assignment).

### 4. Travel Outpasses
- **Outpasses Approved**: 12 requests.
- **Outpasses Flagged**: 1 request flagged for excessive duration (review pending).

*Report generated successfully by Warden AI System.*`;
  }
  
  return `Demo completion for query: "${userMessage}".`;
}

/**
 * Structured mock JSON responses
 */
function getMockJSONResponse(systemPrompt, userMessage) {
  const query = userMessage.toLowerCase();
  
  if (systemPrompt.includes('Billing Assistant')) {
    return JSON.stringify({
      amountPaid: 90000,
      amountDue: 19000,
      status: "Pending",
      paymentDetails: "Annual hostel fee totals INR 1,09,000 for double sharing accommodation. Covers room, 24/7 hot water, maintenance, security, and Wi-Fi access.",
      attendanceSummary: "The student has regular attendance logs in the database. General residency guidelines are being followed.",
      recommendation: "Please ensure the remaining due balance of INR 19,000 is cleared before the upcoming semester examination cycles to avoid penalties."
    });
  }

  if (systemPrompt.includes('AI Classifier')) {
    let category = "other";
    let urgency = "low";
    let justification = "The complaint details a minor request.";
    
    if (query.includes('leak') || query.includes('tap') || query.includes('pipe') || query.includes('plumbing') || query.includes('water')) {
      category = "water";
      urgency = "high";
      justification = "Water issues and active leaks can cause structural damage and inconvenience residents, falling under high priority.";
    } else if (query.includes('fan') || query.includes('wire') || query.includes('socket') || query.includes('fuse') || query.includes('shock') || query.includes('electricity') || query.includes('light')) {
      category = "electricity";
      urgency = query.includes('shock') || query.includes('spark') ? "critical" : "high";
      justification = "Electrical issues pose potential safety risks or critical disruptions, warranting rapid triage.";
    } else if (query.includes('clean') || query.includes('garbage') || query.includes('dust') || query.includes('dirt') || query.includes('smell')) {
      category = "cleanliness";
      urgency = "medium";
      justification = "Cleanliness concerns represent hygienic comfort issues requiring attention within standard turnaround times.";
    }
    
    return JSON.stringify({ category, urgency, justification });
  }

  if (systemPrompt.includes('Attendance Anomalies')) {
    return JSON.stringify({
      summary: "AI Scanner checked attendance registries. 1 student was flagged for low attendance ratios.",
      alerts: [
        {
          name: "N Tejas",
          usn: "4YG23CS072",
          rate: 60,
          consecutiveAbsences: 3,
          recommendation: "Issue attendance warning notice. Student has been absent for 3 consecutive lectures."
        }
      ]
    });
  }

  if (systemPrompt.includes('Risk Scoring')) {
    let riskLevel = "low";
    let recommendation = "approve";
    let justification = "Standard outpass request for weekend travel. Frequency is within normal monthly bounds.";

    if (query.includes('emergency') || query.includes('medical') || query.includes('hospital')) {
      riskLevel = "low";
      recommendation = "approve";
      justification = "Urgent medical request. Recommended for immediate approval with parent contact.";
    } else if (query.includes('week') || query.includes('month') || query.includes('frequent') || query.includes('15 days') || query.includes('10 days')) {
      riskLevel = "high";
      recommendation = "flag";
      justification = "Travel duration exceeds the standard 5-day warden threshold. Requires Chief Warden approval.";
    }

    return JSON.stringify({ riskLevel, recommendation, justification });
  }

  if (systemPrompt.includes('AI Polish')) {
    return JSON.stringify({
      title: "NOTICE: Scheduled Water Supply Interruption",
      body: "Please be informed that due to scheduled plumbing maintenance, the water supply across all hostel blocks will be temporarily shut off tomorrow morning between 6:00 AM and 8:00 AM. Residents are advised to store sufficient water in advance. We apologize for the inconvenience."
    });
  }

  return JSON.stringify({ error: "Unknown request type" });
}

module.exports = {
  callGroqAPI,
  callGroqJSONAPI,
  retrieveHandbookContextVector,
  
  /**
   * Guest chatbot with memory (slices last 6 messages)
   */
  async getChatbotResponse(message, history) {
    const memoryHistory = Array.isArray(history) ? history.slice(-6) : [];
    
    const systemPrompt = `You are the Guest Chatbot assistant for the Navkis College of Engineering Hostel.
Your role is to help visitors and parents with general inquiries. Keep conversation history in mind.
Official details:
- Curfew: 9:00 PM Girls, 9:30 PM Boys.
- Rates: Double sharing is INR 1,09,000/year. Four/five sharing is INR 90,000/year. Girls' hostel also has triple sharing.
- Facilities: 24/7 high speed Wi-Fi, full mess meals (breakfast, lunch, snacks, dinner), library, campus health center, 24/7 security with CCTV.
- Contact: Hasan, Karnataka. Phone: +91 9481450750. Email: adminission@navkisce.ac.in.
Provide concise, friendly answers.`;
    return await callGroqAPI(systemPrompt, message, memoryHistory, 800);
  },

  /**
   * Structured Billing summary
   */
  async getBillingSummary(student, room, attendanceStats) {
    const roomInfo = room ? `${room.sharingType} sharing room on floor ${room.floor}` : 'room';
    
    const systemPrompt = `You are the Hostel Management AI Billing Assistant.
Analyze the student data and return a structured JSON response.
Do NOT output anything else except a single valid JSON block matching this schema:
{
  "amountPaid": number,
  "amountDue": number,
  "status": "Paid" | "Pending",
  "paymentDetails": "detailed string explaining what fee covers (e.g. room, food, wifi, deposits)",
  "attendanceSummary": "summary of the student's attendance records",
  "recommendation": "clear instructions regarding dues and payments"
}

Student Data:
- Name: ${student.name}
- USN: ${student.usn}
- Room Number: ${student.roomNumber || 'Not Assigned'} (${roomInfo})
- Fee Status: ${student.feesStatus}
- Total Fee: INR ${student.totalFee}
- Amount Paid: INR ${student.paid}
- Amount Due: INR ${student.feesDue}
- Attendance: ${attendanceStats.present} present out of ${attendanceStats.total} days (${attendanceStats.rate}% rate).`;

    const userMsg = `Analyze student ${student.name} (${student.usn}).`;
    return await callGroqJSONAPI(systemPrompt, userMsg, 600);
  },

  /**
   * RAG Staff assistant using vector embeddings
   */
  async getStaffAssistantResponse(query, history) {
    const memoryHistory = Array.isArray(history) ? history.slice(-6) : [];
    const context = await retrieveHandbookContextVector(query);
    
    const systemPrompt = `You are the Hostel Staff AI Assistant, grounded in the Navkis College of Engineering Hostel Staff Handbook.
Help staff with rules, protocols, emergencies, and procedures. Use the provided context.
If the answer cannot be found in the context, state clearly: "I cannot find this information in the staff handbook. Please refer to the Chief Warden or Administration for guidance." Do not make up facts.

Handbook Context:
${context || 'No matching handbook sections found.'}

Answer in a helpful, professional, and clear tone. Use bullet points for procedures.`;
    return await callGroqAPI(systemPrompt, query, memoryHistory, 800);
  },

  /**
   * Complaint urgency classifier
   */
  async classifyComplaint(subject, description) {
    const systemPrompt = `You are the Complaint AI Classifier.
Analyze the hostel complaint and categorize it. Urgency levels are low, medium, high, or critical.
Critical urgency should only be assigned if there is a direct safety hazard (sparks, water flooding, structural failure, theft/security breaches).
Return strictly a valid JSON object:
{
  "category": "maintenance" | "water" | "electricity" | "cleanliness" | "other",
  "urgency": "low" | "medium" | "high" | "critical",
  "justification": "one-sentence explanation of category and urgency"
}`;
    
    const userMsg = `Subject: ${subject}\nDescription: ${description}`;
    return await callGroqJSONAPI(systemPrompt, userMsg, 400);
  },

  /**
   * Attendance anomaly alerts analyser
   */
  async getAttendanceAlerts(flaggedStudents) {
    const systemPrompt = `You are the Attendance Anomalies Analyser.
Evaluate the list of flagged students with low attendance (<75%) or consecutive absences (3+ days).
Suggest actionable recommendations for the warden (warning letters, call parents, face-to-face check-in).
Return strictly a valid JSON object matching this schema:
{
  "summary": "brief summary of the attendance alerts",
  "alerts": [
    {
      "name": "student name",
      "usn": "student usn",
      "rate": number (attendance rate percentage),
      "consecutiveAbsences": number,
      "recommendation": "warden action plan suggestion"
    }
  ]
}`;
    
    const userMsg = `Flagged Students Data:\n${JSON.stringify(flaggedStudents)}`;
    return await callGroqJSONAPI(systemPrompt, userMsg, 800);
  },

  /**
   * Outpass Risk scoring
   */
  async getOutpassRisk(student, outpass, pastCount) {
    const duration = Math.ceil((new Date(outpass.toDate) - new Date(outpass.fromDate)) / (1000 * 60 * 60 * 24)) + 1;
    
    const systemPrompt = `You are the Outpass Risk Assessor.
Score the travel outpass request for risk level (low, medium, high) and recommend warden action (approve, review, flag).
Consider:
- High frequency: ${pastCount} past outpasses.
- Long duration: ${duration} days.
- Reason: ${outpass.reason}.
Return strictly a JSON object:
{
  "riskLevel": "low" | "medium" | "high",
  "recommendation": "approve" | "review" | "flag",
  "justification": "one-sentence justification for the score"
}`;
    
    const userMsg = `Student: ${student.name} (${student.usn})
Requested outpass:
- Dates: ${outpass.fromDate} to ${outpass.toDate} (${duration} days)
- Reason: ${outpass.reason}
- Past outpass count: ${pastCount}`;

    return await callGroqJSONAPI(systemPrompt, userMsg, 400);
  },

  /**
   * Monthly report generator
   */
  async generateMonthlyReport(stats) {
    const systemPrompt = `You are the Chief Warden AI Analyst.
Generate a professional, structured Monthly Executive Report for the hostel administration.
Summarize occupancy metrics, financial collections, complaint tallies, and outpass approvals.
Use markdown headings, bullet points, and tables. Highlight areas of concern.`;
    
    const userMsg = `Hostel Statistics for this Month:\n${JSON.stringify(stats)}`;
    return await callGroqAPI(systemPrompt, userMsg, [], 1500);
  },

  /**
   * Polish notice board announcement draft
   */
  async polishNotice(title, body) {
    const systemPrompt = `You are the Notice Board AI Writer.
Take the rough announcement draft and polish it into a formal, professional hostel notice.
Keep the notice clear, authoritative, and polite.
Return strictly a valid JSON object:
{
  "title": "Polished notice title (keep it uppercase/bold-like)",
  "body": "Polished announcement body text"
}`;
    
    const userMsg = `Rough Title: ${title}\nRough Body: ${body}`;
    return await callGroqJSONAPI(systemPrompt, userMsg, 800);
  }
};
