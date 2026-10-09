/**
 * CivicTrust Centralized Internationalization (i18n) Module
 * Supports English (default), Hindi, and Telugu for public and field interface accessibility.
 */

export type SupportedLanguage =
  | "en"
  | "hi"
  | "te"
  | "ta"
  | "kn"
  | "ml"
  | "mr"
  | "bn"
  | "gu"
  | "or"
  | "pa"
  | "as"
  | "ur";

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "हिंदी (Hindi)",
  te: "తెలుగు (Telugu)",
  ta: "தமிழ் (Tamil)",
  kn: "ಕನ್ನಡ (Kannada)",
  ml: "മലയാളം (Malayalam)",
  mr: "मराठी (Marathi)",
  bn: "বাংলা (Bengali)",
  gu: "ગુજરાતી (Gujarati)",
  or: "ଓଡ଼ିଆ (Odia)",
  pa: "ਪੰਜਾਬੀ (Punjabi)",
  as: "అసమీస్ (Assamese)",
  ur: "اردو (Urdu)"
};

const TRANSLATIONS: Partial<Record<SupportedLanguage, Record<string, string>>> = {
  en: {
    "app.name": "CivicTrust",
    "app.subtitle": "Public Grievance & Evidence Verification Platform",
    "app.municipality": "Greater Hyderabad Municipal Corporation (GHMC)",
    "nav.home": "Home",
    "nav.report": "Report Issue",
    "nav.track": "Track Complaints",
    "nav.staffLogin": "Staff Login",
    "nav.logout": "Sign Out",
    "nav.language": "Language",

    "citizen.title": "Citizen Grievance Desk",
    "citizen.subtitle": "Report civic issues directly with geotagged evidence.",
    "citizen.tab.report": "Report an Issue",
    "citizen.tab.myGrievances": "My Complaints",
    "citizen.step1": "1. Photo Evidence",
    "citizen.step1.sub": "Capture or select a photo of the incident site.",
    "citizen.camera.launch": "Take Photo with Camera",
    "citizen.camera.gallery": "Choose from Gallery / Files",
    "citizen.checking": "Checking evidence quality...",
    "citizen.step2": "2. Incident Location",
    "citizen.step2.sub": "Verify GPS location or enter landmark.",
    "citizen.gps.fetch": "Use Device GPS",
    "citizen.gps.locked": "GPS Locked ✓",
    "citizen.address.placeholder": "e.g. Near Pillar 104, Jubilee Hills Road 36",
    "citizen.step3": "3. Issue Category",
    "citizen.step4": "4. Severity Level",
    "citizen.step5": "5. Description",
    "citizen.headline.placeholder": "e.g. Deep pothole causing traffic risk",
    "citizen.details.placeholder": "Provide additional context for the field team...",
    "citizen.submit": "Submit Grievance",
    "citizen.submitting": "Submitting Grievance...",
    "citizen.success.title": "Grievance Registered Successfully",
    "citizen.success.tracking": "Your Tracking ID:",
    "citizen.copy": "Copy ID",
    "citizen.copied": "Copied ✓",

    "status.submitted": "Submitted",
    "status.assigned": "Assigned to Officer",
    "status.in_progress": "Work In Progress",
    "status.resolved": "Resolved (Pending Confirmation)",
    "status.closed": "Closed & Verified",
    "status.tpa_review": "Under Supervisor Audit",

    "officer.title": "Field Officer Workspace",
    "officer.subtitle": "Assigned civic grievances and onsite resolution proof.",
    "officer.tasks": "Assigned Field Tasks",
    "officer.onsite": "Perform Onsite Resolution",
    "officer.resolutionPhoto": "Capture Resolution Proof Photo",
    "officer.gpsVerify": "Verify Officer Onsite GPS",
    "officer.notePlaceholder": "Enter remediation actions taken...",
    "officer.submitResolution": "Submit Resolution Proof",

    "admin.title": "Municipal Command Console",
    "admin.subtitle": "System oversight, audit logs, and jurisdiction management.",
    "depthead.title": "Department Operations Desk",
    "depthead.subtitle": "Monitor resolution performance, SLAs, and escalations."
  },
  hi: {
    "app.name": "सिविकट्रस्ट",
    "app.subtitle": "नागरिक शिकायत और साक्ष्य सत्यापन मंच",
    "app.municipality": "ग्रेटर हैदराबाद नगर निगम (जीएचएमसी)",
    "nav.home": "मुख्य पृष्ठ",
    "nav.report": "शिकायत दर्ज करें",
    "nav.track": "शिकायत की स्थिति",
    "nav.staffLogin": "कर्मचारी लॉगिन",
    "nav.logout": "लॉग आउट",
    "nav.language": "भाषा",

    "citizen.title": "नागरिक शिकायत सेवा",
    "citizen.subtitle": "जीपीएस साक्ष्य के साथ नागरिक समस्याओं की रिपोर्ट करें।",
    "citizen.tab.report": "समस्या दर्ज करें",
    "citizen.tab.myGrievances": "मेरी शिकायतें",
    "citizen.step1": "1. फोटो साक्ष्य",
    "citizen.step1.sub": "घटना स्थल की स्पष्ट फोटो लें या अपलोड करें।",
    "citizen.camera.launch": "कैमरे से फोटो लें",
    "citizen.camera.gallery": "गैलरी / फ़ाइल से चुनें",
    "citizen.checking": "साक्ष्य की जांच की जा रही है...",
    "citizen.step2": "2. दुर्घटना स्थल स्थान",
    "citizen.step2.sub": "जीपीएस स्थान सत्यापित करें या पता दर्ज करें।",
    "citizen.gps.fetch": "जीपीएस का उपयोग करें",
    "citizen.gps.locked": "जीपीएस प्राप्त हुआ ✓",
    "citizen.address.placeholder": "जैसे - पिलर 104 के पास, जुबली हिल्स",
    "citizen.step3": "3. समस्या की श्रेणी",
    "citizen.step4": "4. गंभीरता का स्तर",
    "citizen.step5": "5. विवरण",
    "citizen.headline.placeholder": "जैसे - सड़क पर गहरा गड्ढा",
    "citizen.details.placeholder": "क्षेत्रीय अधिकारी के लिए अतिरिक्त विवरण...",
    "citizen.submit": "शिकायत दर्ज करें",
    "citizen.submitting": "शिकायत दर्ज हो रही है...",
    "citizen.success.title": "शिकायत सफलतापूर्वक दर्ज की गई",
    "citizen.success.tracking": "आपकी ट्रैकिंग आईडी:",
    "citizen.copy": "कॉपी करें",
    "citizen.copied": "कॉपी हुआ ✓",

    "status.submitted": "दर्ज की गई",
    "status.assigned": "अधिकारी को सौंपी गई",
    "status.in_progress": "कार्य प्रगति पर है",
    "status.resolved": "हल (पुष्टि लंबित)",
    "status.closed": "बंद एवं सत्यापित",
    "status.tpa_review": "पर्यवेक्षक समीक्षा के अधीन",

    "officer.title": "क्षेत्रीय अधिकारी कार्यस्थल",
    "officer.subtitle": "आवंटित शिकायतें एवं स्थल समाधान प्रमाण।",
    "officer.tasks": "आवंटित कार्य",
    "officer.onsite": "स्थल पर समाधान कार्य",
    "officer.resolutionPhoto": "समाधान फोटो साक्ष्य लें",
    "officer.gpsVerify": "अधिकारी जीपीएस स्थान सत्यापित करें",
    "officer.notePlaceholder": "किए गए सुधार कार्य का विवरण दर्ज करें...",
    "officer.submitResolution": "समाधान साक्ष्य जमा करें",

    "admin.title": "नगर निगम कमांड कंसोल",
    "admin.subtitle": "प्रणाली निगरानी, ​​ऑडिट लॉग और क्षेत्राधिकार प्रबंधन।",
    "depthead.title": "विभाग संचालन डेस्क",
    "depthead.subtitle": "समाधान प्रदर्शन, एसएलए और एस्केलेशन की निगरानी करें।"
  },
  te: {
    "app.name": "సివిక్‌ట్రస్ట్",
    "app.subtitle": "ప్రజా ఫిర్యాదులు మరియు ఆధారాల ధృవీకరణ వేదిక",
    "app.municipality": "గ్రేటర్ హైదరాబాద్ మున్సిపల్ కార్పొరేషన్ (GHMC)",
    "nav.home": "హోమ్",
    "nav.report": "ఫిర్యాదు నమోదు",
    "nav.track": "ఫిర్యాదుల స్థితి",
    "nav.staffLogin": "స్టాఫ్ లాగిన్",
    "nav.logout": "లాగ్ అవుట్",
    "nav.language": "భాష",

    "citizen.title": "పౌర ఫిర్యాదుల కేంద్రం",
    "citizen.subtitle": "జిపిఎస్ ఆధారాలతో పౌర సమస్యలను నమోదు చేయండి.",
    "citizen.tab.report": "ఫిర్యాదు చేయండి",
    "citizen.tab.myGrievances": "నా ఫిర్యాదులు",
    "citizen.step1": "1. ఫోటో ఆధారం",
    "citizen.step1.sub": "సంఘటన స్థలం యొక్క స్పష్టమైన ఫోటో తీయండి.",
    "citizen.camera.launch": "కెమెరాతో ఫోటో తీయండి",
    "citizen.camera.gallery": "గ్యాలరీ నుండి ఎంచుకోండి",
    "citizen.checking": "ఆధారాన్ని పరిశీలిస్తోంది...",
    "citizen.step2": "2. సమస్య స్థలం",
    "citizen.step2.sub": "జిపిఎస్ స్థానాన్ని సరిచూడండి లేదా చిరునామా ఎంటర్ చేయండి.",
    "citizen.gps.fetch": "జిపిఎస్ తీసుకోండి",
    "citizen.gps.locked": "జిపిఎస్ నిర్ధారణ అయింది ✓",
    "citizen.address.placeholder": "ఉదా: పిల్లర్ 104 దగ్గర, జూబ్లీ హిల్స్",
    "citizen.step3": "3. ఫిర్యాదు విభాగం",
    "citizen.step4": "4. సమస్య తీవ్రత",
    "citizen.step5": "5. వివరణ",
    "citizen.headline.placeholder": "ఉదా: రోడ్డుపై పెద్ద గుంత",
    "citizen.details.placeholder": "ఫీల్డ్ అధికారికి ఉపయోగపడే వివరాలు...",
    "citizen.submit": "ఫిర్యాదు నమోదు చేయండి",
    "citizen.submitting": "సమర్పిస్తోంది...",
    "citizen.success.title": "ఫిర్యాదు విజయవంతంగా నమోదైంది",
    "citizen.success.tracking": "మీ ట్రాకింగ్ ఐడి:",
    "citizen.copy": "కాపీ చేయి",
    "citizen.copied": "కాపీ అయింది ✓",

    "status.submitted": "నమోదైంది",
    "status.assigned": "అధికారికి కేటాయించబడింది",
    "status.in_progress": "పని పురోగతిలో ఉంది",
    "status.resolved": "పరిష్కరించబడింది",
    "status.closed": "పూర్తయింది & ధృవీకరించబడింది",
    "status.tpa_review": "పరిశీలనలో ఉంది",

    "officer.title": "ఫీల్డ్ ఆఫీసర్ వర్క్‌స్పేస్",
    "officer.subtitle": "కేటాయించిన ఫిర్యాదులు మరియు పరిష్కార ఆధారాలు.",
    "officer.tasks": "కేటాయించిన పనులు",
    "officer.onsite": "స్థల పరిశీలన మరియు పరిష్కారం",
    "officer.resolutionPhoto": "పరిష్కార ఫోటో ఆధారాన్ని తీయండి",
    "officer.gpsVerify": "ఆఫీసర్ జిపిఎస్ నిర్ధారించండి",
    "officer.notePlaceholder": "చేసిన పని వివరాలు నమోదు చేయండి...",
    "officer.submitResolution": "పరిష్కారాన్ని సమర్పించండి",

    "admin.title": "మున్సిపల్ కమాండ్ కన్సోల్",
    "admin.subtitle": "వ్యవస్థ పర్యవేక్షణ, ఆడిట్ లాగ్‌లు మరియు నిర్వహణ.",
    "depthead.title": "డిపార్ట్‌మెంట్ ఆపరేషన్స్ డెస్క్",
    "depthead.subtitle": "పరిష్కార పనితీరు మరియు ఎస్కలేషన్ల పర్యవేక్షణ."
  }
};

export async function loadTranslations(lang: string) {
  return true;
}

export function translate(lang: string, key: string, vars?: Record<string, string | number>): string {
  const targetLang = (lang as SupportedLanguage) || "en";
  let text = TRANSLATIONS[targetLang]?.[key] || TRANSLATIONS["en"]?.[key] || key;
  
  // Safe fallback to key name humanization if key itself is not translated
  if (!text || text === key) {
    text = TRANSLATIONS["en"]?.[key] || key.split(".").pop() || key;
  }

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
    }
  }
  return text;
}

export function t(key: string, lang: SupportedLanguage = "en"): string {
  return translate(lang, key);
}

