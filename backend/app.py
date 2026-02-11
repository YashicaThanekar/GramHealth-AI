from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
import json
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

# ── OpenRouter config ──────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL   = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"

URGENCY_COLORS = {"low": "#10b981", "medium": "#f59e0b", "high": "#ef4444"}
DISCLAIMER     = ("This is AI-based guidance, not a medical diagnosis. "
                   "Consult a qualified healthcare provider for proper evaluation and treatment.")

# ── Routes ─────────────────────────────────────────────────────────
@app.route("/")
def home():
    return jsonify({"message": "GramHealth AI Backend", "status": "running"})


@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy"})


@app.route("/api/analyze-symptoms", methods=["POST"])
def analyze_symptoms():
    try:
        data = request.get_json()
        symptoms = (data.get("symptoms") or "").strip()

        if len(symptoms) < 5:
            return jsonify({"error": "Please describe your symptoms in more detail"}), 400

        lang = data.get("language", "en")

        if OPENROUTER_API_KEY:
            result = _analyze_with_ai(symptoms, lang)
        else:
            result = _analyze_with_rules(symptoms)

        # normalise every response
        result.setdefault("color", URGENCY_COLORS.get(result.get("urgency", "medium"), "#f59e0b"))
        result.setdefault("disclaimer", DISCLAIMER)
        return jsonify(result)

    except Exception as exc:
        print(f"[ERROR] {exc}")
        return jsonify({"error": str(exc)}), 500


# ══════════════════════════════════════════════════════════════════
#  AI-POWERED ANALYSIS  (OpenRouter)
# ══════════════════════════════════════════════════════════════════
SYSTEM_PROMPT = """\
You are a senior medical triage doctor working in rural India.
Your job is to analyze the patient's symptoms and return a structured JSON report.

RULES:
• Analyze the EXACT symptoms the patient describes.
• Identify a possible SPECIFIC condition (not generic).
• Explain the medical reason in plain language a villager can understand.
• Give practical, actionable, step-by-step advice (include dosages for OTC meds where appropriate).
• Include warning signs that mean "go to hospital NOW".
• Give expected recovery timeline.
• Choose urgency: low / medium / high using standard triage criteria.

Output ONLY a raw JSON object – no markdown, no commentary:
{
  "urgency": "low | medium | high",
  "urgencyText": "<Condition Name> – <Action>",
  "possibleCauses": "<2-3 specific medical causes for THESE symptoms>",
  "whyHappening": "<Simple explanation of the body mechanism causing THESE symptoms>",
  "advice": "<4-5 numbered actionable steps specific to THESE symptoms>",
  "homeRemedies": "<2-3 safe home remedies relevant to THESE symptoms>",
  "redFlags": "<warning signs that need immediate hospital visit>",
  "timeline": "<expected duration and when to expect improvement>"
}
"""


def _analyze_with_ai(symptoms: str, lang: str = "en") -> dict:
    """Call OpenRouter and return structured result; falls back to rules on any failure."""

    lang_instruction = ""
    if lang == "hi":
        lang_instruction = "\nRespond entirely in Hindi (Devanagari script)."
    elif lang == "mr":
        lang_instruction = "\nRespond entirely in Marathi (Devanagari script)."

    user_msg = f"Patient symptoms: {symptoms}{lang_instruction}"

    try:
        resp = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "GramHealth AI",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_msg},
                ],
                "temperature": 0.4,      # lower = more focused, factual
                "max_tokens": 1200,
                "top_p": 0.9,
            },
            timeout=30,
        )

        if resp.status_code != 200:
            print(f"[OpenRouter {resp.status_code}] {resp.text[:300]}")
            return _analyze_with_rules(symptoms)

        raw = resp.json()["choices"][0]["message"]["content"]

        # strip markdown fences if model wraps them
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*$", "", raw)
        raw = raw.strip()

        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            ai = json.loads(m.group())
            # guarantee required fields exist
            ai.setdefault("urgency", "medium")
            ai.setdefault("urgencyText", "Needs Evaluation")
            ai.setdefault("possibleCauses", "")
            ai.setdefault("whyHappening", "")
            ai.setdefault("advice", "")
            ai.setdefault("homeRemedies", "")
            ai.setdefault("redFlags", "")
            ai.setdefault("timeline", "")
            return ai

        # couldn't parse JSON – use the text as advice
        return {
            "urgency": "medium",
            "urgencyText": "Symptom Analysis",
            "possibleCauses": "",
            "whyHappening": "",
            "advice": raw[:600],
            "homeRemedies": "",
            "redFlags": "",
            "timeline": "",
        }

    except Exception as exc:
        print(f"[AI Error] {exc}")
        return _analyze_with_rules(symptoms)


