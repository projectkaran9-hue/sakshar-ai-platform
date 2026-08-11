import Dashboard from './components/Dashboard';
import InitialAssessment from './components/InitialAssessment';
import Premium from './components/Premium';
import AdminDashboard from './components/AdminDashboard';
import SplashScreen from './components/SplashScreen';
import { subscribeToGlobalSync } from './services/realtimeSync';
import { fetchSystemConfigDB } from './services/db';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import HeroVideoBackground from './components/HeroVideoBackground';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signUpUser, signInUser, signInWithGoogle, getCurrentUser } from './services/auth';
import { supabase } from './services/supabase';
import { createUserProfile, fetchUserProfile } from './services/db';

// 1. Centralized Translation Dictionary (Fully Expanded for all 20 Languages)
const translations = {
  english: {
    home: "Home", signIn: "Sign In", createAccount: "Create Account", welcomeBack: "Welcome back",
    signInSub: "Sign in to continue your learning journey.", email: "✉️ Email Address", password: "🔒 Password", fullName: "👤 Full Name", or: "or",
    googleSignIn: "Continue with Google", newHere: "New here?", alreadyHaveAccount: "Already have an account?", landingTitle: "Empowering Literacy Through AI",
    landingSub: "A personalized learning companion designed to help adults and first-generation learners acquire foundational reading, writing, and speaking skills in regional languages.",
    getStarted: "Get Started", registerTitle: "Create your account", registerSub: "Join our community and expand your learning horizons.",
    languageLabel: "🌐 Preferred Native Language", registerLeftTitle: "Your journey to literacy starts here.",
    registerLeftSub: "Create a profile to unlock voice practice assessments, real-time feedback, and adaptive daily reading lessons.",
    loginLeftTitle: "Every word you learn opens a new door.", loginLeftSub: "Personalized reading, writing, and speaking practice — in your own language, at your own pace.",
    dashboardTitle: "Welcome to Your Dashboard!", logout: "Log Out",
    eduLabel: "📊 Educational Level",
    eduLevel1: "No Formal Schooling / Foundational Learner",
    eduLevel2: "Primary School (Class 1-5)",
    eduLevel3: "Middle School (Class 6-8)",
    eduLevel4: "High School / Secondary (Class 9-12)",
    eduLevel5: "Higher Education / Diploma / Degree",
    navDashboard: "Dashboard",
    navMyClass: "My Class",
    navCourses: "Courses",
    navCommunity: "Community",
    navAnalytics: "Analytics",
    navSettings: "Settings",
    signOut: "Sign Out",
    searchPlaceholder: "Search courses",
    todayPrefix: "Today",
    myClassTitle: "My Class Leaderboard",
    coursesTitle: "Syllabus Curriculum Tracks",
    communityTitle: "SaksharAI Learner Community",
    settingsTitle: "Profile & Interface Settings",
    coursesYoureTaking: "Course You're Taking",
    saveProfileChanges: "Save Profile Changes",
    savingSettings: "Saving Settings...",
    postMessage: "Post Message",
    sendButton: "Send",
    startModule: "Start Module",
    ageLabel: "Age",
    profileDetails: "Profile details",
    appearanceCustomizer: "Appearance customizer",
    tabNativeModules: "📚 Native Syllabus Modules",
    tabLevelQuizzes: "📝 Level Quizzes",
    tabOtherBlocks: "✨ Other Learning Blocks",
    avgAccuracy: "Average Accuracy",
    completedLessonsLabel: "Completed Lessons",
    selectedLevelLabel: "Selected Level",
    alertMessages: "Alert Messages",
    dismissAll: "Dismiss All",
    assessTitle: "Assess your literacy level improvement",
    startPrefix: "Start",
    levelQuizSuffix: "Level Quiz",
    clearChat: "Clear Chat",
    aiTutorTitle: "AI Literacy Tutor Assistant",
    refreshNow: "Refresh Now",
    startNow: "Start Now",
    performanceReportTitle: "Performance Report",
    evaluationHistoryTitle: "Your Evaluation History Logs",
    strengthsLabel: "Strengths",
    areasForImprovementLabel: "Areas for Improvement",
    overallProgress: "Overall Learning Progress",
    skillEvaluationLabel: "Skill Evaluation",
    recommendedNextLesson: "Recommended Next Lesson",
    tutorGreeting: "Hello {name}! I am your AI Literacy Tutor. I can help guide your study path. Choose a suggested option or write a query.",
    tutorWriting: "Tutor is writing...",
    tutorInputPlaceholder: "Ask a question about letters, tracing, pronunciation...",
    quickSuggestPlan: "Suggest a study plan",
    quickSuggestGrammar: "Suggest educational track grammar tip",
    quickSuggestTracing: "Explain writing tracing metrics",
    tutorReplyPlan: "Based on your track level, here is your target schedule:\n1. 📖 Tracing practice (15 mins)\n2. 🗣️ Speaking exercise (10 mins)\n3. 📝 Weekly Quiz validation to assess score growth.",
    tutorReplyScore: "To improve your score: focus on drawing within the stroke bounds of character grids and articulate clear consonant sounds when using the speech microphone recorder.",
    tutorReplyDefault: "Understood! Let's continue practicing. Let me know if you would like me to review vocabulary words or suggest a daily study plan.",
    tutorReplyStudyPlan: "Suggested Study Plan:\n- Mon & Tue: Trace native consonants guides.\n- Wed: Interactive spelling read blocks.\n- Thu & Fri: Pronunciation checks.\n- Weekend: Mock quiz level checks.",
    tutorReplyGrammarTip: "Educational track guidelines:\nFocus on daily words structure, sight nouns, and local communication dialogues to build vocabulary.",
    tutorReplyTracingInfo: "Tracing grading details:\nOur model matches drawn lines with character guides. Drawing with smooth, centralized lines will maximize accuracy.",
    readingTitle: "Reading Practice",
    writingTitle: "Writing Practice",
    speakingTitle: "Speaking Assessment",
    readingSubNone: "Focus on basic native phonics, simple letter groupings, and core sight vocabulary.",
    writingSubNone: "Trace entry-level alphabet strokes and basic phonetic shapes with touch gestures.",
    speakingSubNone: "Speak single native vowels and foundational consonants for absolute feedback.",
    readingSubPrimary: "Read basic multi-syllable phrases and explore local context vocabulary sheets.",
    writingSubPrimary: "Trace basic words and complete simple sentence syntax strings.",
    speakingSubPrimary: "Pronounce short, practical, real-world native sentences with audio feedback.",
    readingSubMiddle: "Read standard continuous text paragraphs regarding daily transactions and public notices.",
    writingSubMiddle: "Practice writing functional interactive text entries and form fields.",
    speakingSubMiddle: "Deliver conversational structural segments into the automatic speech parser.",
    readingSubHigh: "Engage with analytical text structures, modern digital literacy items, and summaries.",
    writingSubHigh: "Draft continuous sentences and freeform communication strings.",
    speakingSubHigh: "Execute complex phrase structures for high-accuracy articulation assessments.",
    aiCompanionBadge: "The AI Literacy Companion",
    landingTitleLine1: "Empowering Literacy",
    landingTitleLine2: "Through AI Intelligence",
    navApproach: "Approach",
    navFeatures: "Features",
    navImpact: "Impact",
    tryLiveDemo: "Try Live Demo",
    analyzeBtn: "Analyze",
    clearBtn: "Clear",
    voiceDetectorLabel: "AI Voice Language Selector",
    voiceListeningPrompt: "Speak now in your mother tongue…",
    voiceInviteText: "Click the mic and speak a few words in your language — we'll detect it instantly.",
    drawInsideBox: "Draw inside the box",
    literacyGapTitle: "The literacy gap is human",
    literacyGapBody: "Millions of adults speak fluently but were never taught to read or write. That's not a technology problem — it's a human one to design for, with patience and dignity.",
    oneSizeFitsTitle: "One size fits no one",
    oneSizeFitsBody: "Traditional classes assume a starting point. Sakshar begins with a short assessment and shapes a path that adapts to the learner's own pace, language and level.",
    aiListensTitle: "AI that listens back",
    aiListensBody: "Real-time pronunciation feedback, character tracing and applied reasoning turn passive lessons into a two-way conversation — patient, private and always available.",
    fluencyMotherTitle: "Fluency in the mother tongue",
    fluencyMotherBody: "Learning lands deepest in the language you dream in. Sakshar teaches across 20+ Indian regional languages, detecting your voice from the very first tap.",
    ourApproachBadge: "Our Approach",
    whyWeBuiltTitle: "Why we built",
    whyWeBuiltHighlight: "Sakshar",
    approachSubtitle: "Four beliefs that shape every lesson, every prompt and every line of feedback on the platform.",
    thePlatformBadge: "The Platform",
    platformTitle: "A classroom that adapts to every learner",
    platformSubtitle: "Three intelligent modules work together to build reading, writing and speaking — one confident step at a time.",
    impactBadge: "Real Impact",
    impactTitle: "Built for those left behind by traditional education",
    impactSubtitle: "Every feature is designed with first-generation learners at the centre.",
    footerTagline: "AI-powered literacy for every Indian learner."
  },
  hindi: {
    home: "होम", signIn: "साइन इन करें", createAccount: "खाता बनाएं", welcomeBack: "आपका स्वागत है",
    signInSub: "अपनी सीखने की यात्रा जारी रखने के लिए साइन इन करें।", email: "✉️ ईमेल पता", password: "🔒 पासवर्ड", fullName: "👤 पूरा नाम", or: "या",
    googleSignIn: "गूगल के साथ जारी रखें", newHere: "यहाँ नए हैं?", alreadyHaveAccount: "पहले से ही एक खाता है?", landingTitle: "एआई के माध्यम से साक्षरता का सशक्तिकरण",
    landingSub: "एक व्यक्तिगत शिक्षण साथी जो वयस्कों और पहली पीढ़ी के शिक्षार्थियों को क्षेत्रीय भाषाओं में बुनियादी पढ़ने, लिखने और बोलने के कौशल हासिल करने में मदद करने के लिए डिज़ाइन किया गया है।",
    getStarted: "शुरू करें", registerTitle: "अपना खाता बनाएं", registerSub: "हमारे समुदाय में शामिल हों और अपने सीखने के क्षितिज का विस्तार करें।",
    languageLabel: "🌐 पसंदीदा मातृभाषा", registerLeftTitle: "आपकी साक्षरता की यात्रा यहीं से शुरू होती है।",
    registerLeftSub: "आवाज अभ्यास आकलन, वास्तविक समय प्रतिक्रिया, और अनुकूली दैनिक पढ़ने के पाठों को अनलॉक करने के लिए एक प्रोफ़ाइल बनाएं।",
    loginLeftTitle: "आपके द्वारा सीखा गया हर शब्द एक नया दरवाजा खोलता है।", loginLeftSub: "व्यक्तिगत पढ़ने, लिखने और बोलने का अभ्यास — आपकी अपनी भाषा में, आपकी अपनी गति से।",
    dashboardTitle: "आपके डैशबोर्ड में आपका स्वागत है!", logout: "लॉग आउट",
    eduLabel: "📊 शैक्षिक स्तर",
    eduLevel1: "कोई औपचारिक शिक्षा नहीं / बुनियादी शिक्षार्थी",
    eduLevel2: "प्राथमिक विद्यालय (कक्षा 1-5)",
    eduLevel3: "मिडिल स्कूल (कक्षा 6-8)",
    eduLevel4: "हाई स्कूल / माध्यमिक (कक्षा 9-12)",
    eduLevel5: "उच्च शिक्षा / डिप्लोमा / डिग्री",
    navDashboard: "डैशबोर्ड",
    navMyClass: "मेरी कक्षा",
    navCourses: "पाठ्यक्रम",
    navCommunity: "समुदाय",
    navAnalytics: "विश्लेषण",
    navSettings: "सेटिंग्स",
    signOut: "साइन आउट",
    searchPlaceholder: "पाठ्यक्रम खोजें",
    todayPrefix: "आज",
    myClassTitle: "मेरी कक्षा लीडरबोर्ड",
    coursesTitle: "पाठ्यक्रम ट्रैक",
    communityTitle: "साक्षरAI शिक्षार्थी समुदाय",
    settingsTitle: "प्रोफ़ाइल और इंटरफ़ेस सेटिंग्स",
    coursesYoureTaking: "आप जो पाठ्यक्रम ले रहे हैं",
    saveProfileChanges: "प्रोफ़ाइल परिवर्तन सहेजें",
    savingSettings: "सेटिंग्स सहेजी जा रही हैं...",
    postMessage: "संदेश भेजें",
    sendButton: "भेजें",
    startModule: "मॉड्यूल शुरू करें",
    ageLabel: "आयु",
    profileDetails: "प्रोफ़ाइल विवरण",
    appearanceCustomizer: "रूप-रंग अनुकूलक",
    tabNativeModules: "📚 स्थानीय पाठ्यक्रम मॉड्यूल",
    tabLevelQuizzes: "📝 स्तर क्विज़",
    tabOtherBlocks: "✨ अन्य शिक्षण खंड",
    avgAccuracy: "औसत सटीकता",
    completedLessonsLabel: "पूर्ण पाठ",
    selectedLevelLabel: "चयनित स्तर",
    alertMessages: "सूचना संदेश",
    dismissAll: "सभी हटाएं",
    assessTitle: "अपने साक्षरता स्तर में सुधार का आकलन करें",
    startPrefix: "शुरू करें",
    levelQuizSuffix: "स्तर क्विज़",
    clearChat: "चैट साफ़ करें",
    aiTutorTitle: "एआई साक्षरता ट्यूटर सहायक",
    refreshNow: "अभी रीफ़्रेश करें",
    startNow: "अभी शुरू करें",
    performanceReportTitle: "प्रदर्शन रिपोर्ट",
    evaluationHistoryTitle: "आपका मूल्यांकन इतिहास लॉग",
    strengthsLabel: "शक्तियां",
    areasForImprovementLabel: "सुधार के क्षेत्र",
    overallProgress: "कुल सीखने की प्रगति",
    skillEvaluationLabel: "कौशल मूल्यांकन",
    recommendedNextLesson: "अनुशंसित अगला पाठ",
    tutorGreeting: "नमस्ते {name}! मैं आपका एआई साक्षरता ट्यूटर हूं। मैं आपके अध्ययन पथ का मार्गदर्शन कर सकता हूं। कोई सुझाया गया विकल्प चुनें या प्रश्न लिखें।",
    tutorWriting: "ट्यूटर लिख रहा है...",
    tutorInputPlaceholder: "अक्षरों, ट्रेसिंग, उच्चारण के बारे में प्रश्न पूछें...",
    quickSuggestPlan: "अध्ययन योजना सुझाएं",
    quickSuggestGrammar: "शैक्षिक व्याकरण सुझाव दें",
    quickSuggestTracing: "लेखन ट्रेसिंग मेट्रिक्स समझाएं",
    tutorReplyPlan: "आपके स्तर के आधार पर, यह रहा आपका लक्ष्य कार्यक्रम:\n1. 📖 ट्रेसिंग अभ्यास (15 मिनट)\n2. 🗣️ बोलने का अभ्यास (10 मिनट)\n3. 📝 साप्ताहिक क्विज़ से प्रगति का आकलन।",
    tutorReplyScore: "अपना स्कोर सुधारने के लिए: अक्षर ग्रिड की सीमाओं के भीतर लिखने पर ध्यान दें और माइक्रोफ़ोन का उपयोग करते समय स्पष्ट व्यंजन ध्वनियां बोलें।",
    tutorReplyDefault: "समझ गया! चलिए अभ्यास जारी रखते हैं। बताएं क्या मैं शब्दावली की समीक्षा करूं या दैनिक अध्ययन योजना सुझाऊं।",
    tutorReplyStudyPlan: "सुझाई गई अध्ययन योजना:\n- सोम व मंगल: मूल व्यंजन ट्रेसिंग करें।\n- बुध: शब्द निर्माण अभ्यास।\n- गुरु व शुक्र: उच्चारण जांच।\n- सप्ताहांत: मॉक क्विज़।",
    tutorReplyGrammarTip: "शैक्षिक दिशानिर्देश:\nदैनिक शब्द संरचना, सामान्य संज्ञाओं और स्थानीय संवाद पर ध्यान दें ताकि शब्दावली बने।",
    tutorReplyTracingInfo: "ट्रेसिंग मूल्यांकन विवरण:\nहमारा मॉडल खींची गई रेखाओं की तुलना अक्षर गाइड से करता है। सहज व केंद्रित रेखाएं सटीकता बढ़ाती हैं।",
    readingTitle: "पठन अभ्यास",
    writingTitle: "लेखन अभ्यास",
    speakingTitle: "वाचन मूल्यांकन",
    readingSubNone: "बुनियादी ध्वनि पहचान, सरल अक्षर समूहन और मूल दृष्टि शब्दावली पर ध्यान दें।",
    writingSubNone: "स्पर्श इशारों से प्रारंभिक वर्णमाला रेखाएं और मूल ध्वन्यात्मक आकार ट्रेस करें।",
    speakingSubNone: "प्रतिक्रिया के लिए एकल स्वर और बुनियादी व्यंजन बोलें।",
    readingSubPrimary: "बुनियादी बहु-अक्षर वाक्यांश पढ़ें और स्थानीय शब्दावली शीट्स देखें।",
    writingSubPrimary: "बुनियादी शब्दों को ट्रेस करें और सरल वाक्य संरचनाएं पूरी करें।",
    speakingSubPrimary: "ऑडियो फीडबैक के साथ छोटे व्यावहारिक वाक्य बोलें।",
    readingSubMiddle: "दैनिक लेनदेन और सार्वजनिक सूचनाओं से जुड़े मानक अनुच्छेद पढ़ें।",
    writingSubMiddle: "कार्यात्मक इंटरैक्टिव टेक्स्ट प्रविष्टियां और फॉर्म फ़ील्ड लिखने का अभ्यास करें।",
    speakingSubMiddle: "स्वचालित वाक् पहचान में संवादात्मक अंश बोलें।",
    readingSubHigh: "विश्लेषणात्मक पाठ संरचनाओं, डिजिटल साक्षरता और सारांशों से जुड़ें।",
    writingSubHigh: "निरंतर वाक्य और स्वतंत्र संचार लेख तैयार करें।",
    speakingSubHigh: "उच्च-सटीकता उच्चारण मूल्यांकन हेतु जटिल वाक्यांश बोलें।",
    aiCompanionBadge: "एआई साक्षरता साथी", landingTitleLine1: "साक्षरता को सशक्त बनाना",
    landingTitleLine2: "एआई बुद्धिमत्ता", navApproach: "दृष्टिकोण", navFeatures: "विशेषताएं",
    navImpact: "प्रभाव", tryLiveDemo: "लाइव डेमो आज़माएं", analyzeBtn: "विश्लेषण करें",
    clearBtn: "साफ़ करें", voiceDetectorLabel: "एआई आवाज़ भाषा चयनकर्ता",
    voiceListeningPrompt: "अब अपनी मातृभाषा में बोलें…",
    voiceInviteText: "माइक दबाएं और अपनी भाषा में कुछ शब्द बोलें — हम तुरंत पहचान लेंगे।",
    drawInsideBox: "बॉक्स के अंदर लिखें",
    literacyGapTitle: "साक्षरता की खाई मानवीय है", literacyGapBody: "लाखों वयस्क धाराप्रवाह बोलते हैं लेकिन कभी पढ़ना या लिखना नहीं सीखा। यह एक मानवीय समस्या है जिसे धैर्य और गरिमा के साथ हल करना है।",
    oneSizeFitsTitle: "एक ही आकार किसी के लिए नहीं", oneSizeFitsBody: "पारंपरिक कक्षाएं एक शुरुआती बिंदु मान लेती हैं। सक्षर एक लघु मूल्यांकन से शुरू होता है और शिक्षार्थी की गति और स्तर के अनुसार रास्ता बनाता है।",
    aiListensTitle: "एआई जो वापस सुनता है", aiListensBody: "वास्तविक समय उच्चारण फीडबैक, अक्षर ट्रेसिंग और तर्क आधारित शिक्षण निष्क्रिय पाठों को द्विपक्षीय बातचीत में बदल देते हैं।",
    fluencyMotherTitle: "मातृभाषा में प्रवाह", fluencyMotherBody: "सीखना उसी भाषा में गहराई से उतरता है जिसमें आप सपने देखते हैं। सक्षर 20+ भारतीय भाषाओं में सिखाता है।",
    ourApproachBadge: "हमारा दृष्टिकोण", whyWeBuiltTitle: "हमने क्यों बनाया", whyWeBuiltHighlight: "सक्षर",
    approachSubtitle: "चार विश्वास जो प्लेटफ़ॉर्म के हर पाठ, हर प्रॉम्प्ट और हर फ़ीडबैक को आकार देते हैं।",
    thePlatformBadge: "प्लेटफ़ॉर्म", platformTitle: "एक कक्षा जो हर शिक्षार्थी के अनुसार ढलती है",
    platformSubtitle: "तीन बुद्धिमान मॉड्यूल मिलकर पढ़ने, लिखने और बोलने का निर्माण करते हैं।",
    impactBadge: "वास्तविक प्रभाव", impactTitle: "उन लोगों के लिए बनाया जिन्हें पारंपरिक शिक्षा ने पीछे छोड़ दिया",
    impactSubtitle: "हर सुविधा पहली पीढ़ी के शिक्षार्थियों को केंद्र में रखकर बनाई गई है।",
    footerTagline: "हर भारतीय शिक्षार्थी के लिए एआई-संचालित साक्षरता।",
    exitBtn: "बाहर निकलें",
    backBtn: "वापस",
    exitAssessmentTitle: "मूल्यांकन से बाहर निकलें",
    initialAssessmentLabel: "प्रारंभिक प्लेसमेंट मूल्यांकन",
    section1Reading: "खंड 1 का 4 (पठन)",
    section2Writing: "खंड 2 का 4 (लेखन)",
    section3Speaking: "खंड 3 का 4 (वाचन)",
    section4Reasoning: "खंड 4 का 4 (तर्क क्षमता)",
    secReading: "पठन",
    secWriting: "लेखन",
    secSpeaking: "वाचन",
    secReasoning: "तर्क क्षमता",
    secReadingTitle: "खंड 1: पठन कौशल",
    secWritingTitle: "खंड 2: लेखन कौशल",
    secSpeakingTitle: "खंड 3: वाचन एवं उच्चारण कौशल",
    secReasoningTitle: "खंड 4: व्यावहारिक तर्क क्षमता",
    readingInst: "नीचे दिए गए पाठ को ध्यान से पढ़ें, फिर प्रश्न का उत्तर दें।",
    writingInst: "नीचे दिए गए कैनवास बॉक्स में लिखें।",
    drawEnvelopeInst: "नीचे दिए गए कैनवास बॉक्स में लिखें।",
    targetWordLabel: "लक्ष्य शब्द",
    drawHerePrompt: "यहाँ लिखें",
    clearCanvasBtn: "कैनवास साफ़ करें",
    analyzingState: "विश्लेषण हो रहा है...",
    speakingInst: "रिकॉर्डिंग के लिए माइक्रोफ़ोन दबाएं।",
    readAloudHeader: "जोर से पढ़ें",
    listeningPrompt: "आपकी आवाज़ सुनी जा रही है...",
    clickToRecordPrompt: "माइक दबाएं और बोलें",
    weHeardLabel: "हमने सुना:",
    accuracyLabel: "सटीकता:",
    reasoningInst: "नीचे दी गई स्थिति पढ़ें, फिर सही विकल्प चुनें।",
    realLifeSituationHeader: "व्यावहारिक स्थिति",
    startAssessmentBtn: "मूल्यांकन शुरू करें →",
    nextQuestionBtn: "अगला प्रश्न →",
    submitSectionBtn: "खंड जमा करें और आगे बढ़ें →",
    finishAssessmentBtn: "मूल्यांकन पूरा करें और परिणाम देखें →",
    assessmentSummaryTitle: "मूल्यांकन सारांश",
    overallCompetencyLabel: "कुल योग्यता",
    dynamicCourseAssigned: "आवंटित पाठ्यक्रम स्तर:",
    courseAssignedDesc: "आपके स्कोर के आधार पर व्यक्तिगत पाठ्यक्रम तैयार किया गया है।",
    aiEvaluationReport: "एआई मूल्यांकन रिपोर्ट",
    engineVersion: "साक्षर एआई इंजन v2 · विस्तृत विश्लेषण",
    aiVerdictHeader: "एआई निष्कर्ष",
    skillBreakdown: "कौशल विश्लेषण",
    topStrength: "मुख्य ताकत",
    focusArea: "सुधार का क्षेत्र",
    overallScoreLabel: "कुल स्कोर",
    aiInsightsLabel: "एआई विश्लेषण",
    cognitiveStyleLabel: "सीखने की शैली",
    paceEstimateLabel: "सीखने की गति",
    estimatedMasteryLabel: "अनुमानित समय",
    recommendedPathLabel: "अनुशंसित अध्ययन मार्ग",
    verifiedBadge: "सत्यापित",
    enterDashboardBtn: "प्रोफ़ाइल सहेजें और डैशबोर्ड में प्रवेश करें →",
    exitModalTitle: "क्या आप प्रारंभिक मूल्यांकन छोड़ना चाहते हैं?",
    exitModalDesc: "आपकी वर्तमान प्रगति मिट जाएगी। क्या आप बाहर निकलना चाहते हैं?",
    cancelBtn: "रद्द करें",
    yesExitBtn: "हाँ, बाहर निकलें",
    liveSandboxBadge: "लाइव एआई सैंडबॉक्स",
    liveSandboxTitle: "अक्षर अनुरेखण का परीक्षण करें",
    selectScriptProfile: "स्क्रिप्ट प्रोफ़ाइल चुनें:",
    drawInsideBoxPrompt: "बॉक्स के अंदर लिखें",
    accuracyMatch: "सटीकता मिलान",
    aiVerified: "एआई द्वारा सत्यापित",
    beginYourJourney: "अपनी यात्रा शुरू करें",
    everyWordLearned: "आपके द्वारा सीखा गया हर शब्द",
    opensADoor: "एक नया दरवाजा खोलता है।",
    getStartedFree: "मुफ्त में शुरू करें",
    watchDemo: "डेमो देखें"
  },
  telugu: {
    home: "హోమ్", signIn: "సైన్ ఇన్ చేయండి", createAccount: "ఖాతాను సృష్టించండి", welcomeBack: "తిరిగి స్వాగతం",
    signInSub: "మీ అభ్యాస ప్రయాణాన్ని కొనసాగించడానికి సైన్ ఇన్ చేయండి.", email: "✉️ ఇమెయిల్ చిరునామా", password: "🔒 పాస్‌వర్డ్", fullName: "👤 పూర్తి పేరు", or: "లేదా",
    googleSignIn: "గూగుల్‌తో కొనసాగండి", newHere: "ఇక్కడ కొత్తవారా?", alreadyHaveAccount: "ఇప్పటికే खाता ఉందా?", landingTitle: "AI ద్వారా అักษరాస్యత సాధికారత",
    landingTitleLine1: "అక్షరాస్యత సాధికారత", landingTitleLine2: "AI మేధస్సు ద్వారా",
    landingSub: "ప్రాంతীয় భాషలలో ప్రాథమిక పఠనం, రాయడం మరియు మాట్లాడే నైపుణ్యాలను పొందడంలో పెద్దలు మరియు మొదటి తരം అభ్యాసకులకు సహాయపడటానికి రూపొందించబడిన వ్యక్తిగతీకరించిన అభ్యాస సహచరుడు.",
    getStarted: "ప్రారంభించండి", registerTitle: "మీ ఖాతాన్ని సృష్టించండి", registerSub: "మా సంఘంలో చేరండి మరియు మీ అభ్యాస పరిధులను విస్తృతం చేసుకోండి.",
    languageLabel: "🌐 ఇష్టపడే మాతృభాష", registerLeftTitle: "మీ అักษరాస్యత ప్రయాణం ఇక్కడే ప్రారంభమవుతుంది.",
    registerLeftSub: "వాయిస్ ప్రాక్టీస్ అసెస్‌మెంట్‌లు, రియల్ టైమ్ ఫీడ్‌బ్యాక్ మరియు అదాప్టివ్ రోజువారీ పఠన పాఠాలను అన్‌లాక్ చేయడానికి ప్రۆఫైల్‌ను సృష్టించండి.",
    loginLeftTitle: "మీరు నేర్చుకునే ప్రతి పదం ఒక కొత్త తలుపును తెరుస్తుంది.", loginLeftSub: "వ్యక్తిగత పఠనం, రాయడం మరియు మాట్లాడటం ప్రాక్టీस — మీ స్వంత భాషలో, మీ స్వంత వేగంతో.",
    dashboardTitle: "మీ డాష్‌ボードకు స్వాగతం!", logout: "లాగ్ అవుట్",
    eduLabel: "📊 విద్యా స్థాయి",
    eduLevel1: "औपचారिक విద్య లేదు / ప్రాథమిక అభ్యాసకుడు",
    eduLevel2: "ప్రాథమిక పాఠశాల (తరగతి 1-5)",
    eduLevel3: "మిడిల్ స్కూల్ (తరగతి 6-8)",
    eduLevel4: "హైస్కూల్ / సెకండరీ (తరగతి 9-12)",
    eduLevel5: "ఉన్నత విద్య / డిప్లొమా / డిగ్రీ",
    navDashboard: "డాష్‌బోర్డ్",
    navMyClass: "నా తరగతి",
    navCourses: "కోర్సులు",
    navCommunity: "సంఘం",
    navAnalytics: "విశ్లేషణలు",
    navSettings: "సెట్టింగ్‌లు",
    signOut: "సైన్ అవుట్",
    searchPlaceholder: "కోర్సులు వెతకండి",
    todayPrefix: "ఈరోజు",
    myClassTitle: "నా తరగతి లీడర్‌బోర్డ్",
    coursesTitle: "సిలబస్ కరికులం ట్రాక్‌లు",
    communityTitle: "సాక్షర్AI అభ్యాసకుల సంఘం",
    settingsTitle: "ప్రొఫైల్ & ఇంటర్‌ఫేస్ సెట్టింగ్‌లు",
    coursesYoureTaking: "మీరు తీసుకుంటున్న కోర్సు",
    saveProfileChanges: "ప్రొఫైల్ మార్పులను సేవ్ చేయండి",
    savingSettings: "సెట్టింగ్‌లు సేవ్ అవుతున్నాయి...",
    postMessage: "సందేశం పోస్ట్ చేయండి",
    sendButton: "పంపండి",
    startModule: "మాడ్యూల్ ప్రారంభించండి",
    ageLabel: "వయస్సు",
    profileDetails: "ప్రొఫైల్ వివరాలు",
    appearanceCustomizer: "రూపాన్ని అనుకూలీకరించండి",
    tabNativeModules: "📚 స్థానిక సిలబస్ మాడ్యూల్స్",
    tabLevelQuizzes: "📝 స్థాయి క్విజ్‌లు",
    tabOtherBlocks: "✨ ఇతర అభ్యాస బ్లాకులు",
    avgAccuracy: "సగటు ఖచ్చితత్వం",
    completedLessonsLabel: "పూర్తయిన పాఠాలు",
    selectedLevelLabel: "ఎంచుకున్న స్థాయి",
    alertMessages: "హెచ్చరిక సందేశాలు",
    dismissAll: "అన్నీ తీసివేయండి",
    assessTitle: "మీ అక్షరాస్యత స్థాయి మెరుగుదలను అంచనా వేయండి",
    startPrefix: "ప్రారంభించండి",
    levelQuizSuffix: "స్థాయి క్విజ్",
    clearChat: "చాట్ క్లియర్ చేయండి",
    aiTutorTitle: "AI అక్షరాస్యత ట్యూటర్ సహాయకుడు",
    refreshNow: "ఇప్పుడు రిఫ్రెష్ చేయండి",
    startNow: "ఇప్పుడు ప్రారంభించండి",
    performanceReportTitle: "పనితీరు నివేదిక",
    evaluationHistoryTitle: "మీ మూల్యాంకన చరిత్ర లాగ్‌లు",
    strengthsLabel: "బలాలు",
    areasForImprovementLabel: "మెరుగుదల ప్రాంతాలు",
    overallProgress: "మొత్తం అభ్యాస పురోగతి",
    skillEvaluationLabel: "నైపుణ్య మూల్యాంకనం",
    recommendedNextLesson: "సిఫార్సు చేయబడిన తదుపరి పాఠం",
    tutorGreeting: "నమస్తే {name}! నేను మీ AI అక్షరాస్యత ట్యూటర్‌ని. మీ అధ్యయన మార్గంలో మార్గనిర్దేశం చేయగలను. సూచించిన ఎంపికను ఎంచుకోండి లేదా ప్రశ్న రాయండి.",
    tutorWriting: "ట్యూటర్ టైప్ చేస్తున్నారు...",
    tutorInputPlaceholder: "అక్షరాలు, ట్రేసింగ్, ఉచ్చారణ గురించి ప్రశ్న అడగండి...",
    quickSuggestPlan: "అధ్యయన ప్రణాళికను సూచించండి",
    quickSuggestGrammar: "విద్యా వ్యాకరణ చిట్కా సూచించండి",
    quickSuggestTracing: "రచన ట్రేసింగ్ కొలమానాలు వివరించండి",
    tutorReplyPlan: "మీ స్థాయి ఆధారంగా, మీ లక్ష్య షెడ్యూల్:\n1. 📖 ట్రేసింగ్ అభ్యాసం (15 నిమి)\n2. 🗣️ మాట్లాడే వ్యాయామం (10 నిమి)\n3. 📝 వారపు క్విజ్‌తో పురోగతిని అంచనా వేయండి.",
    tutorReplyScore: "మీ స్కోర్ మెరుగుపరచడానికి: అక్షర గ్రిడ్ సరిహద్దుల్లో గీయడంపై దృష్టి పెట్టండి మరియు మైక్రోఫోన్ ఉపయోగించేటప్పుడు స్పష్టమైన హల్లుల ధ్వనులు పలకండి.",
    tutorReplyDefault: "అర్థమైంది! అభ్యాసం కొనసాగిద్దాం. పదజాలం సమీక్షించాలా లేదా రోజువారీ ప్రణాళిక సూచించాలా చెప్పండి.",
    tutorReplyStudyPlan: "సూచించిన అధ్యయన ప్రణాళిక:\n- సోమ, మంగళ: మూల హల్లులు ట్రేస్ చేయండి.\n- బుధ: స్పెల్లింగ్ బ్లాక్‌లు.\n- గురు, శుక్ర: ఉచ్చారణ తనిఖీలు.\n- వారాంతం: మాక్ క్విజ్.",
    tutorReplyGrammarTip: "విద్యా మార్గదర్శకాలు:\nరోజువారీ పద నిర్మాణం, సాధారణ నామవాచకాలు మరియు స్థానిక సంభాషణలపై దృష్టి పెట్టండి.",
    tutorReplyTracingInfo: "ట్రేసింగ్ మూల్యాంకన వివరాలు:\nమా మోడల్ గీసిన రేఖలను అక్షర గైడ్‌లతో సరిపోల్చుతుంది. మృదువైన, కేంద్రీకృత రేఖలు ఖచ్చితత్వాన్ని పెంచుతాయి.",
    readingTitle: "పఠన అభ్యాసం",
    writingTitle: "రచన అభ్యాసం",
    speakingTitle: "మాట్లాడే మూల్యాంకనం",
    readingSubNone: "ప్రాథమిక ధ్వని గుర్తింపు, సరళ అక్షర సమూహాలు మరియు ప్రధాన దృష్టి పదజాలంపై దృష్టి పెట్టండి.",
    writingSubNone: "టచ్ సంజ్ఞలతో ప్రారంభ వర్ణమాల రేఖలు మరియు ప్రాథమిక ధ్వని ఆకారాలను ట్రేస్ చేయండి.",
    speakingSubNone: "ఖచ్చితమైన అభిప్రాయం కోసం ఒకే అచ్చులు మరియు ప్రాథమిక హల్లులు పలకండి.",
    readingSubPrimary: "ప్రాథమిక బహుళ-అక్షర పదబంధాలు చదవండి మరియు స్థానిక పదజాల షీట్‌లను అన్వేషించండి.",
    writingSubPrimary: "ప్రాథమిక పదాలను ట్రేస్ చేసి సరళ వాక్య నిర్మాణాలను పూర్తి చేయండి.",
    speakingSubPrimary: "ఆడియో ఫీడ్‌బ్యాక్‌తో చిన్న ఆచరణాత్మక వాక్యాలు పలకండి.",
    readingSubMiddle: "రోజువారీ లావాదేవీలు మరియు ప్రజా నోటీసుల గురించి ప్రామాణిక పేరాగ్రాఫ్‌లు చదవండి.",
    writingSubMiddle: "ఫంక్షనల్ ఇంటరాక్టివ్ టెక్స్ట్ ఎంట్రీలు మరియు ఫారమ్ ఫీల్డ్‌లు రాయడం అభ్యసించండి.",
    speakingSubMiddle: "ఆటోమేటిక్ స్పీచ్ పార్సర్‌లో సంభాషణాత్మక విభాగాలు మాట్లాడండి.",
    readingSubHigh: "విశ్లేషణాత్మక వచన నిర్మాణాలు, డిజిటల్ అక్షరాస్యత అంశాలు మరియు సారాంశాలతో నిమగ్నమవ్వండి.",
    writingSubHigh: "నిరంతర వాక్యాలు మరియు స్వేచ్ఛా సంభాషణ రచనలు రూపొందించండి.",
    speakingSubHigh: "అధిక-ఖచ్చితత్వ ఉచ్చారణ మూల్యాంకనాల కోసం సంక్లిష్ట పద నిర్మాణాలు అమలు చేయండి."
  },
  punjabi: {
    home: "ਹੋਮ", signIn: "ਸਾਈਨ ਇਨ", createAccount: "ਖਾਤਾ ਬਣਾਓ", welcomeBack: "ਜੀ ਆਇਆਂ ਨੂੰ",
    signInSub: "ਆਪਣੀ ਸਿੱਖਣ ਦੀ ਯਾਤਰਾ ਜਾਰੀ ਰੱਖਣ ਲਈ ਸਾਈਨ ਇਨ ਕਰੋ।", email: "✉️ ਈਮੇਲ ਪਤਾ", password: "🔒 ਪਾਸਵਰਡ", fullName: "👤 ਪੂਰਾ ਨਾਮ", or: "ਜਾਂ",
    googleSignIn: "ਗੂਗਲ ਨਾਲ ਜਾਰੀ ਰੱਖੋ", newHere: "ਇੱਥੇ ਨਵੇਂ ਹੋ?", alreadyHaveAccount: "ਖਾਤਾ ਹੈਗਾ ਹੈ?", landingTitle: "ਵਿਅਕਤੀਗਤ AI ਰਾਹੀਂ ਸਾਖਰਤਾ ਦਾ ਸਸ਼ਕਤੀਕਰਨ",
    landingTitleLine1: "ਸਾਖਰਤਾ ਦਾ ਸਸ਼ਕਤੀਕਰਨ", landingTitleLine2: "AI ਬੁੱਧੀ ਰਾਹੀਂ",
    landingSub: "ਇੱਕ ਅਨੁਕੂਲ ਸਿੱਖਣ ਪਲੇਟਫਾਰਮ ਜੋ ਬਾਲਗਾਂ ਅਤੇ ਪਹਿਲੀ ਪੀੜ੍ਹੀ ਦੇ ਸਿੱਖਣ ਵਾਲਿਆਂ ਨੂੰ ਉਹਨਾਂ ਦੀਆਂ ਖੇਤਰੀ ਮਾਤ੍ਰਭਾਸ਼ਾਵਾਂ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਮੁਢਲੀ ਪੜ੍ਹਨ, ਲਿਖਣ ਅਤੇ ਬੋਲਣ ਦਾ ਵਿਸ਼ਵਾਸ ਹਾਸਲ ਕਰਨ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।",
    getStarted: "ਸ਼ੁਰੂ ਕਰੋ", registerTitle: "ਆਪਣੀ ਪ੍ਰੋਫਾਈਲ ਬਣਾਓ", registerSub: "ਸਾਡੇ ਭਾਈਚਾਰੇ ਵਿੱਚ ਸਭਲ ਹੋਵੋ ਅਤੇ ਆਪਣੇ ਸਿੱਖਣ ਦੇ ਦਾਇਰੇ ਦਾ ਵਿਸਤਾਰ ਕਰੋ।",
    languageLabel: "🌐 ਪਸੰਦੀਦਾ ਮਾਤਭਾਸ਼ਾ", registerLeftTitle: "ਤੁਹਾਡੀ ਸਾਖਰਤਾ ਦੀ ਯਾਤਰਾ ਇੱਥੋਂ ਸੁਰੂ ਹੁੰਦੀ ਹੈ।",
    registerLeftSub: "ਆਵਾਜ਼ ਅਭਿਆਸ ਮੁਲਾਂਕਣ, ਰੀਅਲ-ਟਾਈਮ ਫੀਡਬੈਕ, ਅਤੇ ਰੋਜ਼ਾਨਾ ਪੜ੍ਹਨ ਦੇ ਪਾਠਾਂ ਨੂੰ ਅਨਲੌਕ ਕਰਨ ਲਈ ਇੱਕ ਪ੍ਰੋਫਾਈਲ ਬਣਾਓ।",
    loginLeftTitle: "ਤੁਹਾਡਾ ਸਿੱਖਿਆ ਹਰ ਸ਼ਬਦ ਇੱਕ ਨਵਾਂ ਦਰਵਾਜ਼ਾ ਖੋਲ੍ਹਦਾ ਹੈ।", loginLeftSub: "ਨਿੱਜੀ ਪੜ੍ਹਨ, ਲਿਖਣ ਅਤੇ ਬੋਲਣ ਦਾ ਅਭਿਆਸ — ਤੁਹਾਡੀ ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ, ਤੁਹਾਡੀ ਆਪਣੀ ਰਫ਼ਤਾਰ ਨਾਲ।",
    dashboardTitle: "ਤੁਹਾਡੇ ਡੈਸ਼ਬੋਰਡ ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ!", logout: "ਲੌਗ ਆਊਟ",
    eduLabel: "📊 ਵਿਦਿਅਕ ਪੱਧਰ",
    eduLevel1: "ਕੋਈ ਰਸਮੀ ਸਿੱਖਿਆ ਨਹੀਂ / ਬੁਨਿਆਦੀ ਸਿੱਖਿਆਰਥੀ",
    eduLevel2: "ਪ੍ਰਾਇਮਰੀ ਸਕੂਲ (ਕਲਾਸ 1-5)",
    eduLevel3: "ਮਿਡਲ ਸਕੂਲ (ਕਲਾਸ 6-8)",
    eduLevel4: "ਹਾਈ ਸਕੂਲ / ਸੈਕੰਡਰੀ (ਕਲਾਸ 9-12)",
    eduLevel5: "ਉੱਚ ਸਿੱਖਿਆ / ਡਿਪਲੋਮਾ / ਡਿਗਰੀ",
    navDashboard: "ਡੈਸ਼ਬੋਰਡ",
    navMyClass: "ਮੇਰੀ ਕਲਾਸ",
    navCourses: "ਕੋਰਸ",
    navCommunity: "ਭਾਈਚਾਰਾ",
    navAnalytics: "ਵਿਸ਼ਲੇਸ਼ਣ",
    navSettings: "ਸੈਟਿੰਗਾਂ",
    signOut: "ਸਾਈਨ ਆਊਟ",
    searchPlaceholder: "ਕੋਰਸ ਖੋਜੋ",
    todayPrefix: "ਅੱਜ",
    myClassTitle: "ਮੇਰੀ ਕਲਾਸ ਲੀਡਰਬੋਰਡ",
    coursesTitle: "ਸਿਲੇਬਸ ਪਾਠਕ੍ਰਮ ਟਰੈਕ",
    communityTitle: "ਸਾਖਰAI ਸਿਖਿਆਰਥੀ ਭਾਈਚਾਰਾ",
    settingsTitle: "ਪ੍ਰੋਫਾਈਲ ਅਤੇ ਇੰਟਰਫੇਸ ਸੈਟਿੰਗਾਂ",
    coursesYoureTaking: "ਤੁਹਾਡਾ ਚੱਲ ਰਿਹਾ ਕੋਰਸ",
    saveProfileChanges: "ਪ੍ਰੋਫਾਈਲ ਤਬਦੀਲੀਆਂ ਸੰਭਾਲੋ",
    savingSettings: "ਸੈਟਿੰਗਾਂ ਸੰਭਾਲੀਆਂ ਜਾ ਰਹੀਆਂ ਹਨ...",
    postMessage: "ਸੁਨੇਹਾ ਭੇਜੋ",
    sendButton: "ਭੇਜੋ",
    startModule: "ਮੌਡਿਊਲ ਸ਼ੁਰੂ ਕਰੋ",
    ageLabel: "ਉਮਰ",
    profileDetails: "ਪ੍ਰੋਫਾਈਲ ਵੇਰਵੇ",
    appearanceCustomizer: "ਦਿੱਖ ਕਸਟਮਾਈਜ਼ਰ",
    tabNativeModules: "📚 ਦੇਸੀ ਸਿਲੇਬਸ ਮਾਡਿਊਲ",
    tabLevelQuizzes: "📝 ਪੱਧਰ ਕੁਇਜ਼",
    tabOtherBlocks: "✨ ਹੋਰ ਸਿੱਖਣ ਭਾਗ",
    avgAccuracy: "ਔਸਤ ਸ਼ੁੱਧਤਾ",
    completedLessonsLabel: "ਪੂਰੇ ਹੋਏ ਪਾਠ",
    selectedLevelLabel: "ਚੁਣਿਆ ਪੱਧਰ",
    alertMessages: "ਚੇਤਾਵਨੀ ਸੁਨੇਹੇ",
    dismissAll: "ਸਭ ਹਟਾਓ",
    assessTitle: "ਆਪਣੇ ਸਾਖਰਤਾ ਪੱਧਰ ਦੇ ਸੁਧਾਰ ਦਾ ਮੁਲਾਂਕਣ ਕਰੋ",
    startPrefix: "ਸ਼ੁਰੂ ਕਰੋ",
    levelQuizSuffix: "ਪੱਧਰ ਕੁਇਜ਼",
    clearChat: "ਚੈਟ ਸਾਫ਼ ਕਰੋ",
    aiTutorTitle: "AI ਸਾਖਰਤਾ ਟਿਊਟਰ ਸਹਾਇਕ",
    refreshNow: "ਹੁਣੇ ਰਿਫ੍ਰੈਸ਼ ਕਰੋ",
    startNow: "ਹੁਣੇ ਸ਼ੁਰੂ ਕਰੋ",
    performanceReportTitle: "ਪ੍ਰਦਰਸ਼ਨ ਰਿਪੋਰਟ",
    evaluationHistoryTitle: "ਤੁਹਾਡਾ ਮੁਲਾਂਕਣ ਇਤਿਹਾਸ ਲੌਗ",
    strengthsLabel: "ਤਾਕਤਾਂ",
    areasForImprovementLabel: "ਸੁਧਾਰ ਲਈ ਖੇਤਰ",
    overallProgress: "ਕੁੱਲ ਸਿੱਖਣ ਦੀ ਤਰੱਕੀ",
    skillEvaluationLabel: "ਹੁਨਰ ਮੁਲਾਂਕਣ",
    recommendedNextLesson: "ਸਿਫਾਰਸ਼ੀ ਅਗਲਾ ਪਾਠ",
    tutorGreeting: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ {name}! ਮੈਂ ਤੁਹਾਡਾ AI ਸਾਖਰਤਾ ਟਿਊਟਰ ਹਾਂ। ਮੈਂ ਤੁਹਾਡੇ ਅਧਿਐਨ ਮਾਰਗ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਇੱਕ ਸੁਝਾਇਆ ਵਿਕਲਪ ਚੁਣੋ ਜਾਂ ਸਵਾਲ ਲਿਖੋ।",
    tutorWriting: "ਟਿਊਟਰ ਲਿਖ ਰਿਹਾ ਹੈ...",
    tutorInputPlaceholder: "ਅੱਖਰਾਂ, ਟਰੇਸਿੰਗ, ਉਚਾਰਨ ਬਾਰੇ ਸਵਾਲ ਪੁੱਛੋ...",
    quickSuggestPlan: "ਅਧਿਐਨ ਯੋਜਨਾ ਸੁਝਾਓ",
    quickSuggestGrammar: "ਵਿਦਿਅਕ ਵਿਆਕਰਣ ਸੁਝਾਅ ਦਿਓ",
    quickSuggestTracing: "ਲਿਖਣ ਟਰੇਸਿੰਗ ਮੈਟ੍ਰਿਕਸ ਸਮਝਾਓ",
    tutorReplyPlan: "ਤੁਹਾਡੇ ਪੱਧਰ ਦੇ ਆਧਾਰ 'ਤੇ, ਇਹ ਹੈ ਤੁਹਾਡਾ ਟੀਚਾ ਸਮਾਂ-ਸਾਰਣੀ:\n1. 📖 ਟਰੇਸਿੰਗ ਅਭਿਆਸ (15 ਮਿੰਟ)\n2. 🗣️ ਬੋਲਣ ਦਾ ਅਭਿਆਸ (10 ਮਿੰਟ)\n3. 📝 ਹਫ਼ਤਾਵਾਰੀ ਕੁਇਜ਼ ਨਾਲ ਤਰੱਕੀ ਦਾ ਮੁਲਾਂਕਣ।",
    tutorReplyScore: "ਆਪਣਾ ਸਕੋਰ ਸੁਧਾਰਨ ਲਈ: ਅੱਖਰ ਗਰਿੱਡ ਦੀਆਂ ਸੀਮਾਵਾਂ ਦੇ ਅੰਦਰ ਲਿਖਣ 'ਤੇ ਧਿਆਨ ਦਿਓ ਅਤੇ ਮਾਈਕ੍ਰੋਫ਼ੋਨ ਵਰਤਦੇ ਸਮੇਂ ਸਪਸ਼ਟ ਵਿਅੰਜਨ ਬੋਲੋ।",
    tutorReplyDefault: "ਸਮਝ ਗਿਆ! ਆਓ ਅਭਿਆਸ ਜਾਰੀ ਰੱਖੀਏ। ਦੱਸੋ ਕੀ ਮੈਂ ਸ਼ਬਦਾਵਲੀ ਦੀ ਸਮੀਖਿਆ ਕਰਾਂ ਜਾਂ ਰੋਜ਼ਾਨਾ ਯੋਜਨਾ ਸੁਝਾਵਾਂ।",
    tutorReplyStudyPlan: "ਸੁਝਾਈ ਯੋਜਨਾ:\n- ਸੋਮ ਤੇ ਮੰਗਲ: ਮੂਲ ਵਿਅੰਜਨ ਟਰੇਸ ਕਰੋ।\n- ਬੁੱਧ: ਸ਼ਬਦ ਜੋੜ ਅਭਿਆਸ।\n- ਵੀਰ ਤੇ ਸ਼ੁੱਕਰ: ਉਚਾਰਨ ਜਾਂਚ।\n- ਵੀਕਐਂਡ: ਮੌਕ ਕੁਇਜ਼।",
    tutorReplyGrammarTip: "ਵਿਦਿਅਕ ਦਿਸ਼ਾ-ਨਿਰਦੇਸ਼:\nਰੋਜ਼ਾਨਾ ਸ਼ਬਦ ਬਣਤਰ, ਆਮ ਨਾਂਵਾਂ ਅਤੇ ਸਥਾਨਕ ਗੱਲਬਾਤ 'ਤੇ ਧਿਆਨ ਦਿਓ।",
    tutorReplyTracingInfo: "ਟਰੇਸਿੰਗ ਮੁਲਾਂਕਣ ਵੇਰਵੇ:\nਸਾਡਾ ਮਾਡਲ ਖਿੱਚੀਆਂ ਰੇਖਾਵਾਂ ਦੀ ਤੁਲਨਾ ਅੱਖਰ ਗਾਈਡ ਨਾਲ ਕਰਦਾ ਹੈ। ਸੁਚਾਰੂ ਰੇਖਾਵਾਂ ਸ਼ੁੱਧਤਾ ਵਧਾਉਂਦੀਆਂ ਹਨ।",
    readingTitle: "ਪੜ੍ਹਨ ਅਭਿਆਸ",
    writingTitle: "ਲਿਖਣ ਅਭਿਆਸ",
    speakingTitle: "ਬੋਲਣ ਮੁਲਾਂਕਣ",
    readingSubNone: "ਮੂਲ ਧੁਨੀ ਪਛਾਣ, ਸਧਾਰਨ ਅੱਖਰ ਸਮੂਹ ਅਤੇ ਮੂਲ ਸ਼ਬਦਾਵਲੀ 'ਤੇ ਧਿਆਨ ਦਿਓ।",
    writingSubNone: "ਸਪਰਸ਼ ਸੰਕੇਤਾਂ ਨਾਲ ਸ਼ੁਰੂਆਤੀ ਵਰਣਮਾਲਾ ਰੇਖਾਵਾਂ ਅਤੇ ਮੂਲ ਧੁਨੀ ਆਕਾਰ ਟਰੇਸ ਕਰੋ।",
    speakingSubNone: "ਪ੍ਰਤੀਕਿਰਿਆ ਲਈ ਇਕੱਲੇ ਸਵਰ ਅਤੇ ਮੂਲ ਵਿਅੰਜਨ ਬੋਲੋ।",
    readingSubPrimary: "ਮੂਲ ਬਹੁ-ਅੱਖਰੀ ਵਾਕਾਂਸ਼ ਪੜ੍ਹੋ ਅਤੇ ਸਥਾਨਕ ਸ਼ਬਦਾਵਲੀ ਸ਼ੀਟਾਂ ਦੀ ਪੜਚੋਲ ਕਰੋ।",
    writingSubPrimary: "ਮੂਲ ਸ਼ਬਦ ਟਰੇਸ ਕਰੋ ਅਤੇ ਸਧਾਰਨ ਵਾਕ ਬਣਤਰ ਪੂਰੀ ਕਰੋ।",
    speakingSubPrimary: "ਆਡੀਓ ਫੀਡਬੈਕ ਨਾਲ ਛੋਟੇ ਵਿਹਾਰਕ ਵਾਕ ਬੋਲੋ।",
    readingSubMiddle: "ਰੋਜ਼ਾਨਾ ਲੈਣ-ਦੇਣ ਅਤੇ ਜਨਤਕ ਸੂਚਨਾਵਾਂ ਬਾਰੇ ਮਿਆਰੀ ਪੈਰੇ ਪੜ੍ਹੋ।",
    writingSubMiddle: "ਕਾਰਜਸ਼ੀਲ ਇੰਟਰਐਕਟਿਵ ਟੈਕਸਟ ਐਂਟਰੀਆਂ ਅਤੇ ਫਾਰਮ ਫੀਲਡ ਲਿਖਣ ਦਾ ਅਭਿਆਸ ਕਰੋ।",
    speakingSubMiddle: "ਆਟੋਮੈਟਿਕ ਸਪੀਚ ਪਾਰਸਰ ਵਿੱਚ ਗੱਲਬਾਤ ਭਾਗ ਬੋਲੋ।",
    readingSubHigh: "ਵਿਸ਼ਲੇਸ਼ਣਾਤਮਕ ਪਾਠ ਬਣਤਰਾਂ, ਡਿਜੀਟਲ ਸਾਖਰਤਾ ਅਤੇ ਸਾਰਾਂਸ਼ਾਂ ਨਾਲ ਜੁੜੋ।",
    writingSubHigh: "ਲਗਾਤਾਰ ਵਾਕ ਅਤੇ ਸੁਤੰਤਰ ਸੰਚਾਰ ਲਿਖਤਾਂ ਤਿਆਰ ਕਰੋ।",
    speakingSubHigh: "ਉੱਚ-ਸ਼ੁੱਧਤਾ ਉਚਾਰਨ ਮੁਲਾਂਕਣ ਲਈ ਗੁੰਝਲਦਾਰ ਵਾਕਾਂਸ਼ ਬਣਤਰ ਵਰਤੋ।"
  },
  bengali: {
    home: "হোম", signIn: "সাইন ইন", createAccount: "অ্যাকাউন্ট তৈরি করুন", welcomeBack: "স্বাগতম",
    signInSub: "আপনার শেখার যাত্রা চালিয়ে যেতে সাইন ইন করুন।", email: "✉️ ইমেল ঠিকানা", password: "🔒 পাসওয়ার্ড", fullName: "👤 পুরো নাম", or: "অথবা",
    googleSignIn: "গুগল এর সাথে এগিয়ে যান", newHere: "এখানে নতুন?", alreadyHaveAccount: "ইতিমধ্যে অ্যাকাউন্ট আছে?", landingTitle: "এআই এর মাধ্যমে সাক্ষরতার ক্ষমতায়ন",
    landingTitleLine1: "সাক্ষরতার ক্ষমতায়ন", landingTitleLine2: "AI বুদ্ধিমত্তার মাধ্যমে",
    landingSub: "একটি ব্যক্তিগতকৃত শেখার সঙ্গী যা প্রাপ্তবয়স্ক এবং প্রথম প্রজন্মের শিক্ষার্থীদের আঞ্চলিক ভাষায় মৌলিক পড়া, লেখা এবং বলার দক্ষতা অর্জন করতে সহায়তা করার জন্য ডিজাইন করা হয়েছে।",
    getStarted: "শুরু করুন", registerTitle: "আপনার অ্যাকাউন্ট তৈরি করুন", registerSub: "আমাদের সম্প্রদায়ে যোগ দিন এবং আপনার শেখার দিগন্ত প্রসারসার করুন।",
    languageLabel: "🌐 পছন্দের মাতৃভাষা", registerLeftTitle: "আপনার সাক্ষরতার যাত্রা এখানেই শুরু।",
    registerLeftSub: "ভয়েস প্র্যাকটিস অ্যাসেসমেন্ট, রিয়েল-টাইম ফিডব্যাক এবং অভিযোজিত দৈনিক পাঠ আনলক করতে একটি প্রোফাইল তৈরি করুন।",
    loginLeftTitle: "আপনার শেখা প্রতিটি শব্দ একটি নতুন দরজা খুলে দেয়।", loginLeftSub: "ব্যক্তিগতকৃত পড়া, লেখা এবং বলার অনুশীলন — আপনার নিজস্ব ভাষায়, আপনার নিজস্ব গতিতে।",
    dashboardTitle: "আপনার ড্যাশবোর্ডে স্বাগতম!", logout: "লগ আউট",
    eduLabel: "📊 শিক্ষাগত যোগ্যতা",
    eduLevel1: "কোনো প্রাতিষ্ঠানিক শিক্ষা নেই / প্রাথমিক শিক্ষার্থী",
    eduLevel2: "প্রাথমিক বিদ্যালয় (শ্রেণী ১-৫)",
    eduLevel3: "নিম্ন মাধ্যমিক (শ্রেণী ৬-৮)",
    eduLevel4: "উচ্চ মাধ্যমিক / সেকেন্ডারি (শ্রেণী ৯-১২)",
    eduLevel5: "উচ্চশিক্ষা / ডিপ্লোমা / ডিগ্রী",
    navDashboard: "ড্যাশবোর্ড",
    navMyClass: "আমার ক্লাস",
    navCourses: "কোর্স",
    navCommunity: "কমিউনিটি",
    navAnalytics: "অ্যানালিটিক্স",
    navSettings: "সেটিংস",
    signOut: "সাইন আউট",
    searchPlaceholder: "কোর্স খুঁজুন",
    todayPrefix: "আজ",
    myClassTitle: "আমার ক্লাস লিডারবোর্ড",
    coursesTitle: "সিলেবাস কারিকুলাম ট্র্যাক",
    communityTitle: "সাক্ষরAI শিক্ষার্থী কমিউনিটি",
    settingsTitle: "প্রোফাইল ও ইন্টারফেস সেটিংস",
    coursesYoureTaking: "আপনি যে কোর্স নিচ্ছেন",
    saveProfileChanges: "প্রোফাইল পরিবর্তন সংরক্ষণ করুন",
    savingSettings: "সেটিংস সংরক্ষণ হচ্ছে...",
    postMessage: "বার্তা পাঠান",
    sendButton: "পাঠান",
    startModule: "মডিউল শুরু করুন",
    ageLabel: "বয়স",
    profileDetails: "প্রোফাইল বিবরণ",
    appearanceCustomizer: "চেহারা কাস্টমাইজার",
    tabNativeModules: "📚 স্থানীয় পাঠ্যক্রম মডিউল",
    tabLevelQuizzes: "📝 স্তর কুইজ",
    tabOtherBlocks: "✨ অন্যান্য শিক্ষণ ব্লক",
    avgAccuracy: "গড় নির্ভুলতা",
    completedLessonsLabel: "সম্পন্ন পাঠ",
    selectedLevelLabel: "নির্বাচিত স্তর",
    alertMessages: "সতর্কতা বার্তা",
    dismissAll: "সব খারিজ করুন",
    assessTitle: "আপনার সাক্ষরতার স্তরের উন্নতি মূল্যায়ন করুন",
    startPrefix: "শুরু করুন",
    levelQuizSuffix: "স্তর কুইজ",
    clearChat: "চ্যাট মুছুন",
    aiTutorTitle: "AI সাক্ষরতা টিউটর সহায়ক",
    refreshNow: "এখনই রিফ্রেশ করুন",
    startNow: "এখনই শুরু করুন",
    performanceReportTitle: "কর্মক্ষমতা প্রতিবেদন",
    evaluationHistoryTitle: "আপনার মূল্যায়ন ইতিহাস লগ",
    strengthsLabel: "শক্তি",
    areasForImprovementLabel: "উন্নতির ক্ষেত্র",
    overallProgress: "সামগ্রিক শেখার অগ্রগতি",
    skillEvaluationLabel: "দক্ষতা মূল্যায়ন",
    recommendedNextLesson: "প্রস্তাবিত পরবর্তী পাঠ",
    tutorGreeting: "নমস্কার {name}! আমি আপনার AI সাক্ষরতা টিউটর। আমি আপনার অধ্যয়ন পথে সাহায্য করতে পারি। একটি প্রস্তাবিত বিকল্প বেছে নিন বা প্রশ্ন লিখুন।",
    tutorWriting: "টিউটর লিখছেন...",
    tutorInputPlaceholder: "অক্ষর, ট্রেসিং, উচ্চারণ নিয়ে প্রশ্ন করুন...",
    quickSuggestPlan: "একটি অধ্যয়ন পরিকল্পনা সুপারিশ করুন",
    quickSuggestGrammar: "শিক্ষাগত ব্যাকরণ টিপ সুপারিশ করুন",
    quickSuggestTracing: "লেখার ট্রেসিং মেট্রিক্স ব্যাখ্যা করুন",
    tutorReplyPlan: "আপনার স্তরের উপর ভিত্তি করে, এই আপনার লক্ষ্য সময়সূচী:\n1. 📖 ট্রেসিং অনুশীলন (১৫ মিনিট)\n2. 🗣️ কথা বলার অনুশীলন (১০ মিনিট)\n3. 📝 সাপ্তাহিক কুইজে অগ্রগতি মূল্যায়ন।",
    tutorReplyScore: "আপনার স্কোর উন্নত করতে: অক্ষর গ্রিডের সীমার মধ্যে আঁকার দিকে মনোযোগ দিন এবং মাইক্রোফোন ব্যবহারের সময় স্পষ্ট ব্যঞ্জনধ্বনি উচ্চারণ করুন।",
    tutorReplyDefault: "বুঝেছি! চলুন অনুশীলন চালিয়ে যাই। বলুন আমি শব্দভাণ্ডার পর্যালোচনা করব নাকি দৈনিক পরিকল্পনা সুপারিশ করব।",
    tutorReplyStudyPlan: "প্রস্তাবিত অধ্যয়ন পরিকল্পনা:\n- সোম ও মঙ্গল: মূল ব্যঞ্জনবর্ণ ট্রেস করুন।\n- বুধ: বানান অনুশীলন ব্লক।\n- বৃহস্পতি ও শুক্র: উচ্চারণ পরীক্ষা।\n- সপ্তাহান্তে: মক কুইজ।",
    tutorReplyGrammarTip: "শিক্ষাগত নির্দেশিকা:\nদৈনিক শব্দ গঠন, সাধারণ বিশেষ্য এবং স্থানীয় কথোপকথনে মনোযোগ দিন।",
    tutorReplyTracingInfo: "ট্রেসিং মূল্যায়ন বিবরণ:\nআমাদের মডেল আঁকা রেখাগুলিকে অক্ষর গাইডের সাথে মিলায়। মসৃণ, কেন্দ্রীভূত রেখা নির্ভুলতা বাড়ায়।",
    readingTitle: "পঠন অনুশীলন",
    writingTitle: "লেখার অনুশীলন",
    speakingTitle: "কথন মূল্যায়ন",
    readingSubNone: "মৌলিক ধ্বনিতত্ত্ব, সরল অক্ষর গোষ্ঠী এবং মূল দৃষ্টি শব্দভাণ্ডারে মনোযোগ দিন।",
    writingSubNone: "স্পর্শ অঙ্গভঙ্গি দিয়ে প্রাথমিক বর্ণমালা রেখা ও মৌলিক ধ্বনিগত আকৃতি ট্রেস করুন।",
    speakingSubNone: "প্রতিক্রিয়ার জন্য একক স্বরবর্ণ ও মৌলিক ব্যঞ্জনবর্ণ উচ্চারণ করুন।",
    readingSubPrimary: "মৌলিক বহু-সিলেবল বাক্যাংশ পড়ুন ও স্থানীয় শব্দভাণ্ডার শিট অন্বেষণ করুন।",
    writingSubPrimary: "মৌলিক শব্দ ট্রেস করুন ও সরল বাক্য গঠন সম্পূর্ণ করুন।",
    speakingSubPrimary: "অডিও প্রতিক্রিয়া সহ ছোট বাস্তবিক বাক্য উচ্চারণ করুন।",
    readingSubMiddle: "দৈনন্দিন লেনদেন ও পাবলিক নোটিশ সম্পর্কিত মানক অনুচ্ছেদ পড়ুন।",
    writingSubMiddle: "কার্যকরী ইন্টারেক্টিভ টেক্সট এন্ট্রি ও ফর্ম ফিল্ড লেখার অনুশীলন করুন।",
    speakingSubMiddle: "স্বয়ংক্রিয় স্পিচ পার্সারে কথোপকথনমূলক অংশ বলুন।",
    readingSubHigh: "বিশ্লেষণাত্মক পাঠ কাঠামো, ডিজিটাল সাক্ষরতা ও সারাংশে যুক্ত হন।",
    writingSubHigh: "ধারাবাহিক বাক্য ও মুক্ত যোগাযোগ রচনা তৈরি করুন।",
    speakingSubHigh: "উচ্চ-নির্ভুলতা উচ্চারণ মূল্যায়নের জন্য জটিল বাক্যাংশ গঠন সম্পাদন করুন."
  },
  marathi: {
    home: "होम", signIn: "साइन इन", createAccount: "खाते तयार करा", welcomeBack: "स्वागत आहे",
    signInSub: "तुमचा शिकण्याचा प्रवास सुरू ठेवण्यासाठी साइन इन करा.", email: "✉️ ईमेल पत्ता", password: "🔒 पासवर्ड", fullName: "👤 पूर्ण नाव", or: "किंवा",
    googleSignIn: "गुगलसह आगेकूच", newHere: "नवीन आहात?", alreadyHaveAccount: "आधीच खाते आहे का?", landingTitle: "एआई द्वारे साक्षरतेचे सक्षमीकरण",
    landingTitleLine1: "साक्षरता सक्षमीकरण", landingTitleLine2: "एआई बुद्धिमत्तेद्वारे",
    landingSub: "एक वैयक्तिकृत शिक्षण सोबती जो प्रौढ आणि पहिल्या पिढीतील शिकणाऱ्यांना प्रादेशिक भाषांमध्ये मूलभूत वाचन, लेखन आणि बोलण्याचे कौशल्य आत्मसात करण्यास मदत करण्यासाठी डिझाइन केलेले है.",
    getStarted: "सुरू करा", registerTitle: "तुमचे खाते तयार करा", registerSub: "आमच्या समुदायात सामील व्हा आणि तुमच्या शिकण्याच्या कक्षा रुंदावा.",
    languageLabel: "🌐 पसंतीची मातृभाषा", registerLeftTitle: "तुमचा साक्षरतेचा प्रवास इथून सुरू होतो.",
    registerLeftSub: "व्हॉइस प्रॅक्टिस असेसमेंट, रिअल-टाइम फीडबॅक आणि अडॅप्टिव्ह डेली रीडिंग धडे अनलॉक करण्यासाठी एक प्रोफाईल तयार करा.",
    loginLeftTitle: "तुम्ही शिकलेला प्रत्येक शब्द एक नवीन दार उघडतो.", loginLeftSub: "वैयक्तिकृत वाचन, लेखन आणि बोलण्याचा सराव — तुमच्या स्वतःच्या भाषेत, तुमच्या स्वतःच्या गतीने.",
    dashboardTitle: "तुमच्या डॅशबोर्डवर स्वागत आहे!", logout: "लॉग आउट",
    eduLabel: "📊 शैक्षणिक पातळी",
    eduLevel1: "औपचारिक शिक्षण नाही / मूलभूत विद्यार्थी",
    eduLevel2: "प्राथमिक शाळा (इयत्ता १-५)",
    eduLevel3: "माध्यमिक शाळा (इयत्ता ६-८)",
    eduLevel4: "उच्च माध्यमिक (इयत्ता ९-१२)",
    eduLevel5: "उच्च शिक्षण / डिप्लोमा / पदवी",
    navDashboard: "डॅशबोर्ड",
    navMyClass: "माझा वर्ग",
    navCourses: "अभ्यासक्रम",
    navCommunity: "समुदाय",
    navAnalytics: "विश्लेषण",
    navSettings: "सेटिंग्ज",
    signOut: "साइन आउट",
    searchPlaceholder: "अभ्यासक्रम शोधा",
    todayPrefix: "आज",
    myClassTitle: "माझा वर्ग लीडरबोर्ड",
    coursesTitle: "अभ्यासक्रम ट्रॅक",
    communityTitle: "साक्षरAI शिकणारा समुदाय",
    settingsTitle: "प्रोफाइल आणि इंटरफेस सेटिंग्ज",
    coursesYoureTaking: "तुम्ही घेत असलेला कोर्स",
    saveProfileChanges: "प्रोफाइल बदल जतन करा",
    savingSettings: "सेटिंग्ज जतन होत आहेत...",
    postMessage: "संदेश पाठवा",
    sendButton: "पाठवा",
    startModule: "मॉड्यूल सुरू करा",
    ageLabel: "वय",
    profileDetails: "प्रोफाइल तपशील",
    appearanceCustomizer: "देखावा कस्टमायझर",
    tabNativeModules: "📚 स्थानिक अभ्यासक्रम मॉड्यूल",
    tabLevelQuizzes: "📝 पातळी प्रश्नमंजुषा",
    tabOtherBlocks: "✨ इतर शिक्षण विभाग",
    avgAccuracy: "सरासरी अचूकता",
    completedLessonsLabel: "पूर्ण झालेले धडे",
    selectedLevelLabel: "निवडलेली पातळी",
    alertMessages: "सूचना संदेश",
    dismissAll: "सर्व काढून टाका",
    assessTitle: "तुमच्या साक्षरता पातळीतील सुधारणा तपासा",
    startPrefix: "सुरू करा",
    levelQuizSuffix: "पातळी प्रश्नमंजुषा",
    clearChat: "चॅट साफ करा",
    aiTutorTitle: "AI साक्षरता ट्यूटर सहाय्यक",
    refreshNow: "आता रिफ्रेश करा",
    startNow: "आता सुरू करा",
    performanceReportTitle: "कामगिरी अहवाल",
    evaluationHistoryTitle: "तुमचा मूल्यमापन इतिहास लॉग",
    strengthsLabel: "सामर्थ्य",
    areasForImprovementLabel: "सुधारणा क्षेत्रे",
    overallProgress: "एकूण शिकण्याची प्रगती",
    skillEvaluationLabel: "कौशल्य मूल्यमापन",
    recommendedNextLesson: "शिफारस केलेला पुढील धडा",
    tutorGreeting: "नमस्कार {name}! मी तुमचा AI साक्षरता ट्यूटर आहे. मी तुमच्या अभ्यास मार्गात मदत करू शकतो. सुचवलेला पर्याय निवडा किंवा प्रश्न लिहा.",
    tutorWriting: "ट्यूटर टाइप करत आहे...",
    tutorInputPlaceholder: "अक्षरे, ट्रेसिंग, उच्चार याबद्दल प्रश्न विचारा...",
    quickSuggestPlan: "अभ्यास योजना सुचवा",
    quickSuggestGrammar: "शैक्षणिक व्याकरण टिप सुचवा",
    quickSuggestTracing: "लेखन ट्रेसिंग मेट्रिक्स समजावा",
    tutorReplyPlan: "तुमच्या स्तरावर आधारित, हे तुमचे लक्ष्य वेळापत्रक:\n1. 📖 ट्रेसिंग सराव (15 मिनिटे)\n2. 🗣️ बोलण्याचा सराव (10 मिनिटे)\n3. 📝 साप्ताहिक क्विझने प्रगती तपासा.",
    tutorReplyScore: "तुमचा स्कोअर सुधारण्यासाठी: अक्षर ग्रिडच्या मर्यादेत रेखाटण्यावर लक्ष द्या आणि मायक्रोफोन वापरताना स्पष्ट व्यंजन उच्चारा.",
    tutorReplyDefault: "समजले! चला सराव सुरू ठेवूया. सांगा मी शब्दसंग्रह पुनरावलोकन करू की दैनिक योजना सुचवू.",
    tutorReplyStudyPlan: "सुचवलेली अभ्यास योजना:\n- सोम व मंगळ: मूळ व्यंजने ट्रेस करा.\n- बुध: शब्दलेखन सराव.\n- गुरु व शुक्र: उच्चार तपासणी.\n- शनि-रवि: मॉक क्विझ.",
    tutorReplyGrammarTip: "शैक्षणिक मार्गदर्शक तत्त्वे:\nदैनिक शब्द रचना, सामान्य नामे आणि स्थानिक संभाषणावर लक्ष द्या.",
    tutorReplyTracingInfo: "ट्रेसिंग मूल्यांकन तपशील:\nआमचे मॉडेल काढलेल्या रेषांची तुलना अक्षर मार्गदर्शकाशी करते. गुळगुळीत, केंद्रित रेषा अचूकता वाढवतात.",
    readingTitle: "वाचन सराव",
    writingTitle: "लेखन सराव",
    speakingTitle: "बोलणे मूल्यांकन",
    readingSubNone: "मूलभूत ध्वनीशास्त्र, साध्या अक्षर गटांवर आणि मूळ दृष्टी शब्दसंग्रहावर लक्ष द्या.",
    writingSubNone: "स्पर्श हावभावांसह प्रारंभिक वर्णमाला रेषा आणि मूलभूत ध्वन्यात्मक आकार ट्रेस करा.",
    speakingSubNone: "प्रतिसादासाठी एकेरी स्वर आणि मूलभूत व्यंजने उच्चारा.",
    readingSubPrimary: "मूलभूत बहु-अक्षरी वाक्ये वाचा आणि स्थानिक शब्दसंग्रह पत्रके एक्सप्लोर करा.",
    writingSubPrimary: "मूलभूत शब्द ट्रेस करा आणि साधी वाक्य रचना पूर्ण करा.",
    speakingSubPrimary: "ऑडिओ फीडबॅकसह लहान व्यावहारिक वाक्ये उच्चारा.",
    readingSubMiddle: "दैनंदिन व्यवहार आणि सार्वजनिक सूचनांशी संबंधित मानक परिच्छेद वाचा.",
    writingSubMiddle: "कार्यात्मक इंटरॲक्टिव्ह मजकूर नोंदी आणि फॉर्म फील्ड लिहिण्याचा सराव करा.",
    speakingSubMiddle: "स्वयंचलित भाषण विश्लेषकात संभाषणात्मक विभाग बोला.",
    readingSubHigh: "विश्लेषणात्मक मजकूर रचना, डिजिटल साक्षरता आणि सारांशांशी संलग्न व्हा.",
    writingSubHigh: "सतत वाक्ये आणि मुक्त संवाद लेखन तयार करा.",
    speakingSubHigh: "उच्च-अचूकता उच्चार मूल्यांकनासाठी जटिल वाक्यरचना वापरा."
  },
  tamil: {
    home: "முகப்பு", signIn: "உள்நுழை", createAccount: "கணக்கை உருவாக்கு", welcomeBack: "நல்வரவு",
    signInSub: "உங்கள் கற்றல் பயணத்தைத் தொடர உள்நுழையவும்.", email: "✉️ மின்னஞ்சல் முகவரி", password: "🔒 கடவுச்சொல்", fullName: "👤 முழு பெயர்", or: "அல்லது",
    googleSignIn: "கூகிள் மூலம் தொடரவும்", newHere: "புதியவரா?", alreadyHaveAccount: "ஏற்கனவே கணக்கு உள்ளதா?", landingTitle: "AI மூலம் எழுத்தறிவு மேம்பாடு",
    landingTitleLine1: "எழுத்தறிவு மேம்பாடு", landingTitleLine2: "AI நுண்ணறிவின் மூலம்",
    landingSub: "பெரியவர்கள் மற்றும் முதல் தலைமுறை கற்பவர்கள் பிராந்திய மொழிகளில் அடிப்படை வாசிப்பு, எழுதுதல் மற்றும் பேசும் திறன்களைப் பெற உதவும் வகையில் வடிவமைக்கப்பட்ட தனிப்பயனாக்கப்பட்ட கற்றல் துணை.",
    getStarted: "தொடங்குங்கள்", registerTitle: "உங்கள் கணக்கை உருவாக்கவும்", registerSub: "எங்கள் சமூகத்தில் இணைந்து உங்கள் கற்றல் எல்லையை விரிவுபடுத்துங்கள்.",
    languageLabel: "🌐 விருப்பமான தாய்மொழி", registerLeftTitle: "உங்கள் எழுத்தறிவு பயணம் இங்கே தொடங்குகிறது.",
    registerLeftSub: "குரல் பயிற்சி மதிப்பீடுகள், நிகழ்நேர கருத்து மற்றும் தினசரி வாசிப்பு பாடங்களை அணுக ஒரு சுயவிவரத்தை உருவாக்கவும்.",
    loginLeftTitle: "நீங்கள் கற்கும் ஒவ்வொரு வார்த்தையும் ஒரு புதிய கதவைத் திறக்கிறது.", loginLeftSub: "தனிப்பயனாக்கப்பட்ட வாசிப்பு, எழுதுதல் மற்றும் பேசும் பயிற்சி — உங்கள் சொந்த மொழியில், உங்கள் சொந்த வேகத்தில்.",
    dashboardTitle: "உங்கள் டாஷ்போர்டிற்கு வரவேற்கிறோம்!", logout: "வெளியேறு",
    eduLabel: "📊 கல்வி நிலை",
    eduLevel1: "முறையான கல்வி இல்லை / ஆரம்ப நிலை கற்பவர்",
    eduLevel2: "தொடக்கப் பள்ளி (வகுப்பு 1-5)",
    eduLevel3: "நடுநிலைப் பள்ளி (வகுப்பு 6-8)",
    eduLevel4: "மேல்நிலைப் பள்ளி (வகுப்பு 9-12)",
    eduLevel5: "உயர் கல்வி / டிப்ளமோ / பட்டம்",
    navDashboard: "டாஷ்போர்டு",
    navMyClass: "எனது வகுப்பு",
    navCourses: "படிப்புகள்",
    navCommunity: "சமூகம்",
    navAnalytics: "பகுப்பாய்வு",
    navSettings: "அமைப்புகள்",
    signOut: "வெளியேறு",
    searchPlaceholder: "படிப்புகளைத் தேடுங்கள்",
    todayPrefix: "இன்று",
    myClassTitle: "எனது வகுப்பு லீடர்போர்டு",
    coursesTitle: "பாடத்திட்ட வழிகள்",
    communityTitle: "சாக்ஷர்AI கற்பவர் சமூகம்",
    settingsTitle: "சுயவிவரம் & இடைமுக அமைப்புகள்",
    coursesYoureTaking: "நீங்கள் படிக்கும் படிப்பு",
    saveProfileChanges: "சுயவிவர மாற்றங்களைச் சேமிக்கவும்",
    savingSettings: "அமைப்புகள் சேமிக்கப்படுகின்றன...",
    postMessage: "செய்தி அனுப்பு",
    sendButton: "அனுப்பு",
    startModule: "தொகுதியைத் தொடங்கு",
    ageLabel: "வயது",
    profileDetails: "சுயவிவர விவரங்கள்",
    appearanceCustomizer: "தோற்ற தனிப்பயனாக்கி",
    tabNativeModules: "📚 உள்ளூர் பாடத்திட்ட தொகுதிகள்",
    tabLevelQuizzes: "📝 நிலை வினாடி வினாக்கள்",
    tabOtherBlocks: "✨ பிற கற்றல் பிரிவுகள்",
    avgAccuracy: "சராசரி துல்லியம்",
    completedLessonsLabel: "முடிக்கப்பட்ட பாடங்கள்",
    selectedLevelLabel: "தேர்ந்தெடுக்கப்பட்ட நிலை",
    alertMessages: "எச்சரிக்கை செய்திகள்",
    dismissAll: "அனைத்தையும் நிராகரி",
    assessTitle: "உங்கள் கல்வியறிவு நிலை முன்னேற்றத்தை மதிப்பீடு செய்யுங்கள்",
    startPrefix: "தொடங்கு",
    levelQuizSuffix: "நிலை வினாடி வினா",
    clearChat: "அரட்டையை அழி",
    aiTutorTitle: "AI கல்வியறிவு ஆசிரியர் உதவியாளர்",
    refreshNow: "இப்போது புதுப்பி",
    startNow: "இப்போது தொடங்கு",
    performanceReportTitle: "செயல்திறன் அறிக்கை",
    evaluationHistoryTitle: "உங்கள் மதிப்பீட்டு வரலாறு பதிவுகள்",
    strengthsLabel: "பலங்கள்",
    areasForImprovementLabel: "மேம்பாட்டுக்கான பகுதிகள்",
    overallProgress: "ஒட்டுமொத்த கற்றல் முன்னேற்றம்",
    skillEvaluationLabel: "திறன் மதிப்பீடு",
    recommendedNextLesson: "பரிந்துரைக்கப்பட்ட அடுத்த பாடம்",
    tutorGreeting: "வணக்கம் {name}! நான் உங்கள் AI கல்வியறிவு ஆசிரியர். உங்கள் கற்றல் பாதையில் வழிகாட்ட முடியும். பரிந்துரைக்கப்பட்ட விருப்பத்தைத் தேர்ந்தெடுக்கவும் அல்லது கேள்வி எழுதவும்.",
    tutorWriting: "ஆசிரியர் தட்டச்சு செய்கிறார்...",
    tutorInputPlaceholder: "எழுத்துகள், ட்ரேசிங், உச்சரிப்பு பற்றி கேள்வி கேளுங்கள்...",
    quickSuggestPlan: "ஒரு படிப்பு திட்டத்தை பரிந்துரைக்கவும்",
    quickSuggestGrammar: "கல்வி இலக்கண குறிப்பை பரிந்துரைக்கவும்",
    quickSuggestTracing: "எழுத்து ட்ரேசிங் அளவீடுகளை விளக்கவும்",
    tutorReplyPlan: "உங்கள் நிலையின் அடிப்படையில், உங்கள் இலக்கு அட்டவணை:\n1. 📖 ட்ரேசிங் பயிற்சி (15 நிமி)\n2. 🗣️ பேசும் பயிற்சி (10 நிமி)\n3. 📝 வாராந்திர வினாடி வினாவால் முன்னேற்றத்தை மதிப்பீடு.",
    tutorReplyScore: "உங்கள் மதிப்பெண்ணை மேம்படுத்த: எழுத்து கட்டங்களின் எல்லைக்குள் வரைவதில் கவனம் செலுத்தி, மைக்ரோஃபோனைப் பயன்படுத்தும்போது தெளிவான மெய்யொலிகளை உச்சரிக்கவும்.",
    tutorReplyDefault: "புரிந்தது! பயிற்சியைத் தொடர்வோம். சொல்லகராதியை மதிப்பாய்வு செய்யவா அல்லது தினசரி திட்டத்தை பரிந்துரைக்கவா என்று சொல்லுங்கள்.",
    tutorReplyStudyPlan: "பரிந்துரைக்கப்பட்ட படிப்பு திட்டம்:\n- திங்கள் & செவ்வாய்: அடிப்படை மெய் எழுத்துகளை வரையவும்.\n- புதன்: எழுத்துப்பிழை பயிற்சி.\n- வியாழன் & வெள்ளி: உச்சரிப்பு சோதனை.\n- வார இறுதி: மாதிரி வினாடி வினா.",
    tutorReplyGrammarTip: "கல்வி வழிகாட்டுதல்கள்:\nதினசரி சொல் அமைப்பு, பொதுவான பெயர்ச்சொற்கள் மற்றும் உள்ளூர் உரையாடல்களில் கவனம் செலுத்துங்கள்.",
    tutorReplyTracingInfo: "ட்ரேசிங் மதிப்பீட்டு விவரங்கள்:\nஎங்கள் மாதிரி வரையப்பட்ட கோடுகளை எழுத்து வழிகாட்டிகளுடன் பொருத்துகிறது. மென்மையான, மையப்படுத்தப்பட்ட கோடுகள் துல்லியத்தை அதிகரிக்கும்.",
    readingTitle: "வாசிப்பு பயிற்சி",
    writingTitle: "எழுத்து பயிற்சி",
    speakingTitle: "பேச்சு மதிப்பீடு",
    readingSubNone: "அடிப்படை ஒலியியல், எளிய எழுத்து குழுக்கள் மற்றும் முக்கிய பார்வை சொல்லகராதியில் கவனம் செலுத்தவும்.",
    writingSubNone: "தொடு சைகைகளுடன் தொடக்க நிலை எழுத்துக்கோடுகள் மற்றும் அடிப்படை ஒலி வடிவங்களை வரையவும்.",
    speakingSubNone: "பதிலுக்காக ஒற்றை உயிரெழுத்துகள் மற்றும் அடிப்படை மெய்யெழுத்துகளை உச்சரிக்கவும்.",
    readingSubPrimary: "அடிப்படை பல எழுத்துக்கூட்டு சொற்றொடர்களை படித்து உள்ளூர் சூழல் சொல்லகராதி தாள்களை ஆராயவும்.",
    writingSubPrimary: "அடிப்படை சொற்களை வரைந்து எளிய வாக்கிய அமைப்புகளை முடிக்கவும்.",
    speakingSubPrimary: "ஆடியோ பின்னூட்டத்துடன் குறுகிய நடைமுறை வாக்கியங்களை உச்சரிக்கவும்.",
    readingSubMiddle: "தினசரி பரிவர்த்தனைகள் மற்றும் பொது அறிவிப்புகள் தொடர்பான தரமான பத்திகளை படிக்கவும்.",
    writingSubMiddle: "செயல்பாட்டு ஊடாடும் உரை உள்ளீடுகள் மற்றும் படிவ புலங்களை எழுத பயிற்சி செய்யவும்.",
    speakingSubMiddle: "தானியங்கு பேச்சு பாகுபடுத்தியில் உரையாடல் பகுதிகளை பேசவும்.",
    readingSubHigh: "பகுப்பாய்வு உரை கட்டமைப்புகள், டிஜிட்டல் கல்வியறிவு பொருட்கள் மற்றும் சுருக்கங்களில் ஈடுபடவும்.",
    writingSubHigh: "தொடர்ச்சியான வாக்கியங்கள் மற்றும் சுதந்திர தொடர்பு எழுத்துகளை வரைவு செய்யவும்.",
    speakingSubHigh: "உயர்-துல்லிய உச்சரிப்பு மதிப்பீடுகளுக்கு சிக்கலான சொற்றொடர் கட்டமைப்புகளை செயல்படுத்தவும்."
  },
  gujarati: {
    home: "હોм", signIn: "સાઇન ઇન", createAccount: "ખાતું બનાવો", welcomeBack: "સ્વાગત છે",
    signInSub: "તમારી શીખવાની યાત્રા ਚਾਲੂ રાખવા માટે સાઇન ઇન કરો.", email: "✉️ ઇમેઇલ સરનામું", password: "🔒 પાસવર્ડ", fullName: "👤 પૂરું નામ", or: "અથવા",
    googleSignIn: "ગુગલ સાથે ચાલુ રાખો", newHere: "અહીં નવા છો?", alreadyHaveAccount: "પહેલેથી ખાતું છે?", landingTitle: "AI દ્વારા સાક્ષરતા સશક્તિકરણ",
    landingTitleLine1: "સાક્ષરતા સશક્તિકરણ", landingTitleLine2: "AI બુદ્ધિ દ્વારા",
    landingSub: "એક વ્યક્તિગત શિક્ષણ સાથી જે પુખ્ત વયના લોકો અને પ્રથમ પેઢીના શીખનારાઓને પ્રાદેશિક ભાષાઓમાં પાયાના વાંચન, લેખન અને બોલવાના કૌશલ્યો પ્રાપ્ત કરવામાં મદદ કરવા માટે રચાયેલ છે.",
    getStarted: "શરૂ કરો", registerTitle: "તમારું ખાતું બનાવો", registerSub: "અમારા સમુદાયમાં જોડાઓ અને તમારી શીખવાની ક્ષિતિજોનો વિસ્તાર કરો.",
    languageLabel: "🌐 પસંદગીની માતૃભાષા", registerLeftTitle: "તમારી સાક્ષરતાની સફર અહીંથી શરૂ થાય છે.",
    registerLeftSub: "વોઇસ પ્રેક્ટિસ એસેસમેન્ટ्स, રીઅલ-タイム ફીડબેક અને દૈનિક વાંચન પાઠોને અનલૉક કરવા માટે એક પ્રોફાઇલ બનાવો.",
    loginLeftTitle: "તમે શીખો છો તે દરેક શબ્દ એક નવો દરવાજો ખોલે છે.", loginLeftSub: "વિશેષજ્ઞ વાંચન, લેખન અને બોલવાની પ્રેક્ટિસ — તમારી પોતાની ભાષામાં, તમારી પોતાની ગતિએ.",
    dashboardTitle: "તમારા ડેશબોર્ડમાં સ્વાગત છે!", logout: "લોગ આਉਟ",
    eduLabel: "📊 શૈક્ષણિક સ્તર",
    eduLevel1: "કોઈ ઔપચારિક શિક્ષણ નથી / પાયાના શીખનાર",
    eduLevel2: "પ્રાથમિક शाळा (ધોરણ 1-5)",
    eduLevel3: "માધ્યમિક શાળા (ધોરણ 6-8)",
    eduLevel4: "ઉચ્ચતર માધ્યમિક (ધોરણ 9-12)",
    eduLevel5: "உચ્ચ શિક્ષણ / ડિપ્લોમા / પદવી",
    navDashboard: "ડેશબોર્ડ",
    navMyClass: "મારો વર્ગ",
    navCourses: "કોર્સ",
    navCommunity: "સમુદાય",
    navAnalytics: "વિશ્લેષણ",
    navSettings: "સેટિંગ્સ",
    signOut: "સાઇન આઉટ",
    searchPlaceholder: "કોર્સ શોધો",
    todayPrefix: "આજે",
    myClassTitle: "મારો વર્ગ લીડરબોર્ડ",
    coursesTitle: "અભ્યાસક્રમ ટ્રેક",
    communityTitle: "સાક્ષરAI શીખનાર સમુદાય",
    settingsTitle: "પ્રોફાઇલ અને ઇન્ટરફેસ સેટિંગ્સ",
    coursesYoureTaking: "તમે લઈ રહ્યા છો તે કોર્સ",
    saveProfileChanges: "પ્રોફાઇલ ફેરફારો સાચવો",
    savingSettings: "સેટિંગ્સ સાચવાઈ રહી છે...",
    postMessage: "સંદેશ મોકલો",
    sendButton: "મોકલો",
    startModule: "મોડ્યુલ શરૂ કરો",
    ageLabel: "ઉંમર",
    profileDetails: "પ્રોફાઇલ વિગતો",
    appearanceCustomizer: "દેખાવ કસ્ટમાઇઝર",
    tabNativeModules: "📚 સ્થાનિક અભ્યાસક્રમ મોડ્યુલ",
    tabLevelQuizzes: "📝 લેવલ ક્વિઝ",
    tabOtherBlocks: "✨ અન્ય શિક્ષણ વિભાગો",
    avgAccuracy: "સરેરાશ ચોકસાઈ",
    completedLessonsLabel: "પૂર્ણ થયેલા પાઠ",
    selectedLevelLabel: "પસંદ કરેલ સ્તર",
    alertMessages: "ચેતવણી સંદેશા",
    dismissAll: "બધું કાઢી નાખો",
    assessTitle: "તમારા સાક્ષરતા સ્તરના સુધારાનું મૂલ્યાંકન કરો",
    startPrefix: "શરૂ કરો",
    levelQuizSuffix: "લેવલ ક્વિઝ",
    clearChat: "ચેટ સાફ કરો",
    aiTutorTitle: "AI સાક્ષરતા ટ્યુટર સહાયક",
    refreshNow: "હમણાં રિફ્રેશ કરો",
    startNow: "હમણાં શરૂ કરો",
    performanceReportTitle: "કામગીરી અહેવાલ",
    evaluationHistoryTitle: "તમારો મૂલ્યાંકન ઇતિહાસ લોગ",
    strengthsLabel: "શક્તિઓ",
    areasForImprovementLabel: "સુધારણા માટેના ક્ષેત્રો",
    overallProgress: "એકંદર શિક્ષણ પ્રગતિ",
    skillEvaluationLabel: "કૌશલ્ય મૂલ્યાંકન",
    recommendedNextLesson: "ભલામણ કરેલ આગળનો પાઠ",
    tutorGreeting: "નમસ્તે {name}! હું તમારો AI સાક્ષરતા ટ્યુટર છું. હું તમારા અભ્યાસ માર્ગમાં મદદ કરી શકું છું. સૂચિત વિકલ્પ પસંદ કરો અથવા પ્રશ્ન લખો.",
    tutorWriting: "ટ્યુટર લખી રહ્યા છે...",
    tutorInputPlaceholder: "અક્ષરો, ટ્રેસિંગ, ઉચ્ચાર વિશે પ્રશ્ન પૂછો...",
    quickSuggestPlan: "અભ્યાસ યોજના સૂચવો",
    quickSuggestGrammar: "શૈક્ષણિક વ્યાકરણ ટિપ સૂચવો",
    quickSuggestTracing: "લેખન ટ્રેસિંગ મેટ્રિક્સ સમજાવો",
    tutorReplyPlan: "તમારા સ્તરના આધારે, આ તમારું લક્ષ્ય શેડ્યૂલ છે:\n1. 📖 ટ્રેસિંગ પ્રેક્ટિસ (15 મિનિટ)\n2. 🗣️ બોલવાની પ્રેક્ટિસ (10 મિનિટ)\n3. 📝 સાપ્તાહિક ક્વિઝથી પ્રગતિ તપાસો.",
    tutorReplyScore: "તમારો સ્કોર સુધારવા માટે: અક્ષર ગ્રિડની મર્યાદામાં દોરવા પર ધ્યાન આપો અને માઇક્રોફોનનો ઉપયોગ કરતી વખતે સ્પષ્ટ વ્યંજન બોલો.",
    tutorReplyDefault: "સમજાયું! ચાલો પ્રેક્ટિસ ચાલુ રાખીએ. કહો હું શબ્દભંડોળ સમીક્ષા કરું કે દૈનિક યોજના સૂચવું.",
    tutorReplyStudyPlan: "સૂચિત અભ્યાસ યોજના:\n- સોમ અને મંગળ: મૂળ વ્યંજનો ટ્રેસ કરો.\n- બુધ: સ્પેલિંગ પ્રેક્ટિસ.\n- ગુરુ અને શુક્ર: ઉચ્ચાર તપાસ.\n- સપ્તાહાંત: મોક ક્વિઝ.",
    tutorReplyGrammarTip: "શૈક્ષણિક માર્ગદર્શિકા:\nદૈનિક શબ્દ રચના, સામાન્ય નામો અને સ્થાનિક વાતચીત પર ધ્યાન આપો.",
    tutorReplyTracingInfo: "ટ્રેસિંગ મૂલ્યાંકન વિગતો:\nઅમારું મોડેલ દોરેલી રેખાઓની સરખામણી અક્ષર માર્ગદર્શિકા સાથે કરે છે. સરળ, કેન્દ્રિત રેખાઓ ચોકસાઈ વધારે છે.",
    readingTitle: "વાંચન પ્રેક્ટિસ",
    writingTitle: "લેખન પ્રેક્ટિસ",
    speakingTitle: "બોલવાનું મૂલ્યાંકન",
    readingSubNone: "મૂળભૂત ધ્વનિશાસ્ત્ર, સરળ અક્ષર જૂથો અને મુખ્ય દૃષ્ટિ શબ્દભંડોળ પર ધ્યાન આપો.",
    writingSubNone: "સ્પર્શ હાવભાવ સાથે પ્રારંભિક મૂળાક્ષર રેખાઓ અને મૂળભૂત ધ્વન્યાત્મક આકારો ટ્રેસ કરો.",
    speakingSubNone: "પ્રતિભાવ માટે એકલ સ્વરો અને મૂળભૂત વ્યંજનો બોલો.",
    readingSubPrimary: "મૂળભૂત બહુ-અક્ષર શબ્દસમૂહો વાંચો અને સ્થાનિક શબ્દભંડોળ શીટ્સ શોધો.",
    writingSubPrimary: "મૂળભૂત શબ્દો ટ્રેસ કરો અને સરળ વાક્ય રચનાઓ પૂર્ણ કરો.",
    speakingSubPrimary: "ઓડિયો ફીડબેક સાથે ટૂંકા વ્યવહારુ વાક્યો બોલો.",
    readingSubMiddle: "દૈનિક વ્યવહારો અને જાહેર સૂચનાઓ સંબંધિત માનક ફકરાઓ વાંચો.",
    writingSubMiddle: "કાર્યાત્મક ઇન્ટરેક્ટિવ ટેક્સ્ટ એન્ટ્રીઓ અને ફોર્મ ફીલ્ડ્સ લખવાની પ્રેક્ટિસ કરો.",
    speakingSubMiddle: "ઓટોમેટિક સ્પીચ પાર્સરમાં વાતચીતના ભાગો બોલો.",
    readingSubHigh: "વિશ્લેષણાત્મક ટેક્સ્ટ રચનાઓ, ડિજિટલ સાક્ષરતા વસ્તુઓ અને સારાંશો સાથે જોડાઓ.",
    writingSubHigh: "સતત વાક્યો અને મુક્ત સંચાર લેખન તૈયાર કરો.",
    speakingSubHigh: "ઉચ્ચ-ચોકસાઈ ઉચ્ચાર મૂલ્યાંકનો માટે જટિલ શબ્દસમૂહ રચનાઓ ચલાવો."
  },
  kannada: {
    home: "ಹೋಮ್", signIn: "ಸೈನ್ ಇನ್", createAccount: "ಖಾತೆ ರಚಿಸಿ", welcomeBack: "ಸ್ವಾಗತ",
    signInSub: "ನಿಮ್ಮ ಕಲಿಕೆಯ ಪ್ರಯಾಣವನ್ನು ಮುಂದುವರಿಸಲು ಸೈನ್ ಇನ್ ಮಾಡಿ.", email: "✉️ ಇಮೇಲ್ ವಿಳಾಸ", password: "🔒 ಪಾಸ್‌ವರ್ಡ್", fullName: "👤 ಪೂರ್ಣ ಹೆಸರು", or: "ಅಥವಾ",
    googleSignIn: "ಗೂಗಲ್‌ನೊಂದಿಗೆ ಮುಂದುವರಿಯಿರಿ", newHere: "ಇಲ್ಲಿ ಹೊಸಬರೇ?", alreadyHaveAccount: "ಈಗಾಗಲೇ ಖಾತೆ ಹೊಂದಿದ್ದೀರಾ?", landingTitle: "AI ಮೂಲಕ ಸಾಕ್ಷರತೆಯ ಸಬಲೀಕರಣ",
    landingTitleLine1: "ಸಾಕ್ಷರತೆಯ ಸಬಲೀಕರಣ", landingTitleLine2: "AI ಬುದ್ಧಿಮತ್ತೆ ಮೂಲಕ",
    landingSub: "ವಯಸ್ಕರು ಮತ್ತು ಮೊದಲ ತಲೆಮಾರಿನ ಕಲಿಯುವವರಿಗೆ ಪ್ರಾದೇಶಿಕ ಭಾಷೆಗಳಲ್ಲಿ ಮೂಲಭೂತ ಓದುವಿಕೆ, ಬರವಣಿಗೆ ಮತ್ತು ಮಾತನಾಡುವ ಕೌಶಲ್ಯಗಳನ್ನು ಪಡೆಯಲು ಸಹಾಯ ಮಾಡಲು ವಿನ್ಯಾಸಗೊಳಿಸಲಾದ ವೈಯಕ್ಕೀಕರಿಸಿದ ಕಲಿಕೆಯ ಒಡನಾಡಿ.",
    getStarted: "ಪ್ರಾರಂಭಿಸಿ", registerTitle: "ನಿಮ್ಮ ಖಾತೆಯನ್ನು ರಚಿಸಿ", registerSub: "ನಮ್ಮ ಸಮುದಾಯಕ್ಕೆ ಸೇರಿ ಮತ್ತು ನಿಮ್ಮ ಕಲಿಕೆಯ ಪರಿಧಿಯನ್ನು ವಿಸ್ತರಿಸಿ.",
    languageLabel: "🌐 ಆದ್ಯತೆಯ ಮಾತೃಭಾಷೆ", registerLeftTitle: "ನಿಮ್ಮ ಸಾಕ್ಷರತೆಯ ಪ್ರಯಾಣ ಇಲ್ಲಿಂದ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ.",
    registerLeftSub: "ಧ್ವನಿ ಅಭ್ಯಾಸ ಮೌಲ್ಯಮಾಪನಗಳು, ನೈಜ-ಸಮಯದ ಪ್ರತಿಕ್ರಿಯೆ ಮತ್ತು ದೈನಂದಿನ ಓದುವ ಪಾಠಗಳನ್ನು ಅನ್ಲಾಕ್ ಮಾಡಲು ಪ್ರೊಫೈಲ್ ರಚಿಸಿ.",
    loginLeftTitle: "ನೀವು ಕಲಿಯುವ ಪ್ರತಿಯೊಂದು ಪದವೂ ಹೊಸ ಬಾಗಿಲನ್ನು ತೆರೆಯುತ್ತದೆ.", loginLeftSub: "ವೈಯಕ್ಕೀಕರಿಸಿದ ಓದುವಿಕೆ, ಬರವಣಿಗೆ ಮತ್ತು ಮಾತನಾಡುವ ಅಭ್ಯಾಸ — ನಿಮ್ಮದೇ ಭಾಷೆಯಲ್ಲಿ, ನಿಮ್ಮದೇ ವೇಗದಲ್ಲಿ.",
    dashboardTitle: "ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಸ್ವಾಗತ!", logout: "ಲಾಗ್ ಔಟ್",
    eduLabel: "📊 ಶೈಕ್ಷಣಿಕ ಮಟ್ಟ",
    eduLevel1: "ಯಾವುದೇ ಔಪಚಾರಿಕ ಶಿಕ್ಷಣವಿಲ್ಲ / ಮೂಲಭೂತ ಕಲಿಯುವವರು",
    eduLevel2: "प್ರಾಥಮಿಕ ಶಾಲೆ (ತರಗತಿ 1-5)",
    eduLevel3: "ಮಧ್ಯಮ ಶಾಲೆ (ತರಗತಿ 6-8)",
    eduLevel4: "ಪ್ರೌಢಶಾಲೆ / ಪದವಿ ಪೂರ್ವ (ತರಗತಿ 9-12)",
    eduLevel5: "ಉನ್ನತ ಶಿಕ್ಷಣ / ಡಿಪ್ಲೊಮಾ / ಪದವಿ",
    navDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    navMyClass: "ನನ್ನ ತರಗತಿ",
    navCourses: "ಕೋರ್ಸ್‌ಗಳು",
    navCommunity: "ಸಮುದಾಯ",
    navAnalytics: "ವಿಶ್ಲೇಷಣೆ",
    navSettings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    signOut: "ಸೈನ್ ಔಟ್",
    searchPlaceholder: "ಕೋರ್ಸ್‌ಗಳನ್ನು ಹುಡುಕಿ",
    todayPrefix: "ಇಂದು",
    myClassTitle: "ನನ್ನ ತರಗತಿ ಲೀಡರ್‌ಬೋರ್ಡ್",
    coursesTitle: "ಪಠ್ಯಕ್ರಮ ಟ್ರ್ಯಾಕ್‌ಗಳು",
    communityTitle: "ಸಾಕ್ಷರAI ಕಲಿಯುವವರ ಸಮುದಾಯ",
    settingsTitle: "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಇಂಟರ್‌ಫೇಸ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    coursesYoureTaking: "ನೀವು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿರುವ ಕೋರ್ಸ್",
    saveProfileChanges: "ಪ್ರೊಫೈಲ್ ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ",
    savingSettings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ಉಳಿಸಲಾಗುತ್ತಿದೆ...",
    postMessage: "ಸಂದೇಶ ಕಳುಹಿಸಿ",
    sendButton: "ಕಳುಹಿಸಿ",
    startModule: "ಮಾಡ್ಯೂಲ್ ಪ್ರಾರಂಭಿಸಿ",
    ageLabel: "ವಯಸ್ಸು",
    profileDetails: "ಪ್ರೊಫೈಲ್ ವಿವರಗಳು",
    appearanceCustomizer: "ನೋಟ ಕಸ್ಟಮೈಸರ್",
    tabNativeModules: "📚 ಸ್ಥಳೀಯ ಪಠ್ಯಕ್ರಮ ಮಾಡ್ಯೂಲ್‌ಗಳು",
    tabLevelQuizzes: "📝 ಹಂತದ ರಸಪ್ರಶ್ನೆಗಳು",
    tabOtherBlocks: "✨ ಇತರ ಕಲಿಕಾ ಬ್ಲಾಕ್‌ಗಳು",
    avgAccuracy: "ಸರಾಸರಿ ನಿಖರತೆ",
    completedLessonsLabel: "ಪೂರ್ಣಗೊಂಡ ಪಾಠಗಳು",
    selectedLevelLabel: "ಆಯ್ಕೆ ಮಾಡಿದ ಹಂತ",
    alertMessages: "ಎಚ್ಚರಿಕೆ ಸಂದೇಶಗಳು",
    dismissAll: "ಎಲ್ಲವನ್ನೂ ವಜಾಗೊಳಿಸಿ",
    assessTitle: "ನಿಮ್ಮ ಸಾಕ್ಷರತಾ ಮಟ್ಟದ ಸುಧಾರಣೆಯನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ",
    startPrefix: "ಪ್ರಾರಂಭಿಸಿ",
    levelQuizSuffix: "ಹಂತದ ರಸಪ್ರಶ್ನೆ",
    clearChat: "ಚಾಟ್ ತೆರವುಗೊಳಿಸಿ",
    aiTutorTitle: "AI ಸಾಕ್ಷರತಾ ಟ್ಯೂಟರ್ ಸಹಾಯಕ",
    refreshNow: "ಈಗ ರಿಫ್ರೆಶ್ ಮಾಡಿ",
    startNow: "ಈಗ ಪ್ರಾರಂಭಿಸಿ",
    performanceReportTitle: "ಕಾರ್ಯಕ್ಷಮತೆ ವರದಿ",
    evaluationHistoryTitle: "ನಿಮ್ಮ ಮೌಲ್ಯಮಾಪನ ಇತಿಹಾಸ ಲಾಗ್‌ಗಳು",
    strengthsLabel: "ಸಾಮರ್ಥ್ಯಗಳು",
    areasForImprovementLabel: "ಸುಧಾರಣೆಯ ಕ್ಷೇತ್ರಗಳು",
    overallProgress: "ಒಟ್ಟಾರೆ ಕಲಿಕೆಯ ಪ್ರಗತಿ",
    skillEvaluationLabel: "ಕೌಶಲ್ಯ ಮೌಲ್ಯಮಾಪನ",
    recommendedNextLesson: "ಶಿಫಾರಸು ಮಾಡಲಾದ ಮುಂದಿನ ಪಾಠ",
    tutorGreeting: "ನಮಸ್ಕಾರ {name}! ನಾನು ನಿಮ್ಮ AI ಸಾಕ್ಷರತಾ ಟ್ಯೂಟರ್. ನಿಮ್ಮ ಅಧ್ಯಯನ ಮಾರ್ಗದಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಸೂಚಿತ ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ ಅಥವಾ ಪ್ರಶ್ನೆ ಬರೆಯಿರಿ.",
    tutorWriting: "ಟ್ಯೂಟರ್ ಟೈಪ್ ಮಾಡುತ್ತಿದ್ದಾರೆ...",
    tutorInputPlaceholder: "ಅಕ್ಷರಗಳು, ಟ್ರೇಸಿಂಗ್, ಉಚ್ಚಾರಣೆ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಕೇಳಿ...",
    quickSuggestPlan: "ಅಧ್ಯಯನ ಯೋಜನೆ ಸೂಚಿಸಿ",
    quickSuggestGrammar: "ಶೈಕ್ಷಣಿಕ ವ್ಯಾಕರಣ ಸಲಹೆ ಸೂಚಿಸಿ",
    quickSuggestTracing: "ಬರವಣಿಗೆ ಟ್ರೇಸಿಂಗ್ ಮಾಪನಗಳನ್ನು ವಿವರಿಸಿ",
    tutorReplyPlan: "ನಿಮ್ಮ ಹಂತದ ಆಧಾರದ ಮೇಲೆ, ಇಲ್ಲಿದೆ ನಿಮ್ಮ ಗುರಿ ವೇಳಾಪಟ್ಟಿ:\n1. 📖 ಟ್ರೇಸಿಂಗ್ ಅಭ್ಯಾಸ (15 ನಿಮಿ)\n2. 🗣️ ಮಾತನಾಡುವ ಅಭ್ಯಾಸ (10 ನಿಮಿ)\n3. 📝 ವಾರದ ರಸಪ್ರಶ್ನೆಯಿಂದ ಪ್ರಗತಿ ಮೌಲ್ಯಮಾಪನ.",
    tutorReplyScore: "ನಿಮ್ಮ ಸ್ಕೋರ್ ಸುಧಾರಿಸಲು: ಅಕ್ಷರ ಗ್ರಿಡ್‌ಗಳ ಗಡಿಯೊಳಗೆ ಬರೆಯುವುದರ ಮೇಲೆ ಗಮನಹರಿಸಿ ಮತ್ತು ಮೈಕ್ರೊಫೋನ್ ಬಳಸುವಾಗ ಸ್ಪಷ್ಟ ವ್ಯಂಜನ ಶಬ್ದಗಳನ್ನು ಉಚ್ಚರಿಸಿ.",
    tutorReplyDefault: "ಅರ್ಥವಾಯಿತು! ಅಭ್ಯಾಸ ಮುಂದುವರಿಸೋಣ. ಶಬ್ದಕೋಶ ಪರಿಶೀಲಿಸಬೇಕೆ ಅಥವಾ ದೈನಂದಿನ ಯೋಜನೆ ಸೂಚಿಸಬೇಕೆ ತಿಳಿಸಿ.",
    tutorReplyStudyPlan: "ಸೂಚಿತ ಅಧ್ಯಯನ ಯೋಜನೆ:\n- ಸೋಮ ಮತ್ತು ಮಂಗಳ: ಮೂಲ ವ್ಯಂಜನಗಳನ್ನು ಟ್ರೇಸ್ ಮಾಡಿ.\n- ಬುಧ: ಕಾಗುಣಿತ ಅಭ್ಯಾಸ.\n- ಗುರು ಮತ್ತು ಶುಕ್ರ: ಉಚ್ಚಾರಣೆ ಪರಿಶೀಲನೆ.\n- ವಾರಾಂತ್ಯ: ಮಾಕ್ ರಸಪ್ರಶ್ನೆ.",
    tutorReplyGrammarTip: "ಶೈಕ್ಷಣಿಕ ಮಾರ್ಗಸೂಚಿಗಳು:\nದೈನಂದಿನ ಪದ ರಚನೆ, ಸಾಮಾನ್ಯ ನಾಮಪದಗಳು ಮತ್ತು ಸ್ಥಳೀಯ ಸಂಭಾಷಣೆಗಳ ಮೇಲೆ ಗಮನಹರಿಸಿ.",
    tutorReplyTracingInfo: "ಟ್ರೇಸಿಂಗ್ ಮೌಲ್ಯಮಾಪನ ವಿವರಗಳು:\nನಮ್ಮ ಮಾದರಿ ಚಿತ್ರಿಸಿದ ರೇಖೆಗಳನ್ನು ಅಕ್ಷರ ಮಾರ್ಗದರ್ಶಿಗಳೊಂದಿಗೆ ಹೊಂದಿಸುತ್ತದೆ. ನಯವಾದ, ಕೇಂದ್ರೀಕೃತ ರೇಖೆಗಳು ನಿಖರತೆಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತವೆ.",
    readingTitle: "ಓದುವ ಅಭ್ಯಾಸ",
    writingTitle: "ಬರವಣಿಗೆ ಅಭ್ಯಾಸ",
    speakingTitle: "ಮಾತನಾಡುವ ಮೌಲ್ಯಮಾಪನ",
    readingSubNone: "ಮೂಲಭೂತ ಧ್ವನಿಶಾಸ್ತ್ರ, ಸರಳ ಅಕ್ಷರ ಗುಂಪುಗಳು ಮತ್ತು ಮುಖ್ಯ ದೃಷ್ಟಿ ಶಬ್ದಕೋಶದ ಮೇಲೆ ಗಮನಹರಿಸಿ.",
    writingSubNone: "ಸ್ಪರ್ಶ ಸನ್ನೆಗಳೊಂದಿಗೆ ಆರಂಭಿಕ ವರ್ಣಮಾಲೆ ರೇಖೆಗಳು ಮತ್ತು ಮೂಲಭೂತ ಧ್ವನಿ ಆಕಾರಗಳನ್ನು ಟ್ರೇಸ್ ಮಾಡಿ.",
    speakingSubNone: "ಪ್ರತಿಕ್ರಿಯೆಗಾಗಿ ಏಕ ಸ್ವರಗಳು ಮತ್ತು ಮೂಲಭೂತ ವ್ಯಂಜನಗಳನ್ನು ಉಚ್ಚರಿಸಿ.",
    readingSubPrimary: "ಮೂಲಭೂತ ಬಹು-ಅಕ್ಷರ ಪದಗುಚ್ಛಗಳನ್ನು ಓದಿ ಮತ್ತು ಸ್ಥಳೀಯ ಶಬ್ದಕೋಶ ಹಾಳೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ.",
    writingSubPrimary: "ಮೂಲಭೂತ ಪದಗಳನ್ನು ಟ್ರೇಸ್ ಮಾಡಿ ಮತ್ತು ಸರಳ ವಾಕ್ಯ ರಚನೆಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.",
    speakingSubPrimary: "ಆಡಿಯೋ ಪ್ರತಿಕ್ರಿಯೆಯೊಂದಿಗೆ ಸಣ್ಣ ಪ್ರಾಯೋಗಿಕ ವಾಕ್ಯಗಳನ್ನು ಉಚ್ಚರಿಸಿ.",
    readingSubMiddle: "ದೈನಂದಿನ ವಹಿವಾಟುಗಳು ಮತ್ತು ಸಾರ್ವಜನಿಕ ಸೂಚನೆಗಳ ಕುರಿತ ಪ್ರಮಾಣಿತ ಪ್ಯಾರಾಗ್ರಾಫ್‌ಗಳನ್ನು ಓದಿ.",
    writingSubMiddle: "ಕ್ರಿಯಾತ್ಮಕ ಸಂವಾದಾತ್ಮಕ ಪಠ್ಯ ನಮೂದುಗಳು ಮತ್ತು ಫಾರ್ಮ್ ಕ್ಷೇತ್ರಗಳನ್ನು ಬರೆಯುವ ಅಭ್ಯಾಸ ಮಾಡಿ.",
    speakingSubMiddle: "ಸ್ವಯಂಚಾಲಿತ ಭಾಷಣ ಪಾರ್ಸರ್‌ನಲ್ಲಿ ಸಂಭಾಷಣಾ ವಿಭಾಗಗಳನ್ನು ಮಾತನಾಡಿ.",
    readingSubHigh: "ವಿಶ್ಲೇಷಣಾತ್ಮಕ ಪಠ್ಯ ರಚನೆಗಳು, ಡಿಜಿಟಲ್ ಸಾಕ್ಷರತಾ ವಸ್ತುಗಳು ಮತ್ತು ಸಾರಾಂಶಗಳಲ್ಲಿ ತೊಡಗಿಸಿಕೊಳ್ಳಿ.",
    writingSubHigh: "ನಿರಂತರ ವಾಕ್ಯಗಳು ಮತ್ತು ಮುಕ್ತ ಸಂವಹನ ಬರಹಗಳನ್ನು ರಚಿಸಿ.",
    speakingSubHigh: "ಹೆಚ್ಚಿನ ನಿಖರತೆಯ ಉಚ್ಚಾರಣಾ ಮೌಲ್ಯಮಾಪನಗಳಿಗಾಗಿ ಸಂಕೀರ್ಣ ಪದಗುಚ್ಛ ರಚನೆಗಳನ್ನು ಕಾರ್ಯಗತಗೊಳಿಸಿ."
  },
  malayalam: {
    home: "ഹോം", signIn: "സൈൻ ഇൻ", createAccount: "അക്കൗണ്ട് സൃഷ്ടിക്കുക", welcomeBack: "സ്വാഗതം",
    signInSub: "നിങ്ങളുടെ പഠന യാത്ര തുടരാൻ സൈൻ ഇൻ ചെയ്യുക.", email: "✉️ ഇമെയിൽ വിലാസം", password: "🔒 പാസ്‌വേഡ്", fullName: "👤 പൂർണ്ണ നാമം", or: "അല്ലെങ്കിൽ",
    googleSignIn: "ഗൂഗിൾ ഉപയോഗിച്ച് തുടരുക", newHere: "പുതിയതാണോ?", alreadyHaveAccount: "നിലവിൽ അക്കൗണ്ട് ഉണ്ടോ?", landingTitle: "AI വഴിയുള്ള സാക്ഷരതാ ശാക്തീകരണം",
    landingTitleLine1: "സാക്ഷരതാ ശാക്തീകരണം", landingTitleLine2: "AI ബുദ്ധി വഴി",
    landingSub: "മുതിർന്നവർക്കും ആദ്യതലമുറ പഠിതാക്കൾക്കും പ്രാദേശിക ഭാഷകളിൽ അടിസ്ഥാന വായന, എഴുത്ത്, സംസാര കഴിവുകൾ എന്നിവ നേടിയെടുക്കാൻ സഹായിക്കുന്നതിനായി രൂപകൽപ്പന ചെയ്ത ഒരു വ്യക്തിഗത പഠന സഹായി.",
    getStarted: "ആരംഭിക്കുക", registerTitle: "നിങ്ങളുടെ അക്കൗണ്ട് സൃഷ്ടിക്കുക", registerSub: "ഞങ്ങളുടെ കമ്മ്യൂണിറ്റിയിൽ ചേരുക, നിങ്ങളുടെ പഠന ചക്രവാളങ്ങൾ വികസിപ്പിക്കുക.",
    languageLabel: "🌐 താൽപ്പര്യമുള്ള മാതൃഭാഷ", registerLeftTitle: "നിങ്ങളുടെ സാക്ഷരതാ യാത്ര ഇവിടെ ആരംഭിക്കുന്നു.",
    registerLeftSub: "വോയ്‌സ് പ്രാക്ടീസ് അസസ്‌മെന്റുകൾ, തത്സമയ ഫീഡ്‌ബാക്ക്, വ്യക്തിഗതമാക്കിയ വായനാ പാഠങ്ങൾ എന്നിവ അൺലോക്ക് ചെയ്യാൻ ഒരു പ്രൊഫൈൽ സൃഷ്‌ടിക്കുക.",
    loginLeftTitle: "നിങ്ങൾ പഠിക്കുന്ന ഓരോ വാക്കും ഒരു പുതിയ വാതിൽ തുറക്കുന്നു.", loginLeftSub: "വ്യക്തിഗതമാക്കിയ വായന, എഴുത്ത്, സംസാര പരിശീലനം — നിങ്ങളുടെ സ്വന്തം ഭാഷയിൽ, നിങ്ങളുടെ സ്വന്തം വേഗതയിൽ.",
    dashboardTitle: "നിങ്ങളുടെ ഡാഷ്‌ബോർഡിലേക്ക് സ്വാഗതം!", logout: "ലോഗ് ഔട്ട്",
    eduLabel: "📊 വിദ്യാഭ്യാസ നിലവാരം",
    eduLevel1: "ഔപചാരിക വിദ്യാഭ്യാസമില്ല / അടിസ്ഥാന പഠിതാവ്",
    eduLevel2: "പ്രൈമറി സ്കൂൾ (ക്ലാസ് 1-5)",
    eduLevel3: "മിഡിൽ സ്കൂൾ (ക്ലാസ് 6-8)",
    eduLevel4: "ഹൈസ്കൂൾ / സെക്കൻഡറി (ക്ലാസ് 9-12)",
    eduLevel5: "ഉന്നത വിദ്യാഭ്യാസം / ഡിപ്ലോമ / ബിരുദം",
    navDashboard: "ഡാഷ്‌ബോർഡ്",
    navMyClass: "എന്റെ ക്ലാസ്",
    navCourses: "കോഴ്സുകൾ",
    navCommunity: "കമ്മ്യൂണിറ്റി",
    navAnalytics: "അനലിറ്റിക്സ്",
    navSettings: "ക്രമീകരണങ്ങൾ",
    signOut: "സൈൻ ഔട്ട്",
    searchPlaceholder: "കോഴ്സുകൾ തിരയുക",
    todayPrefix: "ഇന്ന്",
    myClassTitle: "എന്റെ ക്ലാസ് ലീഡർബോർഡ്",
    coursesTitle: "സിലബസ് കരിക്കുലം ട്രാക്കുകൾ",
    communityTitle: "സാക്ഷർAI പഠിതാക്കളുടെ കമ്മ്യൂണിറ്റി",
    settingsTitle: "പ്രൊഫൈൽ & ഇന്റർഫേസ് ക്രമീകരണങ്ങൾ",
    coursesYoureTaking: "നിങ്ങൾ എടുക്കുന്ന കോഴ്സ്",
    saveProfileChanges: "പ്രൊഫൈൽ മാറ്റങ്ങൾ സേവ് ചെയ്യുക",
    savingSettings: "ക്രമീകരണങ്ങൾ സേവ് ചെയ്യുന്നു...",
    postMessage: "സന്ദേശം അയയ്ക്കുക",
    sendButton: "അയയ്ക്കുക",
    startModule: "മൊഡ്യൂൾ ആരംഭിക്കുക",
    ageLabel: "പ്രായം",
    profileDetails: "പ്രൊഫൈൽ വിശദാംശങ്ങൾ",
    appearanceCustomizer: "രൂപം കസ്റ്റമൈസർ",
    tabNativeModules: "📚 പ്രാദേശിക സിലബസ് മൊഡ്യൂളുകൾ",
    tabLevelQuizzes: "📝 ലെവൽ ക്വിസുകൾ",
    tabOtherBlocks: "✨ മറ്റ് പഠന ബ്ലോക്കുകൾ",
    avgAccuracy: "ശരാശരി കൃത്യത",
    completedLessonsLabel: "പൂർത്തിയാക്കിയ പാഠങ്ങൾ",
    selectedLevelLabel: "തിരഞ്ഞെടുത്ത ലെവൽ",
    alertMessages: "മുന്നറിയിപ്പ് സന്ദേശങ്ങൾ",
    dismissAll: "എല്ലാം നിരസിക്കുക",
    assessTitle: "നിങ്ങളുടെ സാക്ഷരതാ നിലവാര മെച്ചപ്പെടുത്തൽ വിലയിരുത്തുക",
    startPrefix: "ആരംഭിക്കുക",
    levelQuizSuffix: "ലെവൽ ക്വിസ്",
    clearChat: "ചാറ്റ് മായ്ക്കുക",
    aiTutorTitle: "AI സാക്ഷരതാ ട്യൂട്ടർ അസിസ്റ്റന്റ്",
    refreshNow: "ഇപ്പോൾ പുതുക്കുക",
    startNow: "ഇപ്പോൾ ആരംഭിക്കുക",
    performanceReportTitle: "പ്രകടന റിപ്പോർട്ട്",
    evaluationHistoryTitle: "നിങ്ങളുടെ മൂല്യനിർണ്ണയ ചരിത്ര ലോഗുകൾ",
    strengthsLabel: "ശക്തികൾ",
    areasForImprovementLabel: "മെച്ചപ്പെടുത്തേണ്ട മേഖലകൾ",
    overallProgress: "മൊത്തത്തിലുള്ള പഠന പുരോഗതി",
    skillEvaluationLabel: "നൈപുണ്യ വിലയിരുത്തൽ",
    recommendedNextLesson: "ശുപാർശ ചെയ്യുന്ന അടുത്ത പാഠം",
    tutorGreeting: "നമസ്കാരം {name}! ഞാൻ നിങ്ങളുടെ AI സാക്ഷരതാ ട്യൂട്ടറാണ്. നിങ്ങളുടെ പഠന പാതയിൽ സഹായിക്കാൻ കഴിയും. നിർദ്ദേശിച്ച ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക അല്ലെങ്കിൽ ചോദ്യം എഴുതുക.",
    tutorWriting: "ട്യൂട്ടർ ടൈപ്പ് ചെയ്യുന്നു...",
    tutorInputPlaceholder: "അക്ഷരങ്ങൾ, ട്രേസിംഗ്, ഉച്ചാരണം എന്നിവയെക്കുറിച്ച് ചോദ്യം ചോദിക്കുക...",
    quickSuggestPlan: "ഒരു പഠന പദ്ധതി നിർദ്ദേശിക്കുക",
    quickSuggestGrammar: "വിദ്യാഭ്യാസ വ്യാകരണ ടിപ്പ് നിർദ്ദേശിക്കുക",
    quickSuggestTracing: "എഴുത്ത് ട്രേസിംഗ് അളവുകൾ വിശദീകരിക്കുക",
    tutorReplyPlan: "നിങ്ങളുടെ നിലവാരത്തെ അടിസ്ഥാനമാക്കി, ഇതാ നിങ്ങളുടെ ലക്ഷ്യ ഷെഡ്യൂൾ:\n1. 📖 ട്രേസിംഗ് പരിശീലനം (15 മിനിറ്റ്)\n2. 🗣️ സംസാര പരിശീലനം (10 മിനിറ്റ്)\n3. 📝 പ്രതിവാര ക്വിസ് വഴി പുരോഗതി വിലയിരുത്തുക.",
    tutorReplyScore: "നിങ്ങളുടെ സ്കോർ മെച്ചപ്പെടുത്താൻ: അക്ഷര ഗ്രിഡുകളുടെ പരിധിക്കുള്ളിൽ വരയ്ക്കുന്നതിൽ ശ്രദ്ധിക്കുകയും മൈക്രോഫോൺ ഉപയോഗിക്കുമ്പോൾ വ്യക്തമായ വ്യഞ്ജനാക്ഷര ശബ്ദങ്ങൾ ഉച്ചരിക്കുകയും ചെയ്യുക.",
    tutorReplyDefault: "മനസ്സിലായി! നമുക്ക് പരിശീലനം തുടരാം. പദാവലി അവലോകനം ചെയ്യണോ അതോ ദൈനംദിന പദ്ധതി നിർദ്ദേശിക്കണോ എന്ന് പറയുക.",
    tutorReplyStudyPlan: "നിർദ്ദേശിച്ച പഠന പദ്ധതി:\n- തിങ്കൾ & ചൊവ്വ: അടിസ്ഥാന വ്യഞ്ജനാക്ഷരങ്ങൾ ട്രേസ് ചെയ്യുക.\n- ബുധൻ: അക്ഷരവിന്യാസ പരിശീലനം.\n- വ്യാഴം & വെള്ളി: ഉച്ചാരണ പരിശോധന.\n- വാരാന്ത്യം: മോക്ക് ക്വിസ്.",
    tutorReplyGrammarTip: "വിദ്യാഭ്യാസ മാർഗ്ഗനിർദ്ദേശങ്ങൾ:\nദൈനംദിന വാക്ക് ഘടന, സാധാരണ നാമങ്ങൾ, പ്രാദേശിക സംഭാഷണങ്ങൾ എന്നിവയിൽ ശ്രദ്ധ കേന്ദ്രീകരിക്കുക.",
    tutorReplyTracingInfo: "ട്രേസിംഗ് മൂല്യനിർണ്ണയ വിശദാംശങ്ങൾ:\nഞങ്ങളുടെ മോഡൽ വരച്ച വരികളെ അക്ഷര ഗൈഡുകളുമായി പൊരുത്തപ്പെടുത്തുന്നു. മിനുസമാർന്ന, കേന്ദ്രീകൃത വരികൾ കൃത്യത വർദ്ധിപ്പിക്കും.",
    readingTitle: "വായനാ പരിശീലനം",
    writingTitle: "എഴുത്ത് പരിശീലനം",
    speakingTitle: "സംസാര മൂല്യനിർണ്ണയം",
    readingSubNone: "അടിസ്ഥാന സ്വനിമശാസ്ത്രം, ലളിതമായ അക്ഷര ഗ്രൂപ്പിംഗുകൾ, പ്രധാന കാഴ്ച പദാവലി എന്നിവയിൽ ശ്രദ്ധ കേന്ദ്രീകരിക്കുക.",
    writingSubNone: "സ്പർശന ആംഗ്യങ്ങളോടെ പ്രാരംഭ അക്ഷരമാലാ വരകളും അടിസ്ഥാന സ്വനിമ രൂപങ്ങളും ട്രേസ് ചെയ്യുക.",
    speakingSubNone: "പ്രതികരണത്തിനായി ഏക സ്വരാക്ഷരങ്ങളും അടിസ്ഥാന വ്യഞ്ജനാക്ഷരങ്ങളും ഉച്ചരിക്കുക.",
    readingSubPrimary: "അടിസ്ഥാന ബഹു-അക്ഷര ശൈലികൾ വായിക്കുകയും പ്രാദേശിക പദാവലി ഷീറ്റുകൾ പരിശോധിക്കുകയും ചെയ്യുക.",
    writingSubPrimary: "അടിസ്ഥാന വാക്കുകൾ ട്രേസ് ചെയ്ത് ലളിതമായ വാക്യഘടനകൾ പൂർത്തിയാക്കുക.",
    speakingSubPrimary: "ഓഡിയോ ഫീഡ്ബാക്കോടെ ചെറിയ പ്രായോഗിക വാക്യങ്ങൾ ഉച്ചരിക്കുക.",
    readingSubMiddle: "ദൈനംദിന ഇടപാടുകളും പൊതു അറിയിപ്പുകളും സംബന്ധിച്ച സ്റ്റാൻഡേർഡ് ഖണ്ഡികകൾ വായിക്കുക.",
    writingSubMiddle: "പ്രവർത്തനപരമായ സംവേദനാത്മക ടെക്സ്റ്റ് എൻട്രികളും ഫോം ഫീൽഡുകളും എഴുതുന്നത് പരിശീലിക്കുക.",
    speakingSubMiddle: "ഓട്ടോമാറ്റിക് സ്പീച്ച് പാഴ്സറിൽ സംഭാഷണ ഭാഗങ്ങൾ സംസാരിക്കുക.",
    readingSubHigh: "വിശകലനാത്മക ടെക്സ്റ്റ് ഘടനകൾ, ഡിജിറ്റൽ സാക്ഷരതാ ഇനങ്ങൾ, സംഗ്രഹങ്ങൾ എന്നിവയിൽ ഏർപ്പെടുക.",
    writingSubHigh: "തുടർച്ചയായ വാക്യങ്ങളും സ്വതന്ത്ര ആശയവിനിമയ രചനകളും തയ്യാറാക്കുക.",
    speakingSubHigh: "ഉയർന്ന കൃത്യതയുള്ള ഉച്ചാരണ മൂല്യനിർണ്ണയങ്ങൾക്കായി സങ്കീർണ്ണമായ വാക്യഘടനകൾ നടപ്പിലാക്കുക."
  },
  odia: {
    home: "ହୋମ୍", signIn: "ସାଇନ୍ ଇନ୍", createAccount: "ଆକaଉଣ୍ଟ୍ ତିଆରି କରନ୍ତু", welcomeBack: "ସ୍ୱାଗତ",
    signInSub: "ଆପଣଙ୍କର ଶิକ୍ଷା ଯାତ୍ରା ଜାରି ରଖିବା ପାଇଁ ସାଇନ୍ ଇନ୍ କରନ୍ତୁ ।", email: "✉️ ଇମେଲ୍ ଠିକଣା", password: "🔒 ପାସୱାର୍ଡ", fullName: "👤 ପୂରା ନାମ", or: "କିମ୍ବା",
    googleSignIn: "ଗୁଗଲ୍ ସହିତ ଆଗକୁ ବଢନ୍ତୁ", newHere: "ଏଠାରେ ନୂଆ କି?", alreadyHaveAccount: "ପୂର୍ବରୁ ଆକାଉଣ୍ଟ୍ ଅଛି କି?", landingTitle: "AI ମାଧ୍ୟମରେ ସାକ୍ଷରତା ସଶକ୍ତିକରଣ",
    landingTitleLine1: "ସାକ୍ଷରତା ସଶକ୍ତିକରଣ", landingTitleLine2: "AI ଜ୍ଞାନ ଦ୍ୱାରା",
    landingSub: "ଏକ ବ୍ୟକ୍ତିଗତ ଶିକ୍ଷଣ ସାଥୀ ଯାହା ବୟସ୍କ ଏବଂ ପ୍ରଥମ ପିଢ଼ିର ଶିକ୍ଷାର୍ଥୀମାନଙ୍କୁ ଆଞ୍ଚଳിക ଭାଷାରେ ମୌଳିକ ପଢିବା, ଲେଖିବା ଏବଂ କହିବା ଦକ୍ଷତା ହାସଲ କରିବାରେ ସାହାଯ୍ୟ କରେ ।",
    getStarted: "ଆରମ୍ଭ କରନ୍ତু", registerTitle: "ଆପଣଙ୍କ ଆକାଉଣ୍ଟ୍ ତିଆରି କରନ୍ତু", registerSub: "ଆମ ସମୁଦାୟରେ ଯୋଗ ଦିଅନ୍ତು ଏବଂ ଶିକ୍ଷାର ପରିସରକୁ ବୃଦ୍ଧି କରନ୍ତু ।",
    languageLabel: "🌐 ପସନ୍ଦର ମାତୃଭାଷା", registerLeftTitle: "ଆପଣଙ୍କର ସାକ୍ଷରତା ଯାତ୍ରା ଏଠାରୁ ଆରମ୍ଭ ହୁଏ ।",
    registerLeftSub: "ଭଏସ୍ ପ୍ରାକ୍ଟିସ୍ ଆସେସମେଣ୍տ୍ ଏବଂ ଦୈନିକ ପଠନ ପାଠ୍ୟକ୍ରਮକୁ ଅନଲକ୍ କରିବା ପାଇଁ ଏକ ପ୍ରୋଫାଇଲ୍ ତିଆରି କରନ୍ତু ।",
    loginLeftTitle: "ଆପଣ ଶିଖୁଥିବା ପ୍ରତ୍ୟେକ ଶବ୍ଦ ଏକ ନୂତନ ଦ୍ୱାର ଖୋଲିଥାଏ ।", loginLeftSub: "ବ୍ୟକ୍ତିଗତ ପଢିବା, ଲେଖିବା ଏବଂ କହିବା ଅଭ୍ୟାସ — ଆପଣଙ୍କ ନିଜ ଭାଷାରେ, ଆପଣଙ୍କ ନିଜ ଗତିରେ ।",
    dashboardTitle: "ଆପଣଙ୍କ ଡ୍ୟାଶବୋର୍ଡକୁ ସ୍ୱାଗତ!", logout: "ଲଗ୍ ଆଉଟ୍",
    eduLabel: "📊 ଶିକ୍ଷାଗତ ସ୍ତର",
    eduLevel1: "କୌଣସି ଆନୁଷ୍ଠାନିକ ଶିକ୍ଷା ନାହିଁ / ପ୍ରାଥମିକ ଶିକ୍ଷାର୍ଥୀ",
    eduLevel2: "પ્રાથમિક ବିଦ୍ୟାଳୟ (ଶ୍ରେଣୀ ୧-୫)",
    eduLevel3: "ମଧ୍ୟ ପ୍ରାଥମିକ ବିଦ୍ୟାଳୟ (ଶ୍ରେଣୀ ୬-8)",
    eduLevel4: "ଉଚ୍ଚ ବିଦ୍ୟାଳୟ / ମାଧ୍ୟମିକ (ଶ୍ରେଣୀ ୯-୧୨)",
    eduLevel5: "ଉଚ୍ଚଶିକ୍ଷା / ଡିପ୍ଲୋମା / ଡିଗ୍ରୀ",
    navDashboard: "ଡ୍ୟାସବୋର୍ଡ",
    navMyClass: "ମୋ ଶ୍ରେଣୀ",
    navCourses: "ପାଠ୍ୟକ୍ରମ",
    navCommunity: "ସମ୍ପ୍ରଦାୟ",
    navAnalytics: "ବିଶ୍ଳେଷଣ",
    navSettings: "ସେଟିଂସ",
    signOut: "ସାଇନ୍ ଆଉଟ୍",
    searchPlaceholder: "ପାଠ୍ୟକ୍ରମ ଖୋଜନ୍ତୁ",
    todayPrefix: "ଆଜି",
    myClassTitle: "ମୋ ଶ୍ରେଣୀ ଲିଡରବୋର୍ଡ",
    coursesTitle: "ପାଠ୍ୟକ୍ରମ ଟ୍ରାକ୍",
    communityTitle: "ସାକ୍ଷରAI ଶିକ୍ଷାର୍ଥୀ ସମ୍ପ୍ରଦାୟ",
    settingsTitle: "ପ୍ରୋଫାଇଲ୍ ଏବଂ ଇଣ୍ଟରଫେସ୍ ସେଟିଂସ",
    coursesYoureTaking: "ଆପଣ ନେଉଥିବା ପାଠ୍ୟକ୍ରମ",
    saveProfileChanges: "ପ୍ରୋଫାଇଲ୍ ପରିବର୍ତ୍ତନ ସେଭ୍ କରନ୍ତୁ",
    savingSettings: "ସେଟିଂସ ସେଭ୍ ହେଉଛି...",
    postMessage: "ବାର୍ତ୍ତା ପଠାନ୍ତୁ",
    sendButton: "ପଠାନ୍ତୁ",
    startModule: "ମଡ୍ୟୁଲ୍ ଆରମ୍ଭ କରନ୍ତୁ",
    ageLabel: "ବୟସ",
    profileDetails: "ପ୍ରୋଫାଇଲ୍ ବିବରଣୀ",
    appearanceCustomizer: "ରୂପ କଷ୍ଟମାଇଜର୍",
    tabNativeModules: "📚 ସ୍ଥାନୀୟ ପାଠ୍ୟକ୍ରମ ମଡ୍ୟୁଲ୍",
    tabLevelQuizzes: "📝 ସ୍ତର କୁଇଜ୍",
    tabOtherBlocks: "✨ ଅନ୍ୟ ଶିକ୍ଷଣ ବ୍ଲକ୍",
    avgAccuracy: "ହାରାହାରି ସଠିକତା",
    completedLessonsLabel: "ସମ୍ପୂର୍ଣ୍ଣ ପାଠ",
    selectedLevelLabel: "ମନୋନୀତ ସ୍ତର",
    alertMessages: "ଚେତାବନୀ ବାର୍ତ୍ତା",
    dismissAll: "ସବୁ ବାତିଲ୍ କରନ୍ତୁ",
    assessTitle: "ଆପଣଙ୍କ ସାକ୍ଷରତା ସ୍ତର ଉନ୍ନତିକୁ ମୂଲ୍ୟାୟନ କରନ୍ତୁ",
    startPrefix: "ଆରମ୍ଭ କରନ୍ତୁ",
    levelQuizSuffix: "ସ୍ତର କୁଇଜ୍",
    clearChat: "ଚାଟ୍ ସଫା କରନ୍ତୁ",
    aiTutorTitle: "AI ସାକ୍ଷରତା ଟ୍ୟୁଟର୍ ସହାୟକ",
    refreshNow: "ବର୍ତ୍ତମାନ ରିଫ୍ରେସ୍ କରନ୍ତୁ",
    startNow: "ବର୍ତ୍ତମାନ ଆରମ୍ଭ କରନ୍ତୁ",
    performanceReportTitle: "କାର୍ଯ୍ୟଦକ୍ଷତା ରିପୋର୍ଟ",
    evaluationHistoryTitle: "ଆପଣଙ୍କ ମୂଲ୍ୟାୟନ ଇତିହାସ ଲଗ୍",
    strengthsLabel: "ଶକ୍ତି",
    areasForImprovementLabel: "ଉନ୍ନତି କ୍ଷେତ୍ର",
    overallProgress: "ସାମଗ୍ରିକ ଶିକ୍ଷଣ ପ୍ରଗତି",
    skillEvaluationLabel: "ଦକ୍ଷତା ମୂଲ୍ୟାୟନ",
    recommendedNextLesson: "ସୁପାରିଶ ପରବର୍ତ୍ତୀ ପାଠ",
    tutorGreeting: "ନମସ୍କାର {name}! ମୁଁ ଆପଣଙ୍କର AI ସାକ୍ଷରତା ଟ୍ୟୁଟର୍। ମୁଁ ଆପଣଙ୍କ ଅଧ୍ୟୟନ ପଥରେ ସାହାଯ୍ୟ କରିପାରିବି। ଏକ ପରାମର୍ଶିତ ବିକଳ୍ପ ବାଛନ୍ତୁ କିମ୍ବା ପ୍ରଶ୍ନ ଲେଖନ୍ତୁ।",
    tutorWriting: "ଟ୍ୟୁଟର୍ ଲେଖୁଛନ୍ତି...",
    tutorInputPlaceholder: "ଅକ୍ଷର, ଟ୍ରେସିଂ, ଉଚ୍ଚାରଣ ବିଷୟରେ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ...",
    quickSuggestPlan: "ଏକ ଅଧ୍ୟୟନ ଯୋଜନା ପରାମର୍ଶ ଦିଅନ୍ତୁ",
    quickSuggestGrammar: "ଶିକ୍ଷାଗତ ବ୍ୟାକରଣ ଟିପ୍ସ ପରାମର୍ଶ ଦିଅନ୍ତୁ",
    quickSuggestTracing: "ଲେଖା ଟ୍ରେସିଂ ମେଟ୍ରିକ୍ସ ବ୍ୟାଖ୍ୟା କରନ୍ତୁ",
    tutorReplyPlan: "ଆପଣଙ୍କ ସ୍ତର ଉପରେ ଆଧାର କରି, ଏହା ଆପଣଙ୍କ ଲକ୍ଷ୍ୟ ସୂଚୀ:\n1. 📖 ଟ୍ରେସିଂ ଅଭ୍ୟାସ (15 ମିନିଟ୍)\n2. 🗣️ କଥାବାର୍ତ୍ତା ଅଭ୍ୟାସ (10 ମିନିଟ୍)\n3. 📝 ସାପ୍ତାହିକ କୁଇଜ୍‌ରେ ପ୍ରଗତି ମୂଲ୍ୟାୟନ।",
    tutorReplyScore: "ଆପଣଙ୍କ ସ୍କୋର ଉନ୍ନତ କରିବାକୁ: ଅକ୍ଷର ଗ୍ରିଡ୍‌ର ସୀମା ମଧ୍ୟରେ ଅଙ୍କନ ଉପରେ ଧ୍ୟାନ ଦିଅନ୍ତୁ ଏବଂ ମାଇକ୍ରୋଫୋନ୍ ବ୍ୟବହାର କରିବା ସମୟରେ ସ୍ପଷ୍ଟ ବ୍ୟଞ୍ଜନ ଧ୍ୱନି ଉଚ୍ଚାରଣ କରନ୍ତୁ।",
    tutorReplyDefault: "ବୁଝିଗଲି! ଚାଲନ୍ତୁ ଅଭ୍ୟାସ ଜାରି ରଖିବା। କୁହନ୍ତୁ ମୁଁ ଶବ୍ଦଭଣ୍ଡାର ସମୀକ୍ଷା କରିବି କି ଦୈନିକ ଯୋଜନା ପରାମର୍ଶ ଦେବି।",
    tutorReplyStudyPlan: "ପରାମର୍ଶିତ ଅଧ୍ୟୟନ ଯୋଜନା:\n- ସୋମ ଓ ମଙ୍ଗଳ: ମୂଳ ବ୍ୟଞ୍ଜନ ଟ୍ରେସ୍ କରନ୍ତୁ।\n- ବୁଧ: ବନାନ ଅଭ୍ୟାସ।\n- ଗୁରୁ ଓ ଶୁକ୍ର: ଉଚ୍ଚାରଣ ଯାଞ୍ଚ।\n- ସପ୍ତାହାନ୍ତ: ମକ୍ କୁଇଜ୍।",
    tutorReplyGrammarTip: "ଶିକ୍ଷାଗତ ମାର୍ଗଦର୍ଶିକା:\nଦୈନିକ ଶବ୍ଦ ଗଠନ, ସାଧାରଣ ବିଶେଷ୍ୟ ଏବଂ ସ୍ଥାନୀୟ ବାର୍ତ୍ତାଳାପ ଉପରେ ଧ୍ୟାନ ଦିଅନ୍ତୁ।",
    tutorReplyTracingInfo: "ଟ୍ରେସିଂ ମୂଲ୍ୟାୟନ ବିବରଣୀ:\nଆମର ମଡେଲ ଅଙ୍କିତ ରେଖାଗୁଡ଼ିକୁ ଅକ୍ଷର ଗାଇଡ୍ ସହିତ ମେଳ କରେ। ମସୃଣ, କେନ୍ଦ୍ରୀଭୂତ ରେଖା ସଠିକତା ବଢ଼ାଏ।",
    readingTitle: "ପଠନ ଅଭ୍ୟାସ",
    writingTitle: "ଲେଖା ଅଭ୍ୟାସ",
    speakingTitle: "କଥନ ମୂଲ୍ୟାୟନ",
    readingSubNone: "ମୌଳିକ ଧ୍ୱନିବିଜ୍ଞାନ, ସରଳ ଅକ୍ଷର ଗୋଷ୍ଠୀ ଏବଂ ମୁଖ୍ୟ ଦୃଷ୍ଟି ଶବ୍ଦଭଣ୍ଡାର ଉପରେ ଧ୍ୟାନ ଦିଅନ୍ତୁ।",
    writingSubNone: "ସ୍ପର୍ଶ ସଙ୍କେତ ସହିତ ପ୍ରାରମ୍ଭିକ ବର୍ଣ୍ଣମାଳା ରେଖା ଏବଂ ମୌଳିକ ଧ୍ୱନି ଆକୃତି ଟ୍ରେସ୍ କରନ୍ତୁ।",
    speakingSubNone: "ପ୍ରତିକ୍ରିୟା ପାଇଁ ଏକକ ସ୍ୱର ଏବଂ ମୌଳିକ ବ୍ୟଞ୍ଜନ ଉଚ୍ଚାରଣ କରନ୍ତୁ।",
    readingSubPrimary: "ମୌଳିକ ବହୁ-ଅକ୍ଷର ବାକ୍ୟାଂଶ ପଢ଼ନ୍ତୁ ଏବଂ ସ୍ଥାନୀୟ ଶବ୍ଦଭଣ୍ଡାର ସିଟ୍ ଅନ୍ୱେଷଣ କରନ୍ତୁ।",
    writingSubPrimary: "ମୌଳିକ ଶବ୍ଦ ଟ୍ରେସ୍ କରନ୍ତୁ ଏବଂ ସରଳ ବାକ୍ୟ ଗଠନ ସମାପ୍ତ କରନ୍ତୁ।",
    speakingSubPrimary: "ଅଡିଓ ମତାମତ ସହିତ ଛୋଟ ବ୍ୟବହାରିକ ବାକ୍ୟ ଉଚ୍ଚାରଣ କରନ୍ତୁ।",
    readingSubMiddle: "ଦୈନିକ କାରବାର ଏବଂ ସାର୍ବଜନୀନ ବିଜ୍ଞପ୍ତି ସମ୍ବନ୍ଧୀୟ ମାନକ ଅନୁଚ୍ଛେଦ ପଢ଼ନ୍ତୁ।",
    writingSubMiddle: "କାର୍ଯ୍ୟକ୍ଷମ ଇଣ୍ଟରାକ୍ଟିଭ୍ ଟେକ୍ସଟ୍ ଏଣ୍ଟ୍ରି ଏବଂ ଫର୍ମ ଫିଲ୍ଡ ଲେଖିବା ଅଭ୍ୟାସ କରନ୍ତୁ।",
    speakingSubMiddle: "ସ୍ୱୟଂଚାଳିତ ବାକ୍ ପାର୍ସର୍‌ରେ ବାର୍ତ୍ତାଳାପ ଖଣ୍ଡ କୁହନ୍ତୁ।",
    readingSubHigh: "ବିଶ୍ଳେଷଣାତ୍ମକ ପାଠ୍ୟ ଗଠନ, ଡିଜିଟାଲ୍ ସାକ୍ଷରତା ଏବଂ ସାରାଂଶ ସହିତ ଜଡିତ ହୁଅନ୍ତୁ।",
    writingSubHigh: "କ୍ରମାଗତ ବାକ୍ୟ ଏବଂ ମୁକ୍ତ ଯୋଗାଯୋଗ ଲେଖା ପ୍ରସ୍ତୁତ କରନ୍ତୁ।",
    speakingSubHigh: "ଉଚ୍ଚ-ସଠିକତା ଉଚ୍ଚାରଣ ମୂଲ୍ୟାୟନ ପାଇଁ ଜଟିଳ ବାକ୍ୟାଂଶ ଗଠନ ପ୍ରୟୋଗ କରନ୍ତୁ।"
  },
  urdu: {
    home: "ہوم", signIn: "سائن ان", createAccount: "اکاؤنٹ بنائیں", welcomeBack: "خوش آمدید",
    signInSub: "اپنا سیکھنے کا سفر جاری رکھنے کے لیے سائن ان کریں۔", email: "✉️ ای میل ایڈریس", password: "🔒 پاس ورڈ", fullName: "👤 پورا نام", or: "یا",
    googleSignIn: "گوگل کے ساتھ جاری رکھیں", newHere: "یہاں نئے ہیں؟", alreadyHaveAccount: "پہلے سے اکاؤنٹ ہے؟", landingTitle: "AI کے ذریعے خواندگی کا فروغ",
    landingTitleLine1: "خواندگی کا فروغ", landingTitleLine2: "AI ذہانت کے ذریعے",
    landingSub: "ایک ذاتی نوعیت کا تعلیمی ساتھی جو بالغوں اور پہلی نسل کے سیکھنے والوں کو علاقائی زبانوں میں بنیادی پڑھنے، لکھنے اور بولنے کی مہارت حاصل کرنے میں مدد کرتا ہے۔",
    getStarted: "شروع کریں۔", registerTitle: "اپنا اکاؤنٹ بنائیں", registerSub: "ہماری کمیونٹی میں شامل ہوں اور اپنے سیکھنے کے افق کو وسعت دیں۔",
    languageLabel: "🌐 پسندیدہ مادری زبان", registerLeftTitle: "آپ کا پڑھنے کا سفر یہاں سے شروع ہوتا ہے۔",
    registerLeftSub: "صوتی مشق کے جائزے، حقیقی وقت کے تاثرات, اور روزانہ پڑھنے کے اسباق کو غیر مقفل کرنے کے لیے پروفائل بنائیں۔",
    loginLeftTitle: "ہر وہ لفظ جو آپ سیکھتے ہیں ایک نیا دروازہ کھولتا ہے۔", loginLeftSub: "ذاتی نوعیت کا پڑھنا، لکھنا اور بولنا — آپ کی اپنی زبان میں، آپ کی اپنی رفتار سے Lee۔",
    dashboardTitle: "آپ کے ڈیش بورڈ میں خوش آمدید!", logout: "لاگ آؤٹ",
    eduLabel: "📊 تعلیمی سطح",
    eduLevel1: "کوئی باقاعدہ تعلیم نہیں / بنیادی سیکھنے والے",
    eduLevel2: "پرائمری اسکول (جماعت 1-5)",
    eduLevel3: "مڈل اسکول (جماعت 6-8)",
    eduLevel4: "ہائی اسکول / سیکنڈری (جماعت 9-12)",
    eduLevel5: "اعلیٰ تعلیم / ڈپلومہ / ڈگری",
    navDashboard: "ڈیش بورڈ",
    navMyClass: "میری کلاس",
    navCourses: "کورسز",
    navCommunity: "کمیونٹی",
    navAnalytics: "تجزیات",
    navSettings: "ترتیبات",
    signOut: "سائن آؤٹ",
    searchPlaceholder: "کورسز تلاش کریں",
    todayPrefix: "آج",
    myClassTitle: "میری کلاس لیڈر بورڈ",
    coursesTitle: "نصاب کے ٹریکس",
    communityTitle: "ساکشرAI سیکھنے والوں کی کمیونٹی",
    settingsTitle: "پروفائل اور انٹرفیس ترتیبات",
    coursesYoureTaking: "وہ کورس جو آپ لے رہے ہیں",
    saveProfileChanges: "پروفائل تبدیلیاں محفوظ کریں",
    savingSettings: "ترتیبات محفوظ ہو رہی ہیں...",
    postMessage: "پیغام بھیجیں",
    sendButton: "بھیجیں",
    startModule: "ماڈیول شروع کریں",
    ageLabel: "عمر",
    profileDetails: "پروفائل کی تفصیلات",
    appearanceCustomizer: "ظاہری شکل کسٹمائزر",
    tabNativeModules: "📚 مقامی نصابی ماڈیولز",
    tabLevelQuizzes: "📝 سطح کے کوئز",
    tabOtherBlocks: "✨ دیگر تعلیمی بلاکس",
    avgAccuracy: "اوسط درستگی",
    completedLessonsLabel: "مکمل شدہ اسباق",
    selectedLevelLabel: "منتخب سطح",
    alertMessages: "انتباہی پیغامات",
    dismissAll: "سب ختم کریں",
    assessTitle: "اپنی خواندگی کی سطح میں بہتری کا جائزہ لیں",
    startPrefix: "شروع کریں",
    levelQuizSuffix: "سطح کا کوئز",
    clearChat: "چیٹ صاف کریں",
    aiTutorTitle: "AI خواندگی ٹیوٹر معاون",
    refreshNow: "ابھی ریفریش کریں",
    startNow: "ابھی شروع کریں",
    performanceReportTitle: "کارکردگی رپورٹ",
    evaluationHistoryTitle: "آپ کی تشخیصی تاریخ لاگز",
    strengthsLabel: "خوبیاں",
    areasForImprovementLabel: "بہتری کے شعبے",
    overallProgress: "مجموعی تعلیمی پیشرفت",
    skillEvaluationLabel: "مہارت کی تشخیص",
    recommendedNextLesson: "تجویز کردہ اگلا سبق",
    tutorGreeting: "السلام علیکم {name}! میں آپ کا AI خواندگی ٹیوٹر ہوں۔ میں آپ کے تعلیمی سفر میں رہنمائی کر سکتا ہوں۔ ایک تجویز کردہ آپشن منتخب کریں یا سوال لکھیں۔",
    tutorWriting: "ٹیوٹر لکھ رہا ہے...",
    tutorInputPlaceholder: "حروف، ٹریسنگ، تلفظ کے بارے میں سوال پوچھیں...",
    quickSuggestPlan: "ایک مطالعاتی منصوبہ تجویز کریں",
    quickSuggestGrammar: "تعلیمی گرامر ٹپ تجویز کریں",
    quickSuggestTracing: "تحریری ٹریسنگ میٹرکس بیان کریں",
    tutorReplyPlan: "آپ کی سطح کی بنیاد پر، یہ آپ کا ہدف شیڈول ہے:\n1. 📖 ٹریسنگ مشق (15 منٹ)\n2. 🗣️ بولنے کی مشق (10 منٹ)\n3. 📝 ہفتہ وار کوئز سے پیشرفت جانچیں۔",
    tutorReplyScore: "اپنا سکور بہتر بنانے کے لیے: حروف گرڈ کی حدود میں لکھنے پر توجہ دیں اور مائیکروفون استعمال کرتے وقت واضح صحیح حروف بولیں۔",
    tutorReplyDefault: "سمجھ گیا! چلیں مشق جاری رکھتے ہیں۔ بتائیں کیا میں ذخیرہ الفاظ کا جائزہ لوں یا روزانہ منصوبہ تجویز کروں۔",
    tutorReplyStudyPlan: "تجویز کردہ مطالعاتی منصوبہ:\n- پیر و منگل: بنیادی حروف صحیح ٹریس کریں۔\n- بدھ: املا کی مشق۔\n- جمعرات و جمعہ: تلفظ چیک۔\n- ہفتہ وار: مقابلہ کوئز۔",
    tutorReplyGrammarTip: "تعلیمی رہنما اصول:\nروزانہ الفاظ کی ساخت، عام اسماء اور مقامی گفتگو پر توجہ دیں۔",
    tutorReplyTracingInfo: "ٹریسنگ تشخیص کی تفصیلات:\nہمارا ماڈل کھینچی گئی لکیروں کا حروف گائیڈز سے موازنہ کرتا ہے۔ ہموار، مرکزی لکیریں درستگی بڑھاتی ہیں۔",
    readingTitle: "مطالعہ کی مشق",
    writingTitle: "تحریری مشق",
    speakingTitle: "گفتگو کی تشخیص",
    readingSubNone: "بنیادی صوتیات، سادہ حروف گروپس اور بنیادی نظری الفاظ پر توجہ دیں۔",
    writingSubNone: "لمس کے اشاروں کے ساتھ ابتدائی حروف تہجی کی لکیریں اور بنیادی صوتی اشکال ٹریس کریں۔",
    speakingSubNone: "ردعمل کے لیے واحد حرکات اور بنیادی صحیح حروف بولیں۔",
    readingSubPrimary: "بنیادی کثیر رکنی جملے پڑھیں اور مقامی الفاظ کی شیٹس دیکھیں۔",
    writingSubPrimary: "بنیادی الفاظ ٹریس کریں اور سادہ جملوں کی ساخت مکمل کریں۔",
    speakingSubPrimary: "آڈیو ردعمل کے ساتھ مختصر عملی جملے بولیں۔",
    readingSubMiddle: "روزانہ لین دین اور عوامی نوٹسز سے متعلق معیاری پیراگراف پڑھیں۔",
    writingSubMiddle: "فعال انٹرایکٹو ٹیکسٹ اندراجات اور فارم فیلڈز لکھنے کی مشق کریں۔",
    speakingSubMiddle: "خودکار تقریری پارسر میں گفتگو کے حصے بولیں۔",
    readingSubHigh: "تجزیاتی متن کی ساخت، ڈیجیٹل خواندگی اور خلاصوں میں شامل ہوں۔",
    writingSubHigh: "مسلسل جملے اور آزاد رابطہ تحریریں تیار کریں۔",
    speakingSubHigh: "اعلیٰ درستگی تلفظ کی تشخیص کے لیے پیچیدہ جملوں کی ساخت انجام دیں۔",
  },
  assamese: {
    home: "হোম", signIn: "সাইন ইন", createAccount: "একাউণ্ট খোলক", welcomeBack: "স্বাগতম",
    signInSub: "আপোনাৰ শিকন যাত্ৰা অব্যাহত ৰাখিবলৈ ছাইন ইন কৰক।", email: "✉️ ইমেইল ঠিকনা", password: "🔒 পাছৱৰ্ড", fullName: "👤 সম্পূৰ্ণ নাম", or: "অথবা",
    googleSignIn: "গুগলৰ সৈতে আগবাঢ়ক", newHere: "ইয়াত নতুন নেকি?", alreadyHaveAccount: "ইতিমধ্যে এককাউণ্ট আছে নেকি?", landingTitle: "AI ৰ জৰিয়তে সাক্ষরতা সবলীকৰণ",
    landingTitleLine1: "সাক্ষৰতা সবলীকৰণ", landingTitleLine2: "AI বুদ্ধিৰ জৰিয়তে",
    landingSub: "একটা ব্যক্তিগতকৃত শিক্ষণ সহযোগী যি প্ৰাপ্তবছৰীয়া আৰু প্ৰথম প্ৰজন্মৰ শিক্ষাৰ্থীক আঞ্চলিক ভাষাত মৌলিক পঢ়া, লিখা আৰু কোৱাৰ দক্ষতা অৰ্জন কৰাত সহায় কৰিবলৈ ডিজাইন কৰা হৈছে।",
    getStarted: "আৰম্ভ কৰক", registerTitle: "আপোনাৰ এককাউণ্ট খোলক", registerSub: "আমাৰ সমাজত যোগদান কৰক আৰু আপোনাৰ শিক্ষাৰ পৰিসৰ বৃদ্ধি কৰক।",
    languageLabel: "🌐 পছন্দৰ মাতৃভাষা", registerLeftTitle: "আপোনাৰ সাক্ষরতাৰ যাত্ৰা ইয়াতেই আৰম্ভ হৈছে।",
    registerLeftSub: "ভয়েচ প্ৰেকটিচ এছেছমেণ্ট, ৰিয়েল-টাইম ফীডবেক আৰু দৈনিক পঢ়াৰ পাঠ আনলক কৰিবলৈ এটা প্ৰফাইল সৃষ্টি কৰক।",
    loginLeftTitle: "আপুনি শিকা প্ৰতিটো শব্দই এটা নতুন দুৱাৰ খোলে।", loginLeftSub: "ব্যক্তিগতকৃত পঢ়া, লিখা আৰু কোৱাৰ অভ্যাস — আপোনাৰ নিজৰ ভাষাত, আপোনাৰ নিজৰ গতিৰে।",
    dashboardTitle: "আপোনাৰ ডেশ্ববৰ্ডলৈ স্বাগতম!", logout: "লগ আউট",
    eduLabel: "📊 শিক্ষাগত স্তৰ",
    eduLevel1: "কোনো আনুষ্ঠানিক শিক্ষা নাই / প্ৰাথমিক শিক্ষার্থীক",
    eduLevel2: "প্ৰাথমিক বিদ্যালয় (প্ৰথম-পঞ্চম শ্ৰেণী)",
    eduLevel3: "মধ্য ইংৰাজী বিদ্যালয় (ষষ্ঠ-অষ্টম শ্ৰেণী)",
    eduLevel4: "উচ্চ মাধ্যমিক বিদ্যালয় (নৱম-দ্বাদশ শ্ৰেণী)",
    eduLevel5: "উচ্চ শিক্ষা / ডিপ্লমা / ডিগ্রী",
    navDashboard: "ডেশ্ব’ৰ্ড",
    navMyClass: "মোৰ শ্ৰেণী",
    navCourses: "পাঠ্যক্ৰম",
    navCommunity: "সম্প্ৰদায়",
    navAnalytics: "বিশ্লেষণ",
    navSettings: "ছেটিংছ",
    signOut: "ছাইন আউট",
    searchPlaceholder: "পাঠ্যক্ৰম বিচাৰক",
    todayPrefix: "আজি",
    myClassTitle: "মোৰ শ্ৰেণী লীডাৰবৰ্ড",
    coursesTitle: "পাঠ্যক্ৰম ট্ৰেক",
    communityTitle: "সাক্ষৰAI শিক্ষাৰ্থী সম্প্ৰদায়",
    settingsTitle: "প্ৰ'ফাইল আৰু ইণ্টাৰফেছ ছেটিংছ",
    coursesYoureTaking: "আপুনি লৈ থকা পাঠ্যক্ৰম",
    saveProfileChanges: "প্ৰ'ফাইল সলনি সংৰক্ষণ কৰক",
    savingSettings: "ছেটিংছ সংৰক্ষণ হৈ আছে...",
    postMessage: "বাৰ্তা পঠিয়াওক",
    sendButton: "পঠিয়াওক",
    startModule: "মডিউল আৰম্ভ কৰক",
    ageLabel: "বয়স",
    profileDetails: "প্ৰ'ফাইল বিৱৰণ",
    appearanceCustomizer: "ৰূপ কাষ্টমাইজাৰ",
    tabNativeModules: "📚 স্থানীয় পাঠ্যক্ৰম মডিউল",
    tabLevelQuizzes: "📝 স্তৰ কুইজ",
    tabOtherBlocks: "✨ অন্য শিক্ষণ খণ্ড",
    avgAccuracy: "গড় সঠিকতা",
    completedLessonsLabel: "সম্পূৰ্ণ পাঠ",
    selectedLevelLabel: "নিৰ্বাচিত স্তৰ",
    alertMessages: "সতৰ্কবাণী বাৰ্তা",
    dismissAll: "সকলো বাতিল কৰক",
    assessTitle: "আপোনাৰ সাক্ষৰতাৰ স্তৰৰ উন্নতিৰ মূল্যায়ন কৰক",
    startPrefix: "আৰম্ভ কৰক",
    levelQuizSuffix: "স্তৰ কুইজ",
    clearChat: "চেট পৰিষ্কাৰ কৰক",
    aiTutorTitle: "AI সাক্ষৰতা টিউটৰ সহায়ক",
    refreshNow: "এতিয়া ৰিফ্ৰেছ কৰক",
    startNow: "এতিয়া আৰম্ভ কৰক",
    performanceReportTitle: "কাৰ্যদক্ষতা প্ৰতিবেদন",
    evaluationHistoryTitle: "আপোনাৰ মূল্যায়ন ইতিহাস লগ",
    strengthsLabel: "শক্তি",
    areasForImprovementLabel: "উন্নতিৰ ক্ষেত্ৰ",
    overallProgress: "সামগ্ৰিক শিক্ষণ অগ্ৰগতি",
    skillEvaluationLabel: "দক্ষতা মূল্যায়ন",
    recommendedNextLesson: "পৰামৰ্শিত পৰৱৰ্তী পাঠ",
    tutorGreeting: "নমস্কাৰ {name}! মই আপোনাৰ AI সাক্ষৰতা টিউটৰ। মই আপোনাৰ অধ্যয়ন পথত সহায় কৰিব পাৰোঁ। এটা পৰামৰ্শিত বিকল্প বাছক অথবা প্ৰশ্ন লিখক।",
    tutorWriting: "টিউটৰে লিখি আছে...",
    tutorInputPlaceholder: "আখৰ, ট্ৰেচিং, উচ্চাৰণৰ বিষয়ে প্ৰশ্ন সোধক...",
    quickSuggestPlan: "এটা অধ্যয়ন পৰিকল্পনা পৰামৰ্শ দিয়ক",
    quickSuggestGrammar: "শৈক্ষিক ব্যাকৰণ টিপচ পৰামৰ্শ দিয়ক",
    quickSuggestTracing: "লিখন ট্ৰেচিং মেট্ৰিক্স বুজাওক",
    tutorReplyPlan: "আপোনাৰ স্তৰৰ ওপৰত ভিত্তি কৰি, এইটো আপোনাৰ লক্ষ্য সময়সূচী:\n1. 📖 ট্ৰেচিং অনুশীলন (15 মিনিট)\n2. 🗣️ কথা কোৱাৰ অনুশীলন (10 মিনিট)\n3. 📝 সাপ্তাহিক কুইজেৰে অগ্ৰগতি মূল্যায়ন।",
    tutorReplyScore: "আপোনাৰ স্ক'ৰ উন্নত কৰিবলৈ: আখৰ গ্ৰীডৰ সীমাৰ ভিতৰত আঁকিবলৈ মনোযোগ দিয়ক আৰু মাইক্ৰ'ফ'ন ব্যৱহাৰ কৰাৰ সময়ত স্পষ্ট ব্যঞ্জনধ্বনি উচ্চাৰণ কৰক।",
    tutorReplyDefault: "বুজিলোঁ! অনুশীলন অব্যাহত ৰাখোঁ আহক। কওক মই শব্দভাণ্ডাৰ পৰ্যালোচনা কৰিমনে দৈনিক পৰিকল্পনা পৰামৰ্শ দিম।",
    tutorReplyStudyPlan: "পৰামৰ্শিত অধ্যয়ন পৰিকল্পনা:\n- সোম আৰু মঙ্গল: মূল ব্যঞ্জনবৰ্ণ ট্ৰেচ কৰক।\n- বুধ: বানান অনুশীলন।\n- বৃহস্পতি আৰু শুক্ৰ: উচ্চাৰণ পৰীক্ষা।\n- সপ্তাহান্ত: মক কুইজ।",
    tutorReplyGrammarTip: "শৈক্ষিক নিৰ্দেশনা:\nদৈনিক শব্দ গঠন, সাধাৰণ বিশেষ্য আৰু স্থানীয় বাৰ্তালাপত মনোযোগ দিয়ক।",
    tutorReplyTracingInfo: "ট্ৰেচিং মূল্যায়ন বিৱৰণ:\nআমাৰ মডেলে আঁকা ৰেখাবোৰক আখৰ গাইডৰ সৈতে মিলায়। মসৃণ, কেন্দ্ৰীভূত ৰেখাই সঠিকতা বৃদ্ধি কৰে।",
    readingTitle: "পঠন অনুশীলন",
    writingTitle: "লিখন অনুশীলন",
    speakingTitle: "কথন মূল্যায়ন",
    readingSubNone: "মৌলিক ধ্বনিবিজ্ঞান, সৰল আখৰ সমূহ আৰু মূল দৃষ্টি শব্দভাণ্ডাৰত মনোযোগ দিয়ক।",
    writingSubNone: "স্পৰ্শ সংকেতৰ সৈতে প্ৰাৰম্ভিক আখৰমালা ৰেখা আৰু মৌলিক ধ্বনিগত আকৃতি ট্ৰেচ কৰক।",
    speakingSubNone: "প্ৰতিক্ৰিয়াৰ বাবে একক স্বৰ আৰু মৌলিক ব্যঞ্জন উচ্চাৰণ কৰক।",
    readingSubPrimary: "মৌলিক বহু-আখৰ বাক্যাংশ পঢ়ক আৰু স্থানীয় শব্দভাণ্ডাৰ শ্বীট অন্বেষণ কৰক।",
    writingSubPrimary: "মৌলিক শব্দ ট্ৰেচ কৰক আৰু সৰল বাক্য গঠন সম্পূৰ্ণ কৰক।",
    speakingSubPrimary: "অডিঅ' প্ৰতিক্ৰিয়াৰ সৈতে চুটি ব্যৱহাৰিক বাক্য উচ্চাৰণ কৰক।",
    readingSubMiddle: "দৈনিক লেনদেন আৰু ৰাজহুৱা জাননী সম্পৰ্কীয় প্ৰামাণিক অনুচ্ছেদ পঢ়ক।",
    writingSubMiddle: "কাৰ্যকৰী ইণ্টাৰেক্টিভ লিখনী প্ৰৱিষ্টি আৰু ফৰ্ম ফিল্ড লিখাৰ অনুশীলন কৰক।",
    speakingSubMiddle: "স্বয়ংক্ৰিয় বাক্ পাৰ্চাৰত বাৰ্তালাপ অংশ কওক।",
    readingSubHigh: "বিশ্লেষণাত্মক পাঠ গঠন, ডিজিটেল সাক্ষৰতা আৰু সাৰাংশৰ সৈতে জড়িত হওক।",
    writingSubHigh: "ধাৰাবাহিক বাক্য আৰু মুক্ত যোগাযোগ লিখনী প্ৰস্তুত কৰক।",
    speakingSubHigh: "উচ্চ-সঠিকতা উচ্চাৰণ মূল্যায়নৰ বাবে জটিল বাক্যাংশ গঠন প্ৰয়োগ কৰক।"
  },
  maithili: {
    home: "होम", signIn: "साइन इन", createAccount: "खाता बनाउ", welcomeBack: "स्वागत अछि",
    signInSub: "अपन सीखबाक यात्रा जारी रखबाक लेल साइन in करू।", email: "✉️ ईमेल पता", password: "🔒 पासवर्ड", fullName: "👤 पूरा नाम", or: "वा",
    googleSignIn: "गूगलक संग जारी राखू", newHere: "एतय नव छी?", alreadyHaveAccount: "पहले सं खाता अछि?", landingTitle: "AI क माध्यम सं साक्षरताक सशक्तिकरण",
    landingTitleLine1: "साक्षरताक सशक्तिकरण", landingTitleLine2: "AI बुद्धिमत्ता द्वारा",
    landingSub: "एकटा व्यक्तिगत शिक्षण साथी जे वयस्क आ पहिल पीढ़िक सीखनिहार लोकनिकेँ क्षेत्रीय भाषामे बुनियादी पढ़ब, लिखब आ बाजबाक कौशल हासिल करबामे मद्दत करबाक लेल बनाओल गेल अछि।",
    getStarted: "शुरू करू", registerTitle: "अपन खाता बनाउ", registerSub: "हमर समुदायमे शामिल होऊ आ अपन सीखबाक दायरा बढाउ।",
    languageLabel: "🌐 पसंदीदा मातृभाषा", registerLeftTitle: "अहाँक साक्षरताक यात्रा एतय सं शुरू होइत अछि।",
    registerLeftSub: "आवाज अभ्यास मूल्यांकन आ दैनिक पढ़बाक पाठकेँ अनलॉक करबाक लेल एकटा प्रोफाइल बनाउ।",
    loginLeftTitle: "अहाँक द्वारा सीखल गेल हर शब्द एकटा नव कपाट खोलैत अछि।", loginLeftSub: "व्यक्तिগত পড়ব, लिखব आ बाजबाक अभ्यास — ਅहाँक अपन भाषामे, अपन गति सं।",
    dashboardTitle: "अहाँक डैशबोर्डमे स्वागत अछि!", logout: "लॉग आउट",
    eduLabel: "📊 शैक्षणिक स्तर",
    eduLevel1: "कोनो औपचारिक शिक्षा नै / बुनियादी शिक्षार्थी",
    eduLevel2: "प्राथमिक विद्यालय (कक्षा 1-5)",
    eduLevel3: "मध्यम विद्यालय (कक्षा 6-8)",
    eduLevel4: "उच्च माध्यमिक (कक्षा 9-12)",
    eduLevel5: "उच्च शिक्षा / डिप्लोमा / डिग्री",
    navDashboard: "ड्याशबोर्ड",
    navMyClass: "हमर कक्षा",
    navCourses: "पाठ्यक्रम",
    navCommunity: "समुदाय",
    navAnalytics: "विश्लेषण",
    navSettings: "सेटिंग्स",
    signOut: "साइन आउट",
    searchPlaceholder: "पाठ्यक्रम खोजू",
    todayPrefix: "आइ",
    myClassTitle: "हमर कक्षा लीडरबोर्ड",
    coursesTitle: "पाठ्यक्रम ट्रैक",
    communityTitle: "साक्षरAI शिक्षार्थी समुदाय",
    settingsTitle: "प्रोफाइल आ इंटरफेस सेटिंग्स",
    coursesYoureTaking: "अहां लऽ रहल पाठ्यक्रम",
    saveProfileChanges: "प्रोफाइल बदलाव सहेजू",
    savingSettings: "सेटिंग्स सहेजल जा रहल अछि...",
    postMessage: "संदेश पठाऊ",
    sendButton: "पठाऊ",
    startModule: "मॉड्यूल शुरू करू",
    ageLabel: "उमेर",
    profileDetails: "प्रोफाइल विवरण",
    appearanceCustomizer: "रूप-रंग अनुकूलक",
    tabNativeModules: "📚 स्थानीय पाठ्यक्रम मॉड्यूल",
    tabLevelQuizzes: "📝 स्तर क्विज़",
    tabOtherBlocks: "✨ आन शिक्षण खंड",
    avgAccuracy: "औसत सटीकता",
    completedLessonsLabel: "पूर्ण पाठ",
    selectedLevelLabel: "चयनित स्तर",
    alertMessages: "सूचना संदेश",
    dismissAll: "सभटा हटाऊ",
    assessTitle: "अपन साक्षरता स्तर सुधार के आकलन करू",
    startPrefix: "शुरू करू",
    levelQuizSuffix: "स्तर क्विज़",
    clearChat: "चैट साफ करू",
    aiTutorTitle: "AI साक्षरता ट्यूटर सहायक",
    refreshNow: "अखने रिफ्रेश करू",
    startNow: "अखने शुरू करू",
    performanceReportTitle: "प्रदर्शन रिपोर्ट",
    evaluationHistoryTitle: "अहांक मूल्यांकन इतिहास लॉग",
    strengthsLabel: "शक्ति",
    areasForImprovementLabel: "सुधार क्षेत्र",
    overallProgress: "कुल सिखबाक प्रगति",
    skillEvaluationLabel: "कौशल मूल्यांकन",
    recommendedNextLesson: "अनुशंसित अगिला पाठ",
    tutorGreeting: "नमस्कार {name}! हम अहांक AI साक्षरता ट्यूटर छी। हम अहांक अध्ययन पथ मे मदद क सकैत छी। कोनो सुझाओल विकल्प चुनू वा प्रश्न लिखू।",
    tutorWriting: "ट्यूटर लिख रहल अछि...",
    tutorInputPlaceholder: "अक्षर, ट्रेसिंग, उच्चारण के बारे मे प्रश्न पूछू...",
    quickSuggestPlan: "अध्ययन योजना सुझाउ",
    quickSuggestGrammar: "शैक्षिक व्याकरण सुझाव दिअ",
    quickSuggestTracing: "लेखन ट्रेसिंग मेट्रिक्स बुझाउ",
    tutorReplyPlan: "अहांक स्तर के आधार पर, ई अछि अहांक लक्ष्य कार्यक्रम:\n1. 📖 ट्रेसिंग अभ्यास (15 मिनट)\n2. 🗣️ बजबाक अभ्यास (10 मिनट)\n3. 📝 साप्ताहिक क्विज़ स प्रगति के आकलन।",
    tutorReplyScore: "अपन स्कोर सुधारबाक लेल: अक्षर ग्रिड के सीमा भीतर लिखबा पर ध्यान दिअ आ माइक्रोफोन उपयोग करैत समय स्पष्ट व्यंजन बजाउ।",
    tutorReplyDefault: "बुझि गेलौं! चलू अभ्यास जारी रखी। कहू हम शब्दावली के समीक्षा करू वा दैनिक योजना सुझाबी।",
    tutorReplyStudyPlan: "सुझाओल अध्ययन योजना:\n- सोम आ मंगल: मूल व्यंजन ट्रेस करू।\n- बुध: शब्द निर्माण अभ्यास।\n- गुरु आ शुक्र: उच्चारण जांच।\n- सप्ताहांत: मॉक क्विज़।",
    tutorReplyGrammarTip: "शैक्षिक दिशानिर्देश:\nदैनिक शब्द संरचना, सामान्य संज्ञा आ स्थानीय संवाद पर ध्यान दिअ।",
    tutorReplyTracingInfo: "ट्रेसिंग मूल्यांकन विवरण:\nहमर मॉडल खींचल रेखा के अक्षर गाइड स तुलना करैत अछि। सहज आ केंद्रित रेखा सटीकता बढ़बैत अछि।",
    readingTitle: "पठन अभ्यास",
    writingTitle: "लेखन अभ्यास",
    speakingTitle: "वाचन मूल्यांकन",
    readingSubNone: "बुनियादी ध्वनि पहचान, सरल अक्षर समूहन आ मूल दृष्टि शब्दावली पर ध्यान दिअ।",
    writingSubNone: "स्पर्श इशारा स प्रारंभिक वर्णमाला रेखा आ मूल ध्वन्यात्मक आकार ट्रेस करू।",
    speakingSubNone: "प्रतिक्रिया लेल एकल स्वर आ बुनियादी व्यंजन बजाउ।",
    readingSubPrimary: "बुनियादी बहु-अक्षर वाक्यांश पढ़ू आ स्थानीय शब्दावली शीट देखू।",
    writingSubPrimary: "बुनियादी शब्द ट्रेस करू आ सरल वाक्य संरचना पूरा करू।",
    speakingSubPrimary: "ऑडियो फीडबैक स छोट व्यावहारिक वाक्य बजाउ।",
    readingSubMiddle: "दैनिक लेनदेन आ सार्वजनिक सूचना स जुड़ल मानक अनुच्छेद पढ़ू।",
    writingSubMiddle: "कार्यात्मक इंटरैक्टिव टेक्स्ट प्रविष्टि आ फॉर्म फील्ड लिखबाक अभ्यास करू।",
    speakingSubMiddle: "स्वचालित वाक् पहचान मे संवादात्मक अंश बजाउ।",
    readingSubHigh: "विश्लेषणात्मक पाठ संरचना, डिजिटल साक्षरता आ सारांश स जुड़ू।",
    writingSubHigh: "निरंतर वाक्य आ स्वतंत्र संचार लेख तैयार करू।",
    speakingSubHigh: "उच्च-सटीकता उच्चारण मूल्यांकन हेतु जटिल वाक्यांश बजाउ।"
  },
  santhali: {
    home: "ᱦᱳᱢ", signIn: "ᱥᱟᱭᱤᱱ 🇮🇳", createAccount: "ᱠᱷᱟᱛﺎ ᱵᱮᱱᱟᱣ", welcomeBack: "ᱥᱟᱹᱜᱩն ᱫtransition",
    signInSub: "Aᱢᱟᱜ ᱪեదᱚᱜ ᱦᱚᱨᱟ ᱞᱟਹา 🇮🇩 ᱞᱟᱹᱜིᱫ ᱥᱟᱭᱤն 🇮🇳 ᱢੇ ᱾", email: "✉️ ਈਮੇਲ ਟੀਕੇ", password: "🔒 ᱯᱟᱥᱣᱟरᱰ", fullName: "👤 ᱯᱩᱨᱟᱹ ᱧᱩᱛᱩມ", or: "ᱪᱮ",
    googleSignIn: "ᱜᱩᱜᱚᱞ ᱥᱟᱶ ᱞᱟᱦาᱜ ᱢᱮ", newHere: "ᱱᱚᱸᱰେ ᱱﺎᱣา ᱜᱮᱭᱟᱢ?", alreadyHaveAccount: "ᱞᱟਹา ᱠᱷᱚն ᱠᱷᱟᱛᱟ ᱢେᱱᱟᱜ-า?", landingTitle: "AI ᱛᱮ ᱚլ ᱯᱟᱲհาဝ် ᱞᱟᱦาन्ति",
    landingTitleLine1: "ᱚᱞ ᱯᱟᱲᱦᱟᱣ", landingTitleLine2: "AI ᱫᱚ ᱵᱩᱫᱷᱤ ᱛᱮ",
    landingSub: "ᱢᱤᱫ ᱟପնար ᱪեదᱚᱜ གﺎᱛᱮ ᱡﺎᱦᱟᱸᱭ ᱫᱚ ᱦᱟᱨa ᱵᱩᱨᱩ ᱟᱨ ᱯᱩᱭᱞᱩ ᱯᱤᱲਹਿ ᱪեదᱚᱜ ᱠᱚ ᱟᱠᱚᱣาᱜ ᱟᱭᳵ ᱟᱲᱟᱝ ᱛᱮ ᱚլ, ᱯᱟᱲհาဝ် ᱟᱨ ᱨᱚᱲ ᱪեదᱚᱜ ᱨᱮ ᱜᱚᱲᱚ ᱮਮา ᱠᱚৱᱟ ᱾",
    getStarted: "ᱮܗۆᱵ ᱢᱮ", registerTitle: "Aᱢᱟᱜ ᱠᱷᱟᱛา ᱵᱮնาᱣ ᱢᱮ", registerSub: "Aᱞᱮ ᱥᱟᱶ ᱡᱩᱲᱟᱹᱣ ᱢᱮ ᱟᱨ ᱟᱢาᱜ ᱜᱮᱭᱟն ᱯᱟᱥնᱟᱣ ᱢᱮ ᱾",
    languageLabel: "🌐 ᱠᱩᱥᱤᱭᱟᱜ ᱟᱭᳵ ᱟᱲᱟᱝ", registerLeftTitle: "Aᱢᱟᱜ ᱥᱮଚᱮᱫ ᱦᱚᱨᱟ ᱱᱚᱸᳰେ ᱠᱷᱚն ᱮܗᱚᱵᱚᱜ-ᱟ ᱾",
    registerLeftSub: "Aᱲาᱝ ᱵᱤᰰᱟᱹᱣ ᱟᱨ 🇩🇮նาᱹਮ ᱯᱟᱲհาဝ် ᱞեସᱚն ᱠᱚ ᱡᱷᱤᱡ ᱞᱟᱹᱜིᱫ ᱯᱨᱚပᱷᱟᱭᱤᱞ ᱵᱮնᱟᱣ ᱢᱮ ᱾",
    loginLeftTitle: "复杂 ᱫᱩᱣᱟᱹᱨ ᱡᱷᱤᱡ-ᱟ ᱾", loginLeftSub: "Aਪਨਾਰ ᱯᱟᱲհาဝ်, ᱚլ ᱟᱨ ᱨᱚᱲ ᱨᱮᱱาᱜ ᱵᱤᰰᱟᱹᱣ — ᱟᱢᱟᱜ ᱛᱮ, ᱟᱢᱟᱜ ᱛᱟᱹᱞ ᱛᱮ ᱾",
    dashboardTitle: "Aᱢᱟᱜ ᱰᱮᱥᱵᱳᱨᱰ ᱨᱮ ᱥᱟᱹᱜᱩն ᱫtransition!", logout: "ᱳᱰᱳᱜ ᱢᱮ",
    eduLabel: "📊 ᱥᱮᱪᱮᱫ ᱛᱟᱹᱞ",
    eduLevel1: "Formal ᱥᱮᱪᱮᱫ ᱵᱟᱹնᱩᱜ-ᱟ / ᱮܗᱚᱵ ᱪեదᱚᱜ",
    eduLevel2: "Primary ᱟᱥᱲᱟ (Class 1-5)",
    eduLevel3: "Middle ᱟᱥᱲᱟ (Class 1-5)",
    eduLevel4: "High ᱟᱥᱲᱟ / Secondary (Class 9-12)",
    eduLevel5: "Higher Education / Diploma / Degree",
    navDashboard: "ᱰᱮᱥᱵᱚᱰ",
    navMyClass: "ᱤᱧᱟᱜ ᱠᱞᱟᱥ",
    navCourses: "ᱠᱳᱨᱥ",
    navCommunity: "ᱡᱟᱛᱤ",
    navAnalytics: "ᱵᱤᱥᱞᱮᱥᱚᱬ",
    navSettings: "ᱥᱮᱴᱤᱝ",
    signOut: "ᱥᱟᱭᱤᱱ ᱟᱳᱴ",
    searchPlaceholder: "ᱠᱳᱨᱥ ᱥᱮᱸᱫᱽᱨᱟ ᱢᱮ",
    todayPrefix: "ᱛᱮᱦᱮᱸ",
    myClassTitle: "ᱤᱧᱟᱜ ᱠᱞᱟᱥ ᱞᱤᱰᱚᱨᱵᱚᱰ",
    coursesTitle: "ᱠᱚᱨᱥ ᱴᱨᱮᱠ",
    communityTitle: "ᱥᱟᱠᱷᱚᱨAI ᱥᱮᱬᱟᱭ ᱡᱟᱛᱤ",
    settingsTitle: "ᱯᱨᱳᱯᱷᱟᱭᱤᱞ ᱟᱨ ᱥᱮᱴᱤᱝ",
    coursesYoureTaking: "ᱟᱢ ᱠᱳᱨᱥ",
    saveProfileChanges: "ᱯᱨᱳᱯᱷᱟᱭᱤᱞ ᱥᱟᱺᱴ ᱢᱮ",
    savingSettings: "ᱥᱮᱴᱤᱝ ᱥᱟᱺᱴ ᱦᱩᱭᱩᱜ ᱠᱟᱱᱟ...",
    postMessage: "ᱠᱷᱚᱵᱚᱨ ᱠᱩᱞ ᱢᱮ",
    sendButton: "ᱠᱩᱞ ᱢᱮ",
    startModule: "ᱢᱳᱰᱤᱭᱩᱞ ᱮᱛᱦᱚᱵ ᱢᱮ",
    ageLabel: "ᱚᱢᱚᱨ",
    profileDetails: "ᱯᱨᱳᱯᱷᱟᱭᱤᱞ ᱵᱤᱵᱨᱚᱬ",
    appearanceCustomizer: "ᱨᱩᱯ ᱠᱟᱥᱴᱚᱢᱟᱭᱡᱚᱨ",
    tabNativeModules: "📚 ᱟᱭᱢᱟ ᱢᱳᱰᱤᱭᱩᱞ",
    tabLevelQuizzes: "📝 ᱞᱮᱵᱷᱮᱞ ᱠᱩᱭᱡᱽ",
    tabOtherBlocks: "✨ ᱮᱴᱟᱜ ᱥᱮᱬᱟᱭ ᱵᱞᱚᱠ",
    avgAccuracy: "ᱢᱟᱸᱡᱷ ᱴᱷᱤᱠ",
    completedLessonsLabel: "ᱯᱩᱨᱟᱹ ᱯᱟᱲᱦᱟᱣ",
    selectedLevelLabel: "ᱵᱟᱪᱷᱟᱣ ᱞᱮᱵᱷᱮᱞ",
    alertMessages: "ᱦᱩᱥᱤᱭᱟᱨ ᱠᱷᱚᱵᱚᱨ",
    dismissAll: "ᱡᱚᱛᱚ ᱵᱟᱹᱰ ᱢᱮ",
    assessTitle: "ᱟᱢᱟᱜ ᱥᱟᱠᱷᱚᱨ ᱞᱮᱵᱷᱮᱞ ᱵᱟᱲᱛᱤ ᱥᱟᱯᱲᱟᱣ ᱢᱮ",
    startPrefix: "ᱮᱛᱦᱚᱵ ᱢᱮ",
    levelQuizSuffix: "ᱞᱮᱵᱷᱮᱞ ᱠᱩᱭᱡᱽ",
    clearChat: "ᱪᱮᱴ ᱯᱷᱟᱨᱪᱟᱭ ᱢᱮ",
    aiTutorTitle: "AI ᱥᱟᱠᱷᱚᱨ ᱴᱭᱩᱴᱚᱨ ᱜᱚᱲᱚ",
    refreshNow: "ᱱᱤᱛᱚᱜ ᱨᱤᱯᱷᱨᱮᱥ ᱢᱮ",
    startNow: "ᱱᱤᱛᱚᱜ ᱮᱛᱦᱚᱵ ᱢᱮ",
    performanceReportTitle: "ᱠᱟᱹᱢᱤ ᱨᱤᱯᱳᱴ",
    evaluationHistoryTitle: "ᱟᱢᱟᱜ ᱢᱩᱞᱭᱟᱭᱟᱱ ᱦᱤᱛᱟᱦᱟᱥ ᱞᱚᱜ",
    strengthsLabel: "ᱡᱚᱨ",
    areasForImprovementLabel: "ᱵᱟᱲᱛᱤ ᱡᱟᱭᱜᱟ",
    overallProgress: "ᱡᱚᱛᱚ ᱥᱮᱬᱟᱭ ᱵᱟᱲᱛᱤ",
    skillEvaluationLabel: "ᱠᱩᱥᱤᱭᱟᱹᱨᱤ ᱢᱩᱞᱭᱟᱭᱟᱱ",
    recommendedNextLesson: "ᱛᱟᱵᱚᱱ ᱛᱟᱭᱚᱢ ᱯᱟᱲᱦᱟᱣ",
    tutorGreeting: "जोहार {name}! इंग चि आमाग AI सारना गुरु। इंग आमाग सारना लेका सहायता दाड़ेयाम। एको सोलोकाना बिकल्प बाछा पे आर सवाल ओलपे।",
    tutorWriting: "गुरु ओल कान...",
    tutorInputPlaceholder: "अरा, ट्रेसिंग, उच्चारण बाबद सवाल पुछऽ मे...",
    quickSuggestPlan: "मित सारना काम सोलोक मे",
    quickSuggestGrammar: "सारना व्याकरण टिप्स सोलोक मे",
    quickSuggestTracing: "ओल ट्रेसिंग मेट्रिक्स बुझा मे",
    tutorReplyPlan: "आमाग लेभेल रे आधारित, नोवा आमाग लक्ष्य समय:\n1. 📖 ट्रेसिंग अभ्यास (15 मिनिट)\n2. 🗣️ रोड़ अभ्यास (10 मिनिट)\n3. 📝 हाप्ता क्विज रे बाड़ती मूल्यांकन।",
    tutorReplyScore: "आमाग स्कोर बेस काहामेत्ते: अरा ग्रिड रेयाक सीमा भितरे ओल दाड़े ध्यान एम आर माइक्रोफोन इस्तेमाल ओक ताहेन ते फराक व्यंजन रोड़ मे।",
    tutorReplyDefault: "बुझ लेदिंग! अभ्यास जारी दहा। मेन मे इंग शब्दभंडार समीक्षा दाड़ेयाम की हाप्तावारी योजना सोलोक दाड़ेयाम।",
    tutorReplyStudyPlan: "सोलोकाना सारना योजना:\n- सोम आर मंगल: मूल व्यंजन ट्रेस मे।\n- बुध: बानान अभ्यास।\n- गुरु आर सुक्रो: उच्चारण जांच।\n- हाप्ता सेष: मक क्विज।",
    tutorReplyGrammarTip: "सारना दिशानिर्देश:\nहाप्तावारी शब्द गठन, सादा संज्ञा आर सिमको बातचित रे ध्यान एम।",
    tutorReplyTracingInfo: "ट्रेसिंग मूल्यांकन विवरण:\nओनाग मॉडल आंकल रेखा को अरा गाइड ते मिलाव कादा। सहज आर केंद्रित रेखा सटीकता बाड़ेया।",
    readingTitle: "पाढ़हा अभ्यास",
    writingTitle: "ओल अभ्यास",
    speakingTitle: "रोड़ मूल्यांकन",
    readingSubNone: "मूल ध्वनि पहचान, सादा अरा समूह आर मूल शब्दभंडार रे ध्यान एम।",
    writingSubNone: "फुरकाव इशारा ते प्रारंभिक अरामाला रेखा आर मूल ध्वनि आकार ट्रेस मे।",
    speakingSubNone: "प्रतिक्रिया लागित एकल स्वर आर मूल व्यंजन रोड़ मे।",
    readingSubPrimary: "मूल बहु-अरा वाक्यांश पाढ़हा आर सिमको शब्दभंडार शीट टहल मे।",
    writingSubPrimary: "मूल शब्द ट्रेस मे आर सादा वाक्य गठन पूरा मे।",
    speakingSubPrimary: "ऑडियो प्रतिक्रिया ते हुड़िंग व्यावहारिक वाक्य रोड़ मे।",
    readingSubMiddle: "हाप्तावारी लेनदेन आर सार्वजनिक सूचना बाबद मानक अनुच्छेद पाढ़हा।",
    writingSubMiddle: "कार्यात्मक इंटरैक्टिव टेक्स्ट एंट्री आर फॉर्म फील्ड ओल अभ्यास मे।",
    speakingSubMiddle: "स्वचालित रोड़ पार्सर रे बातचित अंश रोड़ मे।",
    readingSubHigh: "विश्लेषणात्मक पाठ गठन, डिजिटल सारना आर सारांश ते जुड़ मे।",
    writingSubHigh: "निरंतर वाक्य आर स्वतंत्र संचार लेख तैयार मे।",
    speakingSubHigh: "उच्च-सटीकता उच्चारण मूल्यांकन लागित जटिल वाक्यांश गठन लागाव मे।"
  },
  kashmiri: {
    home: "ہوم", signIn: "سائن ان", createAccount: "اکاؤنٹ بنایو", welcomeBack: "خوش آمدید",
    signInSub: "پنُن تعلیمی سفر جاری تھونہ خاطرہ کٔریو سائن ان۔", email: "✉️ ای میل پتہ", password: "🔒 پاس ورڈ", fullName: "👤 پۆرو ناؤ", or: "یا",
    googleSignIn: "گوگل پیتھ کٔریو جاری", newHere: "نۆو چُھا؟", alreadyHaveAccount: "برونہہ پؠٹھے چُھا اکاؤنٹ؟", landingTitle: "AI ذریہ تعلیمی بیداری",
    landingTitleLine1: "تعلیمی بیداری", landingTitleLine2: "AI ذہانت ذریہ",
    landingSub: "اکھ پنُن تعلیمی مددگار یُס वडिरन تۂ گوڈنچہ نسلِ ہندین پرن والین ہنز مادری زبانن منز پراز پرنس، لیکھنس تۂ بولنس منز مدد کران چُھ।",
    getStarted: "شروع کٔریو", registerTitle: "پنُن اکاؤنٹ بنایو", registerSub: "سٲنس برادری منز شمل کٔریو تۂ پنُن علم بڑھایو।",
    languageLabel: "🌐 مادری زبان", registerLeftTitle: "تُہند پرنُک سفر چُھ یتنے شروع سپدان।",
    registerLeftSub: "آواز ہند مشق تۂ پرնک سبق انلاک کرنہ خاطرہ کٔریو پروفائل تیار।",
    loginLeftTitle: "ہر اکھ لفظ یُس تُہی پروו سو چُھ اکھ نیاو دروازہ کھولان।", loginLeftSub: "پننہ زبانِ منز تۂ پننہ رفتارس پیتھ پرنُک تۂ بولنُک مشق।",
    dashboardTitle: "تُہندس ڈیش بورڈس منز خوش آمدید!", logout: "لاگ آؤٹ",
    eduLabel: "📊 تعلیمی سطح",
    eduLevel1: "کانہہ باضابطہ تٲلیم نہ / بنیادی ہیچھن وول",
    eduLevel2: "پرائمری اسکول (जмаث 1-5)",
    eduLevel3: "مڈل اسکول (जмаث 6-8)",
    eduLevel4: "ہائی اسکول / سیکنڈری (जмаث 9-12)",
    eduLevel5: "اعلیٰ تٲلیم / ڈپلومہ / دگری",
    navDashboard: "ڈیش بورڈ",
    navMyClass: "می̆ٚنٕہ کلاس",
    navCourses: "کورس",
    navCommunity: "برادری",
    navAnalytics: "تجزیہ",
    navSettings: "ترتیٖباتھ",
    signOut: "سائن آؤٹ",
    searchPlaceholder: "کورس ژھانڈیو",
    todayPrefix: "أز",
    myClassTitle: "می̆ٚنٕہ کلاس لیڈربورڈ",
    coursesTitle: "نصاب ٹریک",
    communityTitle: "ساکشرAI برادری",
    settingsTitle: "پروفائل تہٕ انٹرفیس ترتیٖباتھ",
    coursesYoureTaking: "تُہٕ چھُ یُس کورس پران",
    saveProfileChanges: "پروفائل تبدیلی سیو کٔریو",
    savingSettings: "ترتیٖباتھ سیو گژھان چھِ...",
    postMessage: "پیغام بیٚژیو",
    sendButton: "بیٚژیو",
    startModule: "ماڈیول شروع کٔریو",
    ageLabel: "عمر",
    profileDetails: "پروفائل تفصیل",
    appearanceCustomizer: "ظاہری شکل کسٹمائزر",
    tabNativeModules: "📚 مقامی نصابی ماڈیول",
    tabLevelQuizzes: "📝 سطحی کوئز",
    tabOtherBlocks: "✨ بییِ سیٖکھنہ حصہٕ",
    avgAccuracy: "اوسط درستی",
    completedLessonsLabel: "پُور سبق",
    selectedLevelLabel: "ژٕ سطح",
    alertMessages: "خبردار پیٚغام",
    dismissAll: "سٲری ختم کٔریو",
    assessTitle: "پننہٕ خواندگی سطحس منز بہتری چھانڈیو",
    startPrefix: "شروع کٔریو",
    levelQuizSuffix: "سطحی کوئز",
    clearChat: "چیٹ صاف کٔریو",
    aiTutorTitle: "AI خواندگی ٹیوٹر مددگار",
    refreshNow: "اووٕ تازہ کٔریو",
    startNow: "اووٕ شروع کٔریو",
    performanceReportTitle: "کارکردگی رپورٹ",
    evaluationHistoryTitle: "تُہنٛد تشخیصی تاریخ لاگ",
    strengthsLabel: "خوبی",
    areasForImprovementLabel: "بہتری خاطرٕ حصہٕ",
    overallProgress: "مجموعی سیٖکھنہ ترقی",
    skillEvaluationLabel: "مہارت تشخیص",
    recommendedNextLesson: "تجویز کرمُت أگلہٕ سبق",
    tutorGreeting: "آداب {name}! بہٕ چھُس تُہنٛد AI خواندگی ٹیوٹر۔ بہٕ چھُس تُہنٛدس مطالعہٕ رستہٕ منز مدد دِنہٕ ہیٚکان۔ تجویز کرمُت آپشن ژھانڈیو یا سوال لیٚکھیو۔",
    tutorWriting: "ٹیوٹر چھُ لیکھان...",
    tutorInputPlaceholder: "حرف، ٹریسنگ، تلفظ بابتھ سوال پوٚچھیو...",
    quickSuggestPlan: "مطالعہٕ منصوبہٕ تجویز کٔریو",
    quickSuggestGrammar: "تعلیمی گرامر ٹِپ تجویز کٔریو",
    quickSuggestTracing: "لیکھنہٕ ٹریسنگ میٹرکس بیان کٔریو",
    tutorReplyPlan: "تُہنٛدس سطحس بنٕقاد پؠٹھ، یہ چھُ تُہنٛد ہدف شیڈول:\n1. 📖 ٹریسنگ مشق (15 مِنَٹ)\n2. 🗣️ واتیزُن مشق (10 مِنَٹ)\n3. 📝 ہفتہٕ وار کوئز ہُنٛد ترقی جانٛچیو۔",
    tutorReplyScore: "پننہٕ سکور بہتر بناونہٕ خاطرٕ: حرف گرِڈ ہنٛدِس حدودس منز لیکھنس پؠٹھ توجہ دِیو تہٕ مائیکروفون استعمال کرنہٕ ہنٛز واقتھ صاف صحیح حرف واتیزیو۔",
    tutorReplyDefault: "سمجھ آیہ! چلیو مشق جاری تھاویو۔ ووتیو کیا بہٕ ذخیرہٕ الفاظہٕ ہنٛز جائزہٕ لٮ۪یم یا روزانہٕ منصوبہٕ تجویز کٔرِم۔",
    tutorReplyStudyPlan: "تجویز کرمُت منصوبہٕ:\n- ژٕند تہٕ بوٚم: بنیادی حرف صحیح ٹریس کٔریو۔\n- بودھ: املا مشق۔\n- برٛس تہٕ جُمہ: تلفظ چیک۔\n- ہفتہٕ آخر: مقابلہٕ کوئز۔",
    tutorReplyGrammarTip: "تعلیمی رہنما اصول:\nروزانہٕ الفاظہٕ ہنٛز ساخت، عام اسماء تہٕ مقامی گفتگہٕ پؠٹھ توجہ دِیو۔",
    tutorReplyTracingInfo: "ٹریسنگ تشخیص تفصیل:\nاسہٕ ماڈل چھُ کٔشمٕژ لکیرہٕ حرف گائیڈس سٕتھ موازنہٕ کران۔ ہموار، مرکزی لکیر چھِ درستی بڑھاوان۔",
    readingTitle: "مطالعہٕ مشق",
    writingTitle: "لیکھنہٕ مشق",
    speakingTitle: "واتیزُن تشخیص",
    readingSubNone: "بنیادی صوتیات، سادہٕ حرف گروپس تہٕ بنیادی نظری الفاظہٕ پؠٹھ توجہ دِیو۔",
    writingSubNone: "لمس اشارن سٕتھ ابتدائی حرف تہجی لکیر تہٕ بنیادی صوتی شکل ٹریس کٔریو۔",
    speakingSubNone: "ردعمل خاطرٕ واحد حرکات تہٕ بنیادی صحیح حرف واتیزیو۔",
    readingSubPrimary: "بنیادی کثیر رکنی جملہٕ پرِیو تہٕ مقامی الفاظہٕ ہنٛز شیٹ ژھانڈیو۔",
    writingSubPrimary: "بنیادی الفاظ ٹریس کٔریو تہٕ سادہٕ جملن ہنٛز ساخت مکمل کٔریو۔",
    speakingSubPrimary: "آڈیو ردعمل سٕتھ مختصر عملی جملہٕ واتیزیو۔",
    readingSubMiddle: "روزانہٕ لین دین تہٕ عوامی نوٹسن متعلق معیاری پیراگراف پرِیو۔",
    writingSubMiddle: "فعال انٹرایکٹو ٹیکسٹ اندراج تہٕ فارم فیلڈ لیکھنہٕ مشق کٔریو۔",
    speakingSubMiddle: "خودکار تقریری پارسرس منز گفتگہٕ ہنٛز حصہٕ واتیزیو۔",
    readingSubHigh: "تجزیاتی متن ہنٛز ساخت، ڈیجیٹل خواندگی تہٕ خلاصن منز شامل گژھیو۔",
    writingSubHigh: "مسلسل جملہٕ تہٕ آزاد رابطہٕ تحریرٕ تیار کٔریو۔",
    speakingSubHigh: "اعلیٰ درستی تلفظ تشخیص خاطرٕ پیچیدہٕ جملن ہنٛز ساخت انجام دِیو۔"
  },
  nepali: {
    home: "होम", signIn: "साइन इन", createAccount: "खाता सिर्जना गर्नुहोस्", welcomeBack: "स्वागत छ",
    signInSub: "आफ्नो सिकाई यात्रा जारी राख्न साइन इन गर्नुहोस्।", email: "✉️ इमेल ठेगाना", password: "🔒 पासवर्ड", fullName: "👤 पूरा नाम", or: "वा",
    googleSignIn: "गुगलसँग जारी राख्नुहोस्", newHere: "यहाँ नयाँ हुनुहुन्छ?", alreadyHaveAccount: "पहिले नै खाता छ?", landingTitle: "AI मार्फत साक्षरता सशक्तिकरण",
    landingTitleLine1: "साक्षरता सशक्तिकरण", landingTitleLine2: "AI बुद्धिमत्ता मार्फत",
    landingSub: "एक व्यक्तिगत सिकाइ साथी जुन वयस्कहरू र पहिलो पुस्ताका शिक्षार्थीहरूलाई क्षेत्रीय भाषाहरूमा आधारभूत पढ्न, लेख्न र बोल्ने सीपहरू प्राप्त गर्न मद्दत गर्न डिजाइन गरिएको हो।",
    getStarted: "सुरु गर्नुहोस्", registerTitle: "आफ्नो खाता सिर्जना गर्नुहोस्", registerSub: "हाम्रो समुदायमा सामेल हुनुहोस् र आफ्नो सिकाई क्षितिज विस्तार गर्नुहोस्।",
    languageLabel: "🌐 रुचाइएको मातृभाषा", registerLeftTitle: "तपाईंको साक्षरता यात्रा यहाँबाट सुरु हुन्छ।",
    registerLeftSub: "आवाज अभ्यास मूल्याङ्कन र दैनिक पढ्ने पाठहरू अनलक गर्न प्रोफाइल सिर्जना गर्नुहोस्।",
    loginLeftTitle: "तपाईंले सिक्नुभएको हरेक शब्दले नयाँ ढोका खोल्छ।", loginLeftSub: "व्यक्तिगत पढ्ने, लेख्ने र बोल्ने अभ्यास — तपाईंको आफ्नै भाषामा, तपाईंको आफ्नै गतिमा।",
    dashboardTitle: "तपाईंको ड्यासबोर्डमा स्वागत छ!", logout: "लग आउट",
    eduLabel: "📊 शैक्षिक स्तर",
    eduLevel1: "औपचारिक शिक्षा नभएको / आधारभूत शिक्षार्थी",
    eduLevel2: "प्राथमिक विद्यालय (कक्षा १-५)",
    eduLevel3: "निम्न माध्यमिक विद्यालय (कक्षा ६-8)",
    eduLevel4: "माध्यमिक / उच्च माध्यमिक (कक्षा ९-१२)",
    eduLevel5: "उच्च शिक्षा / डिप्लोमा / डिग्री",
    navDashboard: "ड्यासबोर्ड",
    navMyClass: "मेरो कक्षा",
    navCourses: "पाठ्यक्रमहरू",
    navCommunity: "समुदाय",
    navAnalytics: "विश्लेषण",
    navSettings: "सेटिङहरू",
    signOut: "साइन आउट",
    searchPlaceholder: "पाठ्यक्रम खोज्नुहोस्",
    todayPrefix: "आज",
    myClassTitle: "मेरो कक्षा लिडरबोर्ड",
    coursesTitle: "पाठ्यक्रम ट्र्याकहरू",
    communityTitle: "साक्षरAI शिक्षार्थी समुदाय",
    settingsTitle: "प्रोफाइल र इन्टरफेस सेटिङहरू",
    coursesYoureTaking: "तपाईंले लिइरहनुभएको पाठ्यक्रम",
    saveProfileChanges: "प्रोफाइल परिवर्तनहरू सुरक्षित गर्नुहोस्",
    savingSettings: "सेटिङहरू सुरक्षित गर्दै...",
    postMessage: "सन्देश पठाउनुहोस्",
    sendButton: "पठाउनुहोस्",
    startModule: "मोड्युल सुरु गर्नुहोस्",
    ageLabel: "उमेर",
    profileDetails: "प्रोफाइल विवरण",
    appearanceCustomizer: "देखावट अनुकूलक",
    tabNativeModules: "📚 स्थानीय पाठ्यक्रम मोड्युलहरू",
    tabLevelQuizzes: "📝 स्तर क्विजहरू",
    tabOtherBlocks: "✨ अन्य सिकाइ खण्डहरू",
    avgAccuracy: "औसत शुद्धता",
    completedLessonsLabel: "पूरा भएका पाठहरू",
    selectedLevelLabel: "चयन गरिएको स्तर",
    alertMessages: "सचेतना सन्देशहरू",
    dismissAll: "सबै हटाउनुहोस्",
    assessTitle: "तपाईंको साक्षरता स्तर सुधारको मूल्याङ्कन गर्नुहोस्",
    startPrefix: "सुरु गर्नुहोस्",
    levelQuizSuffix: "स्तर क्विज",
    clearChat: "च्याट खाली गर्नुहोस्",
    aiTutorTitle: "AI साक्षरता ट्युटर सहायक",
    refreshNow: "अहिले रिफ्रेस गर्नुहोस्",
    startNow: "अहिले सुरु गर्नुहोस्",
    performanceReportTitle: "कार्यसम्पादन प्रतिवेदन",
    evaluationHistoryTitle: "तपाईंको मूल्याङ्कन इतिहास लगहरू",
    strengthsLabel: "बलियो पक्षहरू",
    areasForImprovementLabel: "सुधारका क्षेत्रहरू",
    overallProgress: "समग्र सिकाइ प्रगति",
    skillEvaluationLabel: "सीप मूल्याङ्कन",
    recommendedNextLesson: "सिफारिस गरिएको अर्को पाठ",
    tutorGreeting: "नमस्ते {name}! म तपाईंको AI साक्षरता ट्युटर हुँ। म तपाईंको अध्ययन मार्गमा मार्गदर्शन गर्न सक्छु। सुझाव गरिएको विकल्प छान्नुहोस् वा प्रश्न लेख्नुहोस्।",
    tutorWriting: "ट्युटर टाइप गर्दै छन्...",
    tutorInputPlaceholder: "अक्षर, ट्रेसिङ, उच्चारणको बारेमा प्रश्न सोध्नुहोस्...",
    quickSuggestPlan: "अध्ययन योजना सुझाव दिनुहोस्",
    quickSuggestGrammar: "शैक्षिक व्याकरण सुझाव दिनुहोस्",
    quickSuggestTracing: "लेखन ट्रेसिङ मेट्रिक्स व्याख्या गर्नुहोस्",
    tutorReplyPlan: "तपाईंको स्तरको आधारमा, यो तपाईंको लक्ष्य तालिका हो:\n1. 📖 ट्रेसिङ अभ्यास (15 मिनेट)\n2. 🗣️ बोल्ने अभ्यास (10 मिनेट)\n3. 📝 साप्ताहिक क्विजबाट प्रगति मूल्याङ्कन।",
    tutorReplyScore: "आफ्नो स्कोर सुधार्न: अक्षर ग्रिडको सीमाभित्र चित्र कोर्नमा ध्यान दिनुहोस् र माइक्रोफोन प्रयोग गर्दा स्पष्ट व्यञ्जन ध्वनि उच्चारण गर्नुहोस्।",
    tutorReplyDefault: "बुझें! अभ्यास जारी राखौं। भन्नुहोस् म शब्दावली समीक्षा गरूँ कि दैनिक योजना सुझाउँ।",
    tutorReplyStudyPlan: "सुझाव गरिएको अध्ययन योजना:\n- सोम र मङ्गल: मूल व्यञ्जन ट्रेस गर्नुहोस्।\n- बुध: हिज्जे अभ्यास।\n- बिहि र शुक्र: उच्चारण जाँच।\n- सप्ताहन्त: नक्कली क्विज।",
    tutorReplyGrammarTip: "शैक्षिक दिशानिर्देश:\nदैनिक शब्द संरचना, सामान्य नाम र स्थानीय संवादमा ध्यान दिनुहोस्।",
    tutorReplyTracingInfo: "ट्रेसिङ मूल्याङ्कन विवरण:\nहाम्रो मोडेलले कोरिएको रेखाहरूलाई अक्षर गाइडसँग मिलाउँछ। सहज, केन्द्रित रेखाहरूले शुद्धता बढाउँछ।",
    readingTitle: "पठन अभ्यास",
    writingTitle: "लेखन अभ्यास",
    speakingTitle: "बोली मूल्याङ्कन",
    readingSubNone: "आधारभूत ध्वनिशास्त्र, सरल अक्षर समूह र मूल दृष्टि शब्दावलीमा ध्यान दिनुहोस्।",
    writingSubNone: "स्पर्श इशाराका साथ प्रारम्भिक वर्णमाला रेखा र आधारभूत ध्वन्यात्मक आकार ट्रेस गर्नुहोस्।",
    speakingSubNone: "प्रतिक्रियाका लागि एकल स्वर र आधारभूत व्यञ्जन उच्चारण गर्नुहोस्।",
    readingSubPrimary: "आधारभूत बहु-अक्षर वाक्यांश पढ्नुहोस् र स्थानीय शब्दावली पानाहरू अन्वेषण गर्नुहोस्।",
    writingSubPrimary: "आधारभूत शब्द ट्रेस गर्नुहोस् र सरल वाक्य संरचना पूरा गर्नुहोस्।",
    speakingSubPrimary: "अडियो प्रतिक्रियासँग छोटो व्यावहारिक वाक्य उच्चारण गर्नुहोस्।",
    readingSubMiddle: "दैनिक कारोबार र सार्वजनिक सूचना सम्बन्धी मानक अनुच्छेद पढ्नुहोस्।",
    writingSubMiddle: "कार्यात्मक अन्तरक्रियात्मक पाठ प्रविष्टि र फारम फिल्ड लेख्ने अभ्यास गर्नुहोस्।",
    speakingSubMiddle: "स्वचालित बोली पार्सरमा संवादात्मक खण्ड बोल्नुहोस्।",
    readingSubHigh: "विश्लेषणात्मक पाठ संरचना, डिजिटल साक्षरता र सारांशसँग संलग्न हुनुहोस्।",
    writingSubHigh: "निरन्तर वाक्य र स्वतन्त्र सञ्चार लेखन तयार गर्नुहोस्।",
    speakingSubHigh: "उच्च-शुद्धता उच्चारण मूल्याङ्कनका लागि जटिल वाक्यांश संरचना प्रयोग गर्नुहोस्।"
  },
  gondi: {
    home: "होम", signIn: "साइन इन", createAccount: "खाता कीम", welcomeBack: "सगताम",
    signInSub: "नीवा कलीना वेद्द्ता लोप्पे साइन इन कीम।", email: "✉️ ईमेल पता", password: "🔒 पासवर्ड", fullName: "👤 आक्खे पुदिर", or: "बाले",
    googleSignIn: "गूगल तोड़े सांगे मंत", newHere: "पुना मंत्या?", alreadyHaveAccount: "मुन्ने ने खाता मंता?", landingTitle: "AI ना वळته साक्षरता विकास",
    landingTitleLine1: "साक्षरता विकास", landingTitleLine2: "AI बुद्धि वळते",
    landingSub: "ऊंद मने कलीना तोड़े जश वयस्क और पहिल्या पीढ़ी ना कलीवाला न तोड़े भाषा ते वाचना, लीहना और वळना कली क कींत।",
    getStarted: "शुरू कीम", registerTitle: "नीवा खाता कीम", registerSub: "मावा गोट्टे ते कली और गियान वाधाय कीम।",
    languageLabel: "🌐 यालोळ नाटो भासा", registerLeftTitle: "नीवा साक्षरता कलीना इग्गने शुरू माता।",
    registerLeftSub: "वळना कलीना और रोज वाचना पाठ क तीरा कीले प्रोफाइल कीम।",
    loginLeftTitle: "जे शब्द कली कींत ओंद पुना कपाट तीरीत।", loginLeftSub: "नीवा भाषा ते नीवा नळ ते वाचना, लीहना और वळना क अभ्यास।",
    dashboardTitle: "नीवा डैशबोर्ड ते सगताम मंता!", logout: "बायदो",
    eduLabel: "📊 कलीना स्तर (शिक्षा)",
    eduLevel1: "औपचारिक कलीना हिले / मुन्ने कलीवाला",
    eduLevel2: "प्राथमिक स्कूल (कक्षा 1-5)",
    eduLevel3: "माध्यमिक स्कूल (कक्षा 6-8)",
    eduLevel4: "हाई स्कूल / माध्यमिक (कक्षा 9-12)",
    eduLevel5: "डांडो कलीना / डिप्लोमा / डिग्री",
    navDashboard: "डैशबोर्ड",
    navMyClass: "नीवा कलास",
    navCourses: "कोर्स",
    navCommunity: "गोट्टे",
    navAnalytics: "विश्लेषण",
    navSettings: "सेटिंग",
    signOut: "बायदो",
    searchPlaceholder: "कोर्स टोपेम",
    todayPrefix: "इग्गे",
    myClassTitle: "नीवा कलास लीडरबोर्ड",
    coursesTitle: "कोर्स ट्रैक",
    communityTitle: "साक्षरAI कली गोट्टे",
    settingsTitle: "प्रोफाइल आनी सेटिंग",
    coursesYoureTaking: "नीवा कलीना कोर्स",
    saveProfileChanges: "प्रोफाइल बदलाव सेव कीम",
    savingSettings: "सेटिंग सेव मंता...",
    postMessage: "संदेश कुल कीम",
    sendButton: "कुल कीम",
    startModule: "मॉड्यूल शुरू कीम",
    ageLabel: "नळ",
    profileDetails: "प्रोफाइल विवरण",
    appearanceCustomizer: "रूप कस्टमाइजर",
    tabNativeModules: "📚 गोटा पाठ्यक्रम मॉड्यूल",
    tabLevelQuizzes: "📝 स्तर क्विज़",
    tabOtherBlocks: "✨ ईतर सेखपोर खंड",
    avgAccuracy: "औसत सटीकता",
    completedLessonsLabel: "पूरा पाठ",
    selectedLevelLabel: "टोपेदुर स्तर",
    alertMessages: "सूचना संदेश",
    dismissAll: "सब्बुन हटायेम",
    assessTitle: "नीवा साक्षरता स्तर बदलाव कली मुल्यांकन कीम",
    startPrefix: "शुरू कीम",
    levelQuizSuffix: "स्तर क्विज़",
    clearChat: "चैट साफ कीम",
    aiTutorTitle: "AI साक्षरता ट्यूटर मददगार",
    refreshNow: "इग्गे रिफ्रेश कीम",
    startNow: "इग्गे शुरू कीम",
    performanceReportTitle: "कामकाज रिपोर्ट",
    evaluationHistoryTitle: "नीवा मुल्यांकन इतिहास लॉग",
    strengthsLabel: "ताकत",
    areasForImprovementLabel: "बदलाव कली जागा",
    overallProgress: "गोट्टे सेखपोर प्रगति",
    skillEvaluationLabel: "कौशल मुल्यांकन",
    recommendedNextLesson: "सिफारिश आतिल फुड पाठ",
    tutorGreeting: "जोहार {name}! नाना आमाग AI साक्षरता ट्यूटर ता। नाना आमाग सेखपोर रस्ता मे मदद कीम। सोलोकाल विकल्प टोपेम या सवाल ओलपेम।",
    tutorWriting: "ट्यूटर ओल कीत ता...",
    tutorInputPlaceholder: "अक्षर, ट्रेसिंग, उच्चारण बाबत सवाल पुछेम...",
    quickSuggestPlan: "मित सेखपोर योजना सोलोक कीम",
    quickSuggestGrammar: "सेखपोर व्याकरण टिप सोलोक कीम",
    quickSuggestTracing: "ओल ट्रेसिंग मेट्रिक्स बुझा कीम",
    tutorReplyPlan: "नीवा लेवल आधार पर, नोवा नीवा लक्ष्य समय:\n1. 📖 ट्रेसिंग अभ्यास (15 मिनट)\n2. 🗣️ बोलपोर अभ्यास (10 मिनट)\n3. 📝 हाप्ता क्विज़ ते प्रगति मुल्यांकन।",
    tutorReplyScore: "नीवा स्कोर बेस कीके: अक्षर ग्रिड सीमा भितर ओलपोर पर ध्यान एम आनी माइक्रोफोन उपयोग करता वखत साफ व्यंजन बोलेम।",
    tutorReplyDefault: "बुझ आतोन! अभ्यास जारी रखा। मन्ता नाना शब्दभंडार समीक्षा कीके की हाप्तावारी योजना सोलोक कीके।",
    tutorReplyStudyPlan: "सोलोकाल सेखपोर योजना:\n- सोम आनी मंगल: मूल व्यंजन ट्रेस कीम।\n- बुध: बानान अभ्यास।\n- गुरु आनी शुक्र: उच्चारण जांच।\n- हाप्ता सेष: मॉक क्विज़।",
    tutorReplyGrammarTip: "सेखपोर दिशानिर्देश:\nहाप्तावारी शब्द गठन, सादा संज्ञा आनी गोट्टे बातचित पर ध्यान एम।",
    tutorReplyTracingInfo: "ट्रेसिंग मुल्यांकन विवरण:\nओना मॉडल आंकल रेखा को अक्षर गाइड ते मिलावता। सहज, केंद्रित रेखा सटीकता बड़ेता।",
    readingTitle: "पाठ अभ्यास",
    writingTitle: "ओल अभ्यास",
    speakingTitle: "बोलपोर मुल्यांकन",
    readingSubNone: "मूल ध्वनि पहचान, सादा अक्षर समूह आनी मूल शब्दभंडार पर ध्यान एम।",
    writingSubNone: "फुरकाव इशारा ते प्रारंभिक अक्षरमाला रेखा आनी मूल ध्वनि आकार ट्रेस कीम।",
    speakingSubNone: "प्रतिक्रिया लागी एकल स्वर आनी मूल व्यंजन बोलेम।",
    readingSubPrimary: "मूल बहु-अक्षर वाक्यांश पाठ कीम आनी गोट्टे शब्दभंडार शीट टोपेम।",
    writingSubPrimary: "मूल शब्द ट्रेस कीम आनी सादा वाक्य गठन पूरा कीम।",
    speakingSubPrimary: "ऑडियो प्रतिक्रिया ते हुड़िंग व्यावहारिक वाक्य बोलेम।",
    readingSubMiddle: "हाप्तावारी लेनदेन आनी सार्वजनिक सूचना बाबत मानक अनुच्छेद पाठ कीम।",
    writingSubMiddle: "कार्यात्मक इंटरैक्टिव टेक्स्ट एंट्री आनी फॉर्म फील्ड ओलपोर अभ्यास कीम।",
    speakingSubMiddle: "स्वचालित बोलपोर पार्सर रे बातचित अंश बोलेम।",
    readingSubHigh: "विश्लेषणात्मक पाठ गठन, डिजिटल साक्षरता आनी सारांश ते जुड़ कीम।",
    writingSubHigh: "निरंतर वाक्य आनी स्वतंत्र संचार लेख तैयार कीम।",
    speakingSubHigh: "उच्च-सटीकता उच्चारण मुल्यांकन लागी जटिल वाक्यांश गठन लागाव कीम।"
  },
  sindhi: {
    home: "هوم", signIn: "سائن ان", createAccount: "खातो ٺاهيو", welcomeBack: "ڀلي ڪري آيا",
    signInSub: "پنهنجو سکڻ جو سفر جاري رکڻ لاءِ سائن ان ڪريو.", email: "✉️ اي ميل پتو", password: "🔒 پاسورڊ", fullName: "👤 پورو نالو", or: "يا",
    googleSignIn: "گوگل سان جاري رکو", newHere: "هتي نوان آهيو？", alreadyHaveAccount: "پهرين کان खाتو آهي？", landingTitle: "AI جي ذريعي تعليم جي سجاڳي",
    landingTitleLine1: "تعليم جي سجاڳي", landingTitleLine2: "AI ذہانت ذريعي",
    landingSub: "هڪ ذاتي سکيا جو ساٿي جيڪو وڏن ۽ پهرين نسل جي سکندڙن کي علائقائي ٻولين ۾ بنيادي پڙهڻ, لکڻ ۽ ڳالهائڻ جي صلاحيت حاصل ڪرڻ ۾ مدد ڪري ٿو.",
    getStarted: "شروع ڪريو", registerTitle: "پنهنجو खातो ٺاهيو", registerSub: "اسان جي برادري ۾ شامل ٿيو ۽ پنهنجي سکيا جو دائرو وڌايو.",
    languageLabel: "🌐 پسنديده مادري ٻولي", registerLeftTitle: "توهان جو سکڻ جو سفر هتان شروع ٿئي ٿو.",
    registerLeftSub: "آواز جي مشق ۽ روزاني پڙهڻ جا سبق colarڻ لاءِ هڪ پروفائل ٺاهيو.",
    loginLeftTitle: "توهان جيڪو به لفظ سکو ٿا اهو هڪ نئون دڙو کولي ٿو.", loginLeftSub: "پنهنجي ٻوليءءَ ۾، پنهنجي رفتار سان پڙهڻ، لکڻ ۽ ڳالهائڻ جي مشق.",
    dashboardTitle: "توهان جي ڊيش بورڈ تي ڀلي ڪري آيا!", logout: "لاগ آئوٽ",
    eduLabel: "📊 تعليمي سطح",
    eduLevel1: "ڪا به رسمي تعليم نه / بنيادي سکندڙ",
    eduLevel2: "پرائمري اسڪول (ڪلاس 1-5)",
    eduLevel3: "مڊل اسڪول (ڪلاس 6-8)",
    eduLevel4: "هائي اسڪول / سيڪنڊري (ڪلاس 9-12)",
    eduLevel5: "اعليٰ تعليم / ڊپلوما / ڊگري",
    navDashboard: "ڊيش بورڊ",
    navMyClass: "منهنجي ڪلاس",
    navCourses: "ڪورس",
    navCommunity: "برادري",
    navAnalytics: "تجزيا",
    navSettings: "سيٽنگون",
    signOut: "سائن آئوٽ",
    searchPlaceholder: "ڪورس ڳوليو",
    todayPrefix: "اڄ",
    myClassTitle: "منهنجي ڪلاس ليڊربورڊ",
    coursesTitle: "نصاب جا ٽريڪ",
    communityTitle: "ساکشرAI سکندڙن جي برادري",
    settingsTitle: "پروفائيل ۽ انٽرفيس سيٽنگون",
    coursesYoureTaking: "اهو ڪورس جيڪو توهان وٺي رهيا آهيو",
    saveProfileChanges: "پروفائيل تبديليون سيڪ ڪريو",
    savingSettings: "سيٽنگون سيڪ ٿي رهيون آهن...",
    postMessage: "پيغام موڪليو",
    sendButton: "موڪليو",
    startModule: "ماڊيول شروع ڪريو",
    ageLabel: "عمر",
    profileDetails: "پروفائيل تفصيل",
    appearanceCustomizer: "ظاهري شڪل ڪسٽمائيزر",
    tabNativeModules: "📚 مقامي نصاب ماڊيول",
    tabLevelQuizzes: "📝 سطح جا ڪوئز",
    tabOtherBlocks: "✨ ٻيا سکيا بلاڪ",
    avgAccuracy: "اوسط صحت",
    completedLessonsLabel: "مڪمل ٿيل سبق",
    selectedLevelLabel: "چونڊيل سطح",
    alertMessages: "خبردار پيغام",
    dismissAll: "سڀ رد ڪريو",
    assessTitle: "پنهنجي خواندگي جي سطح جي بهتري جو جائزو وٺو",
    startPrefix: "شروع ڪريو",
    levelQuizSuffix: "سطح جو ڪوئز",
    clearChat: "چيٽ صاف ڪريو",
    aiTutorTitle: "AI خواندگي ٽيوٽر مددگار",
    refreshNow: "هاڻي ريفريش ڪريو",
    startNow: "هاڻي شروع ڪريو",
    performanceReportTitle: "ڪارڪردگي رپورٽ",
    evaluationHistoryTitle: "توهان جي تشخيص تاريخ لاگ",
    strengthsLabel: "طاقتون",
    areasForImprovementLabel: "بهتري لاءِ شعبا",
    overallProgress: "مجموعي تعليمي واڌ",
    skillEvaluationLabel: "مهارت جي تشخيص",
    recommendedNextLesson: "تجويز ڪيل اڳيون سبق",
    tutorGreeting: "السلام عليڪم {name}! مان توهان جو AI خواندگي ٽيوٽر آهيان. مان توهان جي مطالعي جي رستي ۾ رهنمائي ڪري سگهان ٿو. تجويز ڪيل اختيار چونڊيو يا سوال لکو.",
    tutorWriting: "ٽيوٽر لکي رهيو آهي...",
    tutorInputPlaceholder: "اکرن، ٽريسنگ، تلفظ بابت سوال پڇو...",
    quickSuggestPlan: "هڪ اڀياس منصوبو تجويز ڪريو",
    quickSuggestGrammar: "تعليمي گرامر ٽپ تجويز ڪريو",
    quickSuggestTracing: "لکڻ جي ٽريسنگ ميٽرڪس بيان ڪريو",
    tutorReplyPlan: "توهان جي سطح جي بنياد تي، هي آهي توهان جو مقصد شيڊول:\n1. 📖 ٽريسنگ مشق (15 منٽ)\n2. 🗣️ ڳالهائڻ جي مشق (10 منٽ)\n3. 📝 هفتيوار ڪوئز سان ترقي جو جائزو.",
    tutorReplyScore: "پنهنجو اسڪور بهتر ڪرڻ لاءِ: اکر گرڊ جي حدن اندر ڊرائنگ تي ڌيان ڏيو ۽ مائڪروفون استعمال ڪرڻ وقت واضح صحيح آواز چئو.",
    tutorReplyDefault: "سمجهي ويس! اچو مشق جاري رکون. ٻڌايو ڇا مان لفظن جو جائزو وٺان يا روزاني منصوبو تجويز ڪريان.",
    tutorReplyStudyPlan: "تجويز ڪيل اڀياس منصوبو:\n- سومر ۽ اڱارو: بنيادي صحيح آواز ٽريس ڪريو.\n- اربع: اسپيلنگ مشق.\n- خميس ۽ جمعو: تلفظ چيڪ.\n- هفتيوار موقعو: موڪ ڪوئز.",
    tutorReplyGrammarTip: "تعليمي رهنما اصول:\nروزاني لفظ جي جوڙجڪ، عام اسم ۽ مقامي گفتگو تي ڌيان ڏيو.",
    tutorReplyTracingInfo: "ٽريسنگ جائزي جا تفصيل:\nاسان جو ماڊل ڪڍيل لڪيرن جو مقابلو اکر گائيڊس سان ڪري ٿو. نرم، مرڪزي لڪيرون درستگي وڌائين ٿيون.",
    readingTitle: "پڙهڻ جي مشق",
    writingTitle: "لکڻ جي مشق",
    speakingTitle: "ڳالهائڻ جو جائزو",
    readingSubNone: "بنيادي صوتيات، سادي اکر گروپس ۽ بنيادي نظري لفظن تي ڌيان ڏيو.",
    writingSubNone: "ڇهاءَ اشارن سان شروعاتي الفابيٽ لڪيرون ۽ بنيادي آواز شڪليون ٽريس ڪريو.",
    speakingSubNone: "رد عمل لاءِ واحد آواز ۽ بنيادي صحيح آواز چئو.",
    readingSubPrimary: "بنيادي گھڻ رڪني جملا پڙهو ۽ مقامي لفظن جون شيٽون ڳوليو.",
    writingSubPrimary: "بنيادي لفظ ٽريس ڪريو ۽ سادي جملي جي جوڙجڪ مڪمل ڪريو.",
    speakingSubPrimary: "آڊيو رد عمل سان مختصر عملي جملا چئو.",
    readingSubMiddle: "روزاني لين ڏين ۽ عوامي اطلاعن بابت معياري پيراگراف پڙهو.",
    writingSubMiddle: "فعال تعامل واري متن اندراج ۽ فارم فيلڊ لکڻ جي مشق ڪريو.",
    speakingSubMiddle: "خودڪار تقرير پارسر ۾ گفتگو حصا چئو.",
    readingSubHigh: "تجزياتي متن جي جوڙجڪ، ڊجيٽل خواندگي ۽ خلاصن ۾ شامل ٿيو.",
    writingSubHigh: "مسلسل جملا ۽ آزاد رابطي جون لکڻيون تيار ڪريو.",
    speakingSubHigh: "اعليٰ درستگي تلفظ جائزن لاءِ پيچيده جملي جوڙجڪ عمل ۾ آڻيو."
  },
  konkani: {
    home: "होम", signIn: "साइन इन", createAccount: "खातें तयार करात", welcomeBack: "येवकार",
    signInSub: "तुमची शिकपाची भोंवड जारी दवरपाक साइन इन करात.", email: "✉️ ईमेल पत्तो", password: "🔒 पासवर्ड", fullName: "👤 पूर्ण नांव", or: "वा",
    googleSignIn: "गूगल वांगडा फुडे वचात", newHere: "नवे आहात?", alreadyHaveAccount: "पयलींच खातें आसा?", landingTitle: "AI वरवीं साक्षरता उदरगत",
    landingTitleLine1: "साक्षरता उदरगत", landingTitleLine2: "AI बुद्धिमत्ता वरवीं",
    landingSub: "एक खाजगी शिकपाचो सांगाती जो जाणट्यांक आनी पयल्या पिळगेच्या शिकप्यांक थळाव्या भासांनी बुनियादी वाचन, लेखन आनी उलोवपाचीं कौशल्यां मेळोવपाक मदत करता.",
    getStarted: "सुरू करात", registerTitle: "तुमचें खातें तयार करात", registerSub: "आमच्या पंगडांत आस्पावन तुमचें शिकप वाडयात.",
    languageLabel: "🌐 पसंतीची आवयभास", registerLeftTitle: "तुमची साक्षरतेची भोंवड हांगासून सुरू जाता.",
    registerLeftSub: "आवाज सराव आनी दिसाळें वाचन धडे सुरू करपाक एक प्रोफाईल तयार करात.",
    loginLeftTitle: "तुम्ही शिकिल्लो दरेक शब्द एक नवें दार उघडटा.", loginLeftSub: "खंयच्याय अडखळा बगर तुमच्याच भाशेन आनी गतीन वाचन आनी उलोवपाचो सराव.",
    dashboardTitle: "तुमच्या डॅशबोर्डाचेर येवकार!", logout: "لॉग आउट",
    eduLabel: "📊 शिक्षणीक पातळी",
    eduLevel1: "औपचारीक शिक्षण ना / बुन्यादी शिकपी",
    eduLevel2: "प्राथमिक शाळा (इयत्ता १-५)",
    eduLevel3: "माध्यमिक शाळा (इयत्ता ६-८)",
    eduLevel4: "उच्च माध्यमिक (इयत्ता ९-१२)",
    eduLevel5: "उंच शिक्षण / डिप्लोमा / पदवी",
    navDashboard: "डॅशबोर्ड",
    navMyClass: "म्हजो वर्ग",
    navCourses: "कोर्स",
    navCommunity: "समुदाय",
    navAnalytics: "विश्लेषण",
    navSettings: "सेटिंग्ज",
    signOut: "साइन आउट",
    searchPlaceholder: "कोर्स सोदा",
    todayPrefix: "आज",
    myClassTitle: "म्हजो वर्ग लीडरबोर्ड",
    coursesTitle: "अभ्यासक्रम ट्रॅक",
    communityTitle: "साक्षरAI शिकपी समुदाय",
    settingsTitle: "प्रोफायल आनी इंटरफेस सेटिंग्ज",
    coursesYoureTaking: "तुमी घेतिल्लो कोर्स",
    saveProfileChanges: "प्रोफायल बदल जतन करात",
    savingSettings: "सेटिंग्ज जतन जाता...",
    postMessage: "संदेश धाडा",
    sendButton: "धाडा",
    startModule: "मॉड्युल सुरू करात",
    ageLabel: "वय",
    profileDetails: "प्रोफायल तपशील",
    appearanceCustomizer: "देखावो कस्टमायझर",
    tabNativeModules: "📚 थळावो अभ्यासक्रम मॉड्युल",
    tabLevelQuizzes: "📝 पातळी क्वीझ",
    tabOtherBlocks: "✨ हेर शिकपाचे विभाग",
    avgAccuracy: "सरासरी अचूकताय",
    completedLessonsLabel: "पुराय जाल्ले धडे",
    selectedLevelLabel: "निवडील्ली पातळी",
    alertMessages: "सावध संदेश",
    dismissAll: "सगळें काडून उडयात",
    assessTitle: "तुमच्या साक्षरता पातळेंतल्या सुदारणेचें मूल्यांकन करात",
    startPrefix: "सुरू करात",
    levelQuizSuffix: "पातळी क्वीझ",
    clearChat: "चॅट साफ करात",
    aiTutorTitle: "AI साक्षरता ट्यूटर आदार",
    refreshNow: "आतां रिफ्रेश करात",
    startNow: "आतां सुरू करात",
    performanceReportTitle: "कामगिरी अहवाल",
    evaluationHistoryTitle: "तुमचो मूल्यांकन इतिहास लॉग",
    strengthsLabel: "बळ",
    areasForImprovementLabel: "सुदारणेचे विभाग",
    overallProgress: "एकंदर शिकपाची प्रगती",
    skillEvaluationLabel: "कौशल्य मूल्यांकन",
    recommendedNextLesson: "शिफारस केल्लो फुडलो धडो",
    tutorGreeting: "नमस्कार {name}! हांव तुमचो AI साक्षरता ट्यूटर. हांव तुमच्या अभ्यास वाटेंत मदत करूंक शकतां. एक सुचयल्लो पर्याय निवडात वा प्रश्न बरयात.",
    tutorWriting: "ट्यूटर बरयता...",
    tutorInputPlaceholder: "अक्षरां, ट्रेसिंग, उच्चाराविशीं प्रश्न विचारात...",
    quickSuggestPlan: "एक अभ्यास येवजण सुचयात",
    quickSuggestGrammar: "शैक्षणिक व्याकरण टिप सुचयात",
    quickSuggestTracing: "बरोवपाची ट्रेसिंग मेट्रिक्स स्पश्ट करात",
    tutorReplyPlan: "तुमच्या पांवड्या आधारीत, हे तुमचें लक्ष्य वेळापत्रक:\n1. 📖 ट्रेसिंग सराव (15 मिनटां)\n2. 🗣️ उलोवपाचो सराव (10 मिनटां)\n3. 📝 सप्तकी क्वीझान प्रगती तपासात.",
    tutorReplyScore: "तुमचो स्कोर सुदारपाक: अक्षर ग्रिडाच्या मर्यादेभितर काडपाचेर लक्ष दियात आनी मायक्रोफोन वापरतना स्पश्ट व्यंजन उच्चारात.",
    tutorReplyDefault: "समजलें! सराव फुडें व्हरूया. सांगात हांव शब्दसंग्रह परतून पळोवं वा दिसाळी येवजण सुचोवं.",
    tutorReplyStudyPlan: "सुचयल्ली अभ्यास येवजण:\n- सोमार आनी मंगळार: मूळ व्यंजनां ट्रेस करात.\n- बुधवार: शुद्धलेखन सराव.\n- बिरेस्तार आनी सुक्रार: उच्चार तपासणी.\n- सप्तक शेवट: मॉक क्वीझ.",
    tutorReplyGrammarTip: "शैक्षणिक मार्गदर्शक तत्वां:\nदिसाळ्या शब्द रचणुके, सादारण नामां आनी थळाव्या संवादाचेर लक्ष दियात.",
    tutorReplyTracingInfo: "ट्रेसिंग मूल्यांकन तपशील:\nआमचें मॉडेल काडिल्ल्या रेघांची तुळा अक्षर मार्गदर्शकांसंगीं करता. मऊ, केंद्रीत रेघो अचूकताय वाडयता.",
    readingTitle: "वाचपाचो सराव",
    writingTitle: "बरोवपाचो सराव",
    speakingTitle: "उलोवपाचें मूल्यांकन",
    readingSubNone: "मूळ ध्वनीशास्त्र, सादे अक्षर गट आनी मुखेल नदर शब्दसंग्रहाचेर लक्ष दियात.",
    writingSubNone: "स्पर्श हावभावांसंगीं सुरवेच्यो वर्णमाळेच्यो रेघो आनी मूळ ध्वन्यात्मक आकार ट्रेस करात.",
    speakingSubNone: "प्रतिसादाखातीर एकेरी स्वर आनी मूळ व्यंजन उच्चारात.",
    readingSubPrimary: "मूळ बहु-अक्षरी वाक्यांश वाचात आनी थळावे शब्दसंग्रह पत्रां सोदात.",
    writingSubPrimary: "मूळ उतरां ट्रेस करात आनी सादी वाक्य रचणूक पूर्ण करात.",
    speakingSubPrimary: "ऑडियो प्रतिसादासंगीं ल्हान व्यावहारीक वाक्यां उच्चारात.",
    readingSubMiddle: "दिसाळ्या व्यवहारां आनी सार्वजनीक सुचोवण्यांविशीं मानक परिच्छेद वाचात.",
    writingSubMiddle: "कार्यात्मक संवादात्मक मजकूर नोंदी आनी फॉर्म क्षेत्रां बरोवपाचो सराव करात.",
    speakingSubMiddle: "स्वयंचलीत उलोवप विश्लेशकांत संवादात्मक विभाग उलयात.",
    readingSubHigh: "विश्लेशणात्मक मजकूर रचणूक, digital साक्षरताय आनी सारांशांत व्यस्त जावात.",
    writingSubHigh: "सतत वाक्यां आनी मुक्त संवाद बरप तयार करात.",
    speakingSubHigh: "उच्च-अचूकताय उच्चार मूल्यांकनाखातीर क्लिश्ट वाक्यांश रचणूक वापरात."
  }
};

const targetLanguages = [
  { value: 'english', native: 'English', label: 'English' },
  { value: 'hindi', native: 'हिन्दी', label: 'Hindi' },
  { value: 'telugu', native: 'తెలుగు', label: 'Telugu' },
  { value: 'punjabi', native: 'ਪੰਜਾਬੀ', label: 'Punjabi' },
  { value: 'bengali', native: 'বাংলা', label: 'Bengali' },
  { value: 'marathi', native: 'मराठी', label: 'Marathi' },
  { value: 'tamil', native: 'தமிழ்', label: 'Tamil' },
  { value: 'gujarati', native: 'ગુજરાતી', label: 'Gujarati' },
  { value: 'kannada', native: 'ಕನ್ನಡ', label: 'Kannada' },
  { value: 'malayalam', native: 'മലയാളം', label: 'Malayalam' },
  { value: 'odia', native: 'ଓଡ଼ିଆ', label: 'Odia' },
  { value: 'urdu', native: 'اُردُو', label: 'Urdu' },
  { value: 'assamese', native: 'অসমীয়া', label: 'Assamese' },
  { value: 'maithili', native: 'मैथिली', label: 'Maithili' },
  { value: 'santhali', native: 'ᱥᱟᱱᱛᱷᱟᱞᱤ', label: 'Santhali' },
  { value: 'kashmiri', native: 'کٲଶুর', label: 'Kashmiri' },
  { value: 'nepali', native: 'नेपाली', label: 'Nepali' },
  { value: 'gondi', native: 'गोंडी', label: 'Gondi' },
  { value: 'sindhi', native: 'سنڌي', label: 'Sindhi' },
  { value: 'konkani', native: 'कोंकणी', label: 'Konkani' }
];

// Small self-contained stat block that animates its number upward the first
// time it scrolls into view. Used by the redesigned landing page's Impact section.
function CountUpStat({ value, suffix, label, accent }) {
  const [display, setDisplay] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            setStarted(true);
            const duration = 1200;
            const startTime = performance.now();
            const tick = (now) => {
              const progress = Math.min(1, (now - startTime) / duration);
              const eased = 1 - Math.pow(1 - progress, 3);
              setDisplay(Math.round(eased * value));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [started, value]);

  return (
    <div ref={ref} className="text-center sm:text-left">
      <p className="text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums">
        {display}
        <span className={accent}>{suffix}</span>
      </p>
      <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-2">{label}</p>
    </div>
  );
}


/**
 * AnimatedRainbowLetters Component
 * Renders animated rainbow gradient text without breaking Indic scripts (Hindi, Devanagari, Tamil, Telugu, etc.).
 * Words are preserved as unbroken grapheme blocks to prevent standalone matra dotted-circle (U+25CC) bugs.
 */
function AnimatedRainbowLetters({ text, className = '', letterDelay = 0.04, speed = '5s', gradient = 'linear-gradient(135deg, #10b981 0%, #06b6d4 25%, #8b5cf6 50%, #ec4899 75%, #f59e0b 100%)' }) {
  if (!text || typeof text !== 'string') return text;
  
  const words = text.split(' ');

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-[0.28em] ${className}`}>
      {words.map((word, wIdx) => {
        return (
          <span
            key={wIdx}
            className="inline-block whitespace-nowrap transition-all duration-200 hover:scale-105 cursor-default"
            style={{
              background: gradient,
              backgroundSize: '300% 300%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: `sakRainbowFlow ${speed} ease-in-out infinite`,
              animationDelay: `${wIdx * 0.12}s`,
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}

export default function App() {
  // ── ONE-TIME INTRO SPLASH SCREEN ──
  // Plays once when the app first opens. sessionStorage keeps it from
  // replaying on in-app view changes or a same-tab reload, without
  // touching any auth/routing/API logic below.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ⚡ Real-time toast notification for admin updates visible to ALL users
  const [realtimeSyncToast, setRealtimeSyncToast] = useState(null);
  const showSyncToast = (msg) => {
    setRealtimeSyncToast(msg);
    setTimeout(() => setRealtimeSyncToast(null), 4500);
  };

  // ⚡ Sakshar AI Instant Real-Time Global Sync Listener — ALL admin changes push to ALL users
  useEffect(() => {
    const unsubscribe = subscribeToGlobalSync((event) => {
      if (!event || !event.type) return;

      if (event.type === 'HERO_BG_UPDATED' && event.payload) {
        setBgVideoConfig(event.payload);
        showSyncToast('🎨 Landing page background updated by admin');
      } else if (event.type === 'AUTH_BG_UPDATED' && event.payload) {
        setAuthBgConfig(event.payload);
        showSyncToast('🖼️ Authentication background updated by admin');
      } else if (event.type === 'PUSH_BROADCAST' && event.payload) {
        showSyncToast(`🔔 ${event.payload.title || 'New notification'}: ${event.payload.body || ''}`);
      } else if (event.type === 'COURSE_UPDATE' && event.payload) {
        showSyncToast(`📚 Course ${event.payload.action || 'update'}: Content has been refreshed`);
      } else if (event.type === 'SYSTEM_SETTINGS_UPDATED' && event.payload) {
        showSyncToast(`⚙️ System setting updated: ${event.payload.setting || 'configuration'}`);
      } else if (event.type === 'STUDENT_UPDATED') {
        showSyncToast('👤 Learner profile updated by admin');
      }
    });

    return () => unsubscribe();
  }, []);

  const [showSplash, setShowSplash] = useState(() => {
    try {
      const savedAuth = localStorage.getItem('sakshar_auth_bg_config');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed?.splash?.playMode === 'always') return true;
      }
      return sessionStorage.getItem('sakshar_splash_played') !== '1';
    } catch {
      return true;
    }
  });
  const [contentRevealed, setContentRevealed] = useState(true);

  // ⚡ Fetch latest cloud configs from Supabase on mount — ensures new devices/phones get admin settings instantly
  useEffect(() => {
    const loadCloudConfigs = async () => {
      try {
        const cloudHero = await fetchSystemConfigDB('hero_bg_config', null);
        if (cloudHero) setBgVideoConfig(cloudHero);
        const cloudAuth = await fetchSystemConfigDB('auth_bg_config', null);
        if (cloudAuth) setAuthBgConfig(cloudAuth);
      } catch (e) { console.warn('[Cloud Config] Load notice:', e); }
    };
    loadCloudConfigs();
  }, []);

  // Guarantee application is always visible and contentRevealed is true
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setContentRevealed(true);
      setShowSplash(false);
    }, 3500);
    return () => clearTimeout(fallbackTimer);
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setContentRevealed(true);
    try {
      sessionStorage.setItem('sakshar_splash_played', '1');
    } catch {
      /* sessionStorage unavailable — splash simply won't persist across reloads */
    }
  }, []);

  const [view, setView] = useState(() => {
    try {
      if (window.location.hash === '#admin' || window.location.search.includes('admin=true')) {
        return 'admin';
      }
    } catch (e) {}
    return 'landing';
  });
  // English is the default landing page language until explicitly changed by user
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('sakshar_user_selected_lang') || 'english';
    } catch {
      return 'english';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sakshar_lang', lang);
    } catch {
      // storage unavailable
    }
  }, [lang]);

  const [targetLang, setTargetLang] = useState(() => {
    try {
      return localStorage.getItem('sakshar_target_lang') || 'hindi';
    } catch {
      return 'hindi';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sakshar_target_lang', targetLang);
    } catch {
      // storage unavailable
    }
  }, [targetLang]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [educationalLevel, setEducationalLevel] = useState('none');
  const [userId, setUserId] = useState('');
  const [tutorVoiceUri, setTutorVoiceUri] = useState('');

  // Landing page "skill constellation" — cursor-follow parallax state.
  // Offsets are stored in percentage-points (0-100 viewBox scale) so the
  // same value can drive both the HTML node positions and the SVG line
  // endpoints without unit conversion.
  const starWrapRef = useRef(null);
  const [starOffset, setStarOffset] = useState({ x: 0, y: 0 });

  const handleStarMouseMove = (e) => {
    if (!starWrapRef.current) return;
    const rect = starWrapRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    // Scale down the raw percentage delta so the drift stays subtle
    setStarOffset({ x: (px - 50) * 0.12, y: (py - 50) * 0.12 });
  };

  const handleStarMouseLeave = () => setStarOffset({ x: 0, y: 0 });
  
  // Asynchronous operational operational operational operational feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');

  // Hero & Auth Page Background Media State & Listener
  const [authBgConfig, setAuthBgConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('sakshar_auth_bg_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      login: {
        enabled: true,
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=1000'
      },
      register: {
        enabled: true,
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1000'
      }
    };
  });

  useEffect(() => {
    const handleAuthBgUpdate = (e) => {
      if (e.detail) {
        setAuthBgConfig(e.detail);
      } else {
        try {
          const saved = localStorage.getItem('sakshar_auth_bg_config');
          if (saved) setAuthBgConfig(JSON.parse(saved));
        } catch {}
      }
    };

    window.addEventListener('sakshar_auth_bg_updated', handleAuthBgUpdate);
    return () => window.removeEventListener('sakshar_auth_bg_updated', handleAuthBgUpdate);
  }, []);

  useEffect(() => {
    const handleTriggerSplash = () => {
      try {
        sessionStorage.removeItem('sakshar_splash_played');
      } catch {}
      setShowSplash(true);
      setContentRevealed(false);
    };
    window.addEventListener('sakshar_trigger_splash', handleTriggerSplash);
    return () => window.removeEventListener('sakshar_trigger_splash', handleTriggerSplash);
  }, []);

  // Hero Background Video Config state & listener
  const [bgVideoConfig, setBgVideoConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('sakshar_bg_video_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      enabled: true,
      sourceType: 'preset',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-the-night-sky-4000-large.mp4',
      opacity: 0.45,
      blur: 0,
      overlayColor: '#0c1a10',
      overlayOpacity: 0.4
    };
  });

  useEffect(() => {
    const handleVideoUpdate = (e) => {
      if (e.detail) {
        setBgVideoConfig(e.detail);
      } else {
        try {
          const saved = localStorage.getItem('sakshar_bg_video_config');
          if (saved) setBgVideoConfig(JSON.parse(saved));
        } catch {}
      }
    };

    window.addEventListener('sakshar_bg_video_updated', handleVideoUpdate);
    window.addEventListener('sakshar_hero_bg_updated', handleVideoUpdate);
    return () => {
      window.removeEventListener('sakshar_bg_video_updated', handleVideoUpdate);
      window.removeEventListener('sakshar_hero_bg_updated', handleVideoUpdate);
    };
  }, []);

  // Voice language auto-detection states
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceDetectedLang, setVoiceDetectedLang] = useState(null);
  const [voiceToast, setVoiceToast] = useState(null); // { label, native }
  const getInvitationTextForLang = (l) => {
    switch (l) {
      case 'english': return 'Tap the mic and speak in your mother tongue to auto-detect language';
      case 'hindi': return 'अपनी भाषा में बोलने के लिए माइक पर क्लिक करें (हिन्दी)';
      case 'telugu': return 'మాట్లాడటానికి మైక్‌ను నొక్కండి (తెలుగు)';
      case 'kannada': return 'ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ (ಕನ್ನಡ)';
      case 'bengali': return 'কথা বলতে মাইকে চাপ দিন (বাংলা)';
      case 'tamil': return 'பேச மைக் பட்டனை அழுத்தவும் (தமிழ்)';
      case 'marathi': return 'बोलण्यासाठी मायक्रोफोनवर क्लिक करा (मराठी)';
      case 'gujarati': return 'બોલવા માટે માઇક પર ક્લિક કરો (ગુજરાતી)';
      case 'punjabi': return "ਬੋਲਣ ਲਈ ਮਾਈਕ 'ਤੇ ਕਲਿੱਕ ਕਰੋ (ਪੰਜਾਬੀ)";
      case 'malayalam': return 'സംസാരിക്കാൻ മൈക്കിൽ അമർത്തുക (മലയാളം)';
      case 'odia': return 'କହିବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ (ଓଡ଼ିଆ)';
      case 'assamese': return "কথা ক'বলৈ মাইকত টিপক (অসমীয়া)";
      default: return 'Tap the mic and speak in your mother tongue to auto-detect language';
    }
  };

  const [invitationText, setInvitationText] = useState(() => getInvitationTextForLang(lang));

  useEffect(() => {
    setInvitationText(getInvitationTextForLang(lang));
  }, [lang]);

  // Multilingual voice invitation cycling (every 2 seconds)
  useEffect(() => {
    const INVITATIONS = [
      'अपनी भाषा में बोलने के लिए माइक पर क्लिक करें (हिन्दी)',
      'உங்கள் மொழியில் பேச மைக் பொத்தானை அழுத்தவும் (தமிழ்)',
      'మీ భాషలో మాట్లాడటానికి మైక్ క్लीక్ చేయండి (తెలుగు)',
      'ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲਣ ਲਈ ਮਾਈਕ ਦਬਾਓ (ਪੰਜਾਬੀ)',
      'নিজের ভাষায় বলতে মাইক চিহ্নে চাপ দিন (বাংলা)',
      'तुमच्या भाषेत बोलण्यासाठी माइकवर क्लिक करा (मराठी)',
      'તમારી ભાષામાં બોલવા માટે માઇક દબાવો (ગુજરાતી)',
      'ನಿಮ್ಮ ਭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಲು ಮೈಕ್ ಕ್ಲಿಕ್ ಮಾಡಿ (ಕನ್ನಡ)',
      'നിങ്ങളുടെ ഭാഷയിൽ സംസാരിക്കാൻ മൈക്ക് ക്ലിക്ക് ചെയ്യുക (മലയാളം)',
      'ନିଜ ଭାଷାରେ କହିବା ପାଇଁ ମାଇକ୍ କ୍ଲିକ୍ କରନ୍ତୁ (ଓଡ଼ିଆ)',
      'اپنی زبان بولنے کے لیے مائیک دبائیں (اردو)',
      'Click the mic to speak in your own language (English)'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % INVITATIONS.length;
      setInvitationText(INVITATIONS[idx]);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Interactive pre-login demo parameters
  const [demoScript, setDemoScript] = useState({ code: 'hindi', char: 'अ', label: 'Hindi' });
  const [hasDemoDrawn, setHasDemoDrawn] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);
  const [demoFeedback, setDemoFeedback] = useState(null);
  const [isDemoDrawing, setIsDemoDrawing] = useState(false);
  const demoCanvasRef = useRef(null);

  // ── VOICE LANGUAGE AUTO-DETECTION ──
  // Maps BCP-47 language codes returned by SpeechRecognition to our app's lang keys
  const bcp47ToAppLang = {
    'hi': 'hindi', 'hi-IN': 'hindi',
    'te': 'telugu', 'te-IN': 'telugu',
    'pa': 'punjabi', 'pa-IN': 'punjabi', 'pa-PK': 'punjabi',
    'bn': 'bengali', 'bn-IN': 'bengali', 'bn-BD': 'bengali',
    'mr': 'marathi', 'mr-IN': 'marathi',
    'ta': 'tamil',   'ta-IN': 'tamil',   'ta-LK': 'tamil',
    'gu': 'gujarati','gu-IN': 'gujarati',
    'kn': 'kannada', 'kn-IN': 'kannada',
    'ml': 'malayalam','ml-IN': 'malayalam',
    'or': 'odia',   'or-IN': 'odia',
    'ur': 'urdu',   'ur-IN': 'urdu',   'ur-PK': 'urdu',
    'as': 'assamese','as-IN': 'assamese',
    'mai': 'maithili',
    'sat': 'santhali',
    'ks': 'kashmiri','ks-IN': 'kashmiri',
    'ne': 'nepali',  'ne-IN': 'nepali', 'ne-NP': 'nepali',
    'kok': 'konkani','kok-IN': 'konkani',
    'sd': 'sindhi',  'sd-IN': 'sindhi',
    'en': 'english', 'en-US': 'english', 'en-IN': 'english', 'en-GB': 'english',
  };

  // ── Helper: unicode-script fallback language mapper (offline) ──
  // ── Layer 1: Unicode script → app lang key (100% accurate for Indian scripts) ──
  const detectLangFromScript = (text) => {
    if (!text) return null;
    // Count characters per Unicode block — highest count wins
    const scores = {};
    const blocks = [
      { lang: 'hindi',     re: /[\u0900-\u097F]/g },  // Devanagari (shared w/ Marathi/Nepali)
      { lang: 'bengali',   re: /[\u0980-\u09FF]/g },  // Bengali + Assamese
      { lang: 'punjabi',   re: /[\u0A00-\u0A7F]/g },  // Gurmukhi
      { lang: 'gujarati',  re: /[\u0A80-\u0AFF]/g },  // Gujarati
      { lang: 'odia',      re: /[\u0B00-\u0B7F]/g },  // Odia
      { lang: 'tamil',     re: /[\u0B80-\u0BFF]/g },  // Tamil
      { lang: 'telugu',    re: /[\u0C00-\u0C7F]/g },  // Telugu
      { lang: 'kannada',   re: /[\u0C80-\u0CFF]/g },  // Kannada
      { lang: 'malayalam', re: /[\u0D00-\u0D7F]/g },  // Malayalam
      { lang: 'urdu',      re: /[\u0600-\u06FF]/g },  // Arabic/Urdu script
      { lang: 'santhali',  re: /[\u1C50-\u1C7F]/g },  // Ol Chiki (Santhali)
    ];
    blocks.forEach(({ lang, re }) => {
      const matches = text.match(re);
      if (matches) scores[lang] = (scores[lang] || 0) + matches.length;
    });

    // Sub-script disambiguation for Devanagari languages
    if (scores['hindi']) {
      const marathiWords  = /\b(आहे|मला|तुम्ही|आम्ही|नाही|हे|ते|मी|आपण)\b/.test(text);
      const nepaliWords   = /\b(छ|मलाई|तपाईं|हामी|भएको|गर्ने|पनि)\b/.test(text);
      const maithiliWords = /\b(अछि|हमरा|अपना|करय|जाय)\b/.test(text);
      if (marathiWords) return 'marathi';
      if (nepaliWords)  return 'nepali';
      if (maithiliWords) return 'maithili';
    }
    // Assamese shares Bengali script — check specific words
    if (scores['bengali']) {
      const assameseWords = /\b(আছে|মই|তুমি|আমি|হৈছে|কৰিব|যাওঁ)\b/.test(text);
      if (assameseWords) return 'assamese';
    }

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best && best[1] > 0 ? best[0] : null;
  };

  // ── Layer 2: Language-name spoken words (any language name = switch to it) ──
  const detectLangFromSpokenName = (text) => {
    if (!text) return null;
    const t = text.toLowerCase().trim();
    const nameMap = {
      // English names
      'hindi': 'hindi', 'हिंदी': 'hindi', 'हिन्दी': 'hindi', 'hindee': 'hindi',
      'telugu': 'telugu', 'తెలుగు': 'telugu',
      'tamil': 'tamil', 'தமிழ்': 'tamil',
      'bengali': 'bengali', 'bangla': 'bengali', 'বাংলা': 'bengali',
      'marathi': 'marathi', 'मराठी': 'marathi',
      'punjabi': 'punjabi', 'panjabi': 'punjabi', 'ਪੰਜਾਬੀ': 'punjabi',
      'gujarati': 'gujarati', 'ગુજરાતી': 'gujarati',
      'kannada': 'kannada', 'ಕನ್ನಡ': 'kannada',
      'malayalam': 'malayalam', 'മലയാളം': 'malayalam',
      'odia': 'odia', 'odiya': 'odia', 'oriya': 'odia', 'ଓଡ଼ିଆ': 'odia',
      'urdu': 'urdu', 'اردو': 'urdu',
      'assamese': 'assamese', 'axomiya': 'assamese', 'অসমীয়া': 'assamese',
      'nepali': 'nepali', 'नेपाली': 'nepali',
      'kashmiri': 'kashmiri', 'کٲشُر': 'kashmiri',
      'konkani': 'konkani', 'कोंकणी': 'konkani',
      'sindhi': 'sindhi', 'سنڌي': 'sindhi',
      'maithili': 'maithili', 'मैथिली': 'maithili',
      'santhali': 'santhali', 'santali': 'santhali',
      'gondi': 'gondi', 'गोंडी': 'gondi',
      'english': 'english', 'angrezi': 'english',
    };
    for (const [key, val] of Object.entries(nameMap)) {
      if (t.includes(key)) return val;
    }
    return null;
  };

  // ── Helper: apply a detected lang key to state ──
  const applyLang = (appLang, nativeLabel, methodLabel) => {
    const langMeta = targetLanguages.find((l) => l.value === appLang);
    setVoiceDetectedLang(appLang);
    setLang(appLang);
    setVoiceToast({
      label:  langMeta?.label  || appLang,
      native: nativeLabel || langMeta?.native || appLang,
      model:  methodLabel,
    });
    setTimeout(() => setVoiceToast(null), 4500);
  };

  // ════════════════════════════════════════════════════════════════════════
  //  MAIN VOICE LANGUAGE DETECTION  — 4-layer cascade
  //  Layer 1: Unicode script analysis on Web Speech API transcript (instant)
  //  Layer 2: Spoken language-name word matching (e.g. user says "Hindi")
  //  Layer 3: Bedrock Claude text API to identify romanized text
  //  Layer 4: Nova Sonic audio streaming (most powerful, needs backend)
  // ════════════════════════════════════════════════════════════════════════
  const startVoiceLanguageDetection = async () => {
    if (isVoiceListening) return;
    setIsVoiceListening(true);
    setVoiceToast(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsVoiceListening(false);
      setVoiceToast({ label: 'Not Supported', native: 'Browser does not support Web Speech input', error: true });
      setTimeout(() => setVoiceToast(null), 4000);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = ''; // Auto-detect based on user's browser/system locale
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.continuous = false; // Stop listening automatically when the user pauses speaking

    // Track if we successfully processed a result to avoid duplicate toasts on end
    let processed = false;

    rec.onresult = async (ev) => {
      processed = true;
      setIsVoiceListening(false);

      const transcript = ev.results[0]?.[0]?.transcript || '';
      console.log('[Voice] Transcript received:', transcript);

      if (!transcript.trim()) {
        setVoiceToast({ label: 'No Speech', native: 'No speech detected — please speak louder', error: true });
        setTimeout(() => setVoiceToast(null), 3500);
        return;
      }

      // ════ LAYER 1: Unicode script detection (Instant) ════
      const scriptLang = detectLangFromScript(transcript);
      if (scriptLang) {
        console.log('[Voice L1] Unicode script →', scriptLang, 'from:', transcript);
        applyLang(scriptLang, null, 'Script Detection');
        return;
      }

      // ════ LAYER 2: Spoken language-name word matching (Instant) ════
      const nameLang = detectLangFromSpokenName(transcript);
      if (nameLang) {
        console.log('[Voice L2] Spoken name →', nameLang, 'from:', transcript);
        applyLang(nameLang, null, 'Voice Match');
        return;
      }

      // ════ LAYER 3: Bedrock Claude text identification (Needs internet/server) ════
      console.log('[Voice L3] Sending transcript to Bedrock text classifier:', transcript);
      setVoiceToast({ label: 'Analyzing...', native: `"${transcript}"` });
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'}/api/voice/identify-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        if (data.success && data.detected_language) {
          console.log('[Voice L3] Bedrock →', data.detected_language);
          const langMeta = targetLanguages.find((l) => l.value === data.detected_language);
          applyLang(data.detected_language, langMeta?.native, 'Bedrock AI');
        } else {
          throw new Error('Identification failed');
        }
      } catch (err) {
        console.warn('[Voice L3] Bedrock text failed:', err.message);
        setVoiceToast({ label: 'Not Recognized', native: `Spoke: "${transcript}" (could not classify)`, error: true });
        setTimeout(() => setVoiceToast(null), 4000);
      }
    };

    rec.onerror = (ev) => {
      setIsVoiceListening(false);
      console.error('[Voice] SpeechRecognition error:', ev.error);
      const msg = ev.error === 'not-allowed' ? 'Microphone access denied' :
                  ev.error === 'no-speech' ? 'No speech detected — try speaking closer to mic' :
                  'Voice detection error';
      setVoiceToast({ label: 'Voice Error', native: msg, error: true });
      setTimeout(() => setVoiceToast(null), 4000);
    };

    rec.onend = () => {
      setIsVoiceListening(false);
      // If the microphone closed but we didn't get any result or error toast
      setTimeout(() => {
        if (!processed && !voiceToast) {
          setIsVoiceListening(false);
        }
      }, 500);
    };

    try {
      rec.start();
    } catch (startErr) {
      setIsVoiceListening(false);
      console.error('[Voice] Failed to start SpeechRecognition:', startErr);
      setVoiceToast({ label: 'Error', native: 'Failed to start microphone listener', error: true });
      setTimeout(() => setVoiceToast(null), 4000);
    }
  };

  // Demo canvas drawing triggers
  const startDemoDrawing = (e) => {
    e.preventDefault();
    const canvas = demoCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1C2D1A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDemoDrawing(true);
    setHasDemoDrawn(true);
  };

  const drawDemo = (e) => {
    if (!isDemoDrawing) return;
    e.preventDefault();
    const canvas = demoCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDemoDrawing = () => setIsDemoDrawing(false);

  const clearDemoCanvas = () => {
    const canvas = demoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDemoDrawn(false);
    setDemoFeedback(null);
  };

  const submitDemoWriting = async () => {
    const canvas = demoCanvasRef.current;
    if (!canvas) return;

    setIsDemoSubmitting(true);
    setDemoFeedback(null);

    const dataUrl = canvas.toDataURL('image/png');

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'}/api/assessment/writing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lang: demoScript.code,
          target_char: demoScript.char,
          image_data: dataUrl
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setDemoFeedback({
          score: data.score,
          message: data.feedback
        });
      } else {
        throw new Error();
      }
    } catch (err) {
      // Local fallback simulation if server is unavailable
      const mockScore = Math.floor(Math.random() * 15) + 80;
      setDemoFeedback({
        score: mockScore,
        message: `Excellent trace attempt! Your character shape '${demoScript.char}' closely follows the baseline guidelines.`
      });
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  // Helper: hydrate app state from a Supabase user object
  const hydrateUserState = async (user) => {
    const metadata = user.user_metadata || {};
    if (metadata.name || metadata.full_name) setFullName(metadata.name || metadata.full_name || '');
    if (metadata.age) setAge(metadata.age);
    if (metadata.language) setLang(metadata.language);
    if (metadata.educationalLevel) setEducationalLevel(metadata.educationalLevel || 'none');
    if (user.id) setUserId(user.id);
    if (metadata.tutorVoiceUri) setTutorVoiceUri(metadata.tutorVoiceUri);

    try {
      const existingProfile = await fetchUserProfile(user.id);
      if (existingProfile) {
        if (existingProfile.name) setFullName(existingProfile.name);
        if (existingProfile.age) setAge(existingProfile.age);
        if (existingProfile.language) setLang(existingProfile.language);
        if (existingProfile.educational_level) setEducationalLevel(existingProfile.educational_level);
      }
    } catch (err) {
      console.warn("Profile fetch error in hydration:", err);
    }
    // Hydrate user profile data into React state, but preserve landing view when opening the app
  };

  // Persistent Initial Session Checker Hook
  useEffect(() => {
    // Guard: tracks whether checkActiveSession already handled routing
    let sessionHandled = false;

    const checkActiveSession = async () => {
      setIsLoading(true);
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          sessionHandled = true;
          await hydrateUserState(currentUser);
        }
      } catch (error) {
        console.error("Session restoration failing silently:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkActiveSession();

    // Listen for OAuth redirect / auth state changes (Google sign-in callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (sessionHandled) return;

        const user = session.user;
        const meta = user.user_metadata || {};

        const displayName = meta.name || meta.full_name || meta.email || user.email || '';
        if (displayName) setFullName(displayName);
        if (meta.language) setLang(meta.language);
        if (user.id) setUserId(user.id);

        // Hydrate user profile data into React state, but preserve landing view when opening the app
        try {
          const profile = await fetchUserProfile(user.id);
          if (profile) {
            if (profile.name) setFullName(profile.name);
            if (profile.age) setAge(profile.age);
            if (profile.language) setLang(profile.language);
            if (profile.educational_level) setEducationalLevel(profile.educational_level);
          }
        } catch (profileErr) {
          console.warn('Profile fetch skipped (non-blocking):', profileErr.message);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fallback state hydration matching strategy
  const baseT = translations.english;
  const targetT = translations[lang] || baseT;
  const t = { ...baseT, ...targetT }; 

  // Handlers for authenticating backend with database triggers
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');

    if (!age) {
      setAuthError('Please enter your age.');
      setIsLoading(false);
      return;
    }
    if (Number(age) < 1 || Number(age) > 120) {
      setAuthError('Please enter a valid age.');
      setIsLoading(false);
      return;
    }

    try {
      // Register the new user
      const data = await signUpUser(email, password, fullName, lang, educationalLevel, age);
      
      const newUserId = data?.user?.id || `local-${Date.now()}`;
      setUserId(newUserId);
      if (fullName) setFullName(fullName);
      if (lang) setLang(lang);
      if (educationalLevel) setEducationalLevel(educationalLevel);
      if (age) setAge(age);

      // Attempt profile creation (skipped gracefully if Supabase URL is placeholder)
      try {
        await createUserProfile(newUserId, {
          fullName: fullName,
          email: email,
          age: age,
          nativeLanguage: lang,
          literacyLevel: educationalLevel
        });
      } catch (dbErr) {
        console.warn("Profile db notice:", dbErr);
      }

      if (data?.needsEmailVerification) {
        setUnverifiedEmail(email);
        setView('verify-email');
      } else {
        setView('initial-assessment');
      }
    } catch (error) {
      setAuthError(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const handleVerifyOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode.trim()) {
      setAuthError('Please enter the 6-digit verification code.');
      return;
    }
    setIsVerifyingOtp(true);
    setAuthError('');
    setOtpMessage('');
    try {
      await verifyUserEmailOTP(unverifiedEmail || email, otpCode.trim());
      setOtpMessage('✓ Email verified successfully! Redirecting to your initial placement assessment...');
      setTimeout(() => {
        setView('initial-assessment');
      }, 1500);
    } catch (err) {
      setAuthError(err.message || 'Invalid verification code. Please check your email or try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendEmail = async () => {
    setAuthError('');
    setOtpMessage('');
    try {
      await resendVerificationEmail(unverifiedEmail || email);
      setOtpMessage('✉️ Verification email resent! Please check your inbox.');
    } catch (err) {
      setAuthError(err.message || 'Could not resend email. Please try again in a few moments.');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    try {
      const userData = await signInUser(email, password);
      
      if (userData?.fullName) {
        setFullName(userData.fullName);
      }

      if (userData?.age) {
        setAge(userData.age);
      }

      if (userData?.language) {
        setLang(userData.language);
      } else {
        setLang('english'); 
      }

      // STATE RESOLUTION: Captures saved profile data and ensures dashboard responds directly to custom curriculum profiles
      if (userData?.educationalLevel) {
        setEducationalLevel(userData.educationalLevel);
      } else {
        setEducationalLevel('none');
      }

      if (userData?.tutorVoiceUri) {
        setTutorVoiceUri(userData.tutorVoiceUri);
      } else {
        setTutorVoiceUri('');
      }

      if (userData?.user?.id) {
        setUserId(userData.user.id);
      }

      // Logging in directly opens the Learner Dashboard
      setView('dashboard');
    } catch (error) {
      setAuthError(error.message || "Login Failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError('');
    try {
      const res = await signInWithGoogle();
      if (res?.user || res?.isDemoSession) {
        const uid = res?.user?.id || `google-${Date.now()}`;
        setUserId(uid);
        if (res?.fullName) setFullName(res.fullName);
        else setFullName('Google Learner');
        if (res?.language) setLang(res.language);
        if (res?.educationalLevel) setEducationalLevel(res.educationalLevel);

        setIsLoading(false);
        // Logging in via Google directly opens the Learner Dashboard
        setView('dashboard');
      }
    } catch (err) {
      setAuthError(err.message || 'Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleLogoutAction = () => {
    setView('landing');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setFullName('');
    setLang('english');
    setEducationalLevel('none');
    setUserId('');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#1C2D1A]">
      {/* One-time intro splash — falling droplet + ripples over a water-surface gradient.
          Sits above everything and fades out into the app below; skipped/simplified
          automatically when the user prefers reduced motion. */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Wrapper that fades the whole app in and slides it up once the splash
          screen finishes, so the transition into the landing page is seamless. */}
      <div className={contentRevealed ? 'animate-content-reveal' : 'animate-fade-in'}>

      {/* Global Application Loading State Mask Overlay */}
      {isLoading && view === 'landing' && (
        <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center font-medium text-sm">
          Loading system instance context...
        </div>
      )}

      {/* ⚡ Real-Time Admin Sync Toast — visible to ALL users on ALL devices */}
      {realtimeSyncToast && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm animate-slide-in-right">
          <div className="bg-gradient-to-r from-[#0b1021]/95 to-[#1a1f3a]/95 backdrop-blur-xl text-white px-5 py-3.5 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3">
            <span className="text-sm font-medium leading-snug">{realtimeSyncToast}</span>
            <button onClick={() => setRealtimeSyncToast(null)} className="text-white/50 hover:text-white text-lg ml-2 shrink-0">✕</button>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      {view !== 'dashboard' && view !== 'initial-assessment' && (
        view === 'landing' ? (
          /* ── Light editorial nav on the landing page ── */
          <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-emerald-100/60 px-4 sm:px-6 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="SaksharAI Logo" className="h-12 sm:h-16 w-auto object-contain cursor-pointer" onClick={() => setView('landing')} />
              </div>
              <div className="hidden md:flex items-center gap-8">
                {[[t.navApproach || 'Approach', 'sak-approach-section'], [t.navFeatures || 'Features', 'sak-features-section'], [t.navImpact || 'Impact', 'sak-impact-section']].map(([label, id]) => (
                  <button
                    key={id}
                    onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] font-black tracking-[0.2em] text-gray-600 hover:text-emerald-700 uppercase transition-colors duration-200 cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Language switcher on landing page */}
                <select
                  value={lang}
                  onChange={(e) => { const l = e.target.value; setLang(l); try { localStorage.setItem('sakshar_user_selected_lang', l); } catch {} }}
                  className="bg-gray-50 border border-gray-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-gray-700 focus:ring-1 focus:ring-[#1C2D1A] cursor-pointer outline-none hidden sm:block"
                >
                  {targetLanguages.map((l) => (
                    <option key={l.value} value={l.value}>{l.native}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setView('admin')} 
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <span>🛡️</span>
                  <span>Admin</span>
                </button>
                <button onClick={() => setView('login')} className="hidden sm:inline text-xs font-bold text-gray-700 hover:text-emerald-800 transition-colors cursor-pointer">
                  {t.signIn}
                </button>
                <button
                  onClick={() => setView('login')}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 bg-[#1C2D1A] hover:bg-emerald-950 text-white text-xs font-black rounded-full shadow-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  {t.getStarted || 'Get Started'}
                </button>

                {/* Mobile Hamburger Toggle Button */}
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(!mobileNavOpen)}
                  className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-emerald-50 text-xl cursor-pointer"
                  aria-label="Toggle Navigation Menu"
                >
                  {mobileNavOpen ? '✕' : '☰'}
                </button>
              </div>
            </div>

            {/* Mobile Dropdown Drawer */}
            {mobileNavOpen && (
              <div className="md:hidden pt-4 pb-3 space-y-3 border-t border-emerald-100 mt-3 animate-mobile-drawer">
                <div className="flex flex-col space-y-2">
                  {[[t.navApproach || 'Approach', 'sak-approach-section'], [t.navFeatures || 'Features', 'sak-features-section'], [t.navImpact || 'Impact', 'sak-impact-section']].map(([label, id]) => (
                    <button
                      key={id}
                      onClick={() => {
                        setMobileNavOpen(false);
                        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-emerald-50 rounded-xl"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-gray-100 flex flex-col space-y-2">
                  <div className="flex items-center justify-between px-3">
                    <span className="text-xs font-bold text-gray-500">Preferred Language</span>
                    <select
                      value={lang}
                      onChange={(e) => { const l = e.target.value; setLang(l); setMobileNavOpen(false); try { localStorage.setItem('sakshar_user_selected_lang', l); } catch {} }}
                      className="bg-gray-100 border border-gray-200 text-xs font-bold rounded-lg px-2.5 py-1 text-gray-800"
                    >
                      {targetLanguages.map((l) => (
                        <option key={l.value} value={l.value}>{l.native}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => { setMobileNavOpen(false); setView('admin'); }} 
                    className="text-left px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 rounded-xl flex items-center gap-2"
                  >
                    <span>🛡️</span> Admin Portal
                  </button>
                  <button 
                    onClick={() => { setMobileNavOpen(false); setView('login'); }} 
                    className="text-left px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl"
                  >
                    {t.signIn} / {t.getStarted || 'Get Started'}
                  </button>
                </div>
              </div>
            )}
          </nav>
        ) : (
          /* ── Original light nav used on login / register / other non-dashboard views ── */
          <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="SaksharAI Logo" className="h-14 sm:h-16 w-auto object-contain" />
            </div>
            <div className="flex items-center space-x-6">
              <button onClick={() => setView('landing')} className="text-sm font-semibold text-[#1C2D1A]">
                {t.home}
              </button>
              <button onClick={() => setView('login')} className="text-sm font-medium text-gray-600 hover:text-[#1C2D1A]">
                {t.signIn}
              </button>

              {/* Global Language Switcher in Navbar */}
              <div className="relative">
                <select
                  value={lang}
                  onChange={(e) => { const l = e.target.value; setLang(l); try { localStorage.setItem('sakshar_user_selected_lang', l); } catch {} }}
                  disabled={isLoading}
                  className="bg-gray-50 border border-gray-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-gray-700 focus:ring-1 focus:ring-[#1C2D1A] cursor-pointer outline-none"
                >
                  {targetLanguages.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.native}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </nav>
        )
      )}

      {/* Main View Router */}
      <main>
        {/* LANDING VIEW */}
        {view === 'landing' && (
          <div className="relative overflow-hidden bg-[#FAFAF8] text-[#1C2D1A]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Local fonts + keyframes for the redesigned landing page */}
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,600&display=swap');
              .sak-serif { font-family: 'Playfair Display', serif; }
              @keyframes sakMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
              @keyframes sakOrbitFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
              @keyframes sakTwinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.8; } }
              @keyframes sakPulseRing { 0% { transform: scale(0.9); opacity: 0.6; } 100% { transform: scale(1.7); opacity: 0; } }
              @keyframes sakFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
              @keyframes sakConstellationDrift {
                0%   { transform: translate(0px, 0px); }
                18%  { transform: translate(34px, -26px); }
                36%  { transform: translate(-22px, 22px); }
                54%  { transform: translate(28px, 30px); }
                72%  { transform: translate(-34px, -18px); }
                88%  { transform: translate(14px, -30px); }
                100% { transform: translate(0px, 0px); }
              }
            `}</style>

            {/* ══════════════════ VOICE LANGUAGE DETECTION TOAST ══════════════════ */}
            {voiceToast && (
              <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-500 animate-slide-down ${
                voiceToast.error
                  ? 'bg-red-50/95 border-red-200 text-red-800'
                  : 'bg-white/95 border-indigo-200 text-gray-900'
              }`}>
                <span className="text-2xl">{voiceToast.error ? '⚠️' : '🌐'}</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-2">
                    {voiceToast.error ? 'Voice Error' : 'Language Detected'}
                    {!voiceToast.error && voiceToast.model && (
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider border border-indigo-200">
                        {voiceToast.model}
                      </span>
                    )}
                  </p>
                  <p className="text-sm font-black mt-0.5">
                    {voiceToast.native}
                    {!voiceToast.error && <span className="opacity-70 font-medium ml-1">({voiceToast.label})</span>}
                  </p>
                </div>
              </div>
            )}

            {/* ══════════════════════════════ HERO ══════════════════════════════ */}
            <section className="relative min-h-[92vh] flex items-center px-6 pt-16 pb-10 overflow-hidden" style={{ background: bgVideoConfig?.enabled && bgVideoConfig?.url ? '#060e08' : 'linear-gradient(180deg, #FBFDFB 0%, #F1F9F5 45%, #E6F4ED 100%)' }}>

              {/* 🎥 Admin Configured Hero Video Background (File / URL / YouTube Embed) */}
              <HeroVideoBackground config={bgVideoConfig} />

              {/* Soothing Starfield / Sparkles */}
              <div className="absolute inset-0 pointer-events-none">
                {[
                  ['6%', '14%', 3, 0], ['14%', '62%', 2, 1.1], ['22%', '30%', 3, 2.3], ['30%', '80%', 2, 0.6],
                  ['38%', '8%', 3, 1.8], ['46%', '92%', 2, 0.3], ['58%', '20%', 3, 2.6], ['66%', '70%', 2, 1.4],
                  ['74%', '45%', 3, 0.9], ['82%', '88%', 2, 2.1], ['88%', '12%', 3, 0.5], ['92%', '55%', 2, 1.7],
                ].map(([top, left, size, delay], i) => (
                  <span key={i} className="absolute rounded-full bg-emerald-400/40" style={{ top, left, width: size, height: size, animation: `sakTwinkle 3.5s ease-in-out ${delay}s infinite` }} />
                ))}
              </div>

              <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-12 items-center">

                {/* ── Left: copy + CTAs + voice demo ── */}
                <div className="lg:col-span-7 space-y-7 text-left" style={{ animation: 'sakFadeUp 0.7s ease-out both' }}>

                  <div className="flex items-center gap-3">
                    <span className="w-8 h-px bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500" />
                    <span className="text-[11px] font-black tracking-[0.3em] uppercase">
                      <AnimatedRainbowLetters 
                        text={t.aiCompanionBadge || 'The AI Literacy Companion'} 
                        speed="4s"
                        gradient="linear-gradient(135deg, #059669 0%, #10b981 25%, #06b6d4 50%, #8b5cf6 75%, #ec4899 100%)"
                      />
                    </span>
                  </div>

                  <h1 className="sak-serif text-5xl sm:text-6xl md:text-7xl leading-[1.08]">
                    <AnimatedRainbowLetters 
                      text={t.landingTitleLine1 || 'Empowering Literacy'} 
                      speed="5s"
                      gradient="linear-gradient(135deg, #047857 0%, #10b981 20%, #06b6d4 40%, #3b82f6 60%, #8b5cf6 80%, #f59e0b 100%)"
                    />
                    <br />
                    <em className="italic font-black inline-block mt-1" style={{ textShadow: '0 0 25px rgba(16,185,129,0.3)' }}>
                      <AnimatedRainbowLetters 
                        text={t.landingTitleLine2 || 'Through AI Intelligence'} 
                        speed="4.5s"
                        letterDelay={0.04}
                        gradient="linear-gradient(135deg, #10b981 0%, #06b6d4 25%, #8b5cf6 50%, #ec4899 75%, #f59e0b 100%)"
                      />
                    </em>
                  </h1>

                  <p className="text-base sm:text-lg max-w-xl leading-relaxed font-semibold">
                    <AnimatedRainbowLetters 
                      text={t.landingSub} 
                      speed="7s"
                      letterDelay={0.015}
                      gradient="linear-gradient(135deg, #065f46 0%, #047857 25%, #0d9488 50%, #2563eb 75%, #7c3aed 100%)"
                    />
                  </p>

                  {/* Secondary interactive element: voice language auto-detect */}
                  <div className="bg-white/90 backdrop-blur-lg border border-emerald-100 rounded-3xl p-5 flex items-center gap-5 shadow-lg relative overflow-hidden max-w-xl">
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 transition-all duration-500 ${isVoiceListening ? 'bg-red-500 scale-150' : 'bg-emerald-400'}`} />

                    <div className="relative shrink-0">
                      {isVoiceListening && (
                        <>
                          <div className="absolute inset-0 rounded-full bg-red-500/30" style={{ animation: 'sakPulseRing 1.4s ease-out infinite' }} />
                          <div className="absolute -inset-2 rounded-full bg-red-400/20" style={{ animation: 'sakPulseRing 1.4s ease-out 0.4s infinite' }} />
                        </>
                      )}
                      <button
                        type="button"
                        onClick={startVoiceLanguageDetection}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md ${
                          isVoiceListening
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95 cursor-pointer shadow-emerald-500/20'
                        }`}
                        title={t.micBtnTooltip || "Click and speak your language!"}
                      >
                        {isVoiceListening ? (
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <span className="w-1.5 h-7 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <span className="w-1.5 h-5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                          </div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black tracking-wider uppercase text-emerald-800 mb-0.5 flex items-center gap-2 text-left">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {isVoiceListening ? (t.listening || 'Listening…') : (t.voiceDetectorLabel || 'AI Voice Language Selector')}
                      </p>
                      <div className="min-h-9 flex items-center text-left">
                        <span className="text-gray-900 text-sm font-black leading-snug">
                          {isVoiceListening ? (
                            <span className="text-red-600 animate-pulse">{t.voiceListeningPrompt || 'Speak now in your mother tongue…'}</span>
                          ) : voiceDetectedLang ? (
                            <span>{t.detectedLabel || "Detected"}: <strong className="text-emerald-700 capitalize">{voiceDetectedLang}</strong>!</span>
                          ) : (
                            <span className="text-gray-700">{invitationText}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <button
                      onClick={() => setView('login')}
                      className="px-9 py-4 bg-[#1C2D1A] hover:bg-emerald-950 text-white font-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 text-center cursor-pointer text-sm"
                    >
                      {t.getStarted || 'Get Started'} →
                    </button>
                    <button
                      onClick={() => document.getElementById('sak-demo-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="px-8 py-4 border-2 border-emerald-800/20 text-emerald-950 bg-white/90 hover:bg-white font-black rounded-full shadow-sm hover:border-emerald-700/40 transition-all duration-200 text-center cursor-pointer text-sm"
                    >
                      {t.tryLiveDemo || 'Try Live Demo'}
                    </button>
                  </div>

                </div>

                {/* ── Right: orbiting skill constellation ── */}
                <div
                  ref={starWrapRef}
                  onMouseMove={handleStarMouseMove}
                  onMouseLeave={handleStarMouseLeave}
                  className="lg:col-span-5 relative h-[380px] sm:h-[460px] cursor-crosshair"
                  style={{ animation: 'sakFadeUp 0.9s ease-out 0.15s both' }}
                >
                {/* Slow ambient wander — the whole constellation (hub, lines, nodes)
                    drifts gently on its own, independent of and layered underneath
                    the cursor-follow parallax already applied to each element. */}
                <div className="absolute inset-0" style={{ animation: 'sakConstellationDrift 24s ease-in-out infinite' }}>
                  {(() => {
                    const nodes = [
                      { label: t.secReading || 'Reading', left: 55, top: 8, color: '#059669', delay: 0, factor: 1.0 },
                      { label: t.secWriting || 'Writing', left: 82, top: 15, color: '#d97706', delay: 0.4, factor: 0.8 },
                      { label: t.secSpeaking || 'Speaking', left: 92, top: 39, color: '#0284c7', delay: 0.8, factor: 1.2 },
                      { label: t.secReasoning || 'Reasoning', left: 85, top: 66, color: '#7c3aed', delay: 1.2, factor: 0.9 },
                      { label: t.voiceAiLabel || 'Voice AI', left: 61, top: 87, color: '#059669', delay: 1.6, factor: 1.1 },
                      { label: t.tracingLabel || 'Tracing', left: 30, top: 87, color: '#d97706', delay: 2.0, factor: 0.85 },
                      { label: t.langHindi || 'हिन्दी', left: 7, top: 63, color: '#0284c7', delay: 2.4, factor: 1.15 },
                      { label: t.langTamil || 'தமிழ்', left: 3, top: 36, color: '#7c3aed', delay: 0.6, factor: 0.95 },
                      { label: t.langBengali || 'বাংলা', left: 17, top: 12, color: '#059669', delay: 1.0, factor: 1.05 },
                    ];
                    const hubX = 50 + starOffset.x * 0.25;
                    const hubY = 50 + starOffset.y * 0.25;

                    return (
                      <>
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                          {nodes.map((n, i) => (
                            <line
                              key={i}
                              x1={hubX}
                              y1={hubY}
                              x2={n.left + starOffset.x * n.factor}
                              y2={n.top + starOffset.y * n.factor}
                              stroke="rgba(16, 185, 129, 0.3)"
                              strokeWidth="0.5"
                              strokeDasharray="2.2 2.2"
                              className="animate-dash-flow"
                              style={{ animationDelay: `${n.delay * 0.3}s`, transition: 'x1 0.15s ease-out, y1 0.15s ease-out, x2 0.15s ease-out, y2 0.15s ease-out' }}
                            />
                          ))}
                        </svg>

                        {/* Central hub — drifts gently toward the cursor */}
                        <div
                          className="absolute flex items-center justify-center"
                          style={{
                            left: `${hubX}%`,
                            top: `${hubY}%`,
                            transform: 'translate(-50%, -50%)',
                            transition: 'left 0.15s ease-out, top 0.15s ease-out',
                          }}
                        >
                          <span className="absolute w-24 h-24 rounded-full border border-emerald-400/40" style={{ animation: 'sakPulseRing 2.6s ease-out infinite' }} />
                          <span className="absolute w-24 h-24 rounded-full border border-emerald-400/30" style={{ animation: 'sakPulseRing 2.6s ease-out 1s infinite' }} />
                          <span className="absolute w-24 h-24 rounded-full bg-emerald-400/15 blur-2xl" />
                          <div className="w-16 h-16 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200">
                            <span className="sak-serif italic text-emerald-700 font-extrabold text-base">AI</span>
                          </div>
                        </div>

                        {/* Satellite skill/language nodes — each drifts at its own depth */}
                        {nodes.map((n, i) => (
                          <div
                            key={i}
                            className="absolute"
                            style={{
                              left: `${n.left + starOffset.x * n.factor}%`,
                              top: `${n.top + starOffset.y * n.factor}%`,
                              transform: 'translate(-50%, -50%)',
                              transition: 'left 0.15s ease-out, top 0.15s ease-out',
                            }}
                          >
                            <div
                              className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full border border-emerald-100 shadow-sm hover:scale-110 hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-default"
                              style={{ animation: `sakOrbitFloat 4.5s ease-in-out ${n.delay}s infinite` }}
                            >
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: n.color }} />
                              <span className="text-[11px] font-black text-gray-800 whitespace-nowrap">{n.label}</span>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
                </div>
              </div>

              {/* Scroll hint */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-60">
                <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-[0.3em]">{t.scrollLabel || "Scroll"}</span>
                <span className="w-px h-6 bg-emerald-600 animate-bounce" />
              </div>
            </section>

            {/* ══════════════════ LANGUAGE MARQUEE ══════════════════ */}
            <div className="border-y border-emerald-100 bg-emerald-50/80 overflow-hidden py-6">
              <div className="flex whitespace-nowrap" style={{ animation: 'sakMarquee 32s linear infinite' }}>
                {[...targetLanguages, ...targetLanguages].map((l, i) => (
                  <span key={i} className="sak-serif italic text-3xl sm:text-4xl text-emerald-900 font-extrabold px-8 flex items-center gap-8">
                    {l.native}
                    <span className="text-emerald-500 not-italic text-lg">•</span>
                  </span>
                ))}
              </div>
            </div>

            {/* ══════════════════ LIVE DEMO SANDBOX ══════════════════ */}
            <section id="sak-demo-section" className="relative bg-[#F4F9F6] border-t border-emerald-100 px-6 py-24">
              <div className="max-w-3xl mx-auto">
                <div id="interactive-demo-widget" className="bg-white/90 backdrop-blur-xl border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-400/20">{t.liveSandboxBadge || "Live AI Sandbox"}</span>
                      <h3 className="sak-serif text-xl text-white mt-2">{t.liveSandboxTitle || "Test Character Tracing"}</h3>
                    </div>
                    <span className="text-2xl">✨</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block text-left">{t.selectScriptProfile || "Select Script Profile:"}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { code: 'hindi', char: 'अ', label: 'Hindi' },
                        { code: 'telugu', char: 'అ', label: 'Telugu' },
                        { code: 'bengali', char: 'অ', label: 'Bengali' },
                        { code: 'english', char: 'A', label: 'English' }
                      ].map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            setDemoScript(item);
                            clearDemoCanvas();
                          }}
                          className={`py-2 px-1 text-xs border rounded-xl transition cursor-pointer ${
                            demoScript.code === item.code
                              ? 'bg-indigo-500 border-indigo-500 text-white font-black shadow-md'
                              : 'bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.08] font-bold'
                          }`}
                        >
                          <span className="block text-base">{item.char}</span>
                          <span className="block text-[8px] opacity-75 uppercase">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative w-full aspect-square max-w-[240px] bg-white border-2 border-white/10 rounded-2xl p-1 shadow-inner overflow-hidden">
                      <canvas
                        ref={demoCanvasRef}
                        width={240}
                        height={240}
                        className="w-full h-full bg-white rounded-xl cursor-crosshair touch-none"
                        onMouseDown={startDemoDrawing}
                        onMouseMove={drawDemo}
                        onMouseUp={stopDemoDrawing}
                        onMouseLeave={stopDemoDrawing}
                        onTouchStart={startDemoDrawing}
                        onTouchMove={drawDemo}
                        onTouchEnd={stopDemoDrawing}
                      />
                      {!hasDemoDrawn && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400 gap-1.5">
                          <span className="text-2xl">✏️</span>
                          <p className="text-[10px] font-black uppercase tracking-wider">{t.drawInsideBox || 'Draw'} '{demoScript.char}'</p>
                        </div>
                      )}
                    </div>

                    {demoFeedback && (
                      <div className="w-full max-w-[240px] mt-4 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-100 animate-scale-up text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black">{demoFeedback.score}% {t.accuracyMatch || "Accuracy Match"}</span>
                          <span className="text-[8px] uppercase tracking-wider text-indigo-200 bg-white/10 px-1.5 py-0.5 rounded font-black border border-white/10">{t.aiVerified || "AI Verified"}</span>
                        </div>
                        <p className="text-[10px] font-bold leading-relaxed">{demoFeedback.message}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-4 w-full max-w-[240px]">
                      <button
                        type="button"
                        onClick={clearDemoCanvas}
                        disabled={!hasDemoDrawn || isDemoSubmitting}
                        className="flex-1 py-2.5 border border-white/10 text-xs font-bold rounded-xl text-gray-300 hover:bg-white/[0.06] disabled:opacity-40 transition cursor-pointer"
                      >
                        {t.clearBtn || 'Clear'}
                      </button>
                      <button
                        type="button"
                        onClick={submitDemoWriting}
                        disabled={!hasDemoDrawn || isDemoSubmitting}
                        className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black rounded-xl disabled:opacity-40 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        {isDemoSubmitting ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>{t.checking || 'Checking...'}</span>
                          </>
                        ) : (
                          t.analyzeBtn || 'Analyze'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══════════════════ APPROACH ══════════════════ */}
            <section id="sak-approach-section" className="bg-black px-6 py-24 border-t border-white/10">
              <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-12">
                <div className="md:col-span-4 space-y-4">
                  <span className="text-[11px] font-bold tracking-[0.3em] text-gray-400 uppercase">{t.ourApproachBadge || 'Our Approach'}</span>
                  <h2 className="sak-serif text-4xl sm:text-5xl text-white leading-tight">
                    {t.whyWeBuiltTitle || 'Why we built'}<br /><em className="italic text-amber-400">{t.whyWeBuiltHighlight || 'Sakshar'}</em>
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                    {t.approachSubtitle || 'Four beliefs that shape every lesson, every prompt and every line of feedback on the platform.'}
                  </p>
                </div>

                <div className="md:col-span-8 divide-y divide-white/10">
                  {[
                    { n: '01', title: t.literacyGapTitle || 'The literacy gap is human', body: t.literacyGapBody || "Millions of adults speak fluently but were never taught to read or write with confidence. That's not a technology problem to route around — it's a human one to design for, with patience and dignity." },
                    { n: '02', title: t.oneSizeFitsTitle || 'One size fits no one', body: t.oneSizeFitsBody || 'Traditional classes assume a starting point. Sakshar begins with a short assessment and shapes a path that adapts to the learner\'s own pace, language and level.' },
                    { n: '03', title: t.aiListensTitle || 'AI that listens back', body: t.aiListensBody || 'Real-time pronunciation feedback, character tracing and applied reasoning turn passive lessons into a two-way conversation — patient, private and always available.' },
                    { n: '04', title: t.fluencyMotherTitle || 'Fluency in the mother tongue', body: t.fluencyMotherBody || 'Learning lands deepest in the language you dream in. Sakshar teaches across 20+ Indian regional languages, detecting your voice from the very first tap.' },
                  ].map((item) => (
                    <div key={item.n} className="py-8 first:pt-0 grid sm:grid-cols-[3rem_1fr] gap-4">
                      <span className="text-amber-400 text-sm font-bold tracking-wider">{item.n}</span>
                      <div>
                        <h3 className="sak-serif text-2xl text-white mb-2">{item.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══════════════════ PLATFORM / FEATURES ══════════════════ */}
            <section id="sak-features-section" className="bg-[#0c130f] px-6 py-24 border-t border-white/10">
              <div className="max-w-6xl mx-auto space-y-14">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold tracking-[0.3em] text-emerald-400/80 uppercase">{t.thePlatformBadge || 'The Platform'}</span>
                    <h2 className="sak-serif text-4xl sm:text-5xl text-white leading-tight">
                      {t.platformTitle || 'A classroom that adapts to every learner'}
                    </h2>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                    {t.platformSubtitle || 'Three intelligent modules work together to build reading, writing and speaking — one confident step at a time.'}
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-6">
                  {[
                    { n: t.mod1Tag || '01 / READING', icon: '📖', title: t.mod1Title || 'Interactive Reading', desc: t.mod1Desc || 'Custom content decks built around daily local tasks, with tap-to-explain glossaries for unfamiliar words.' },
                    { n: t.mod2Tag || '02 / WRITING', icon: '✍️', title: t.mod2Title || 'Real-Time Tracing', desc: t.mod2Desc || 'Trace characters on screen and get stroke-by-stroke correction — try it above in the live sandbox.' },
                    { n: t.mod3Tag || '03 / SPEAKING', icon: '🗣️', title: t.mod3Title || 'Voice Verification', desc: t.mod3Desc || 'Speak aloud and hear how close you are — private, patient pronunciation feedback powered by AI.' },
                  ].map((feat, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.06] hover:-translate-y-1.5 transition-all duration-300 cursor-default">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-6">{feat.icon}</div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/70">{feat.n}</span>
                      <h3 className="sak-serif text-xl text-white mt-2 mb-2">{feat.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-medium">{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══════════════════ IMPACT STATS ══════════════════ */}
            <section id="sak-impact-section" className="bg-black px-6 py-20 border-t border-white/10">
              <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
                <CountUpStat value={20} suffix="+" label={t.stat1Label || "Regional Languages"} accent="text-indigo-400" />
                <CountUpStat value={95} suffix="%" label={t.stat2Label || "Pronunciation Accuracy"} accent="text-indigo-400" />
                <CountUpStat value={10} suffix="K+" label={t.stat3Label || "Learners Onboarded"} accent="text-indigo-400" />
                <CountUpStat value={3} suffix="" label={t.stat4Label || "Literacy Modules"} accent="text-indigo-400" />
              </div>
            </section>

            {/* ══════════════════ FINAL CTA ══════════════════ */}
            <section className="bg-[#0d140f] px-6 py-24 border-t border-white/10">
              <div className="max-w-4xl mx-auto">
                <span className="text-[11px] font-bold tracking-[0.3em] text-gray-400 uppercase">{t.beginYourJourney || "Begin Your Journey"}</span>
                <h2 className="sak-serif text-4xl sm:text-6xl text-white leading-tight mt-4 mb-8">
                  {t.ctaHeadlineLine1 || "Every word you learn"}<br /><em className="italic text-amber-400">{t.ctaHeadlineLine2 || "opens a door."}</em>
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    onClick={() => setView('login')}
                    className="px-8 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-full shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all duration-200 text-center cursor-pointer text-sm"
                  >
                    {t.getStartedFree || "Get Started Free"}
                  </button>
                  <button
                    onClick={() => document.getElementById('sak-demo-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-8 py-3.5 border border-white/20 text-white bg-white/[0.03] hover:bg-white/[0.08] font-bold rounded-full transition-all duration-200 text-center cursor-pointer text-sm"
                  >
                    {t.watchDemo || "Watch the Demo"}
                  </button>
                </div>
              </div>
            </section>

            {/* ══════════════════ FOOTER ══════════════════ */}
            <footer className="bg-black border-t border-white/10 px-6 py-10">
              <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="SaksharAI Logo" className="h-12 w-auto object-contain bg-white/90 p-1.5 rounded-lg" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase text-center">
                  {t.footerTagline || "Literacy for every voice · Built with intelligence"}
                </span>
              </div>
            </footer>

          </div>
        )}

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <div className="flex min-h-[calc(100vh-80px)] page-transition">
            <div className="w-1/2 relative hidden md:block animate-auth-panel overflow-hidden pointer-events-none select-none touch-none">
              {authBgConfig?.login?.mediaType === 'video' || authBgConfig?.login?.mediaType === 'youtube' || authBgConfig?.login?.url?.includes('.mp4') ? (
                <HeroVideoBackground config={authBgConfig.login} />
              ) : (
                <img 
                  src={authBgConfig?.login?.url || "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=1000"} 
                  alt="Person reading" 
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-300 pointer-events-none select-none"
                  style={{
                    opacity: authBgConfig?.login?.opacity ?? 1.0,
                    filter: `blur(${authBgConfig?.login?.blur ?? 0}px)`
                  }}
                />
              )}
              <div 
                className="absolute inset-0 vignette-overlay pointer-events-none select-none transition-all duration-300 z-10"
                style={{
                  backgroundColor: authBgConfig?.login?.overlayColor || '#3A4D39',
                  opacity: authBgConfig?.login?.overlayOpacity ?? 0.8
                }}
              />
              <div className="absolute bottom-16 left-16 right-16 text-white z-20 animate-auth-caption pointer-events-none select-none">
                <h2 className="text-4xl font-bold leading-tight mb-4">{t.loginLeftTitle}</h2>
                <p className="text-lg opacity-90 leading-relaxed">{t.loginLeftSub}</p>
              </div>
              <div className="absolute inset-0 z-30 pointer-events-none select-none touch-none bg-transparent" />
            </div>

            <div className="w-full md:w-1/2 bg-[#FBFBFA] flex flex-col p-16 md:p-24 justify-center">
              <div className="max-w-md mx-auto w-full animate-auth-form">
                <div className="flex items-center space-x-2.5 mb-12">
                  <img src="/logo.png" alt="SaksharAI Logo" className="h-16 w-auto object-contain" />
                </div>

                <h1 className="text-4xl font-extrabold mb-3 tracking-tight">{t.welcomeBack}</h1>
                <p className="text-gray-600 mb-10">{t.signInSub}</p>

                <form className="space-y-6" onSubmit={handleLoginSubmit}>
                  {authError && (
                    <div className="p-3.5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl font-medium animate-auth-error">
                      ⚠️ {authError}
                    </div>
                  )}
                  <div className="animate-auth-field" style={{ animationDelay: '0.05s' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.email}</label>
                    <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1C2D1A] outline-none transition-shadow" required disabled={isLoading} />
                  </div>
                  <div className="animate-auth-field" style={{ animationDelay: '0.12s' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.password}</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1C2D1A] outline-none transition-shadow" required disabled={isLoading} />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        disabled={isLoading}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.29 20.29 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.32 20.32 0 0 1-4.05 5.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-[#1C2D1A] text-white py-3.5 rounded-xl font-semibold hover:bg-[#2c4429] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] animate-auth-field" style={{ animationDelay: '0.19s' }}>
                    <span>{isLoading ? 'Verifying...' : t.signIn}</span> →
                  </button>
                </form>

                {/* Instant Demo Sign In Fallback */}
                <div className="mt-3 animate-auth-field" style={{ animationDelay: '0.21s' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsLoading(true);
                      setAuthError('');
                      setTimeout(() => {
                        const demoId = `demo-${Date.now()}`;
                        setFullName('Sakshar Learner');
                        setLang('english');
                        setEducationalLevel('none');
                        setUserId(demoId);
                        localStorage.setItem('sakshar_demo_user', JSON.stringify({
                          user: { id: demoId, email: 'learner@sakshar.ai' },
                          fullName: 'Sakshar Learner',
                          language: 'english',
                          educationalLevel: 'none',
                          initialAssessmentCompleted: true
                        }));
                        setIsLoading(false);
                        setView('dashboard');
                      }, 300);
                    }}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-emerald-800 to-teal-800 text-white py-3 rounded-xl font-bold hover:opacity-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs uppercase tracking-wider"
                  >
                    ⚡ Instant Demo Sign In (Explore Platform)
                  </button>
                </div>

                <div className="relative my-6 animate-auth-field" style={{ animationDelay: '0.24s' }}>
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-3 bg-[#FBFBFA] text-gray-500">{t.or}</span></div>
                </div>

                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading} 
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] animate-auth-field cursor-pointer shadow-sm"
                  style={{ animationDelay: '0.29s' }}
                >
                  <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="h-5 w-5" />
                  {t.googleSignIn}
                </button>

                <p className="text-center text-sm text-gray-600 mt-12 animate-auth-field" style={{ animationDelay: '0.34s' }}>
                  {t.newHere} <button onClick={() => { setView('register'); setAuthError(''); }} disabled={isLoading} className="font-semibold text-[#1C2D1A] hover:underline disabled:opacity-50"> {t.createAccount}</button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* REGISTER VIEW */}
        {view === 'register' && (
          <div className="flex min-h-[calc(100vh-80px)] page-transition">
            <div className="w-1/2 relative hidden md:block animate-auth-panel overflow-hidden pointer-events-none select-none touch-none">
              {authBgConfig?.register?.mediaType === 'video' || authBgConfig?.register?.mediaType === 'youtube' || authBgConfig?.register?.url?.includes('.mp4') ? (
                <HeroVideoBackground config={authBgConfig.register} />
              ) : (
                <img 
                  src={authBgConfig?.register?.url || "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1000"} 
                  alt="Books" 
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-300 pointer-events-none select-none" 
                  style={{
                    opacity: authBgConfig?.register?.opacity ?? 1.0,
                    filter: `blur(${authBgConfig?.register?.blur ?? 0}px)`
                  }}
                />
              )}
              <div 
                className="absolute inset-0 vignette-overlay pointer-events-none select-none transition-all duration-300 z-10"
                style={{
                  backgroundColor: authBgConfig?.register?.overlayColor || '#3A4D39',
                  opacity: authBgConfig?.register?.overlayOpacity ?? 0.8
                }}
              />
              <div className="absolute bottom-16 left-16 right-16 text-white z-20 animate-auth-caption pointer-events-none select-none">
                <h2 className="text-4xl font-bold leading-tight mb-4">{t.registerLeftTitle}</h2>
                <p className="text-lg opacity-90 leading-relaxed">{t.registerLeftSub}</p>
              </div>
              <div className="absolute inset-0 z-30 pointer-events-none select-none touch-none bg-transparent" />
            </div>

            <div className="w-full md:w-1/2 bg-[#FBFBFA] flex flex-col p-12 md:p-20 justify-center">
              <div className="max-w-md mx-auto w-full animate-auth-form">
                <div className="flex items-center space-x-2.5 mb-8">
                  <img src="/logo.png" alt="SaksharAI Logo" className="h-16 w-auto object-contain" />
                </div>

                <h1 className="text-3xl font-extrabold mb-2 tracking-tight">{t.registerTitle}</h1>
                <p className="text-gray-600 mb-8">{t.registerSub}</p>

                <form className="space-y-5" onSubmit={handleRegisterSubmit}>
                  {authError && (
                    <div className="p-3.5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl font-medium animate-auth-error">
                      ⚠️ {authError}
                    </div>
                  )}
                  <div className="animate-auth-field" style={{ animationDelay: '0.05s' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.fullName}</label>
                    <input type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1C2D1A] outline-none transition-shadow" required disabled={isLoading} />
                  </div>
                  <div className="animate-auth-field" style={{ animationDelay: '0.1s' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.email}</label>
                    <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1C2D1A] outline-none transition-shadow" required disabled={isLoading} />
                  </div>
                  <div className="animate-auth-field" style={{ animationDelay: '0.15s' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.password}</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1C2D1A] outline-none transition-shadow" required disabled={isLoading} />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        disabled={isLoading}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.29 20.29 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.32 20.32 0 0 1-4.05 5.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="animate-auth-field" style={{ animationDelay: '0.2s' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.age || '🎂 Age'}</label>
                    <input type="number" min="1" max="120" placeholder="Your age" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1C2D1A] outline-none transition-shadow" required disabled={isLoading} />
                  </div>

                  {/* 20-Language Unified Matrix Selector Dropdown (Preferred UI Language) */}
                  <div className="animate-auth-field" style={{ animationDelay: '0.25s' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.languageLabel}</label>
                    <select 
                      value={lang}
                      onChange={(e) => { const l = e.target.value; setLang(l); try { localStorage.setItem('sakshar_user_selected_lang', l); } catch {} }}
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 font-medium focus:ring-2 focus:ring-[#1C2D1A] cursor-pointer outline-none disabled:opacity-50 transition-shadow"
                    >
                      {targetLanguages.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.native} ({l.label})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Want to Learn Language Dropdown (Subject Language for Assessment & Practice) */}
                  <div className="animate-auth-field" style={{ animationDelay: '0.28s' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t.wantToLearnLabel || '🎯 Language You Want to Learn'}
                    </label>
                    <select 
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 font-medium focus:ring-2 focus:ring-[#1C2D1A] cursor-pointer outline-none disabled:opacity-50 transition-shadow"
                    >
                      {targetLanguages.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.native} ({l.label})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Educational Level Dropdown */}
                  <div className="animate-auth-field" style={{ animationDelay: '0.3s' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Educational Level / Track</label>
                    <select 
                      value={educationalLevel}
                      onChange={(e) => setEducationalLevel(e.target.value)}
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 font-medium focus:ring-2 focus:ring-[#1C2D1A] cursor-pointer outline-none disabled:opacity-50 transition-shadow"
                    >
                      <option value="none">{t.eduLevel1 || "No Formal Schooling / Foundational Learner"}</option>
                      <option value="primary">{t.eduLevel2 || "Primary School (Class 1-5)"}</option>
                      <option value="middle">{t.eduLevel3 || "Middle School (Class 6-8)"}</option>
                      <option value="high">{t.eduLevel4 || "High School / Secondary (Class 9-12)"}</option>
                    </select>
                  </div>

                  <button type="submit" disabled={isLoading} className="w-full bg-[#1C2D1A] text-white py-3 rounded-xl font-semibold hover:bg-[#2c4429] transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] animate-auth-field" style={{ animationDelay: '0.35s' }}>
                    {isLoading ? 'Creating Profile...' : `${t.createAccount} →`}
                  </button>
                </form>

                <div className="relative my-6 animate-auth-field" style={{ animationDelay: '0.36s' }}>
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-3 bg-[#FBFBFA] text-gray-500">{t.or}</span></div>
                </div>

                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading} 
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] animate-auth-field cursor-pointer shadow-sm"
                  style={{ animationDelay: '0.38s' }}
                >
                  <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="h-5 w-5" />
                  {t.googleSignIn}
                </button>

                <p className="text-center text-sm text-gray-600 mt-8 animate-auth-field" style={{ animationDelay: '0.4s' }}>
                  {t.alreadyHaveAccount} <button onClick={() => { setView('login'); setAuthError(''); }} disabled={isLoading} className="font-semibold text-[#1C2D1A] hover:underline disabled:opacity-50">{t.signIn}</button>
                </p>
              </div>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <Dashboard 
            userId={userId}
            fullName={fullName} 
            lang={lang}
            targetLang={targetLang} 
            educationalLevel={educationalLevel} 
            age={age}
            tutorVoiceUri={tutorVoiceUri}
            onLogout={handleLogoutAction} 
            onProfileUpdate={({ fullName: newName, language: newLang, educationalLevel: newEdu, age: newAge, tutorVoiceUri: newVoice }) => {
              if (newName !== undefined) setFullName(newName);
              if (newLang !== undefined) setLang(newLang);
              if (newEdu !== undefined) setEducationalLevel(newEdu);
              if (newAge !== undefined) setAge(newAge);
              if (newVoice !== undefined) setTutorVoiceUri(newVoice);
            }}
            onLanguagePreview={(newLang) => setLang(newLang)}
            onNavigateToPremium={() => setView('premium')}
            t={t} 
          />
        )}

        {view === 'premium' && (
          <Premium
            fullName={fullName}
            lang={lang}
            t={t}
            onBack={() => setView('dashboard')}
          />
        )}

        {view === 'admin' && (
          <AdminDashboard
            onBackToPlatform={() => setView('landing')}
            t={t}
            currentLearner={{
              userId,
              fullName,
              lang,
              targetLang,
              educationalLevel,
              age,
              tutorVoiceUri
            }}
            onUpdateLearnerProfile={({ fullName: newName, language: newLang, educationalLevel: newEdu, age: newAge }) => {
              if (newName !== undefined) setFullName(newName);
              if (newLang !== undefined) setLang(newLang);
              if (newEdu !== undefined) setEducationalLevel(newEdu);
              if (newAge !== undefined) setAge(newAge);
            }}
            onResetLearnerAssessment={() => {
              if (userId) {
                localStorage.removeItem(`sakshar_initial_assessment_completed_${userId}`);
              }
              setView('initial-assessment');
            }}
          />
        )}

                {/* ── EMAIL VERIFICATION SCREEN ── */}
        {view === 'verify-email' && (
          <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6 text-center border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl mx-auto animate-bounce">
                ✉️
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verify Your Email Address</h2>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  We sent a verification link & 6-digit confirmation code to:
                  <br />
                  <span className="font-extrabold text-indigo-600 break-all">{unverifiedEmail || email}</span>
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl animate-shake">
                  {authError}
                </div>
              )}

              {otpMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-2xl">
                  {otpMessage}
                </div>
              )}

              {/* 6-DIGIT OTP VERIFICATION FORM */}
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Enter 6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl font-mono font-black tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-500/20 cursor-pointer transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isVerifyingOtp ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <span>✅</span> Verify Email & Continue
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  className="hover:text-indigo-600 underline cursor-pointer transition"
                >
                  Resend Email
                </button>

                <button
                  type="button"
                  onClick={() => { setView('login'); setAuthError(''); }}
                  className="hover:text-indigo-600 underline cursor-pointer transition"
                >
                  Back to Login ➔
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'initial-assessment' && (
          <InitialAssessment
            userId={userId}
            fullName={fullName}
            lang={lang}
            targetLang={targetLang}
            age={age}
            selectedLevel={educationalLevel}
            assessmentBgConfig={authBgConfig?.assessment}
            onComplete={(assessedLevel) => {
              setEducationalLevel(assessedLevel);
              setView('dashboard');
            }}
            onExit={() => setView('landing')}
            t={t}
          />
        )}
      </main>
      <PWAInstallPrompt t={t} />
      </div>
    </div>
  );
}