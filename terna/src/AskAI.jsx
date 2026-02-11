import { useState, useRef, useEffect, lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import SOSButton from "./components/SOSButton";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import { useLanguage } from "./LanguageContext";
import "./AskAI.css";

const VoiceAgent = lazy(() => import("./VoiceAgent"));

// API key should be moved to environment variables for production
// For now using import.meta.env or fallback to backend proxy
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// ─── Emergency keywords for instant RED classification ───
const EMERGENCY_KEYWORDS = {
  en: [
    "bleeding heavily",
    "unconscious",
    "chest pain",
    "accident",
    "not breathing",
    "heart attack",
    "stroke",
    "seizure",
    "choking",
    "collapsed",
    "suicide",
    "fainted",
  ],
  hi: [
    "खून बह",
    "बेहोश",
    "छाती में दर्द",
    "दुर्घटना",
    "सांस नहीं",
    "हार्ट अटैक",
    "दौरा",
    "गला घुट",
    "बेसुध",
  ],
  mr: [
    "रक्तस्राव",
    "बेशुद्ध",
    "छातीत दुखणे",
    "अपघात",
    "श्वास नाही",
    "हार्ट अटॅक",
    "झटका",
    "गुदमरणे",
  ],
};

// ─── UI strings per language ───
const UI_STRINGS = {
  en: {
    welcome:
      "Hello! I'm GramHealth AI, your health assistant.\n\nTell me what health problem you are facing. I will ask a few short questions and then guide you.",
    askDuration:
      "How long have you had this problem?\n(e.g. today, 2 days, 1 week)",
    askSeverityAge:
      "How bad is it? (mild / moderate / severe)\nAlso, what is your age group? (child / adult / elderly)",
    emergencyAdvice:
      "This sounds like an EMERGENCY.\n\n1. Call 108 (ambulance) RIGHT NOW.\n2. Do not move the person unless in danger.\n3. Stay calm and wait for help.",
    disclaimer:
      "This is not a medical diagnosis. Please consult a qualified doctor.",
    greenLabel: "Green — Low Urgency",
    yellowLabel: "Yellow — Moderate Urgency",
    redLabel: "Red — Emergency",
    adviceLabel: "Advice",
    inputPlaceholder: "Type your symptoms or reply here...",
    send: "Send",
    newChat: "New Chat",
    talkToAI: "Talk to AI Doctor",
    talkHint: "Real-time voice conversation",
  },
  hi: {
    welcome:
      "नमस्ते! मैं GramHealth AI हूँ, आपका स्वास्थ्य सहायक।\n\nबताइए आपको क्या स्वास्थ्य समस्या है। मैं कुछ छोटे सवाल पूछूँगा और फिर आपकी मदद करूँगा।",
    askDuration: "यह समस्या कब से है?\n(जैसे: आज से, 2 दिन, 1 हफ्ता)",
    askSeverityAge:
      "कितना गंभीर है? (हल्का / मध्यम / गंभीर)\nआपकी उम्र बताएं: बच्चा, वयस्क, या बुज़ुर्ग?",
    emergencyAdvice:
      "यह आपातकालीन स्थिति लगती है।\n\n1. अभी 108 (एम्बुलेंस) पर कॉल करें।\n2. व्यक्ति को हिलाएं नहीं जब तक खतरा न हो।\n3. शांत रहें और मदद का इंतज़ार करें।",
    disclaimer:
      "यह चिकित्सा निदान नहीं है। कृपया योग्य डॉक्टर से परामर्श करें।",
    greenLabel: "हरा — कम गंभीर",
    yellowLabel: "पीला — मध्यम गंभीर",
    redLabel: "लाल — आपातकालीन",
    adviceLabel: "सलाह",
    inputPlaceholder: "अपने लक्षण या जवाब यहाँ लिखें...",
    send: "भेजें",
    newChat: "नई चैट",
    talkToAI: "AI डॉक्टर से बात करें",
    talkHint: "रियल-टाइम वॉइस बातचीत",
  },
  mr: {
    welcome:
      "नमस्कार! मी GramHealth AI, तुमचा आरोग्य सहाय्यक.\n\nतुम्हाला कोणती आरोग्य समस्या आहे ते सांगा. मी काही छोटे प्रश्न विचारतो आणि मग तुम्हाला मार्गदर्शन करतो.",
    askDuration: "ही समस्या कधीपासून आहे?\n(उदा.: आजपासून, 2 दिवस, 1 आठवडा)",
    askSeverityAge:
      "किती गंभीर आहे? (सौम्य / मध्यम / गंभीर)\nतुमचे वय सांगा: लहान मूल, प्रौढ, किंवा वृद्ध?",
    emergencyAdvice:
      "ही आपत्कालीन परिस्थिती वाटते.\n\n1. आत्ताच 108 (रुग्णवाहिका) वर कॉल करा.\n2. धोका नसेल तर व्यक्तीला हलवू नका.\n3. शांत राहा आणि मदतीची वाट पहा.",
    disclaimer: "हे वैद्यकीय निदान नाही. कृपया पात्र डॉक्टरांचा सल्ला घ्या.",
    greenLabel: "हिरवा — कमी गंभीर",
    yellowLabel: "पिवळा — मध्यम गंभीर",
    redLabel: "लाल — आपत्कालीन",
    adviceLabel: "सल्ला",
    inputPlaceholder: "तुमची लक्षणे किंवा उत्तर इथे लिहा...",
    send: "पाठवा",
    newChat: "नवीन चॅट",
    talkToAI: "AI डॉक्टरशी बोला",
    talkHint: "रिअल-टाइम व्हॉइस संभाषण",
  },
};

// ─── GramHealth AI System Prompt ───
const GRAMHEALTH_SYSTEM_PROMPT = `You are GramHealth AI, a rural healthcare assistant for low-literacy, low-internet areas.

RULES:
1. NEVER diagnose or prescribe medicines.
2. Use very simple language. No medical jargon.
3. Provide practical, actionable advice that people can follow at home or know when to seek help.
4. Format advice as NUMBERED POINTS (1. 2. 3. etc.) for easy reading.
5. Include both modern home remedies AND traditional Ayurvedic remedies.
6. Respond ONLY in valid JSON. No other text outside JSON.

CONVERSATION FLOW:
- The user shares symptoms along with collected info (duration, age, severity).
- Based on all available info, provide a FINAL assessment.
- If critical info is still missing, ask ONE short follow-up question.

For follow-up questions, reply:
{ "type": "question", "message": "your short question here" }

For final assessment, reply:
{
  "type": "final",
  "urgency": "green" or "yellow" or "red",
  "advice": "numbered points with home remedies, Ayurvedic remedies, warning signs, and when to see doctor"
}

URGENCY GUIDE:
- green: mild, manageable at home, short-lasting
- yellow: needs doctor visit within 24-48 hours
- red: emergency, call 108 immediately

ADVICE FORMAT (numbered points, be comprehensive but simple):
1. Immediate home care steps
2. Common household remedies
3. Ayurvedic/traditional remedies (tulsi, turmeric, ginger, ajwain, etc.)
4. Warning signs to watch for
5. When to visit doctor
6. What to avoid

EXAMPLES OF GOOD ADVICE:
For fever: "1. Drink plenty of water and ORS solution. 2. Sponge body with lukewarm water. 3. Take tulsi leaves with honey or drink turmeric milk at bedtime (Ayurvedic). 4. Rest in a cool room and eat light foods like khichdi. 5. Visit doctor if fever lasts more than 3 days or goes above 103°F."

For stomach pain: "1. Rest and drink small sips of water. 2. Try ginger tea or warm water with ajwain seeds. 3. Drink buttermilk with roasted cumin powder (Ayurvedic remedy). 4. Eat light foods like rice, banana, or curd. 5. See doctor if pain is severe, lasts over 6 hours, or if there is blood."

For cough/cold: "1. Rest well and drink warm fluids. 2. Do steam inhalation 2-3 times daily. 3. Take ginger-honey-tulsi tea or turmeric milk (Ayurvedic). 4. Gargle with warm salt water. 5. See doctor if breathing becomes difficult or symptoms last over 1 week."

If symptoms mention bleeding heavily, unconscious, severe chest pain, accident, or breathing stopped:
→ immediately respond with "red" urgency and advise to call 108. Do NOT ask questions.`;

// ─── Offline condition database (compact) ───
const OFFLINE_CONDITIONS = {
  en: {
    emergency: {
      keywords: [
        "bleeding",
        "unconscious",
        "chest pain",
        "accident",
        "not breathing",
        "heart attack",
        "choking",
        "collapsed",
      ],
      urgency: "red",
    },
    fever: {
      keywords: ["fever", "temperature", "hot", "chills"],
      urgency: "yellow",
      advice:
        "1. Drink plenty of water and ORS solution throughout the day. 2. Sponge body with lukewarm water to reduce temperature. 3. Take tulsi (holy basil) leaves with honey or drink tulsi tea (Ayurvedic remedy). 4. Drink turmeric milk at bedtime - mix 1/2 teaspoon turmeric in warm milk (Ayurvedic). 5. Rest in a cool, well-ventilated room and eat light foods like khichdi or dal-rice. 6. Take paracetamol if fever is above 100°F. 7. Visit doctor if fever continues for more than 3 days, goes above 103°F, or if you have severe headache, body pain, or rash.",
    },
    headache: {
      keywords: ["headache", "head pain", "migraine"],
      urgency: "green",
      advice:
        "1. Drink plenty of water - dehydration often causes headaches. 2. Rest in a quiet, dark room away from noise and bright lights. 3. Apply a cool compress on your forehead or warm compress on neck. 4. Try ginger tea with tulsi leaves (Ayurvedic remedy). 5. Massage your temples with eucalyptus oil or peppermint oil mixed with coconut oil. 6. Drink coriander seed water - soak 1 teaspoon coriander seeds in water overnight and drink in morning (Ayurvedic). 7. Avoid skipping meals and get adequate sleep. 8. See doctor immediately if headache is very severe, sudden, or comes with fever, vomiting, or stiff neck.",
    },
    stomach: {
      keywords: [
        "stomach",
        "belly",
        "vomit",
        "diarrhea",
        "loose motion",
        "nausea",
        "acidity",
      ],
      urgency: "yellow",
      advice:
        "1. Drink ORS solution every 1-2 hours to prevent dehydration. 2. Try warm water with ajwain (carom seeds) - boil and drink (Ayurvedic). 3. Drink buttermilk with roasted cumin powder and a pinch of salt (Ayurvedic remedy). 4. Take ginger tea or chew small piece of fresh ginger. 5. Mix 1 teaspoon jeera (cumin) powder in curd and eat (Ayurvedic). 6. Eat light foods like rice, banana, curd, or khichdi only. 7. Avoid spicy, oily, and heavy foods completely. 8. Rest and avoid physical activity. 9. Visit doctor if there is blood in stool or vomit, severe pain lasting over 6 hours, continuous vomiting, or signs of dehydration.",
    },
    cold: {
      keywords: [
        "cold",
        "cough",
        "sneeze",
        "runny nose",
        "throat",
        "sore throat",
        "flu",
      ],
      urgency: "green",
      advice:
        "1. Rest well and stay warm. 2. Drink ginger-honey-tulsi tea 2-3 times daily (Ayurvedic remedy). 3. Drink turmeric milk (haldi doodh) at bedtime - add 1/2 teaspoon turmeric to warm milk (Ayurvedic). 4. Do steam inhalation with ajwain or eucalyptus oil 2-3 times daily. 5. Gargle with warm salt water 3-4 times daily for sore throat. 6. Take mixture of honey and black pepper powder (Ayurvedic for cough). 7. Chew tulsi leaves with honey for throat relief. 8. Avoid cold drinks, ice cream, and cold foods completely. 9. See doctor if cough has blood, breathing becomes difficult, high fever develops, or symptoms last more than 1 week.",
    },
    chest: {
      keywords: ["chest", "heart", "crushing", "pressure"],
      urgency: "red",
      advice:
        "Call 108 immediately. Sit upright and stay calm. Do not drive yourself. This needs urgent check.",
    },
    breathing: {
      keywords: [
        "breathing",
        "breathe",
        "wheeze",
        "asthma",
        "shortness of breath",
        "suffocating",
      ],
      urgency: "red",
      advice:
        "Sit upright. Use inhaler if prescribed. Call 108 if getting worse. All breathing problems need urgent check.",
    },
    pain: {
      keywords: ["pain", "ache", "hurt", "sore"],
      urgency: "yellow",
      advice:
        "1. Rest the affected area and avoid activities that worsen pain. 2. Apply warm compress for muscle pain or cold compress for swelling (20 minutes at a time). 3. Massage gently with warm sesame oil or coconut oil (Ayurvedic). 4. Drink turmeric milk - mix 1/2 teaspoon turmeric in warm milk (Ayurvedic anti-inflammatory). 5. Try ginger tea for natural pain relief (Ayurvedic). 6. Take paracetamol if pain is severe. 7. Note when pain started and what makes it better or worse. 8. Visit doctor within 24-48 hours for proper examination, especially if pain is severe, increasing, or not improving with rest.",
    },
    skin: {
      keywords: ["skin", "rash", "itch", "allergy", "hives", "red spots"],
      urgency: "green",
      advice:
        "1. Keep the affected area clean and dry. 2. Avoid scratching to prevent infection. 3. Apply neem paste or neem oil - natural antibacterial (Ayurvedic). 4. Use aloe vera gel or turmeric paste (mix turmeric with water) for relief (Ayurvedic). 5. Apply coconut oil mixed with a pinch of turmeric at bedtime. 6. Drink neem water - boil neem leaves in water and drink when cool (Ayurvedic blood purifier). 7. Wear loose, cotton clothing. 8. Avoid hot water baths and harsh soaps. 9. See doctor if rash spreads quickly, comes with fever, is very painful, or shows signs of infection.",
    },
    injury: {
      keywords: ["cut", "wound", "fall", "burn", "fracture", "bleed"],
      urgency: "yellow",
      advice:
        "1. For bleeding: Press clean cloth firmly on wound for 10-15 minutes without checking. 2. For burns: Put area under cool running water for 10 minutes. Never apply ice, oil, or toothpaste. 3. Apply turmeric powder mixed with honey on small cuts after cleaning (Ayurvedic antiseptic). 4. Use neem oil or aloe vera gel on minor burns after cooling (Ayurvedic). 5. For suspected broken bone: Keep the injured part still and don't move it. 6. Apply ice pack wrapped in cloth to reduce swelling. 7. Drink turmeric milk to reduce inflammation (Ayurvedic). 8. Visit hospital immediately if bleeding doesn't stop, burn is large or deep, bone might be broken, or wound needs stitches.",
    },
    dental: {
      keywords: ["tooth", "toothache", "dental", "gum", "jaw"],
      urgency: "yellow",
      advice:
        "1. Rinse mouth with warm salt water (1 teaspoon salt in 1 glass water) 3-4 times daily. 2. Apply clove oil on painful tooth using clean cotton (Ayurvedic remedy). 3. Chew a clove bud near the painful area for relief (Ayurvedic). 4. Rinse with neem water - boil neem leaves and use when cool (Ayurvedic antiseptic). 5. Apply turmeric paste mixed with mustard oil on gums (Ayurvedic). 6. Avoid very hot, cold, or sweet foods and drinks. 7. Take paracetamol if pain is severe. 8. Keep area clean by gentle brushing. 9. Visit dentist within 1-2 days. Seek immediate help if severe swelling, fever, or difficulty swallowing.",
    },
    eye: {
      keywords: ["eye", "vision", "blurry", "red eye", "eye pain"],
      urgency: "yellow",
      advice:
        "1. Wash hands thoroughly before touching eyes. 2. Clean eyes gently with cooled boiled water using clean cotton. 3. Put 2-3 drops of rose water in eyes for relief (Ayurvedic). 4. Apply triphala water - soak triphala overnight and use the water to wash eyes in morning (Ayurvedic). 5. Put cooled used tea bags on closed eyes for 10 minutes. 6. Rest eyes and avoid bright lights and screens. 7. Don't rub eyes or share towels. 8. Eat foods rich in Vitamin A like carrots and papaya. 9. See doctor immediately if vision is blurry, severe pain, flashes of light, injury, or no improvement in 24 hours.",
    },
    joint: {
      keywords: [
        "joint",
        "knee",
        "ankle",
        "elbow",
        "shoulder",
        "arthritis",
        "stiff",
      ],
      urgency: "green",
      advice:
        "1. Rest the affected joint and avoid heavy work or exercise. 2. Apply warm sesame oil or mustard oil and massage gently (Ayurvedic). 3. Apply warm compress or heating pad for 15-20 minutes. 4. Drink turmeric milk daily - mix 1/2 teaspoon turmeric in warm milk (Ayurvedic anti-inflammatory). 5. Try ginger tea for natural pain relief. 6. Make paste of turmeric and ginger, apply on joint and wrap with cloth (Ayurvedic). 7. Keep joint elevated when resting. 8. Do gentle movements to prevent stiffness. 9. See doctor if pain is severe, lasts over 1 week, joint is very swollen or red, or cannot move the joint.",
    },
    dehydration: {
      keywords: [
        "dehydrated",
        "thirsty",
        "dry mouth",
        "dizzy",
        "weak",
        "tired",
      ],
      urgency: "yellow",
      advice:
        "1. Drink ORS solution immediately - mix 1 liter water + 6 teaspoons sugar + 1/2 teaspoon salt. 2. Drink coconut water - natural electrolyte replacement (Ayurvedic). 3. Take small sips every few minutes, don't drink too fast. 4. Drink buttermilk with a pinch of salt and roasted cumin (Ayurvedic). 5. Eat water-rich fruits like watermelon, oranges, or cucumber. 6. Drink rice water or barley water (Ayurvedic cooling drinks). 7. Rest in cool, shaded place. 8. Avoid tea, coffee, alcohol, and going in sun. 9. Visit hospital immediately if cannot keep water down, very dizzy, urinating very little, or feeling confused.",
    },
    back: {
      keywords: ["back pain", "back", "spine", "lower back"],
      urgency: "yellow",
      advice:
        "1. Rest on firm mattress but avoid complete bed rest for over 1-2 days. 2. Apply warm sesame oil or mustard oil and massage gently (Ayurvedic). 3. Apply warm compress or heating pad for 15-20 minutes several times daily. 4. Make paste of turmeric and ginger, warm it slightly and apply on affected area (Ayurvedic). 5. Drink turmeric milk before bedtime (Ayurvedic anti-inflammatory). 6. Try ginger tea for pain relief. 7. Sleep on side with pillow between knees, or on back with pillow under knees. 8. Take paracetamol for pain relief. 9. Avoid heavy lifting and bending. 10. See doctor if pain goes down to legs, numbness, tingling, difficulty with bladder/bowels, or severe pain not improving.",
    },
  },
  hi: {
    emergency: {
      keywords: [
        "खून",
        "बेहोश",
        "छाती में दर्द",
        "दुर्घटना",
        "सांस नहीं",
        "हार्ट अटैक",
        "गला घुट",
      ],
      urgency: "red",
    },
    fever: {
      keywords: ["बुखार", "ताप", "गर्म", "ठंड लगना"],
      urgency: "yellow",
      advice:
        "खूब पानी और ORS पिएं। गुनगुने पानी से स्पंज करें। 3 दिन से अधिक बुखार या 103°F से अधिक हो तो डॉक्टर को दिखाएं।",
    },
    headache: {
      keywords: ["सिरदर्द", "सिर दर्द", "माइग्रेन"],
      urgency: "green",
      advice:
        "पानी पिएं, शांत अंधेरे कमरे में आराम करें। बहुत तेज हो तो डॉक्टर को दिखाएं।",
    },
    stomach: {
      keywords: ["पेट", "उल्टी", "दस्त", "पेट दर्द", "एसिडिटी"],
      urgency: "yellow",
      advice:
        "ORS पिएं। हल्का खाना खाएं। मल या उल्टी में खून हो तो डॉक्टर को दिखाएं।",
    },
    cold: {
      keywords: ["सर्दी", "खांसी", "छींक", "नाक बहना", "गला दर्द"],
      urgency: "green",
      advice:
        "आराम करें। गर्म पानी और शहद-अदरक की चाय पिएं। सांस में तकलीफ हो तो डॉक्टर को दिखाएं।",
    },
    chest: {
      keywords: ["छाती", "हृदय", "सीने में दर्द"],
      urgency: "red",
      advice: "तुरंत 108 पर कॉल करें। सीधे बैठें। गाड़ी न चलाएं।",
    },
    breathing: {
      keywords: ["सांस", "दम", "घुटन"],
      urgency: "red",
      advice: "सीधे बैठें। इनहेलर हो तो उपयोग करें। 108 पर कॉल करें।",
    },
    pain: {
      keywords: ["दर्द", "पीड़ा"],
      urgency: "yellow",
      advice: "प्रभावित हिस्से को आराम दें। 24-48 घंटे में डॉक्टर को दिखाएं।",
    },
    skin: {
      keywords: ["त्वचा", "चकत्ते", "खुजली", "एलर्जी"],
      urgency: "green",
      advice: "साफ और सूखा रखें। फैलने या बुखार आने पर डॉक्टर को दिखाएं।",
    },
    injury: {
      keywords: ["चोट", "घाव", "गिरना", "जलना", "खून"],
      urgency: "yellow",
      advice: "खून बहने पर साफ कपड़े से दबाएं। गहरा घाव हो तो अस्पताल जाएं।",
    },
    dental: {
      keywords: ["दांत", "दांत दर्द", "मसूड़े"],
      urgency: "yellow",
      advice: "गर्म नमक पानी से कुल्ला करें। 2 दिन में दंत चिकित्सक को दिखाएं।",
    },
    joint: {
      keywords: ["जोड़", "घुटना", "कंधा"],
      urgency: "green",
      advice:
        "जोड़ को आराम दें। सूजन हो तो ठंड सिकाई करें। 1 हफ्ते से अधिक रहे तो डॉक्टर को दिखाएं।",
    },
    dehydration: {
      keywords: ["निर्जलीकरण", "प्यास", "चक्कर", "कमजोरी"],
      urgency: "yellow",
      advice:
        "तुरंत ORS या नारियल पानी पिएं। ठंडी जगह आराम करें। पानी न पी पाएं तो अस्पताल जाएं।",
    },
    back: {
      keywords: ["पीठ", "कमर", "कमर दर्द"],
      urgency: "yellow",
      advice:
        "सख्त सतह पर आराम करें। गर्म सिकाई करें। पैर में दर्द या सुन्नता हो तो डॉक्टर को दिखाएं।",
    },
  },
  mr: {
    emergency: {
      keywords: [
        "रक्तस्राव",
        "बेशुद्ध",
        "छातीत दुखणे",
        "अपघात",
        "श्वास नाही",
        "हार्ट अटॅक",
        "गुदमरणे",
      ],
      urgency: "red",
    },
    fever: {
      keywords: ["ताप", "तापमान", "गरम", "थंडी वाजणे"],
      urgency: "yellow",
      advice:
        "भरपूर पाणी आणि ORS प्या. कोमट पाण्याने स्पंज करा. 3 दिवसांपेक्षा जास्त ताप असल्यास डॉक्टरांना दाखवा.",
    },
    headache: {
      keywords: ["डोकेदुखी", "डोके दुखणे"],
      urgency: "green",
      advice:
        "पाणी प्या, शांत अंधाऱ्या खोलीत विश्रांती घ्या. खूप तीव्र असल्यास डॉक्टरांना दाखवा.",
    },
    stomach: {
      keywords: ["पोट", "उलट्या", "जुलाब", "पोट दुखणे"],
      urgency: "yellow",
      advice: "ORS प्या. हलके अन्न खा. विष्ठेत रक्त आल्यास डॉक्टरांना दाखवा.",
    },
    cold: {
      keywords: ["सर्दी", "खोकला", "शिंका", "नाक वाहणे", "घसा दुखणे"],
      urgency: "green",
      advice:
        "विश्रांती घ्या. गरम पाणी प्या. श्वासाची अडचण असल्यास डॉक्टरांना दाखवा.",
    },
    chest: {
      keywords: ["छाती", "हृदय", "छातीत दुखणे"],
      urgency: "red",
      advice: "ताबडतोब 108 वर कॉल करा. सरळ बसा. गाडी चालवू नका.",
    },
    breathing: {
      keywords: ["श्वास", "दम", "गुदमरणे"],
      urgency: "red",
      advice: "सरळ बसा. इनहेलर असल्यास वापरा. 108 वर कॉल करा.",
    },
    pain: {
      keywords: ["वेदना", "दुखणे"],
      urgency: "yellow",
      advice: "प्रभावित भागाला विश्रांती द्या. 24-48 तासांत डॉक्टरांना दाखवा.",
    },
    skin: {
      keywords: ["त्वचा", "पुरळ", "खाज", "ऍलर्जी"],
      urgency: "green",
      advice: "स्वच्छ आणि कोरडे ठेवा. पसरत असल्यास डॉक्टरांना दाखवा.",
    },
    injury: {
      keywords: ["दुखापत", "जखम", "पडणे", "भाजणे", "रक्त"],
      urgency: "yellow",
      advice: "रक्तस्रावासाठी स्वच्छ कापड दाबा. खोल जखम असल्यास रुग्णालयात जा.",
    },
    dental: {
      keywords: ["दात", "दातदुखी", "हिरड्या"],
      urgency: "yellow",
      advice: "कोमट मिठाच्या पाण्याने कुल्ला करा. 2 दिवसांत दंतवैद्याला दाखवा.",
    },
    joint: {
      keywords: ["सांधा", "गुडघा", "खांदा"],
      urgency: "green",
      advice:
        "सांध्याला विश्रांती द्या. सूज असल्यास थंड पट्टी करा. 1 आठवड्यापेक्षा जास्त राहिल्यास डॉक्टरांना दाखवा.",
    },
    dehydration: {
      keywords: ["निर्जलीकरण", "तहान", "चक्कर", "कमकुवतपणा"],
      urgency: "yellow",
      advice:
        "ताबडतोब ORS किंवा नारळ पाणी प्या. थंड जागी विश्रांती घ्या. पाणी पिता येत नसेल तर रुग्णालयात जा.",
    },
    back: {
      keywords: ["पाठ", "कंबर", "पाठदुखी"],
      urgency: "yellow",
      advice:
        "घट्ट गादीवर विश्रांती घ्या. गरम पट्टी करा. पायात दुखणे असल्यास डॉक्टरांना दाखवा.",
    },
  },
};

// ─── Offline symptom detection ───
function detectOfflineCondition(text, lang) {
  const lower = text.toLowerCase();
  const conditions = OFFLINE_CONDITIONS[lang] || OFFLINE_CONDITIONS.en;

  // Check emergency first
  const emergencyKws = conditions.emergency?.keywords || [];
  for (const kw of emergencyKws) {
    if (lower.includes(kw.toLowerCase())) {
      return { urgency: "red", isEmergency: true };
    }
  }

  // Score other conditions
  let best = null;
  let bestScore = 0;
  for (const [key, cond] of Object.entries(conditions)) {
    if (key === "emergency") continue;
    const score = cond.keywords.filter((kw) =>
      lower.includes(kw.toLowerCase()),
    ).length;
    if (score > bestScore) {
      bestScore = score;
      best = cond;
    }
  }
  return best || null;
}

// ─── Component ───
const AskAI = () => {
  const { t, language } = useLanguage();
  const s = UI_STRINGS[language] || UI_STRINGS.en;

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState("initial"); // initial | followup1 | followup2 | done
  const [collectedInfo, setCollectedInfo] = useState({
    symptoms: "",
    duration: "",
    severityAge: "",
  });

  // UI state
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const msgIdRef = useRef(2);

  // Initialize welcome message
  useEffect(() => {
    const str = UI_STRINGS[language] || UI_STRINGS.en;
    setMessages([
      { id: 1, role: "assistant", type: "text", content: str.welcome },
    ]);
    setPhase("initial");
    setCollectedInfo({ symptoms: "", duration: "", severityAge: "" });
    msgIdRef.current = 2;
  }, [language]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const addMsg = (msg) => {
    const id = msgIdRef.current++;
    setMessages((prev) => [...prev, { id, ...msg }]);
    return id;
  };

  // ─── Voice Input ───
  const handleVoiceInput = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setToast({
        message:
          t("voiceNotSupported") ||
          "Voice input not supported. Please use Chrome.",
        type: "error",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    const voiceLangMap = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
    recognition.lang = voiceLangMap[language] || "en-IN";

    let finalTranscript = input;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + txt;
        } else {
          interim = txt;
        }
      }
      setInput(
        finalTranscript +
          (interim ? (finalTranscript ? " " : "") + interim : ""),
      );
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setToast({
          message:
            "Microphone access denied. Allow microphone in browser settings.",
          type: "error",
        });
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // ─── AI: Get a follow-up question ───
  async function getAIFollowUp(symptoms, collectedAnswers) {
    try {
      let langInstr = "";
      if (language === "hi")
        langInstr = "\nRespond entirely in Hindi (Devanagari script).";
      else if (language === "mr")
        langInstr = "\nRespond entirely in Marathi (Devanagari script).";

      let userMsg = `Patient says: "${symptoms}"`;
      if (collectedAnswers.length > 0) {
        userMsg += `\nAlready collected: ${collectedAnswers.map((a) => `${a.q}: ${a.a}`).join(", ")}`;
      }
      userMsg +=
        "\nAsk ONE short follow-up question to assess urgency. Keep it very simple.";
      userMsg += langInstr;

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "GramHealth AI",
          },
          body: JSON.stringify({
            model: "openai/gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: GRAMHEALTH_SYSTEM_PROMPT + langInstr,
              },
              { role: "user", content: userMsg },
            ],
            temperature: 0.3,
            max_tokens: 200,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(tid);
      if (!resp.ok) return null;

      const data = await resp.json();
      let raw = data.choices?.[0]?.message?.content || "";
      console.log("Follow-up AI Response:", raw); // Debug log

      raw = raw
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .trim()
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === "question" && parsed.message) return parsed.message;
      } catch (e) {
        console.log("Follow-up JSON parse failed:", e);
        // Might be plain text
        if (raw.length > 5 && raw.length < 300 && raw.includes("?")) return raw;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ─── AI: Get final assessment ───
  async function getFinalAssessment(info) {
    const str = UI_STRINGS[language] || UI_STRINGS.en;

    // Offline fallback
    const offline = detectOfflineCondition(info.symptoms, language);
    const offlineFinal = offline
      ? {
          urgency: offline.urgency || "yellow",
          advice: offline.isEmergency
            ? str.emergencyAdvice
            : offline.advice ||
              (language === "en"
                ? "Visit your nearest health centre for check-up."
                : language === "hi"
                  ? "अपने निकटतम स्वास्थ्य केंद्र पर जाएं।"
                  : "जवळच्या आरोग्य केंद्रात जा."),
          disclaimer: str.disclaimer,
        }
      : {
          urgency: "yellow",
          advice:
            language === "en"
              ? "Please visit your nearest health centre within 24 hours."
              : language === "hi"
                ? "कृपया 24 घंटे में अपने निकटतम स्वास्थ्य केंद्र पर जाएं।"
                : "कृपया 24 तासांत जवळच्या आरोग्य केंद्रात जा.",
          disclaimer: str.disclaimer,
        };

    // Try AI for a better answer
    try {
      let langInstr = "";
      if (language === "hi") langInstr = "\nRespond in Hindi (Devanagari).";
      else if (language === "mr")
        langInstr = "\nRespond in Marathi (Devanagari).";

      const userMsg = `Patient info:\n- Symptoms: ${info.symptoms}\n- Duration: ${info.duration}\n- Severity/Age: ${info.severityAge}\n\nNow give the FINAL assessment with detailed practical advice including home remedies and when to see a doctor.${langInstr}`;

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "GramHealth AI",
          },
          body: JSON.stringify({
            model: "openai/gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: GRAMHEALTH_SYSTEM_PROMPT + langInstr,
              },
              { role: "user", content: userMsg },
            ],
            temperature: 0.3,
            max_tokens: 600,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(tid);
      if (!resp.ok) return offlineFinal;

      const data = await resp.json();
      let raw = data.choices?.[0]?.message?.content || "";
      console.log("AI Response:", raw); // Debug log

      raw = raw
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .trim()
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      try {
        // First, try to parse the entire response as JSON
        const parsed = JSON.parse(raw);
        if (parsed.type === "final" && parsed.urgency && parsed.advice) {
          return {
            urgency: ["green", "yellow", "red"].includes(parsed.urgency)
              ? parsed.urgency
              : "yellow",
            advice: parsed.advice,
            disclaimer: parsed.disclaimer || str.disclaimer,
          };
        }
      } catch (e) {
        console.log("Full JSON parse failed, trying regex:", e);
        // Fallback: try to extract JSON using regex
        const jsonMatches = [
          ...raw.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g),
        ];
        const match =
          jsonMatches.length > 0
            ? jsonMatches[jsonMatches.length - 1][0]
            : null;

        if (match) {
          try {
            const parsed = JSON.parse(match);
            if (parsed.urgency && parsed.advice) {
              return {
                urgency: ["green", "yellow", "red"].includes(parsed.urgency)
                  ? parsed.urgency
                  : "yellow",
                advice: parsed.advice,
                disclaimer: parsed.disclaimer || str.disclaimer,
              };
            }
          } catch (e2) {
            console.log("Regex JSON parse also failed:", e2);
          }
        }
      }

      return offlineFinal;
    } catch {
      return offlineFinal;
    }
  }

  // ─── Process initial symptom (shared logic) ───
  const processInitialSymptom = async (text) => {
    const str = UI_STRINGS[language] || UI_STRINGS.en;

    // Check emergency keywords
    const emergencyKws = EMERGENCY_KEYWORDS[language] || EMERGENCY_KEYWORDS.en;
    const lower = text.toLowerCase();
    const isEmergency = emergencyKws.some((kw) =>
      lower.includes(kw.toLowerCase()),
    );

    if (isEmergency) {
      addMsg({
        role: "assistant",
        type: "final",
        urgency: "red",
        advice: str.emergencyAdvice,
        disclaimer: str.disclaimer,
      });
      setPhase("done");
      return;
    }

    // Also check offline conditions for emergency
    const offline = detectOfflineCondition(text, language);
    if (offline && offline.urgency === "red") {
      addMsg({
        role: "assistant",
        type: "final",
        urgency: "red",
        advice: offline.isEmergency
          ? str.emergencyAdvice
          : offline.advice || str.emergencyAdvice,
        disclaimer: str.disclaimer,
      });
      setPhase("done");
      return;
    }

    // Store symptoms, ask follow-up
    setCollectedInfo((prev) => ({ ...prev, symptoms: text }));
    setPhase("followup1");

    setIsLoading(true);
    const aiQuestion = await getAIFollowUp(text, []);
    setIsLoading(false);

    addMsg({
      role: "assistant",
      type: "text",
      content: aiQuestion || str.askDuration,
    });
  };

  // ─── Handle Send ───
  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    addMsg({ role: "user", type: "text", content: text });

    const str = UI_STRINGS[language] || UI_STRINGS.en;

    // ─── Initial or Done (restart) ───
    if (phase === "initial" || phase === "done") {
      setCollectedInfo({ symptoms: "", duration: "", severityAge: "" });
      await processInitialSymptom(text);
      return;
    }

    // ─── Follow-up 1 (typically duration) ───
    if (phase === "followup1") {
      setCollectedInfo((prev) => ({ ...prev, duration: text }));
      setPhase("followup2");

      setIsLoading(true);
      const aiQuestion = await getAIFollowUp(collectedInfo.symptoms, [
        { q: "duration", a: text },
      ]);
      setIsLoading(false);

      addMsg({
        role: "assistant",
        type: "text",
        content: aiQuestion || str.askSeverityAge,
      });
      return;
    }

    // ─── Follow-up 2 (severity/age) → Final assessment ───
    if (phase === "followup2") {
      const updatedInfo = {
        symptoms: collectedInfo.symptoms,
        duration: collectedInfo.duration,
        severityAge: text,
      };
      setCollectedInfo(updatedInfo);
      setPhase("done");

      setIsLoading(true);
      const assessment = await getFinalAssessment(updatedInfo);
      setIsLoading(false);

      addMsg({
        role: "assistant",
        type: "final",
        urgency: assessment.urgency,
        advice: assessment.advice,
        disclaimer: assessment.disclaimer || str.disclaimer,
      });
    }
  };

  // ─── New Chat ───
  const handleNewChat = () => {
    const str = UI_STRINGS[language] || UI_STRINGS.en;
    msgIdRef.current = 2;
    setMessages([
      { id: 1, role: "assistant", type: "text", content: str.welcome },
    ]);
    setPhase("initial");
    setCollectedInfo({ symptoms: "", duration: "", severityAge: "" });
    setInput("");
  };

  // ─── SOS ───
  const handleSOS = () => {
    setConfirmDialog({
      message: t("sosConfirm"),
      onConfirm: () => {
        setConfirmDialog(null);
        window.location.href = "tel:108";
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // ─── Urgency config ───
  const urgencyConfig = {
    green: {
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
      icon: "✓",
      label: s.greenLabel,
    },
    yellow: {
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
      icon: "⚠",
      label: s.yellowLabel,
    },
    red: {
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
      icon: "🚨",
      label: s.redLabel,
    },
  };

  // ─── Render ───
  return (
    <div className="askai-page">
      <Navbar />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      <div className="gram-container">
        {/* ── Header ── */}
        <div className="gram-header">
          <div className="gram-header-top">
            <div className="gram-logo">
              <div className="gram-logo-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="26"
                  height="26"
                >
                  <path d="M4.8 2.3A.3.3 0 0 1 5 2h14a.3.3 0 0 1 .3.3v19.4a.3.3 0 0 1-.3.3H5a.3.3 0 0 1-.2-.3V2.3z" />
                  <path d="M8 7h8M8 11h8M8 15h5" />
                  <circle
                    cx="17"
                    cy="19"
                    r="4"
                    fill="currentColor"
                    opacity="0.15"
                  />
                  <path d="M17 17v4M15 19h4" />
                </svg>
              </div>
              <div>
                <h1 className="gram-title">GramHealth AI</h1>
                <p className="gram-subtitle">{t("aiSubtitle")}</p>
              </div>
            </div>
            <div className="gram-header-actions">
              <button className="gram-new-chat-btn" onClick={handleNewChat}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="16"
                  height="16"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>{s.newChat}</span>
              </button>
            </div>
          </div>

          <button
            className="gram-voice-btn"
            onClick={() => setShowVoiceAgent(true)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            {s.talkToAI}
            <span className="gram-voice-hint">{s.talkHint}</span>
          </button>
        </div>

        {/* ── Chat Area ── */}
        <div className="gram-chat">
          {messages.map((msg) => (
            <div key={msg.id} className={`gram-msg gram-msg-${msg.role}`}>
              {msg.role === "assistant" && (
                <div className="gram-avatar">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="18"
                    height="18"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </div>
              )}
              <div className={`gram-bubble gram-bubble-${msg.role}`}>
                {msg.type === "final" ? (
                  <div className="gram-assessment">
                    {/* Advice */}
                    <div className="gram-advice">
                      <h4>{s.adviceLabel}:</h4>
                      {msg.advice
                        .split(/(?=\d+\.\s)/) // Split before numbered points like "1. ", "2. ", etc.
                        .filter((line) => line.trim()) // Remove empty lines
                        .map((line, i) => (
                          <p key={i} style={{ marginBottom: "0.5rem" }}>
                            {line.trim()}
                          </p>
                        ))}
                    </div>

                    {/* Disclaimer */}
                    <div className="gram-disclaimer-card">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="16"
                        height="16"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                      <span>{msg.disclaimer}</span>
                    </div>
                  </div>
                ) : (
                  msg.content
                    .split("\n")
                    .map((line, i) =>
                      line.trim() ? <p key={i}>{line}</p> : <br key={i} />,
                    )
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="gram-msg gram-msg-assistant">
              <div className="gram-avatar">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="18"
                  height="18"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
              <div className="gram-bubble gram-bubble-assistant">
                <div className="gram-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ── Input Area ── */}
        <div className="gram-input-area">
          <div className="gram-input-wrapper">
            <input
              type="text"
              className="gram-input"
              placeholder={s.inputPlaceholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading}
            />
            <button
              className={`gram-mic-btn ${isListening ? "listening" : ""}`}
              onClick={handleVoiceInput}
              title={t("voiceInput") || "Voice Input"}
            >
              {isListening ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </button>
            <button
              className="gram-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <SOSButton />
      </Suspense>

      {/* Voice Agent Overlay */}
      {showVoiceAgent && (
        <Suspense fallback={null}>
          <VoiceAgent onClose={() => setShowVoiceAgent(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default AskAI;