# ══════════════════════════════════════════════════════════════════
#  RULE-BASED ANALYSIS  (offline fallback)
#  Key idea: match ALL relevant conditions, merge them, and
#  compose a combined response so "wisdom teeth + shaking hands"
#  gets advice for BOTH.
# ══════════════════════════════════════════════════════════════════

# ---------- condition knowledge base ----------
CONDITIONS = {
    "dental": {
        "keywords": ["tooth", "teeth", "wisdom tooth", "wisdom teeth", "toothache",
                      "gum", "dental", "molar", "cavity", "jaw pain"],
        "urgency": "medium",
        "label": "Dental Pain",
        "causes": (
            "Impacted wisdom tooth (tooth stuck under gum or pressing neighbouring teeth), "
            "dental cavity reaching the nerve (pulpitis), gum infection (pericoronitis), "
            "or a dental abscess (pus pocket at the tooth root)"
        ),
        "mechanism": (
            "When a wisdom tooth can't erupt fully, a flap of gum covers it and traps "
            "bacteria, causing swelling and throbbing pain. If decay reaches the inner "
            "nerve (pulp), every hot/cold stimulus sends a sharp pain signal."
        ),
        "advice": (
            "1. Rinse with warm salt water (1 tsp salt in a glass of warm water) every 2-3 hours.\n"
            "2. Take Ibuprofen 400 mg with food every 8 hours for pain and swelling.\n"
            "3. Apply an ice pack on the cheek – 15 min on, 15 min off.\n"
            "4. Eat soft foods (khichdi, dal, curd) and chew on the opposite side.\n"
            "5. Visit a dentist within 48 hours for X-ray and treatment plan."
        ),
        "home_remedies": (
            "Clove oil on cotton applied to the sore gum numbs pain naturally. "
            "A cold tea bag pressed against the area reduces swelling. "
            "Turmeric paste (haldi + water) on gums has anti-bacterial properties."
        ),
        "red_flags": "Fever above 101 °F, facial swelling spreading to eye/neck, difficulty opening mouth or swallowing, pus oozing from gums",
        "timeline": "Pain eases in 2-3 days with salt rinses and ibuprofen. If impacted, a dentist may schedule extraction (recovery: 7-10 days)."
    },

    "tremor": {
        "keywords": ["shaking", "tremor", "trembling", "hands shaking", "hand shaking",
                      "shivering", "vibrating"],
        "urgency": "medium",
        "label": "Tremor / Shaking",
        "causes": (
            "Pain-triggered adrenaline surge (most common with dental/injury pain), "
            "low blood sugar (skipped meals), excess caffeine or tea, anxiety/stress response, "
            "thyroid over-activity (hyperthyroidism), or essential tremor (neurological)"
        ),
        "mechanism": (
            "Severe pain makes your brain release adrenaline (fight-or-flight hormone). "
            "This speeds up your heart, tenses muscles, and causes visible trembling. "
            "Low blood sugar starves nerve cells of fuel, making them misfire and twitch."
        ),
        "advice": (
            "1. If you're in pain, treating the pain (see dental/injury advice) usually stops the shaking.\n"
            "2. Sit down, drink a glass of warm sweet milk or glucose water to raise blood sugar.\n"
            "3. Practice slow breathing: breathe in 4 sec → hold 4 sec → breathe out 6 sec.\n"
            "4. Reduce tea/coffee to max 2 cups a day.\n"
            "5. If tremor persists for more than a week without pain, see a doctor – they'll check thyroid and sugar levels."
        ),
        "home_remedies": (
            "Warm milk with a teaspoon of ghee before bed calms the nervous system. "
            "Soaked almonds (4-5 overnight) eaten in the morning support nerve health. "
            "Regular walking 30 min/day reduces anxiety-related tremors."
        ),
        "red_flags": "Tremor only on one side of the body, numbness or weakness in limbs, slurred speech, confusion",
        "timeline": "Stress/pain-related tremors stop within hours once pain is managed. If it persists beyond 1 week, get blood tests done."
    },

    "headache": {
        "keywords": ["headache", "head pain", "migraine", "head hurting", "head ache",
                      "temple pain", "forehead pain"],
        "urgency": "medium",
        "label": "Headache",
        "causes": (
            "Tension headache (tight muscles in neck/scalp from stress or screen time), "
            "migraine (neurological, often one-sided with nausea), dehydration, "
            "sinus congestion, eye strain, or high blood pressure"
        ),
        "mechanism": (
            "Tension headaches: stress tightens muscles around your skull, compressing pain nerves. "
            "Migraines: abnormal brain wave activity dilates blood vessels and inflames nearby nerves, "
            "causing intense pulsing pain, light/sound sensitivity, and sometimes aura (visual disturbance)."
        ),
        "advice": (
            "1. Drink 2 glasses of water immediately – dehydration is the #1 overlooked cause.\n"
            "2. Take Paracetamol 500 mg (or Ibuprofen 400 mg with food).\n"
            "3. Rest in a dark, quiet room with a cold damp cloth on your forehead.\n"
            "4. Gently massage the temples and back of the neck in slow circles.\n"
            "5. If headaches occur >3 times a week or are the worst you've ever had, see a doctor urgently."
        ),
        "home_remedies": (
            "Peppermint oil dabbed on temples provides cooling relief. "
            "Strong ginger tea with jaggery can ease migraine nausea. "
            "A pinch of cinnamon paste on the forehead helps with sinus headache."
        ),
        "red_flags": "Sudden 'thunderclap' worst-ever headache, stiff neck with fever, confusion, vision loss, weakness on one side",
        "timeline": "Tension headache: resolves in 30 min – 4 hours with rest and medication. Migraines: 4-72 hours."
    },

    "fever": {
        "keywords": ["fever", "temperature", "high temp", "bukhar", "burning up",
                      "chills", "sweating", "102", "103", "104"],
        "urgency": "medium",
        "label": "Fever",
        "causes": (
            "Viral infection (common cold, flu, COVID-19, dengue), bacterial infection "
            "(throat, urinary, typhoid), malaria (if in endemic area), "
            "or body's inflammatory response to an injury/infection"
        ),
        "mechanism": (
            "Your immune system detects invading germs and releases chemicals called pyrogens. "
            "These reset your brain's thermostat (hypothalamus) to a higher temperature. "
            "The higher heat slows germ reproduction and boosts white blood cell activity – "
            "that's why you feel hot but shiver (body generating heat to reach the new setpoint)."
        ),
        "advice": (
            "1. Take Paracetamol 500 mg every 6 hours (do NOT exceed 4 doses/day).\n"
            "2. Sponge forehead, armpits, and neck with lukewarm (not cold) water.\n"
            "3. Drink ORS, coconut water, or lime water – aim for 8-10 glasses/day.\n"
            "4. Wear light cotton clothes, use a thin sheet instead of heavy blankets.\n"
            "5. Record temperature every 4 hours. If it crosses 103 °F or lasts >3 days, see a doctor for blood tests."
        ),
        "home_remedies": (
            "Tulsi (holy basil) tea with black pepper and honey is a traditional fever reducer. "
            "Rice starch water (kanji) keeps energy up when appetite is low. "
            "A paste of sandalwood on the forehead provides a cooling effect."
        ),
        "red_flags": "Fever above 103 °F, rash appearing with fever, severe bodyache with low platelets suspicion (dengue), confusion, difficulty breathing",
        "timeline": "Viral fevers: 3-5 days. If no improvement by day 3, get a blood test (CBC, Widal, Dengue NS1)."
    },

    "chest_pain": {
        "keywords": ["chest pain", "chest pressure", "chest tight", "heart pain",
                      "heart attack", "crushing pain"],
        "urgency": "high",
        "label": "Chest Pain – EMERGENCY",
        "causes": (
            "Heart attack (blocked coronary artery), angina (reduced blood flow), "
            "pulmonary embolism (blood clot in lung), severe acidity/GERD, "
            "or muscle strain in chest wall"
        ),
        "mechanism": (
            "In a heart attack, a fatty plaque in a heart artery ruptures and a blood clot blocks "
            "blood flow. The heart muscle downstream starts dying within minutes – "
            "this causes crushing chest pain that may radiate to the left arm, jaw, or back."
        ),
        "advice": (
            "1. CALL 108 (AMBULANCE) IMMEDIATELY.\n"
            "2. Sit upright or in whatever position feels easiest to breathe.\n"
            "3. Chew 1 Aspirin 325 mg (if not allergic) – it helps dissolve the clot.\n"
            "4. Do NOT walk, drive, or exert yourself. Stay calm.\n"
            "5. If the person becomes unconscious and stops breathing, start chest CPR (push hard and fast in the centre of the chest)."
        ),
        "home_remedies": (
            "There are NO home remedies for heart-related chest pain – get to a hospital. "
            "If the pain is clearly acid-related (burning after meals, relieved by antacid), "
            "try a glass of cold milk or an antacid tablet."
        ),
        "red_flags": "ALL chest pain must be evaluated urgently. Sweating with chest pain, pain in left arm/jaw, breathlessness, fainting",
        "timeline": "Heart attack: treatment within 90 minutes saves life. Do NOT wait."
    },

    "stomach": {
        "keywords": ["stomach pain", "stomach ache", "abdomen", "belly pain",
                      "nausea", "vomiting", "diarrhea", "loose motion",
                      "food poisoning", "acidity", "gas", "bloating"],
        "urgency": "medium",
        "label": "Stomach / Digestive Issue",
        "causes": (
            "Gastroenteritis (stomach infection from contaminated food/water), "
            "acidity/GERD (excess stomach acid), food poisoning, "
            "irritable bowel syndrome (IBS), or intestinal worms"
        ),
        "mechanism": (
            "Contaminated food or water introduces bacteria/viruses that irritate the gut lining. "
            "Your body responds with vomiting and diarrhea to expel the toxins. "
            "Acidity occurs when the stomach produces excess hydrochloric acid that burns the lining."
        ),
        "advice": (
            "1. Prepare ORS: 1 litre boiled-cooled water + 6 teaspoons sugar + ½ teaspoon salt. Sip every 5 min.\n"
            "2. Do NOT eat solid food for 4-6 hours if vomiting. Then start with plain rice, moong dal water, or curd-rice.\n"
            "3. For acidity: chew 1 antacid tablet (Gelusil/Digene) or take Pantoprazole 40 mg before breakfast.\n"
            "4. Avoid spicy, oily, and dairy foods for 48 hours.\n"
            "5. If you see blood in vomit or stool, have severe cramp pain, or can't keep water down for 12 hours – go to hospital."
        ),
        "home_remedies": (
            "Jeera (cumin) water: boil 1 tsp cumin in water for 5 min – soothes stomach. "
            "Ajwain (carom seeds) with black salt relieves gas and bloating. "
            "Plain curd with rice is the easiest food to digest during recovery."
        ),
        "red_flags": "Blood in vomit or stool, severe dehydration (dry mouth, no urine >8 hrs), high fever with stomach pain, rigid/hard abdomen",
        "timeline": "Food poisoning: 12-48 hours. Gastroenteritis: 2-3 days. Acidity: improves in 1-2 days with medication."
    },

    "respiratory": {
        "keywords": ["cough", "cold", "flu", "runny nose", "congestion", "sore throat",
                      "sneezing", "blocked nose", "phlegm", "mucus"],
        "urgency": "low",
        "label": "Cold / Upper Respiratory Infection",
        "causes": (
            "Common cold (rhinovirus – 200+ strains), seasonal flu (influenza), "
            "COVID-19, allergic rhinitis (dust/pollen), or sinus infection"
        ),
        "mechanism": (
            "Viruses attach to the cells lining your nose and throat, triggering inflammation. "
            "Your body produces mucus to trap the virus and sends more blood to the area "
            "(causing the stuffy feeling). Sneezing and coughing are reflexes to expel the invaders."
        ),
        "advice": (
            "1. Steam inhalation 3 times a day: boil water, add 2 drops eucalyptus oil, inhale with towel over head for 10 min.\n"
            "2. Gargle with warm salt water morning and night for sore throat.\n"
            "3. Drink warm haldi-doodh (turmeric milk) or ginger-honey tea before bed.\n"
            "4. Take Cetirizine 10 mg at night if there's a lot of sneezing/runny nose.\n"
            "5. Rest well, wash hands often, and wear a mask around others."
        ),
        "home_remedies": (
            "Kadha: boil tulsi leaves, ginger, black pepper, and cloves in water – sip warm. "
            "Honey (1 tsp) before bed reduces nighttime cough. "
            "Nasal saline drops (salt water) clear congestion without medicine."
        ),
        "red_flags": "Difficulty breathing or chest tightness, high fever >3 days, blood in sputum, severe headache with stiff neck",
        "timeline": "Common cold: 5-7 days. Flu: 7-10 days. Cough may linger 2-3 weeks. See a doctor if not improving by day 5."
    },

    "skin": {
        "keywords": ["rash", "itching", "skin", "allergy", "hives", "swelling",
                      "red spots", "bumps", "pimple", "boil", "eczema", "fungal"],
        "urgency": "low",
        "label": "Skin / Allergy Issue",
        "causes": (
            "Allergic reaction (food, detergent, pollen), fungal infection (ringworm, athlete's foot), "
            "eczema (dry inflamed skin), insect bites, or heat rash (prickly heat)"
        ),
        "mechanism": (
            "When skin contacts an allergen, immune cells release histamine. "
            "Histamine widens blood vessels (redness), leaks fluid into tissue (swelling), "
            "and stimulates itch nerves. Fungal infections thrive in warm moist skin folds."
        ),
        "advice": (
            "1. Take Cetirizine 10 mg at night to reduce itching and swelling.\n"
            "2. Apply calamine lotion on itchy areas for soothing relief.\n"
            "3. For fungal patches: apply Clotrimazole cream twice daily for 2 weeks, keep area dry.\n"
            "4. Wear loose cotton clothes, avoid scratching (trim nails short).\n"
            "5. If rash spreads rapidly, face/throat swells, or breathing becomes difficult – this is anaphylaxis, rush to hospital."
        ),
        "home_remedies": (
            "Neem paste applied to ringworm patches has antifungal properties. "
            "Coconut oil soothes dry eczema skin. "
            "A cold oatmeal bath relieves widespread itching."
        ),
        "red_flags": "Rapid swelling of face/lips/tongue, difficulty breathing (anaphylaxis), fever with widespread rash, blisters/peeling skin",
        "timeline": "Allergic rash: clears in 2-5 days with antihistamines. Fungal infection: needs 2-4 weeks of consistent cream application."
    },

    "injury": {
        "keywords": ["cut", "wound", "bleeding", "fracture", "broken", "sprain",
                      "fall", "accident", "hit", "injury", "bruise", "burn"],
        "urgency": "medium",
        "label": "Injury / Wound",
        "causes": (
            "Physical trauma from a fall, accident, or impact. "
            "Could result in soft tissue injury (bruise/sprain), laceration (cut), "
            "fracture (broken bone), or burn (thermal/chemical)"
        ),
        "mechanism": (
            "When tissue is damaged, blood vessels break causing bleeding and bruising. "
            "Your body sends inflammatory cells and fluid to the area (swelling) to begin repair. "
            "A fracture means the bone has cracked or broken – you'll feel intense pain with movement."
        ),
        "advice": (
            "1. For bleeding: press a clean cloth firmly on the wound for 10 minutes without lifting.\n"
            "2. For sprains: RICE method – Rest, Ice (15 min on/off), Compress with bandage, Elevate the limb.\n"
            "3. For burns: run cool (not ice-cold) water over the burn for 10 minutes, cover loosely.\n"
            "4. Take Paracetamol 500 mg for pain. Do NOT apply ointments/toothpaste on burns.\n"
            "5. If bone looks deformed, you can't move the limb, or bleeding doesn't stop – go to hospital immediately."
        ),
        "home_remedies": (
            "Turmeric-coconut oil paste on minor cuts is antiseptic. "
            "Aloe vera gel on minor burns cools and helps healing. "
            "Cold compress (ice in cloth) for the first 48 hours of a sprain."
        ),
        "red_flags": "Bone visibly deformed or poking through skin, bleeding won't stop after 15 min of pressure, head injury with confusion/vomiting, deep wound needing stitches",
        "timeline": "Bruises: 1-2 weeks. Sprains: 2-6 weeks. Fractures: 4-8 weeks in cast. Cuts: 5-10 days to heal."
    },

    "eye": {
        "keywords": ["eye", "vision", "blurry", "red eye", "eye pain", "watery eyes",
                      "eye swelling", "conjunctivitis", "itchy eye"],
        "urgency": "medium",
        "label": "Eye Problem",
        "causes": (
            "Conjunctivitis (viral/bacterial eye infection), allergic eye irritation, "
            "eye strain from screens, foreign body in eye, or stye (eyelid infection)"
        ),
        "mechanism": (
            "The conjunctiva (thin membrane covering the eye) becomes inflamed when infected or irritated. "
            "Blood vessels dilate (redness), the eye produces excess tears or discharge to flush out the irritant."
        ),
        "advice": (
            "1. Wash hands before touching eyes. Use clean cotton soaked in cooled boiled water to gently clean discharge.\n"
            "2. For infection: use antibiotic eye drops (Ciprofloxacin drops) 4 times a day for 5 days.\n"
            "3. For allergy: cold compress on closed eyes + antiallergy drops (Olopatadine).\n"
            "4. Do NOT rub eyes, share towels, or wear contact lenses until healed.\n"
            "5. If vision becomes blurry, eye is very painful, or light causes severe pain – see an eye doctor ASAP."
        ),
        "home_remedies": (
            "Rose water drops soothe mild eye irritation. "
            "Cold cucumber slices on closed eyes reduce puffiness and redness. "
            "Washing eyes with clean, cooled boiled water 3 times a day helps with discharge."
        ),
        "red_flags": "Sudden vision loss, severe eye pain, something stuck in eye you can't remove, eye injury with blood inside eye",
        "timeline": "Viral conjunctivitis: 5-7 days. Bacterial: improves in 2-3 days with drops. Eye strain: resolves with rest."
    },

    "urinary": {
        "keywords": ["urine", "burning urine", "frequent urination", "uti", "urinary",
                      "pee", "kidney", "back pain lower"],
        "urgency": "medium",
        "label": "Urinary Issue",
        "causes": (
            "Urinary tract infection (UTI – bacteria from outside enter the urethra), "
            "kidney stones (mineral deposits blocking urine flow), "
            "dehydration causing concentrated dark urine"
        ),
        "mechanism": (
            "Bacteria (usually E. coli from the gut) travel up the urethra and infect the bladder lining. "
            "This causes inflammation, making the bladder feel full even when it's not – "
            "hence the burning sensation and urge to urinate frequently."
        ),
        "advice": (
            "1. Drink 3-4 litres of water today to flush bacteria out.\n"
            "2. Do NOT hold urine – empty your bladder fully every time.\n"
            "3. Common UTI treatment: Nitrofurantoin 100 mg twice daily for 5 days (needs doctor prescription).\n"
            "4. Cranberry juice (unsweetened) may help prevent bacteria from sticking to bladder walls.\n"
            "5. If you have back pain, fever, blood in urine, or vomiting – this may be a kidney infection, see a doctor today."
        ),
        "home_remedies": (
            "Barley water (jau ka pani): boil barley in water, strain, sip throughout the day – soothes the urinary tract. "
            "Coriander seed water has cooling properties. "
            "Coconut water is a natural diuretic that helps flush the system."
        ),
        "red_flags": "Fever with back/flank pain (kidney infection), blood in urine, severe pain that comes in waves (kidney stone), unable to urinate at all",
        "timeline": "UTI with antibiotic: symptoms improve in 24-48 hours. Kidney stones: may pass in 1-3 days (drink lots of water). See doctor if pain is severe."
    },

    "anxiety": {
        "keywords": ["anxiety", "panic", "anxious", "panic attack", "nervous",
                      "worried", "stress", "can't sleep", "insomnia", "palpitation"],
        "urgency": "low",
        "label": "Anxiety / Stress",
        "causes": (
            "Generalized anxiety disorder, panic disorder, acute stress reaction, "
            "sleep deprivation, excessive caffeine, or an underlying physical condition "
            "(thyroid, anaemia) mimicking anxiety"
        ),
        "mechanism": (
            "Your brain's amygdala (threat detector) fires a false alarm, flooding your body with "
            "adrenaline and cortisol. Heart races, muscles tense, breathing speeds up, stomach churns – "
            "this is the fight-or-flight response activating when there's no real danger."
        ),
        "advice": (
            "1. Box breathing: breathe IN 4 sec → HOLD 4 sec → OUT 4 sec → HOLD 4 sec. Repeat 5 times.\n"
            "2. Grounding exercise: name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste.\n"
            "3. Walk outside for 15-20 minutes – movement burns off stress hormones.\n"
            "4. Limit tea/coffee to 2 cups before noon. No screens 1 hour before bed.\n"
            "5. If panic attacks happen frequently or you have thoughts of self-harm, speak to a counsellor (iCall helpline: 9152987821)."
        ),
        "home_remedies": (
            "Warm chamomile or ashwagandha tea before bed promotes calm. "
            "Lavender oil on pillow helps with sleep. "
            "15 minutes of slow pranayama (deep yogic breathing) daily reduces baseline anxiety."
        ),
        "red_flags": "Thoughts of self-harm or suicide (call KIRAN helpline: 1800-599-0019), chest pain (rule out heart problem), fainting spells",
        "timeline": "Panic attacks peak in 10 minutes and pass in 20-30 minutes. Chronic anxiety: improves over 4-6 weeks with regular breathing exercises, lifestyle changes, or therapy."
    },

    "back_pain": {
        "keywords": ["back pain", "lower back", "spine", "backache", "slipped disc",
                      "sciatica", "back hurting"],
        "urgency": "low",
        "label": "Back Pain",
        "causes": (
            "Muscle strain (heavy lifting, poor posture), lumbar spondylosis (wear and tear of spine), "
            "slipped disc (disc pressing on nerve), or kidney problem (if pain is on one side with fever)"
        ),
        "mechanism": (
            "Most back pain is muscular: overuse or sudden twisting tears small muscle fibres, "
            "causing inflammation and spasm. A slipped disc means the soft cushion between vertebrae "
            "bulges out and presses on nearby nerves, causing pain that may shoot down the leg (sciatica)."
        ),
        "advice": (
            "1. Stay gently active – complete bed rest makes it worse. Walk slowly for 10 min every 2 hours.\n"
            "2. Apply a hot water bag to the sore area for 15-20 minutes, 3 times a day.\n"
            "3. Take Ibuprofen 400 mg with food every 8 hours for pain and inflammation.\n"
            "4. Sleep on your side with a pillow between the knees to reduce spine strain.\n"
            "5. If pain shoots down the leg, you feel numbness/tingling, or have trouble controlling urine – see a doctor urgently."
        ),
        "home_remedies": (
            "Warm mustard oil massage along the spine improves blood flow. "
            "A pinch of turmeric in warm milk before bed reduces inflammation. "
            "Cat-cow stretch (on hands and knees, arch and round the back slowly) done 10 times twice daily eases stiffness."
        ),
        "red_flags": "Pain shooting down the leg with numbness (sciatica), loss of bladder/bowel control, fever with back pain (spinal infection), pain after serious fall/accident",
        "timeline": "Muscle strain: improves in 3-7 days. Disc-related: 4-6 weeks. If no improvement in 2 weeks, get an X-ray/MRI."
    },
}


