import React, { createContext, useContext, useState } from 'react';

// Simplified translation context
const translations = {
  en: {
    heroTitle: "Every Complaint. Every Officer. Accountable.",
    heroSubline: "India's AI-verified civic grievance platform",
    reportIssueBtn: "Report an Issue",
    publicStatsBtn: "View Public Stats",
    selectCategory: "Select Category",
    submitTicket: "Submit Grievance",
    anonymousSubmit: "Submit Anonymously",
    trackStatus: "Track Status",
    officerPortal: "Officer Portal",
    adminPortal: "Admin Dashboard",
    liveCounter: "Grievances Resolved Today",
    serving: "Serving India",
    loginLabel: "Login via Secure Access",
    assignedTickets: "Assigned Issues",
    uploadProof: "Upload Resolution Proof",
    beforeAfterCompare: "Truth Layer Comparison",
    tpaQueue: "Neutral TPA Verification",
    // Adding more keys for completeness...
    roads: "Roads",
    water: "Water Supply",
    sanitation: "Sanitation",
    electricity: "Electricity",
    other: "Other"
  },
  hi: { // Hindi Let's use basic Hindi translations for the core UI
    heroTitle: "हर शिकायत। हर अधिकारी। जवाबदेह।",
    heroSubline: "भारत का एआई-सत्यापित नागरिक शिकायत मंच",
    reportIssueBtn: "शिकायत दर्ज करें",
    publicStatsBtn: "सार्वजनिक आँकड़े देखें",
    selectCategory: "श्रेणी चुनें",
    submitTicket: "शिकायत सबमिट करें",
    anonymousSubmit: "गुमनाम रूप से सबमिट करें",
    trackStatus: "स्थिति ट्रैक करें",
    officerPortal: "अधिकारी पोर्टल",
    adminPortal: "व्यवस्थापक डैशबोर्ड",
    liveCounter: "आज हल की गई शिकायतें",
    serving: "भारत की सेवा में",
    loginLabel: "सुरक्षित पहुँच के माध्यम से प्रवेश करें",
    assignedTickets: "सौंपे गए मुद्दे",
    uploadProof: "समाधान का प्रमाण अपलोड करें",
    beforeAfterCompare: "सत्य परत तुलना",
    tpaQueue: "तटस्थ TPA सत्यापन",
    roads: "सड़कें",
    water: "जल आपूर्ति",
    sanitation: "स्वच्छता",
    electricity: "बिजली",
    other: "अन्य"
  },
  te: { // Telugu
    heroTitle: "ప్రతి ఫిర్యాదు. ప్రతి అధికారి. జవాబుదారీ.",
    heroSubline: "భారతదేశ AI-ధృవీకరించబడిన పౌర ఫిర్యాదు వేదిక",
    reportIssueBtn: "సమస్యను నివేదించండి",
    publicStatsBtn: "పబ్లిక్ గణాంకాలను చూడండి",
    selectCategory: "వర్గాన్ని ఎంచుకోండి",
    submitTicket: "ఫిర్యాదును సమర్పించండి",
    anonymousSubmit: "అజ్ఞాతంగా సమర్పించండి",
    trackStatus: "స్థితిని ట్రాక్ చేయండి",
    officerPortal: "అధికారి పోర్టల్",
    adminPortal: "అడ్మిన్ డాష్‌బోర్డ్",
    liveCounter: "ఈ రోజు పరిష్కరించబడిన ఫిర్యాదులు",
    serving: "భారతదేశానికి సేవ చేయడం",
    loginLabel: "సురక్షిత యాక్సెస్ ద్వారా లాగిన్ చేయండి",
    assignedTickets: "కేటాయించిన సమస్యలు",
    uploadProof: "పరిష్కార రుజువు అప్‌లోడ్ చేయండి",
    beforeAfterCompare: "ట్రూత్ లేయర్ పోలిక",
    tpaQueue: "తటస్థ TPA ధృవీకరణ",
    roads: "రోడ్లు",
    water: "నీటి సరఫరా",
    sanitation: "పారిశుద్ధ్యం",
    electricity: "విద్యుత్",
    other: "ఇతర"
  },
  ta: { // Tamil 
    heroTitle: "ஒவ்வொரு புகாரும். ஒவ்வொரு அதிகாரியும். பொறுப்பு.",
    heroSubline: "இந்தியாவின் AI-சரிபார்க்கப்பட்ட சிவில் புகாரளிக்கும் தளம்",
    reportIssueBtn: "புகாரளிக்க",
    publicStatsBtn: "புள்ளிவிவரங்களை காண்க",
    selectCategory: "வகையைத் தேர்ந்தெடுக்கவும்",
    submitTicket: "புகாரை சமர்ப்பிக்கவும்",
    anonymousSubmit: "அநாமதேயமாக சமர்ப்பிக்கவும்",
    trackStatus: "நிலையை கண்காணிக்கவும்",
    officerPortal: "அதிகாரி போர்ட்டல்",
    adminPortal: "நிர்வாக டேஷ்போர்டு",
    liveCounter: "இன்று தீர்க்கப்பட்ட புகார்கள்",
    serving: "இந்தியாவுக்கு சேவை",
    loginLabel: "பாதுகாப்பான அணுகல் வழியாக உள்நுழைக",
    assignedTickets: "ஒதுக்கப்பட்ட சிக்கல்கள்",
    uploadProof: "தீர்வின் ஆதாரத்தை பதிவேற்றவும்",
    beforeAfterCompare: "உண்மை அடுக்கு ஒப்பீடு",
    tpaQueue: "நடுநிலை TPA சரிபார்ப்பு",
    roads: "சாலைகள்",
    water: "நீர் விநியோகம்",
    sanitation: "சுகாதாரம்",
    electricity: "மின்சாரம்",
    other: "மற்றவை"
  },
  kn: { // Kannada
    heroTitle: "ಪ್ರತಿ ದೂರು. ಪ್ರತಿ ಅಧಿಕಾರಿ. ಜವಾಬ್ದಾರಿ.",
    heroSubline: "ಭಾರತದ AI ಪರಿಶೀಲಿಸಿದ ನಾಗರಿಕ ಕುಂದುಕೊರತೆ ವೇದಿಕೆ",
    reportIssueBtn: "ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ",
    publicStatsBtn: "ಸಾರ್ವಜನಿಕ ಅಂಕಿಅಂಶಗಳನ್ನು ವೀಕ್ಷಿಸಿ",
    selectCategory: "ವರ್ಗವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ",
    submitTicket: "ದೂರನ್ನು ಸಲ್ಲಿಸಿ",
    anonymousSubmit: "ಅನಾಮಧೇಯವಾಗಿ ಸಲ್ಲಿಸಿ",
    trackStatus: "ಸ್ಥಿತಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    officerPortal: "ಅಧಿಕಾರಿ ಪೋರ್ಟಲ್",
    adminPortal: "ಅಡ್ಮಿನ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    liveCounter: "ಇಂದು ಪರಿಹರಿಸಲಾದ ದೂರುಗಳು",
    serving: "ಭಾರತಕ್ಕೆ ಸೇವೆ",
    loginLabel: "ಸುರಕ್ಷಿತ ಪ್ರವೇಶದ ಮೂಲಕ ಲಾಗಿನ್ ಮಾಡಿ",
    assignedTickets: "ನಿಯೋಜಿಸಲಾದ ಸಮಸ್ಯೆಗಳು",
    uploadProof: "ಪರಿಹಾರದ ಪುರಾವೆಯನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    beforeAfterCompare: "ಟ್ರೂತ್ ಲೇಯರ್ ಹೋಲಿಕೆ",
    tpaQueue: "ತಟಸ್ಥ TPA ಪರಿಶೀಲನೆ",
    roads: "ರಸ್ತೆಗಳು",
    water: "ನೀರು ಸರಬರಾಜು",
    sanitation: "ನೈರ್ಮಲ್ಯ",
    electricity: "ವಿದ್ಯುತ್",
    other: "ಇತರೆ"
  },
  bn: { // Bengali
    heroTitle: "প্রতিটি অভিযোগ। প্রতিটি কর্মকর্তা। জবাবদিহি।",
    heroSubline: "ভারতের এআই যাচাইকৃত নাগরিক অভিযোগ প্ল্যাটফর্ম",
    reportIssueBtn: "অভিযোগ করুন",
    publicStatsBtn: "পাবলিক পরিসংখ্যান দেখুন",
    selectCategory: "বিভাগ নির্বাচন করুন",
    submitTicket: "অভিযোগ জমা দিন",
    anonymousSubmit: "বেনামে জমা দিন",
    trackStatus: "স্ট্যাটাস ট্র্যাক করুন",
    officerPortal: "কর্মকর্তা পোর্টাল",
    adminPortal: "অ্যাডমিন ড্যাশবোর্ড",
    liveCounter: "আজ সমাধান করা অভিযোগ",
    serving: "ভারতের সেবায়",
    loginLabel: "নিরাপদ অ্যাক্সেসের মাধ্যমে লগইন করুন",
    assignedTickets: "বরাদ্দকৃত সমস্যা",
    uploadProof: "সমাধানের প্রমাণ আপলোড করুন",
    beforeAfterCompare: "সত্য স্তরের তুলনা",
    tpaQueue: "নিরপেক্ষ TPA যাচাইকরণ",
    roads: "রাস্তাঘাট",
    water: "জল সরবরাহ",
    sanitation: "স্যানিটেশন",
    electricity: "বিদ্যুৎ",
    other: "অন্যান্য"
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');

  const t = (key) => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