def _score_conditions(symptoms_lower: str) -> list:
    """Return conditions sorted by keyword-match score (highest first).
    
    Uses two strategies:
    1. Exact phrase match (high weight) — e.g. "wisdom teeth" found in input
    2. Individual word match (lower weight) — e.g. "head" + "paining" matches headache
       even when the user writes "my head is paining"
    
    Generic words like "pain" are ignored in word-level matching to avoid
    false cross-matches (e.g. "head paining" triggering dental via "jaw pain").
    """
    # extract individual words from user input
    input_words = set(re.findall(r"[a-z]+", symptoms_lower))

    # synonyms / stemming map: common variations → root keyword
    WORD_ALIASES = {
        "paining": "pain", "painful": "pain", "pains": "pain", "hurts": "pain",
        "hurting": "pain", "aching": "pain", "ache": "pain", "aches": "pain",
        "sore": "pain", "burning": "burn", "itchy": "itching", "itches": "itching",
        "dizzy": "dizziness", "vomit": "vomiting", "puking": "vomiting",
        "breathless": "breathing", "coughing": "cough", "sneezy": "sneezing",
        "shaky": "shaking", "shakes": "shaking", "trembling": "tremor",
        "feverish": "fever", "temperature": "fever",
        "tummy": "stomach", "belly": "stomach", "abdomen": "stomach",
        "peeing": "urine", "urinating": "urine",
        "sleepless": "insomnia", "sleeplessness": "insomnia",
        "anxious": "anxiety", "panicking": "panic", "stressed": "stress",
        "blurred": "blurry", "swollen": "swelling",
    }

    # Generic symptom-descriptor words that appear across many conditions.
    # These should ONLY contribute to exact phrase matches, never word-level
    # matching, to prevent "jaw pain" matching just because user said "pain".
    GENERIC_WORDS = {
        "pain", "ache", "severe", "mild", "moderate", "chronic", "acute",
        "high", "low", "attack", "problem", "issue", "infection",
    }

    # expand input words with aliases
    expanded_words = set(input_words)
    for word in input_words:
        if word in WORD_ALIASES:
            expanded_words.add(WORD_ALIASES[word])

    scored = []
    for name, c in CONDITIONS.items():
        score = 0

        # --- Strategy 1: exact phrase match (higher weight) ---
        for kw in c["keywords"]:
            if kw in symptoms_lower:
                score += len(kw.split()) * 3   # "wisdom teeth" = 6 pts

        # --- Strategy 2: individual word match ---
        # split each keyword into its component words and check overlap,
        # but EXCLUDE generic words so "pain" alone can't cross-match
        kw_word_set = set()
        for kw in c["keywords"]:
            for w in kw.split():
                if w not in GENERIC_WORDS:
                    kw_word_set.add(w)
        # also add the condition label words (lowercase), minus generic ones
        for w in c["label"].lower().split():
            if w not in GENERIC_WORDS:
                kw_word_set.add(w)

        overlap = expanded_words & kw_word_set
        if overlap:
            score += len(overlap)   # each matched word = 1 pt

        if score > 0:
            scored.append((score, name, c))

    scored.sort(reverse=True, key=lambda x: x[0])
    return scored


def _analyze_with_rules(symptoms: str) -> dict:
    """Match symptoms against the condition DB, combine top matches, and
    compose a unified response so multi-symptom inputs get multi-condition answers."""

    symptoms_lower = symptoms.lower()
    matches = _score_conditions(symptoms_lower)

    if not matches:
        return {
            "urgency": "medium",
            "urgencyText": "Unrecognised Symptoms – See a Doctor",
            "possibleCauses": (
                "Your symptoms don't match common patterns in our database. "
                "This does NOT mean they aren't important – it means a doctor needs to evaluate you in person."
            ),
            "whyHappening": (
                "The human body is complex and some symptom combinations need clinical examination, "
                "blood tests, or imaging to diagnose properly."
            ),
            "advice": (
                "1. Visit your nearest Primary Health Centre (PHC) within 24 hours.\n"
                "2. Write down all your symptoms, when they started, and what makes them better or worse.\n"
                "3. In the meantime: rest, stay hydrated, and avoid self-medication.\n"
                "4. If you feel seriously unwell at any point, call 108 for an ambulance."
            ),
            "homeRemedies": "Stay hydrated with warm water, lemon, and a pinch of salt. Light home-cooked food. Adequate rest.",
            "redFlags": "Severe or worsening pain, high fever, difficulty breathing, confusion, bleeding",
            "timeline": "See a doctor within 24-48 hours for proper diagnosis.",
        }

    # take top 2 conditions max (to handle combined symptoms like "tooth pain + shaking")
    top = matches[:2]

    # highest urgency wins
    urgency_rank = {"high": 3, "medium": 2, "low": 1}
    best_urgency = max(top, key=lambda x: urgency_rank.get(x[2]["urgency"], 0))
    urgency = best_urgency[2]["urgency"]

    labels    = " + ".join(m[2]["label"] for m in top)
    causes    = "\n\n".join(f"▸ {m[2]['label']}: {m[2]['causes']}" for m in top)
    mechanism = "\n\n".join(f"▸ {m[2]['label']}: {m[2]['mechanism']}" for m in top)
    advice    = "\n\n".join(f"── {m[2]['label']} ──\n{m[2]['advice']}" for m in top)
    remedies  = "\n\n".join(f"▸ {m[2]['label']}: {m[2]['home_remedies']}" for m in top)
    flags     = " | ".join(m[2]["red_flags"] for m in top)
    timeline  = "\n".join(f"▸ {m[2]['label']}: {m[2]['timeline']}" for m in top)

    return {
        "urgency": urgency,
        "urgencyText": f"{labels} – {'Seek Immediate Care' if urgency == 'high' else 'Consult a Doctor' if urgency == 'medium' else 'Self-Care & Monitor'}",
        "possibleCauses": causes,
        "whyHappening": mechanism,
        "advice": advice,
        "homeRemedies": remedies,
        "redFlags": flags,
        "timeline": timeline,
    }


# ── Run ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
