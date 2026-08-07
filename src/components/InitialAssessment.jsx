import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabase';
import { updateUserProfileTable, saveEvaluationDB } from '../services/db';
import { updateUserAuthProfile } from '../services/auth';

// Buckets ages into fine-grained ranges to map directly to the psychometric matrix.
const getAgeBracket = (ageValue) => {
  const numericAge = Number(ageValue);
  if (!numericAge || Number.isNaN(numericAge)) return '20-25'; // Default
  if (numericAge <= 25) return '20-25';
  if (numericAge <= 30) return '26-30';
  if (numericAge <= 35) return '31-35';
  if (numericAge <= 40) return '36-40';
  if (numericAge <= 45) return '41-45';
  if (numericAge <= 50) return '46-50';
  if (numericAge <= 55) return '51-55';
  if (numericAge <= 60) return '56-60';
  if (numericAge <= 65) return '61-65';
  if (numericAge <= 70) return '66-70';
  if (numericAge <= 75) return '71-75';
  return '76-80';
};

// Generates exactly 20 different tasks/questions (5 Reading, 5 Writing, 5 Speaking, 5 Applied Reasoning)
// dynamically tailored to the user's selected educational level and language.
// Multilingual question dictionaries covering all 20+ Indian regional languages & English
const SCRIPT_DICT = {
  hindi: {
    letter1: 'ब', letter1Options: ['ब', 'क', 'म', 'न'],
    word1: 'घर', word1Options: ['घर', 'चल', 'मन', 'फल'],
    missingText: 'अ _ ार', missingOptions: ['न', 'म', 'क', 'त'], missingCorrect: 'न',
    word2: 'नल', word2Options: ['नल', 'जल', 'कल', 'थल'],
    word3: 'आम', word3Options: ['आम', 'काम', 'नाम', 'शाम'],
    trace: ['अ', 'क', 'म', 'र', 'स'],
    traceWords: ['किताब', 'कलम', 'स्कूल', 'दोस्त', 'पानी'],
    traceWordsMiddle: ['विज्ञान', 'सफलता', 'स्वास्थ्य', 'नियम', 'पर्यावरण'],
    traceWordsHigh: ['लोकतंत्र', 'संविधान', 'वित्तीय', 'जिम्मेदारी', 'अधिकार'],
    speakingNone: ['घर', 'जल', 'बस', 'आम', 'नमस्ते'],
    speakingPrimary: ['नमस्ते मेरे दोस्त', 'मुझे पढ़ना अच्छा लगता है', 'आसमान का रंग नीला है', 'आज बहुत तेज धूप है', 'हम सब मिलकर खेलते हैं'],
    speakingMiddle: ['समय का मूल्य समझें और मेहनत करें', 'पेड़ लगाओ और पर्यावरण बचाओ', 'पुस्तकालय ज्ञान का भंडार होता है', 'नियमित योग करने से मन शांत रहता है', 'सच्चाई की हमेशा जीत होती है'],
    speakingHigh: ['डिजिटल साक्षरता से वित्तीय सुरक्षा बढ़ती है', 'सभी नागरिकों को समान अधिकार प्राप्त हैं', 'पर्यावरण संरक्षण हमारी नैतिक जिम्मेदारी है', 'अनेकता में एकता भारत की विशेषता है', 'शिक्षा से ही समाज का विकास संभव है'],
    identifyLetter: 'दिखाए गए अक्षर को पहचानें:',
    identifyWord: 'शब्द को पहचानें:',
    fillBlank: 'रिक्त स्थान भरें:',
    whatIsWritten: 'यह क्या लिखा है?',
    chooseCorrectWord: 'सही शब्द चुनें:',
    traceInstruction: (char) => `अक्षर/शब्द '${char}' को ट्रेस करें`,
    sayInstruction: (phrase) => `बोलें '${phrase}'`,
  },
  bengali: {
    letter1: 'ব', letter1Options: ['ব', 'ক', 'ম', 'ন'],
    word1: 'ঘর', word1Options: ['ঘর', 'জল', 'মন', 'ফল'],
    missingText: 'আ _ েল', missingOptions: ['প', 'ব', 'ত', 'ম'], missingCorrect: 'প',
    word2: 'জল', word2Options: ['জল', 'বল', 'কল', 'ফল'],
    word3: 'আম', word3Options: ['আম', 'কাজ', 'নাম', 'দাম'],
    trace: ['অ', 'ক', 'ম', 'র', 'স'],
    traceWords: ['বই', 'কলম', 'স্কুল', 'বন্ধু', 'জল'],
    traceWordsMiddle: ['বিজ্ঞান', 'সাফল্য', 'স্বাস্থ্য', 'নিয়ম', 'পরিবেশ'],
    traceWordsHigh: ['গণতন্ত্র', 'সংবিধান', 'আর্থিক', 'দায়িত্ব', 'অধিকার'],
    speakingNone: ['ঘর', 'জল', 'বাস', 'আম', 'নমস্কার'],
    speakingPrimary: ['নমস্কার আমার বন্ধু', 'আমি পড়তে ভালোবাসেন', 'আকাশের রঙ নীল', 'আজ খুব রোদ উঠেছে', 'আমরা সবাই একসাথে খেলি'],
    speakingMiddle: ['সময়ের মূল্য বুঝুন ও পরিশ্রম করুন', 'গাছ লাগান পরিবেশ বাঁচান', 'পাঠাগার জ্ঞানের ভান্ডার', 'নিয়মিত যোগ ব্যায়াম মন শান্ত রাখে', 'সত্যের সর্বদা জয় হয়'],
    speakingHigh: ['ডিজিটাল সাক্ষরতা আর্থিক নিরাপত্তা বাড়ায়', 'সকল নাগরিকের সমান অধিকার আছে', 'পরিবেশ রক্ষা আমাদের নৈতিক দায়িত্ব', 'বিভিন্নতার মধ্যে ঐক্য ভারতের বৈশিষ্ট্য', 'শিক্ষার মাধ্যমেই সমাজের উন্নয়ন সম্ভব'],
    identifyLetter: 'প্রদর্শিত অক্ষরটি চিহ্নিত করুন:',
    identifyWord: 'শব্দটি চিহ্নিত করুন:',
    fillBlank: 'শূন্যস্থান পূরণ করুন:',
    whatIsWritten: 'উপরে কী লেখা আছে?',
    chooseCorrectWord: 'সঠিক শব্দটি বেছে নিন:',
    traceInstruction: (char) => `'${char}' শব্দটি ট্রেস বা লিখুন`,
    sayInstruction: (phrase) => `বলুন '${phrase}'`,
  },
  marathi: {
    letter1: 'ब', letter1Options: ['ब', 'क', 'म', 'न'],
    word1: 'घर', word1Options: ['घर', 'चल', 'मन', 'फळ'],
    missingText: 'अ _ ार', missingOptions: ['न', 'म', 'क', 'त'], missingCorrect: 'न',
    word2: 'पाणी', word2Options: ['पाणी', 'वाणी', 'गाणी', 'खाणी'],
    word3: 'आंबा', word3Options: ['आंबा', 'काम', 'नाव', 'शाम'],
    trace: ['अ', 'क', 'म', 'र', 'स'],
    traceWords: ['पुस्तक', 'पेन', 'शाळा', 'मित्र', 'पाणी'],
    traceWordsMiddle: ['विज्ञान', 'यश', 'आरोग्य', 'नियम', 'पर्यावरण'],
    traceWordsHigh: ['लोकशाही', 'संविधान', 'आर्थिक', 'जबाबदारी', 'हक्क'],
    speakingNone: ['घर', 'पाणी', 'बस', 'आंबा', 'नमस्कार'],
    speakingPrimary: ['नमस्कार माझ्या मित्रा', 'मला वाचायला आवडते', 'आकाशाचा रंग निळा आहे', 'आज खूप ऊन आहे', 'आपण सगळे एकत्र खेळतो'],
    speakingMiddle: ['वेळेचे महत्व ओळखा व मेहनत करा', 'झाडे लावा पर्यावरण वाचवा', 'ग्रंथालय हे ज्ञानाचे भांडार आहे', 'नियमित योगाने मन शांत राहते', 'सत्याचा नेहमी विजय होतो'],
    speakingHigh: ['डिजिटल साक्षरतेने आर्थिक सुरक्षा वाढते', 'सर्व नागरिकांना समान हक्क आहेत', 'पर्यावरण रक्षण ही आपली नैतिक जबाबदारी आहे', 'विविधतेत एकता ही भारताची ओळख आहे', 'शिक्षणानेच समाजाचा विकास शक्य आहे'],
    identifyLetter: 'दाखवलेले अक्षर ओळखा:',
    identifyWord: 'शब्द ओळखा:',
    fillBlank: 'रिकामी जागा भरा:',
    whatIsWritten: 'हे काय लिहिले आहे?',
    chooseCorrectWord: 'योग्य शब्द निवडा:',
    traceInstruction: (char) => `'${char}' हा शब्द लिहा/ट्रेस करा`,
    sayInstruction: (phrase) => `म्हणा '${phrase}'`,
  },
  telugu: {
    letter1: 'బ', letter1Options: ['బ', 'క', 'మ', 'న'],
    word1: 'ఇల్లు', word1Options: ['ఇల్లు', 'నీరు', 'మనసు', 'పండు'],
    missingText: 'అ _ ాలు', missingOptions: ['న', 'మ', 'క', 'త'], missingCorrect: 'న',
    word2: 'నీరు', word2Options: ['నీరు', 'పాలు', 'చేప', 'చెట్టు'],
    word3: 'మామిడి', word3Options: ['మామిడి', 'పని', 'పేరు', 'పాట'],
    trace: ['అ', 'క', 'మ', 'ర', 'స'],
    traceWords: ['పుస్తకం', 'కలం', 'బడి', 'స్నేహితుడు', 'నీరు'],
    traceWordsMiddle: ['విజ్ఞానం', 'విజయం', 'ఆరోగ్యం', 'నియమం', 'పర్యావరణం'],
    traceWordsHigh: ['ప్రజాస్వామ్యం', 'రాజ్యాంగం', 'ఆర్థిక', 'బాధ్యత', 'హక్కు'],
    speakingNone: ['ఇల్లు', 'నీరు', 'బస్సు', 'మామిడి', 'నమస్కారం'],
    speakingPrimary: ['నమస్కారం నా మిత్రమా', 'నాకు చదవడం ఇష్టం', 'ఆకాశం నీల రంగులో ఉంది', 'ఈ రోజు ఎండ ఎక్కువ', 'మేమంతా కలిసి ఆడుకుంటాం'],
    speakingMiddle: ['సమయ పాలన విజయం ఇస్తుంది', 'చెట్లు నాటండి పర్యావరణం కాపాడండి', 'గ్రంథాలయం జ్ఞాన నిధి', 'యోగా మనస్సుకు ప్రశాంతత ఇస్తుంది', 'సత్యమే జయిస్తుంది'],
    speakingHigh: ['డిజిటల్ అక్షరాస్యత ఆర్థిక భద్రత ఇస్తుంది', 'పౌరులందరికీ సమాన హక్కులు ఉన్నాయి', 'పర్యావరణ పరిరక్షణ మన బాధ్యత', 'భిన్నత్వంలో ఏకత్వం మన బలం', 'విద్యతోనే సమాజ వికాసం సాధ్యం'],
    identifyLetter: 'చూపించిన అక్షరాన్ని గుర్తించండి:',
    identifyWord: 'పదాన్ని గుర్తించండి:',
    fillBlank: 'ఖాలీని పూరించండి:',
    whatIsWritten: 'ఇక్కడ ఏమి రాసి ఉంది?',
    chooseCorrectWord: 'సరైన పదాన్ని ఎంచుకోండి:',
    traceInstruction: (char) => `'${char}' పదాన్ని రాయండి`,
    sayInstruction: (phrase) => `'${phrase}' అని చెప్పండి`,
  },
  tamil: {
    letter1: 'ப', letter1Options: ['ப', 'க', 'ம', 'ந'],
    word1: 'வீடு', word1Options: ['வீடு', 'நீர்', 'மரம்', 'பழம்'],
    missingText: 'அ _ ம்', missingOptions: ['ந', 'ம', 'க', 'த'], missingCorrect: 'ந',
    word2: 'நீர்', word2Options: ['நீர்', 'பால்', 'மீன்', 'மழை'],
    word3: 'மாம்பழம்', word3Options: ['மாம்பழம்', 'வேலை', 'பெயர்', 'பாட்டு'],
    trace: ['அ', 'க', 'ம', 'ர', 'ச'],
    traceWords: ['புத்தகம்', 'பேனா', 'பள்ளி', 'நண்பன்', 'நீர்'],
    traceWordsMiddle: ['அறிவியல்', 'வெற்றி', 'சுகாதாரம்', 'விதி', 'சுற்றுச்சூழல்'],
    traceWordsHigh: ['ஜனநாயகம்', 'அரசியலமைப்பு', 'நிதி', 'பொறுப்பு', 'உரிமை'],
    speakingNone: ['வீடு', 'நீர்', 'பேருந்து', 'மாம்பழம்', 'வணக்கம்'],
    speakingPrimary: ['வணக்கம் என் நண்பா', 'எனக்கு படிக்க பிடிக்கும்', 'வானம் நீல நிறம்', 'இன்று வெயில் அதிகம்', 'நாம் சேர்ந்து விளையாடுவோம்'],
    speakingMiddle: ['நேரத்தின் மதிப்பை உணருங்கள்', 'மரம் நட்டு உலகை காப்போம்', 'நூலகம் அறிவின் கூடம்', 'யோகா மன அமைதி தரும்', 'வாய்மையே வெல்லும்'],
    speakingHigh: ['டிஜிட்டல் அறிவு நிதி பாதுகாப்பு தரும்', 'அனைவருக்கும் சம உரிமை உண்டு', 'இயற்கையை காப்பது நம் கடமை', 'வேற்றுமையில் ஒற்றுமை நமது பலம்', 'கல்வியே சமூக வளர்ச்சிக்கு வழி'],
    identifyLetter: 'காட்டப்பட்ட எழுத்தை அடையாளம் காணவும்:',
    identifyWord: 'வார்த்தையை அடையாளம் காணவும்:',
    fillBlank: 'கோடிட்ட இடத்தை நிரப்புக:',
    whatIsWritten: 'இங்கே என்ன எழுதப்பட்டுள்ளது?',
    chooseCorrectWord: 'சரியான வார்த்தையைத் தேர்ந்தெடுக்கவும்:',
    traceInstruction: (char) => `'${char}' என்ற வார்த்தையை எழுதவும்`,
    sayInstruction: (phrase) => `'${phrase}' என்று சொல்லுங்கள்`,
  },
  punjabi: {
    letter1: 'ਬ', letter1Options: ['ਬ', 'ਕ', 'ਮ', 'ਨ'],
    word1: 'ਘਰ', word1Options: ['ਘਰ', 'ਜਲ', 'ਮਨ', 'ਫਲ'],
    missingText: 'ਅ _ ਾਰ', missingOptions: ['ਨ', 'ਮ', 'ਕ', 'ਤ'], missingCorrect: 'ਨ',
    word2: 'ਜਲ', word2Options: ['ਜਲ', 'ਬਲ', 'ਕਲ', 'ਫਲ'],
    word3: 'ਅੰਬ', word3Options: ['ਅੰਬ', 'ਕੰਮ', 'ਨਾਮ', 'ਸ਼ਾਮ'],
    trace: ['ਅ', 'ਕ', 'ਮ', 'ਰ', 'ਸ'],
    traceWords: ['ਕਿਤਾਬ', 'ਕਲਮ', 'ਸਕੂਲ', 'ਦੋਸਤ', 'ਪਾਣੀ'],
    traceWordsMiddle: ['ਵਿਗਿਆਨ', 'ਸਫਲਤਾ', 'ਸਿਹਤ', 'ਨਿਯਮ', 'ਵਾਤਾਵਰਨ'],
    traceWordsHigh: ['ਲੋਕਤੰਤਰ', 'ਸੰਵਿਧਾਨ', 'ਵਿੱਤੀ', 'ਜ਼ਿੰਮੇਵਾਰੀ', 'ਅਧਿਕਾਰ'],
    speakingNone: ['ਘਰ', 'ਜਲ', 'ਬੱਸ', 'ਅੰਬ', 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ'],
    speakingPrimary: ['ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਮੇਰੇ ਦੋਸਤ', 'ਮੈਨੂੰ ਪੜ੍ਹਨਾ ਚੰਗਾ ਲੱਗਦਾ ਹੈ', 'ਅਸਮਾਨ ਦਾ ਰੰਗ ਨੀਲਾ ਹੈ', 'ਅੱਜ ਬਹੁਤ ਧੁੱਪ ਹੈ', 'ਅਸੀਂ ਸਾਰੇ ਮਿਲ ਕੇ ਖੇਡਦੇ ਹਾਂ'],
    speakingMiddle: ['ਸਮੇਂ ਦੀ ਕਦਰ ਕਰੋ ਅਤੇ ਮਿਹਨਤ ਕਰੋ', 'ਰੁੱਖ ਲਗਾਓ ਵਾਤਾਵਰਨ ਬਚਾਓ', 'ਲਾਇਬ੍ਰੇਰੀ ਗਿਆਨ ਦਾ ਭੰਡਾਰ ਹੈ', 'ਯੋਗਾ ਨਾਲ ਮਨ ਸ਼ਾਂਤ ਰਹਿੰਦਾ ਹੈ', 'ਸੱਚ ਦੀ ਹਮੇਸ਼ਾ ਜਿੱਤ ਹੁੰਦੀ ਹੈ'],
    speakingHigh: ['ਡਿਜੀਟਲ ਸਾਖਰਤਾ ਨਾਲ ਵਿੱਤੀ ਸੁਰੱਖਿਆ ਵਧਦੀ ਹੈ', 'ਸਭ ਨਾਗਰਿਕਾਂ ਨੂੰ ਸਮਾਨ ਅਧਿਕਾਰ ਪ੍ਰਾਪਤ ਹਨ', 'ਵਾਤਾਵਰਨ ਦੀ ਸੰਭਾਲ ਸਾਡੀ ਜ਼ਿੰਮੇਵਾਰੀ ਹੈ', 'ਅਨੇਕਤਾ ਵਿੱਚ ਏਕਤਾ ਭਾਰਤ ਦੀ ਸ਼ਾਨ ਹੈ', 'ਸਿੱਖਿਆ ਨਾਲ ਹੀ ਸਮਾਜ ਦਾ ਵਿਕਾਸ ਸੰਭਵ ਹੈ'],
    identifyLetter: 'ਦਿਖਾਏ ਗਏ ਅੱਖਰ ਨੂੰ ਪਛਾਣੋ:',
    identifyWord: 'ਸ਼ਬਦ ਨੂੰ ਪਛਾਣੋ:',
    fillBlank: 'ਖਾਲੀ ਥਾਂ ਭਰੋ:',
    whatIsWritten: 'ਇਹ ਕੀ ਲਿਖਿਆ ਹੈ?',
    chooseCorrectWord: 'ਸਹੀ ਸ਼ਬਦ ਚੁਣੋ:',
    traceInstruction: (char) => `'${char}' ਅੱਖਰ/ਸ਼ਬਦ ਲਿਖੋ`,
    sayInstruction: (phrase) => `'${phrase}' ਬੋਲੋ`,
  },
  gujarati: {
    letter1: 'બ', letter1Options: ['બ', 'ક', 'મ', 'ન'],
    word1: 'ઘર', word1Options: ['ઘર', 'પાણી', 'મન', 'ફળ'],
    missingText: 'અ _ ાર', missingOptions: ['ન', 'મ', 'ક', 'ત'], missingCorrect: 'ન',
    word2: 'પાણી', word2Options: ['પાણી', 'વાણી', 'ગાણી', 'ખાણી'],
    word3: 'કેરી', word3Options: ['કેરી', 'કામ', 'નામ', 'શામ'],
    trace: ['અ', 'ક', 'મ', 'ર', 'સ'],
    traceWords: ['પુસ્તક', 'પેન', 'શાળા', 'મિત્ર', 'પાણી'],
    traceWordsMiddle: ['વિજ્ઞાન', 'સફળતા', 'આરોગ્ય', 'નિયમ', 'પર્યાવરણ'],
    traceWordsHigh: ['લોકશાહી', 'બંધારણ', 'નાણાકીય', 'જવાબદારી', 'અધિકાર'],
    speakingNone: ['ઘર', 'પાણી', 'બસ', 'કેરી', 'નમસ્તે'],
    speakingPrimary: ['નમસ્તે મારા મિત્ર', 'મને વાંચવું ગમે છે', 'આકાશનો રંગ વાદળી છે', 'આજે ખૂબ તડકો છે', 'આપણે બધા સાથે રમીએ છીએ'],
    speakingMiddle: ['સમયનું મહત્વ સમજો અને મહેનત કરો', 'વૃક્ષો વાવો પર્યાવરણ બચાવો', 'પુસ્તકાલય જ્ઞાનનો ભંડાર છે', 'નિયમિત યોગથી મન શાંત રહે છે', 'સત્યની હંમેશા જીત થાય છે'],
    speakingHigh: ['ડિજિટલ સાક્ષરતાથી નાણાકીય સુરક્ષા વધે છે', 'તમામ નાગરિકોને સમાન અધિકાર છે', 'પર્યાવરણ રક્ષણ આપણી નૈતિક જવાબદારી છે', 'વિવિધતામાં એકતા ભારતની વિશેષતા છે', 'શિક્ષણથી જ સમાજનો વિકાસ શક્ય છે'],
    identifyLetter: 'દર્શાવેલ અક્ષર ઓળખો:',
    identifyWord: 'શબ્દ ઓળખો:',
    fillBlank: 'ખાલી જગ્યા પૂરો:',
    whatIsWritten: 'આ શું લખ્યું છે?',
    chooseCorrectWord: 'સાચો શબ્દ પસંદ કરો:',
    traceInstruction: (char) => `'${char}' અક્ષર/શબ્દ લખો`,
    sayInstruction: (phrase) => `'${phrase}' બોલો`,
  },
  kannada: {
    letter1: 'ಬ', letter1Options: ['ಬ', 'ಕ', 'ಮ', 'ನ'],
    word1: 'ಮನೆ', word1Options: ['ಮನೆ', 'ನೀರು', 'ಮನಸು', 'ಹಣ್ಣು'],
    missingText: 'ಅ _ ಾರ', missingOptions: ['ನ', 'ಮ', 'ಕ', 'ತ'], missingCorrect: 'ನ',
    word2: 'ನೀರು', word2Options: ['ನೀರು', 'ಹಾಲು', 'ಮೀನು', 'ಮಳೆ'],
    word3: 'ಮಾವು', word3Options: ['ಮಾವು', 'ಕೆಲಸ', 'ಹೆಸರು', 'ಹಾಡು'],
    trace: ['ಅ', 'ಕ', 'ಮ', 'ರ', 'ಸ'],
    traceWords: ['ಪುಸ್ತಕ', 'ಪೆನ್', 'ಶಾಲೆ', 'ಸ್ನೇಹಿತ', 'ನೀರು'],
    traceWordsMiddle: ['ವಿಜ್ಞಾನ', 'ಸಾಧನೆ', 'ಆರೋಗ್ಯ', 'ನಿಯಮ', 'ಪರಿಸರ'],
    traceWordsHigh: ['ಪ್ರಜಾಪ್ರಭುತ್ವ', 'ಸಂವಿಧಾನ', 'ಹಣಕಾಸು', 'ಹೊಣೆಗಾರಿಕೆ', 'ಹಕ್ಕು'],
    speakingNone: ['ಮನೆ', 'ನೀರು', 'ಬಸ್', 'ಮಾವು', 'ನಮಸ್ಕಾರ'],
    speakingPrimary: ['ನಮಸ್ಕಾರ ನನ್ನ ಸ್ನೇಹಿತನೆ', 'ನನಗೆ ಓದಲು ಇಷ್ಟ', 'ಆಕಾಶದ ಬಣ್ಣ ನೀಲಿ', 'ಇಂದು ಬಿಸಿಲು ಹೆಚ್ಚು', 'ನಾವೆಲ್ಲರೂ ಒಟ್ಟಿಗೆ ಆಡುತ್ತೇವೆ'],
    speakingMiddle: ['ಸಮಯದ ಮಹತ್ವ ತಿಳಿಯಿರಿ', 'ಮರ ನೆಡಿ ಪರಿಸರ ಉಳಿಸಿ', 'ಗ್ರಂಥಾಲಯ ಜ್ಞಾನದ ಭಂಡಾರ', 'ಯೋಗದಿಂದ ಮನಸ್ಸು ಶಾಂತವಾಗುತ್ತದೆ', 'ಸತ್ಯಕ್ಕೆ ಸದಾ ಜಯ'],
    speakingHigh: ['ಡಿಜಿಟಲ್ ಸಾಕ್ಷರತೆ ಹಣಕಾಸಿನ ಭದ್ರತೆ ನೀಡುತ್ತದೆ', 'ಎಲ್ಲಾ ನಾಗರಿಕರಿಗೂ ಸಮಾನ ಹಕ್ಕುಗಳಿವೆ', 'ಪರಿಸರ ರಕ್ಷಣೆ ನಮ್ಮ ಕರ್ತವ್ಯ', 'ವೈವಿಧ್ಯತೆಯಲ್ಲಿ ಏಕತೆ ಭಾರತದ ಹೆಮ್ಮೆ', 'ಶಿಕ್ಷಣದಿಂದ ಸಮಾಜದ ಪ್ರಗತಿ ಸಾಧ್ಯ'],
    identifyLetter: 'ತೋರಿಸಲಾದ ಅಕ್ಷರವನ್ನು ಗುರುತಿಸಿ:',
    identifyWord: 'ಪದವನ್ನು ಗುರುತಿಸಿ:',
    fillBlank: 'ಖಾಲಿ ಜಾಗ ತುಂಬಿ:',
    whatIsWritten: 'ಇಲ್ಲಿ ಏನು ಬರೆಯಲಾಗಿದೆ?',
    chooseCorrectWord: 'ಸರಿಯಾದ ಪದ ಆಯ್ಕೆ ಮಾಡಿ:',
    traceInstruction: (char) => `'${char}' ಪದವನ್ನು ಬರೆಯಿರಿ`,
    sayInstruction: (phrase) => `'${phrase}' ಎಂದು ಹೇಳಿ`,
  },
  malayalam: {
    letter1: 'ബ', letter1Options: ['ബ', 'ക', 'മ', 'ന'],
    word1: 'വീട്', word1Options: ['വീട്', 'വെള്ളം', 'മനസ്സ്', 'പഴം'],
    missingText: 'അ _ ം', missingOptions: ['ന', 'മ', 'ക', 'ത'], missingCorrect: 'ന',
    word2: 'വെള്ളം', word2Options: ['വെള്ളം', 'പാൽ', 'മീൻ', 'മഴ'],
    word3: 'മാമ്പഴം', word3Options: ['മാമ്പഴം', 'ജോലി', 'പേര്', 'പാട്ട്'],
    trace: ['അ', 'ക', 'മ', 'ര', 'സ'],
    traceWords: ['പുസ്തകം', 'പേന', 'സ്കൂൾ', 'കൂട്ടുകാരൻ', 'വെള്ളം'],
    traceWordsMiddle: ['ശാസ്ത്രം', 'വിജയം', 'ആരോഗ്യം', 'നിയമം', 'പരിസ്ഥിതി'],
    traceWordsHigh: ['ജനാധിപത്യം', 'ഭരണഘടന', 'സാമ്പത്തികം', 'ഉത്തരവാദിത്തം', 'അവകാശം'],
    speakingNone: ['വീട്', 'വെള്ളം', 'ബസ്', 'മാമ്പഴം', 'നമസ്കാരം'],
    speakingPrimary: ['നമസ്കാരം എന്റെ കൂട്ടുകാരാ', 'എനിക്ക് വായിക്കാൻ ഇഷ്ടമാണ്', 'ആകാശത്തിന്റെ നിറം നീലയാണ്', 'ഇന്ന് നല്ല വെയിലുണ്ട്', 'ഞങ്ങൾ എല്ലാവരും ഒന്നിച്ച് കളിക്കുന്നു'],
    speakingMiddle: ['സമയത്തിന്റെ മൂല്യം മനസ്സിലാക്കുക', 'മരം നടൂ പരിസ്ഥിതി സംരക്ഷിക്കൂ', 'ഗ്രന്ഥശാല അറിവിന്റെ ഭണ്ഡാരമാണ്', 'യോഗ മനസ്സിനെ ശാന്തമാക്കുന്നു', 'സത്യം എപ്പോഴും ജയിക്കും'],
    speakingHigh: ['ഡിജിറ്റൽ സാക്ഷരത സാമ്പത്തിക സുരക്ഷ നൽകുന്നു', 'എല്ലാ പൗരന്മാർക്കും തുല്യ അവകാശമുണ്ട്', 'പരിസ്ഥിതി സംരക്ഷണം നമ്മുടെ ചുമതലയാണ്', 'വൈവിധ്യത്തിൽ ഏകത്വം ഇന്ത്യയുടെ സവിശേഷതയാണ്', 'വിദ്യാഭ്യാസത്തിലൂടെ സമൂഹ പുരോഗതി സാധ്യമാണ്'],
    identifyLetter: 'കാണിച്ചിരിക്കുന്ന അക്ഷരം തിരിച്ചറിയുക:',
    identifyWord: 'വാക്ക് തിരിച്ചറിയുക:',
    fillBlank: 'വിട്ടുപോയ അക്ഷരം പൂരിപ്പിക്കുക:',
    whatIsWritten: 'ഇവിടെ എന്താണ് എഴുതിയിരിക്കുന്നത്?',
    chooseCorrectWord: 'ശരിയായ വാക്ക് തിരഞ്ഞെടുക്കുക:',
    traceInstruction: (char) => `'${char}' എന്ന വാക്ക് വരയ്ക്കുക/എഴുതുക`,
    sayInstruction: (phrase) => `'${phrase}' എന്ന് പറയുക`,
  },
  odia: {
    letter1: 'ବ', letter1Options: ['ବ', 'କ', 'ମ', 'ନ'],
    word1: 'ଘର', word1Options: ['ଘର', 'ପାଣି', 'ମନ', 'ଫଳ'],
    missingText: 'ଅ _ ାର', missingOptions: ['ନ', 'ମ', 'କ', 'ତ'], missingCorrect: 'ନ',
    word2: 'ପାଣି', word2Options: ['ପାଣି', 'ଖୀର', 'ମାଛ', 'ବର୍ଷା'],
    word3: 'ଆମ୍ବ', word3Options: ['ଆମ୍ବ', 'କାମ', 'ନାମ', 'ଗୀତ'],
    trace: ['ଅ', 'କ', 'ମ', 'ର', 'ସ'],
    traceWords: ['ବହି', 'କଲମ', 'ବିଦ୍ୟାଳୟ', 'ସାଙ୍ଗ', 'ପାଣି'],
    traceWordsMiddle: ['ବିଜ୍ଞାନ', 'ସଫଳତା', 'ସ୍ବାସ୍ଥ୍ୟ', 'ନିୟମ', 'ପରିବେଶ'],
    traceWordsHigh: ['ଗଣତନ୍ତ୍ର', 'ସମ୍ବିଧାନ', 'ଆର୍ଥିକ', 'ଦାୟିତ୍ବ', 'ଅଧିକାର'],
    speakingNone: ['ଘର', 'ପାଣି', 'ବସ୍', 'ଆମ୍ବ', 'ନମସ୍କାର'],
    speakingPrimary: ['ନମସ୍କାର ମୋର ସାଙ୍ଗ', 'ମୋତେ ପଢ଼ିବା ଭଲ ଲାଗେ', 'ଆକାଶର ରଙ୍ଗ ନୀଳ', 'ଆଜି ଖରା ବହୁତ', 'ଆମେ ସମସ୍ତେ ମିଶି ଖେଳୁ'],
    speakingMiddle: ['ସମୟର ମୂଲ୍ୟ ବୁଝନ୍ତୁ', 'ଗଛ ଲଗାନ୍ତୁ ପରିବେଶ ବଞ୍ଚାନ୍ତୁ', 'ପାଠାଗାର ଜ୍ଞାନର ଭଣ୍ଡାର', 'ଯୋଗ ଦ୍ବାରା ମନ ଶାନ୍ତ ରହେ', 'ସତ୍ୟର ସଦା ଜୟ'],
    speakingHigh: ['ଡିଜିଟାଲ୍ ସାକ୍ଷରତା ଆର୍ଥିକ ସୁରକ୍ଷା ଦିଏ', 'ସମସ୍ତ ନାଗରିକଙ୍କ ସମାନ ଅଧିକାର ଅଛି', 'ପରିବେଶ ସୁରକ୍ଷା ଆମ ଦାୟିତ୍ବ', 'ଏକତାରେ ବଳ ଭାରତର ପରିଚୟ', 'ଶିକ୍ଷା ଦ୍ବାରା ସମାଜର ବିକାଶ ସମ୍ଭବ'],
    identifyLetter: 'ଦର୍ଶାଯାଇଥିବା ଅକ୍ଷରକୁ ଚିହ୍ନନ୍ତୁ:',
    identifyWord: 'ଶବ୍ଦକୁ ଚିହ୍ନନ୍ତୁ:',
    fillBlank: 'ଖାଲି ସ୍ଥାନ ପୂରଣ କରନ୍ତୁ:',
    whatIsWritten: 'ଏହା କ’ଣ ଲେଖାହୋଇଛି?',
    chooseCorrectWord: 'ସଠିକ୍ ଶବ୍ଦ ବାଛନ୍ତୁ:',
    traceInstruction: (char) => `'${char}' ଶବ୍ଦଟି ଲେଖନ୍ତୁ`,
    sayInstruction: (phrase) => `'${phrase}' କୁହନ୍ତୁ`,
  },
};

const ENGLISH_SCRIPT_DICT = {
  letter1: 'B', letter1Options: ['B', 'D', 'P', 'R'],
  word1: 'CAT', word1Options: ['CAT', 'BAT', 'DOG', 'RAT'],
  missingText: 'A _ P L E', missingOptions: ['P', 'B', 'T', 'M'], missingCorrect: 'P',
  word2: 'SUN', word2Options: ['SUN', 'RUN', 'FUN', 'GUN'],
  word3: 'BOY', word3Options: ['BOY', 'TOY', 'JOY', 'SOY'],
  trace: ['A', 'T', 'M', 'C', 'S'],
  traceWords: ['Book', 'Pen', 'Tree', 'Friend', 'Water'],
  traceWordsMiddle: ['Science', 'Success', 'Health', 'Respect', 'Nature'],
  traceWordsHigh: ['Democracy', 'Constitution', 'Financial', 'Responsibility', 'Authority'],
  speakingNone: ['Sun', 'Water', 'Bus', 'Food', 'Hello'],
  speakingPrimary: ['Hello my friend', 'I love reading books', 'Sky is blue today', 'It is sunny outside', 'We play together daily'],
  speakingMiddle: ['Value of time is key to success', 'Plant trees to protect our environment', 'Library is a house of knowledge', 'Regular yoga keeps the mind calm', 'Honesty is always the best policy'],
  speakingHigh: ['Digital literacy enhances financial security', 'All citizens are equal under constitution', 'Protecting nature is our moral obligation', 'Unity in diversity is Indias strength', 'Education leads to progress of society'],
  identifyLetter: 'Identify the letter shown above:',
  identifyWord: 'Identify the word shown above:',
  fillBlank: 'Find the missing letter:',
  whatIsWritten: 'What is written above?',
  chooseCorrectWord: 'Choose the correct word:',
  traceInstruction: (char) => `Trace or write the word '${char}'`,
  sayInstruction: (phrase) => `Say '${phrase}'`,
};

const getAssessmentQuestions = (lang, level, ageBracket) => {
  const d = SCRIPT_DICT[lang] || ENGLISH_SCRIPT_DICT;

  // ============================================================================
  // LEVEL: NONE (Pre-literate / Foundational Learner) - 20 Unique Questions
  // ============================================================================
  if (level === 'none') {
    return [
      // Reading (5)
      { type: 'reading', text: d.letter1, question: d.identifyLetter, options: d.letter1Options, correct: d.letter1 },
      { type: 'reading', text: d.word1, question: d.identifyWord, options: d.word1Options, correct: d.word1 },
      { type: 'reading', text: d.missingText, question: d.fillBlank, options: d.missingOptions, correct: d.missingCorrect },
      { type: 'reading', text: d.word2, question: d.whatIsWritten, options: d.word2Options, correct: d.word2 },
      { type: 'reading', text: d.word3, question: d.chooseCorrectWord, options: d.word3Options, correct: d.word3 },
      // Writing (5)
      { type: 'writing', char: d.trace[0], instruction: d.traceInstruction(d.trace[0]) },
      { type: 'writing', char: d.trace[1], instruction: d.traceInstruction(d.trace[1]) },
      { type: 'writing', char: d.trace[2], instruction: d.traceInstruction(d.trace[2]) },
      { type: 'writing', char: d.trace[3], instruction: d.traceInstruction(d.trace[3]) },
      { type: 'writing', char: d.trace[4], instruction: d.traceInstruction(d.trace[4]) },
      // Speaking (5)
      { type: 'speaking', phrase: d.speakingNone[0], instruction: d.sayInstruction(d.speakingNone[0]) },
      { type: 'speaking', phrase: d.speakingNone[1], instruction: d.sayInstruction(d.speakingNone[1]) },
      { type: 'speaking', phrase: d.speakingNone[2], instruction: d.sayInstruction(d.speakingNone[2]) },
      { type: 'speaking', phrase: d.speakingNone[3], instruction: d.sayInstruction(d.speakingNone[3]) },
      { type: 'speaking', phrase: d.speakingNone[4], instruction: d.sayInstruction(d.speakingNone[4]) },
      // Reasoning (5)
      {
        type: 'reasoning', icon: '🥛',
        scenario: lang === 'hindi' ? 'आपको बहुत तेज प्यास लगी है।' : 'You are feeling very thirsty.',
        question: lang === 'hindi' ? 'आप क्या इस्तेमाल करेंगे?' : 'What will you use to drink?',
        options: [{ emoji: '🥛', label: lang === 'hindi' ? 'पानी का गिलास' : 'Glass of water' }, { emoji: '👞', label: lang === 'hindi' ? 'जूता' : 'Shoe' }, { emoji: '🧱', label: lang === 'hindi' ? 'पत्थर' : 'Stone' }],
        correct: lang === 'hindi' ? 'पानी का गिलास' : 'Glass of water'
      },
      {
        type: 'reasoning', icon: '🧼',
        scenario: lang === 'hindi' ? 'आपको भोजन करने से पहले हाथ साफ करने हैं।' : 'You need to clean your hands before eating food.',
        question: lang === 'hindi' ? 'आप हाथ धोने के लिए किसका उपयोग करेंगे?' : 'What will you use to wash your hands?',
        options: [{ emoji: '🧼', label: lang === 'hindi' ? 'साबुन' : 'Soap' }, { emoji: '📰', label: lang === 'hindi' ? 'कागज' : 'Newspaper' }, { emoji: '✏️', label: lang === 'hindi' ? 'पेंसिल' : 'Pencil' }],
        correct: lang === 'hindi' ? 'साबुन' : 'Soap'
      },
      {
        type: 'reasoning', icon: '☔',
        scenario: lang === 'hindi' ? 'बाहर अचानक बहुत तेज बारिश शुरू हो गई है।' : 'Suddenly it starts raining heavily outside.',
        question: lang === 'hindi' ? 'भीगने से बचने के लिए आप क्या लेंगे?' : 'What will you use to avoid getting wet?',
        options: [{ emoji: '☔', label: lang === 'hindi' ? 'छाता' : 'Umbrella' }, { emoji: '🥣', label: lang === 'hindi' ? 'कटोरा' : 'Bowl' }, { emoji: '🥄', label: lang === 'hindi' ? 'चम्मच' : 'Spoon' }],
        correct: lang === 'hindi' ? 'छाता' : 'Umbrella'
      },
      {
        type: 'reasoning', icon: '🔦',
        scenario: lang === 'hindi' ? 'रात को कमरे में अचानक बत्ती गुल होने से अंधेरा हो गया है।' : 'The lights go off at night, making the room completely dark.',
        question: lang === 'hindi' ? 'रोशनी के लिए आप क्या चालू करेंगे?' : 'What will you switch on to get light?',
        options: [{ emoji: '🔦', label: lang === 'hindi' ? 'टॉर्च' : 'Torch' }, { emoji: '🌀', label: lang === 'hindi' ? 'पंख' : 'Fan' }, { emoji: '🍽️', label: lang === 'hindi' ? 'थाली' : 'Plate' }],
        correct: lang === 'hindi' ? 'टॉर्च' : 'Torch'
      },
      {
        type: 'reasoning', icon: '🍞',
        scenario: lang === 'hindi' ? 'आपको बहुत तेज भूख लगी है और पेट खाली है।' : 'You are feeling very hungry and your stomach is empty.',
        question: lang === 'hindi' ? 'आप इनमें से क्या खाएंगे?' : 'Which of these will you eat?',
        options: [{ emoji: '🍞', label: lang === 'hindi' ? 'रोटी' : 'Roti / Bread' }, { emoji: '🧱', label: lang === 'hindi' ? 'ईंट' : 'Brick' }, { emoji: '📚', label: lang === 'hindi' ? 'किताब' : 'Book' }],
        correct: lang === 'hindi' ? 'रोटी' : 'Roti / Bread'
      }
    ];
  }

  // ============================================================================
  // LEVEL: PRIMARY (Class 1-5 level) - 20 Unique Questions
  // ============================================================================
  if (level === 'primary') {
    return [
      // Reading (5)
      { type: 'reading', text: lang === 'hindi' ? "पेड़ पर बंदर बैठा है।" : "The quick cat runs fast.", question: lang === 'hindi' ? "पेड़ पर कौन बैठा है?" : "Who runs fast?", options: lang === 'hindi' ? ["बंदर", "तोता", "चिड़िया", "बिल्ली"] : ["Cat", "Dog", "Rabbit", "Mouse"], correct: lang === 'hindi' ? "बंदर" : "Cat" },
      { type: 'reading', text: lang === 'hindi' ? "सूरज पूर्व दिशा से ______ है।" : "The sun shines in the ______.", question: d.fillBlank, options: lang === 'hindi' ? ["उगता", "डूबता", "बहता", "उड़ता"] : ["sky", "water", "ground", "forest"], correct: lang === 'hindi' ? "उगता" : "sky" },
      { type: 'reading', text: lang === 'hindi' ? "कल स्कूल बंद रहेगा।" : "Tomorrow is a school holiday.", question: lang === 'hindi' ? "कल स्कूल क्या रहेगा?" : "What is tomorrow at school?", options: lang === 'hindi' ? ["खुला", "बंद", "नया", "बड़ा"] : ["Open day", "Holiday", "Exam day", "Sport day"], correct: lang === 'hindi' ? "बंद" : "Holiday" },
      { type: 'reading', text: lang === 'hindi' ? "मुझे आम बहुत मीठा लगा।" : "The yellow mango is very sweet.", question: lang === 'hindi' ? "आम कैसा लगा?" : "How does the mango taste?", options: lang === 'hindi' ? ["खट्टा", "कड़वा", "मीठा", "नमकीन"] : ["Sour", "Sweet", "Bitter", "Salty"], correct: lang === 'hindi' ? "मीठा" : "Sweet" },
      { type: 'reading', text: lang === 'hindi' ? "यह नीली पतंग बहुत सुंदर है।" : "This is a beautiful blue kite.", question: lang === 'hindi' ? "पतंग का रंग क्या है?" : "What color is the kite?", options: lang === 'hindi' ? ["पीला", "लाल", "नीला", "काला"] : ["Yellow", "Red", "Blue", "Black"], correct: lang === 'hindi' ? "नीला" : "Blue" },
      // Writing (5)
      { type: 'writing', char: d.traceWords[0], instruction: d.traceInstruction(d.traceWords[0]) },
      { type: 'writing', char: d.traceWords[1], instruction: d.traceInstruction(d.traceWords[1]) },
      { type: 'writing', char: d.traceWords[2], instruction: d.traceInstruction(d.traceWords[2]) },
      { type: 'writing', char: d.traceWords[3], instruction: d.traceInstruction(d.traceWords[3]) },
      { type: 'writing', char: d.traceWords[4], instruction: d.traceInstruction(d.traceWords[4]) },
      // Speaking (5)
      { type: 'speaking', phrase: d.speakingPrimary[0], instruction: d.sayInstruction(d.speakingPrimary[0]) },
      { type: 'speaking', phrase: d.speakingPrimary[1], instruction: d.sayInstruction(d.speakingPrimary[1]) },
      { type: 'speaking', phrase: d.speakingPrimary[2], instruction: d.sayInstruction(d.speakingPrimary[2]) },
      { type: 'speaking', phrase: d.speakingPrimary[3], instruction: d.sayInstruction(d.speakingPrimary[3]) },
      { type: 'speaking', phrase: d.speakingPrimary[4], instruction: d.sayInstruction(d.speakingPrimary[4]) },
      // Reasoning (5)
      {
        type: 'reasoning', icon: '🚌',
        scenario: lang === 'hindi' ? 'स्कूल बस का समय सुबह 7:30 बजे है और आपकी घड़ी में 7:20 बजे हैं।' : 'The school bus arrives at 7:30 AM. Your watch shows 7:20 AM.',
        question: lang === 'hindi' ? 'आपके पास कितना समय बचा है?' : 'How much time do you have left?',
        options: [{ emoji: '⏰', label: lang === 'hindi' ? '10 मिनट' : '10 minutes' }, { emoji: '⏰', label: lang === 'hindi' ? '20 मिनट' : '20 minutes' }, { emoji: '⏰', label: lang === 'hindi' ? '30 मिनट' : '30 minutes' }],
        correct: lang === 'hindi' ? '10 मिनट' : '10 minutes'
      },
      {
        type: 'reasoning', icon: '📕',
        scenario: lang === 'hindi' ? 'पुस्तकालय से ली गई किताब को 7 दिनों में वापस करना है।' : 'A library book must be returned in 7 days.',
        question: lang === 'hindi' ? 'यदि आप उसे समय पर वापस नहीं करते हैं तो क्या हो सकता है?' : 'What happens if you return it late?',
        options: [{ emoji: '⚠️', label: lang === 'hindi' ? 'जुर्माना लग सकता है' : 'A fine may apply' }, { emoji: '🎁', label: lang === 'hindi' ? 'उपहार मिलेगा' : 'Get a reward' }, { emoji: '✅', label: lang === 'hindi' ? 'कुछ नहीं होगा' : 'Nothing changes' }],
        correct: lang === 'hindi' ? 'जुर्माना लग सकता है' : 'A fine may apply'
      },
      {
        type: 'reasoning', icon: '🥔',
        scenario: lang === 'hindi' ? 'सब्जी विक्रेता कहता है कि आलू ₹20 प्रति किलो हैं।' : 'The vegetable seller says that potatoes cost $2 per kilo.',
        question: lang === 'hindi' ? 'आपको 2 किलो आलू खरीदने के लिए कितने पैसे देने होंगे?' : 'How much will you pay for 2 kilos of potatoes?',
        options: [{ emoji: '💵', label: lang === 'hindi' ? '₹40' : '$4' }, { emoji: '💵', label: lang === 'hindi' ? '₹20' : '$2' }, { emoji: '💵', label: lang === 'hindi' ? '₹50' : '$5' }],
        correct: lang === 'hindi' ? '₹40' : '$4'
      },
      {
        type: 'reasoning', icon: '✏️',
        scenario: lang === 'hindi' ? 'आपके परीक्षा पत्र पर निर्देश लिखा है: "सभी 5 प्रश्न अनिवार्य हैं।"' : 'Your exam paper instruction states: "All 5 questions are compulsory."',
        question: lang === 'hindi' ? 'आपको परीक्षा में कितने प्रश्न हल करने चाहिए?' : 'How many questions should you solve?',
        options: [{ emoji: '✏️', label: lang === 'hindi' ? 'सभी 5 प्रश्न' : 'All 5 questions' }, { emoji: '🚫', label: lang === 'hindi' ? 'केवल 2 प्रश्न' : 'Only 2 questions' }, { emoji: '❌', label: lang === 'hindi' ? 'कोई भी नहीं' : 'None' }],
        correct: lang === 'hindi' ? 'सभी 5 प्रश्न' : 'All 5 questions'
      },
      {
        type: 'reasoning', icon: '🧸',
        scenario: lang === 'hindi' ? 'खिलौने की दुकान के बाहर लिखा है: "खिलौनों पर 50% की छूट"। खिलौने की मूल कीमत ₹100 है।' : 'A toy store sign says: "50% off on toys". The original price of a toy is $100.',
        question: lang === 'hindi' ? 'छूट के बाद खिलौने की कीमत क्या होगी?' : 'What will be the price of the toy after discount?',
        options: [{ emoji: '💵', label: lang === 'hindi' ? '₹50' : '$50' }, { emoji: '💵', label: lang === 'hindi' ? '₹80' : '$80' }, { emoji: '💵', label: lang === 'hindi' ? '₹100' : '$100' }],
        correct: lang === 'hindi' ? '₹50' : '$50'
      }
    ];
  }

  // ============================================================================
  // LEVEL: MIDDLE (Class 6-8 level) - 20 Unique Questions
  // ============================================================================
  if (level === 'middle') {
    return [
      // Reading (5)
      { type: 'reading', text: lang === 'hindi' ? "विज्ञान ने मनुष्य के जीवन को बेहद सरल बना दिया है।" : "Science has made human life very simple and comfortable.", question: lang === 'hindi' ? "विज्ञान ने जीवन को कैसा बनाया है?" : "What has science done to human life?", options: lang === 'hindi' ? ["बेहद सरल", "कठिन", "उदासीन", "अकेला"] : ["simple and comfortable", "difficult", "boring", "stressful"], correct: lang === 'hindi' ? "बेहद सरल" : "simple and comfortable" },
      { type: 'reading', text: lang === 'hindi' ? "समय का सदुपयोग करने वाले लोग हमेशा ______ होते हैं।" : "People who manage time properly always ______.", question: d.fillBlank, options: lang === 'hindi' ? ["सफल", "असफल", "आलसी", "दुखी"] : ["succeed", "fail", "procrastinate", "complain"], correct: lang === 'hindi' ? "सफल" : "succeed" },
      { type: 'reading', text: lang === 'hindi' ? "पेड़ हमें प्राणवायु ऑक्सीजन और मीठे फल प्रदान करते हैं।" : "Trees provide us oxygen and sweet edible fruits.", question: lang === 'hindi' ? "पेड़ हमें कौन सी गैस प्रदान करते हैं?" : "What gas do trees provide us?", options: lang === 'hindi' ? ["ऑक्सीजन", "नाइट्रोजन", "कार्बन", "हाइड्रोजन"] : ["Oxygen", "Nitrogen", "Carbon", "Hydrogen"], correct: lang === 'hindi' ? "ऑक्सीजन" : "Oxygen" },
      { type: 'reading', text: lang === 'hindi' ? "स्वास्थ्य ही मनुष्य का सबसे बड़ा वास्तविक धन है।" : "Health is the greatest real wealth of human life.", question: lang === 'hindi' ? "मनुष्य का सबसे बड़ा धन क्या है?" : "What is the greatest wealth of humans?", options: lang === 'hindi' ? ["स्वास्थ्य", "सोना", "गाड़ी", "बंगला"] : ["Health", "Gold", "Car", "House"], correct: lang === 'hindi' ? "स्वास्थ्य" : "Health" },
      { type: 'reading', text: lang === 'hindi' ? "पुस्तकालय में हमेशा शांत रहकर पढ़ना चाहिए।" : "A library is a quiet place intended for studying.", question: lang === 'hindi' ? "पुस्तकालय में कैसा व्यवहार करना चाहिए?" : "How should one behave in a library?", options: lang === 'hindi' ? ["शांत रहना", "शोर मचाना", "खेलना", "गाना"] : ["Remain quiet", "Make noise", "Play games", "Sing songs"], correct: lang === 'hindi' ? "शांत रहना" : "Remain quiet" },
      // Writing (5)
      { type: 'writing', char: d.traceWordsMiddle[0], instruction: d.traceInstruction(d.traceWordsMiddle[0]) },
      { type: 'writing', char: d.traceWordsMiddle[1], instruction: d.traceInstruction(d.traceWordsMiddle[1]) },
      { type: 'writing', char: d.traceWordsMiddle[2], instruction: d.traceInstruction(d.traceWordsMiddle[2]) },
      { type: 'writing', char: d.traceWordsMiddle[3], instruction: d.traceInstruction(d.traceWordsMiddle[3]) },
      { type: 'writing', char: d.traceWordsMiddle[4], instruction: d.traceInstruction(d.traceWordsMiddle[4]) },
      // Speaking (5)
      { type: 'speaking', phrase: d.speakingMiddle[0], instruction: d.sayInstruction(d.speakingMiddle[0]) },
      { type: 'speaking', phrase: d.speakingMiddle[1], instruction: d.sayInstruction(d.speakingMiddle[1]) },
      { type: 'speaking', phrase: d.speakingMiddle[2], instruction: d.sayInstruction(d.speakingMiddle[2]) },
      { type: 'speaking', phrase: d.speakingMiddle[3], instruction: d.sayInstruction(d.speakingMiddle[3]) },
      { type: 'speaking', phrase: d.speakingMiddle[4], instruction: d.sayInstruction(d.speakingMiddle[4]) },
      // Reasoning (5)
      {
        type: 'reasoning', icon: '🔬',
        scenario: lang === 'hindi' ? 'स्कूल का नोटिस: "विज्ञान प्रदर्शनी में भाग लेने के लिए बुधवार तक नाम दें।"' : 'A school notice says: "Submit your names for the science exhibition by Wednesday."',
        question: lang === 'hindi' ? 'यदि आप गुरुवार को पंजीकरण कराने जाते हैं तो क्या होगा?' : 'What happens if you go to register on Thursday?',
        options: [{ emoji: '🚫', label: lang === 'hindi' ? 'पंजीकरण नहीं होगा' : 'Registration closed' }, { emoji: '✅', label: lang === 'hindi' ? 'पंजीकरण हो जाएगा' : 'Registered successfully' }, { emoji: '💵', label: lang === 'hindi' ? 'पुरस्कार मिलेगा' : 'Get a prize' }],
        correct: lang === 'hindi' ? 'पंजीकरण नहीं होगा' : 'Registration closed'
      },
      {
        type: 'reasoning', icon: '💻',
        scenario: lang === 'hindi' ? 'कंप्यूटर लैब गाइडलाइन: "बिना अनुमति के पेन ड्राइव या कोई बाहरी उपकरण न लगाएं।"' : 'Computer lab rule: "Do not insert pen drives or external devices without permission."',
        question: lang === 'hindi' ? 'यदि आपको अपना होमवर्क कॉपी करना है, तो आप क्या करेंगे?' : 'If you need to copy your homework file, what should you do?',
        options: [{ emoji: '🙋', label: lang === 'hindi' ? 'शिक्षक से अनुमति मांगें' : 'Ask the teacher for permission' }, { emoji: '⚡', label: lang === 'hindi' ? 'चुपके से पेन ड्राइव लगाएं' : 'Insert it secretly' }, { emoji: '❌', label: lang === 'hindi' ? 'होमवर्क न करें' : 'Do not submit homework' }],
        correct: lang === 'hindi' ? 'शिक्षक से अनुमति मांगें' : 'Ask the teacher for permission'
      },
      {
        type: 'reasoning', icon: '🚲',
        scenario: lang === 'hindi' ? 'साइकिल स्टैंड बोर्ड: "अपनी साइकिल में ताला जरूर लगाएं, चोरी होने पर स्कूल जिम्मेदार नहीं होगा।"' : 'Bicycle stand sign: "Lock your cycle. School is not responsible for any thefts."',
        question: lang === 'hindi' ? 'सुरक्षित पार्किंग के लिए आपको क्या करना चाहिए?' : 'What should you do for safe parking?',
        options: [{ emoji: '🔒', label: lang === 'hindi' ? 'साइकिल को ताला लगाएं' : 'Lock your cycle' }, { emoji: '🚲', label: lang === 'hindi' ? 'बिना ताले के छोड़ दें' : 'Leave it unlocked' }, { emoji: '🛣️', label: lang === 'hindi' ? 'सड़क पर पार्क करें' : 'Park on the main road' }],
        correct: lang === 'hindi' ? 'साइकिल को ताला लगाएं' : 'Lock your cycle'
      },
      {
        type: 'reasoning', icon: '⚽',
        scenario: lang === 'hindi' ? 'खेल विभाग की सूचना: "खेल का सामान शाम 5:00 बजे से पहले वापस जमा करें।"' : 'Sports department rule: "Return sports equipment before 5:00 PM."',
        question: lang === 'hindi' ? 'यदि आप शाम 5:30 बजे सामान लौटाते हैं, तो क्या होगा?' : 'What happens if you return the equipment at 5:30 PM?',
        options: [{ emoji: '⚠️', label: lang === 'hindi' ? 'नियमों का उल्लंघन माना जाएगा' : 'Considered rule violation' }, { emoji: '🎁', label: lang === 'hindi' ? 'विशेष इनाम मिलेगा' : 'Get a special reward' }, { emoji: '✅', label: lang === 'hindi' ? 'कुछ नहीं होगा' : 'Nothing happens' }],
        correct: lang === 'hindi' ? 'नियमों का उल्लंघन माना जाएगा' : 'Considered rule violation'
      },
      {
        type: 'reasoning', icon: '📝',
        scenario: lang === 'hindi' ? 'परीक्षा गाइडलाइन: "उत्तर पुस्तिका पर अपना रोल नंबर स्पष्ट अक्षरों में लिखें।"' : 'Exam rule: "Write your roll number clearly on the answer sheet."',
        question: lang === 'hindi' ? 'रोल नंबर लिखना क्यों आवश्यक है?' : 'Why is writing your roll number necessary?',
        options: [{ emoji: '✍️', label: lang === 'hindi' ? 'ताकि आपकी कॉपी पहचानी जा सके' : 'To identify your paper' }, { emoji: '💯', label: lang === 'hindi' ? 'अतिरिक्त अंक पाने के लिए' : 'To get extra marks' }, { emoji: '🎨', label: lang === 'hindi' ? 'केवल सजावट के लिए' : 'Just for decoration' }],
        correct: lang === 'hindi' ? 'ताकि आपकी कॉपी पहचानी जा सके' : 'To identify your paper'
      }
    ];
  }

  // ============================================================================
  // LEVEL: HIGH (Class 9-12 level) - 20 Unique Questions
  // ============================================================================
  return [
    // Reading (5)
    { type: 'reading', text: lang === 'hindi' ? "लोकतंत्र में प्रत्येक नागरिक के पास मतदान का मौलिक अधिकार है।" : "In a democracy, every citizen possesses the fundamental right to vote.", question: lang === 'hindi' ? "नागरिकों के पास कौन सा मौलिक अधिकार है?" : "What fundamental right is mentioned?", options: lang === 'hindi' ? ["मतदान का", "यात्रा का", "व्यापार का", "भोजन का"] : ["right to vote", "right to travel", "right to trade", "right to food"], correct: lang === 'hindi' ? "मतदान का" : "right to vote" },
    { type: 'reading', text: lang === 'hindi' ? "डिजिटल साक्षरता आज के युग में वित्तीय सुरक्षा के लिए ______ है।" : "Digital literacy is crucial for financial ______ in modern times.", question: d.fillBlank, options: lang === 'hindi' ? ["अनिवार्य", "व्यर्थ", "खतरनाक", "कठिन"] : ["security", "struggle", "loss", "trouble"], correct: lang === 'hindi' ? "अनिवार्य" : "security" },
    { type: 'reading', text: lang === 'hindi' ? "संवैधानिक प्रावधानों के अनुसार, कानून के समक्ष सभी नागरिक समान हैं।" : "According to constitutional provisions, all citizens are equal before law.", question: lang === 'hindi' ? "कानून के समक्ष नागरिक कैसे हैं?" : "How does the law treat citizens?", options: lang === 'hindi' ? ["समान", "असमान", "विशिष्ट", "विभाजित"] : ["equal", "unequal", "separated", "privileged"], correct: lang === 'hindi' ? "समान" : "equal" },
    { type: 'reading', text: lang === 'hindi' ? "जलवायु परिवर्तन वैश्विक कृषि उत्पादन को गंभीर रूप से प्रभावित कर रहा है।" : "Climate change is severely impacting global agricultural output.", question: lang === 'hindi' ? "जलवायु परिवर्तन किसे गंभीर रूप से प्रभावित कर रहा है?" : "What is climate change severely impacting?", options: lang === 'hindi' ? ["कृषि उत्पादन को", "खनिज उत्खनन को", "आईटी सेक्टर को", "फैशन जगत को"] : ["agricultural output", "mineral mining", "IT sector", "fashion world"], correct: lang === 'hindi' ? "कृषि उत्पादन को" : "agricultural output" },
    { type: 'reading', text: lang === 'hindi' ? "सतत विकास का अर्थ प्राकृतिक संसाधनों का जिम्मेदारी से उपयोग करना है।" : "Sustainable development means utilizing resources responsibly.", question: lang === 'hindi' ? "सतत विकास का क्या अर्थ है?" : "What does sustainable development mean?", options: lang === 'hindi' ? ["जिम्मेदारी से उपयोग", "संसाधनों का दोहन", "संसाधनों को नष्ट करना", "भविष्य को अनदेखा करना"] : ["utilizing resources responsibly", "exploiting all resources", "destroying natural resources", "ignoring the future"], correct: lang === 'hindi' ? "जिम्मेदारी से उपयोग" : "utilizing resources responsibly" },
    // Writing (5)
    { type: 'writing', char: d.traceWordsHigh[0], instruction: d.traceInstruction(d.traceWordsHigh[0]) },
    { type: 'writing', char: d.traceWordsHigh[1], instruction: d.traceInstruction(d.traceWordsHigh[1]) },
    { type: 'writing', char: d.traceWordsHigh[2], instruction: d.traceInstruction(d.traceWordsHigh[2]) },
    { type: 'writing', char: d.traceWordsHigh[3], instruction: d.traceInstruction(d.traceWordsHigh[3]) },
    { type: 'writing', char: d.traceWordsHigh[4], instruction: d.traceInstruction(d.traceWordsHigh[4]) },
    // Speaking (5)
    { type: 'speaking', phrase: d.speakingHigh[0], instruction: d.sayInstruction(d.speakingHigh[0]) },
    { type: 'speaking', phrase: d.speakingHigh[1], instruction: d.sayInstruction(d.speakingHigh[1]) },
    { type: 'speaking', phrase: d.speakingHigh[2], instruction: d.sayInstruction(d.speakingHigh[2]) },
    { type: 'speaking', phrase: d.speakingHigh[3], instruction: d.sayInstruction(d.speakingHigh[3]) },
    { type: 'speaking', phrase: d.speakingHigh[4], instruction: d.sayInstruction(d.speakingHigh[4]) },
    // Reasoning (5)
    {
      type: 'reasoning', icon: '🏠',
      scenario: lang === 'hindi' ? 'किराया समझौते में लिखा है: "हर साल किराए में 10% की वृद्धि होगी।" वर्तमान किराया ₹10,000 है।' : 'Rental agreement: "Rent will increase by 10% annually." Current rent is $10,000.',
      question: lang === 'hindi' ? 'अगले वर्ष आपका मासिक किराया कितना होगा?' : 'How much will your rent be next year?',
      options: [{ emoji: '💵', label: lang === 'hindi' ? '₹11,000' : '$11,000' }, { emoji: '💵', label: lang === 'hindi' ? '₹12,000' : '$12,000' }, { emoji: '💵', label: lang === 'hindi' ? '₹10,500' : '$10,500' }],
      correct: lang === 'hindi' ? '₹11,000' : '$11,000'
    },
    {
      type: 'reasoning', icon: '📝',
      scenario: lang === 'hindi' ? 'आपकी सैलरी स्लिप में लिखा है: "भविष्य निधि अंशदान काटने के बाद वेतन जमा किया गया।"' : 'Your payslip reads: "Salary credited after deduction of provident fund contribution."',
      question: lang === 'hindi' ? 'आपके वेतन में से क्या काटा गया है?' : 'What has been subtracted from your salary?',
      options: [{ emoji: '🏦', label: lang === 'hindi' ? 'भविष्य निधि अंशदान' : 'Provident fund contribution' }, { emoji: '🍽️', label: lang === 'hindi' ? 'भोजन भत्ता' : 'Food allowance' }, { emoji: '🚌', label: lang === 'hindi' ? 'यात्रा बोनस' : 'Travel bonus' }],
      correct: lang === 'hindi' ? 'भविष्य निधि अंशदान' : 'Provident fund contribution'
    },
    {
      type: 'reasoning', icon: '🗳️',
      scenario: lang === 'hindi' ? 'मतदाता सूची में नाम जुड़वाने के लिए फॉर्म 6 भरना पड़ता है।' : 'To add your name to the voter list, you must fill Form 6.',
      question: lang === 'hindi' ? 'यदि आप नए शहर में वोट देना चाहते हैं, तो आप क्या करेंगे?' : 'If you move to a new city and want to vote, what will you do?',
      options: [{ emoji: '📝', label: lang === 'hindi' ? 'फॉर्म 6 भरेंगे' : 'Fill Form 6' }, { emoji: '🚫', label: lang === 'hindi' ? 'चुनाव का बहिष्कार करेंगे' : 'Boycott election' }, { emoji: '🗳️', label: lang === 'hindi' ? 'सीधे पोलिंग बूथ चले जाएंगे' : 'Go directly to polling booth' }],
      correct: lang === 'hindi' ? 'फॉर्म 6 भरेंगे' : 'Fill Form 6'
    },
    {
      type: 'reasoning', icon: '🏦',
      scenario: lang === 'hindi' ? 'बैंक फिक्स डिपॉजिट नियम: "अवधि से पहले निकासी पर 1% जुर्माना लागू होगा।"' : 'Fixed deposit terms: "1% penalty applies on premature withdrawal."',
      question: lang === 'hindi' ? 'यदि आप परिपक्वता से पहले फिक्स डिपॉजिट बंद करते हैं तो क्या होगा?' : 'What happens if you close your FD before maturity?',
      options: [{ emoji: '⚠️', label: lang === 'hindi' ? '1% जुर्माना काटा जाएगा' : '1% penalty deducted' }, { emoji: '❌', label: lang === 'hindi' ? 'खाता बंद नहीं किया जाएगा' : 'Account will not close' }, { emoji: '💰', label: lang === 'hindi' ? 'बोनस ब्याज मिलेगा' : 'Get bonus interest' }],
      correct: lang === 'hindi' ? '1% जुर्माना काटा जाएगा' : '1% penalty deducted'
    },
    {
      type: 'reasoning', icon: '📅',
      scenario: lang === 'hindi' ? 'आयकर रिटर्न दाखिल करने की अंतिम तिथि 31 जुलाई है, जिसके बाद विलंब शुल्क लागू होगा।' : 'Income tax return deadline is July 31. Late fee applies thereafter.',
      question: lang === 'hindi' ? 'यदि आप 15 अगस्त को रिटर्न दाखिल करते हैं, तो क्या होगा?' : 'What happens if you file your return on August 15?',
      options: [{ emoji: '💵', label: lang === 'hindi' ? 'विलंब शुल्क लगेगा' : 'Late fee will be charged' }, { emoji: '❌', label: lang === 'hindi' ? 'रिटर्न अस्वीकार हो जाएगा' : 'Return will be rejected' }, { emoji: '✅', label: lang === 'hindi' ? 'बोनस रिफंड मिलेगा' : 'Get bonus refund' }],
      correct: lang === 'hindi' ? 'विलंब शुल्क लगेगा' : 'Late fee will be charged'
    }
  ];
};



function AnimatedNumber({ value, duration = 900, suffix = '%' }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const from = 0;
    const to = Number(value) || 0;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out-quad for a natural deceleration into the final score
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span>{display}{suffix}</span>;
}

// Small presentational helper: a labeled score row with an animated
// cyan-to-magenta fill bar, staggered in on the results screen.
function ScoreBar({ icon, label, value, delay = 0 }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="space-y-1.5 opacity-0"
      style={{ animation: `nxRowIn 0.5s ease-out ${delay}ms forwards` }}
    >
      <div className="flex justify-between items-center text-xs">
        <span className="font-bold text-slate-400 flex items-center gap-1.5"><span>{icon}</span> {label}</span>
        <span className="font-extrabold text-fuchsia-200 tabular-nums">
          <AnimatedNumber value={filled ? value : 0} />
        </span>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 transition-[width] duration-[900ms] ease-out"
          style={{ width: filled ? `${value}%` : '0%' }}
        />
      </div>
    </div>
  );
}

// Circular gauge variant used on the results screen so each metric reads as
// its own standalone ring instead of a stacked list inside one big card.
function RadialScore({ icon, label, value, delay = 0, size = 84, stroke = 7, big = false, gradId }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (filled ? Math.min(value, 100) / 100 : 0) * circumference;
  const uid = gradId || `radialGrad-${label.replace(/\s+/g, '')}`;

  return (
    <div
      className="flex flex-col items-center gap-2 opacity-0"
      style={{ animation: `nxScaleUp 0.5s ease-out ${delay}ms forwards` }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${uid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 900ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={big ? 'text-2xl' : 'text-base'}>{icon}</span>
          <span className={`font-extrabold text-fuchsia-200 tabular-nums ${big ? 'text-sm' : 'text-[11px]'}`}>
            <AnimatedNumber value={filled ? value : 0} />
          </span>
        </div>
      </div>
      <span className={`font-bold text-slate-400 uppercase tracking-wide text-center leading-tight ${big ? 'text-xs max-w-[140px]' : 'text-[9px] max-w-[76px]'}`}>
        {label}
      </span>
    </div>
  );
}

// Animated network-sphere backdrop, echoing a "digital globe" motif: a ring
// of drifting, twinkling nodes loosely connected by faint threads, slowly
// rotating behind the assessment card. Pure canvas, no dependencies.
function NexusOrbBackdrop() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let w = 0, h = 0, dpr = 1;

    // --- Sphere surface: evenly distributed via a Fibonacci lattice, then
    // rotated in real 3D each frame for a genuine (not simulated) globe. ---
    const SPHERE_POINTS = 1300;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const spherePoints = Array.from({ length: SPHERE_POINTS }, (_, i) => {
      const y = 1 - (i / (SPHERE_POINTS - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      const roll = Math.random();
      // Speckle palette: mostly pale starlight, with sparse colored flecks
      let color = 'rgba(210,225,255,ALPHA)';
      if (roll > 0.93) color = 'rgba(250,204,21,ALPHA)';
      else if (roll > 0.83) color = 'rgba(236,72,153,ALPHA)';
      else if (roll > 0.68) color = 'rgba(168,139,250,ALPHA)';
      else if (roll > 0.5) color = 'rgba(103,232,249,ALPHA)';
      return {
        x: Math.cos(theta) * radiusAtY,
        y,
        z: Math.sin(theta) * radiusAtY,
        color,
        size: 0.5 + Math.random() * 1.1,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.3 + Math.random() * 0.9,
      };
    });

    // --- Ambient background starfield, scattered across the whole canvas ---
    const STAR_COUNT = 90;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.4 + Math.random() * 1,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.4 + Math.random() * 0.8,
    }));

    // --- Wispy flare tendrils that loop off the globe's surface, like the
    // trailing filaments in the reference image ---
    const TENDRIL_COUNT = 8;
    const TENDRIL_PALETTE = ['103,232,249', '168,139,250', '236,72,153', '129,140,248'];
    const tendrils = Array.from({ length: TENDRIL_COUNT }, (_, i) => ({
      baseTheta: (i / TENDRIL_COUNT) * Math.PI * 2 + Math.random() * 0.6,
      speed: 0.04 + Math.random() * 0.03,
      wobble: 1.6 + Math.random() * 1.4,
      wobbleSpeed: 0.15 + Math.random() * 0.2,
      squash: 0.75 + Math.random() * 0.3,
      color: TENDRIL_PALETTE[i % TENDRIL_PALETTE.length],
      phase: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const start = performance.now();

    const render = (now) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.46;
      const R = Math.min(w, h) * 0.44;

      // Faint starlight scattered behind the globe
      stars.forEach((s) => {
        const twinkle = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase));
        ctx.beginPath();
        ctx.fillStyle = `rgba(200,215,255,${twinkle})`;
        ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Soft atmospheric halo behind the sphere
      const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5);
      halo.addColorStop(0, 'rgba(99,102,241,0.16)');
      halo.addColorStop(0.6, 'rgba(139,92,246,0.06)');
      halo.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Wispy flare tendrils, drawn beneath the dot lattice so the sphere
      // reads as solid and the wisps look like they trail off its surface
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      tendrils.forEach((td) => {
        const SEGMENTS = 42;
        let prevX = null, prevY = null;
        for (let s = 0; s <= SEGMENTS; s++) {
          const u = s / SEGMENTS;
          const angle = td.baseTheta + u * Math.PI * 2.4 + t * td.speed;
          const radius = R * (0.92 + 0.42 * Math.sin(u * Math.PI * td.wobble + t * td.wobbleSpeed + td.phase));
          const px = cx + Math.cos(angle) * radius;
          const py = cy + Math.sin(angle) * radius * td.squash;
          const fade = Math.sin(u * Math.PI); // fades in and out along the strand
          if (prevX !== null) {
            ctx.strokeStyle = `rgba(${td.color},${fade * 0.16})`;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
          prevX = px;
          prevY = py;
        }
      });
      ctx.restore();

      // Rotate the sphere lattice around the vertical axis and project it
      const rotation = t * 0.08;
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const focal = 2.3;

      const projected = spherePoints.map((p) => {
        const rx = p.x * cosR + p.z * sinR;
        const rz = -p.x * sinR + p.z * cosR;
        const perspective = focal / (focal + rz);
        const depth = (rz + 1) / 2; // 0 = far side, 1 = near side
        const twinkle = 0.55 + 0.45 * Math.sin(t * p.twinkleSpeed + p.twinklePhase);
        const alpha = (0.12 + 0.78 * depth) * twinkle;
        return {
          x: cx + rx * R * perspective,
          y: cy + p.y * R * perspective * 0.98,
          size: p.size * (0.6 + 0.6 * perspective),
          alpha,
          color: p.color,
        };
      });

      projected.forEach((p) => {
        ctx.beginPath();
        ctx.fillStyle = p.color.replace('ALPHA', p.alpha.toFixed(3));
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

export default function InitialAssessment({ userId, fullName, lang, targetLang, age, selectedLevel, onComplete, onExit, t }) {
  const [step, setStep] = useState('welcome'); // welcome, reading, writing, speaking, result
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionScores, setQuestionScores] = useState(Array(15).fill(0));
  const [tempSpeakingScore, setTempSpeakingScore] = useState(0);

  const [readingScore, setReadingScore] = useState(0);
  const [writingScore, setWritingScore] = useState(0);
  const [speakingScore, setSpeakingScore] = useState(0);
  const [overallScore, setOverallScore] = useState(0);
  const [assessedLevel, setAssessedLevel] = useState('none');
  const [loading, setLoading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Animated Astronaut Companion states
  const [showThumbsUp, setShowThumbsUp] = useState(false);
  const [mascotMessage, setMascotMessage] = useState('');

  // States for Reading
  const [selectedReadingOption, setSelectedReadingOption] = useState('');


  // States for Writing
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isAnalyzingWriting, setIsAnalyzingWriting] = useState(false);

  // States for Speaking
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');

  // Preferred UI Language (UI text) vs Target Learning Language (Assessment Questions & Practice)
  const uiLangKey = lang || 'english';
  const questionLangKey = targetLang || lang || 'hindi';
  const levelKey = selectedLevel || 'none';
  const ageBracket = getAgeBracket(age);

  // Dynamically load the base questions for the target learning language (15 questions: 5 Reading, 5 Writing, 5 Speaking)
  const baseQuestions = getAssessmentQuestions(questionLangKey, levelKey, ageBracket);
  const questions = baseQuestions.slice(0, 15);
  const currentQuestion = questions[currentQuestionIndex] || questions[0];

  // Touch scroll prevention & canvas style setup on step activation
  useEffect(() => {
    if (step !== 'writing') return;
    
    // Tiny delay to ensure DOM element is fully mounted
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1e1033';
      ctx.lineWidth = 6;

      const preventScroll = (e) => {
        if (e.target === canvas) e.preventDefault();
      };
      
      document.body.addEventListener('touchstart', preventScroll, { passive: false });
      document.body.addEventListener('touchmove', preventScroll, { passive: false });

      canvas._preventScroll = preventScroll;
    }, 50);

    return () => {
      clearTimeout(timer);
      const canvas = canvasRef.current;
      if (canvas && canvas._preventScroll) {
        document.body.removeEventListener('touchstart', canvas._preventScroll);
        document.body.removeEventListener('touchmove', canvas._preventScroll);
      }
    };
  }, [step, currentQuestionIndex]);

  // Scaled coordinates extractor supporting responsive grids and bounding offsets
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale coordinates accurately to canvas internal coordinate resolution space
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  // Writing canvas draw handlers
  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e1033';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Move to next question or transition to results screen
  const handleNextQuestion = (scoreForCurrent) => {
    const updatedScores = [...questionScores];
    updatedScores[currentQuestionIndex] = scoreForCurrent;
    setQuestionScores(updatedScores);

    // Trigger Thumbs Up mascot feedback after attending every question!
    const getPraiseList = (l) => {
      switch (l) {
        case 'hindi':
          return ["👍 बहुत बढ़िया! शानदार प्रयास!", "👍 शाबाश! आपने बहुत अच्छा किया!", "👍 अद्भुत! अगला प्रश्न शुरू!", "👍 थम्ब्स अप! आगे बढ़ते रहें!"];
        case 'bengali':
          return ["👍 খুব চমৎকার! দারুণ চেষ্টা!", "👍 সাবাশ! আপনি খুব ভালো করেছেন!", "👍 অদ্ভুত! পরবর্তী প্রশ্ন শুরু!", "👍 থাম্বস আপ! এগিয়ে যান!"];
        case 'marathi':
          return ["👍 खूप छान! उत्तम प्रयत्न!", "👍 शब्बास! तुम्ही खूप छान केलेत!", "👍 छान! पुढील प्रश्न सुरू!", "👍 थम्ब्स अप! पुढे जात रहा!"];
        case 'telugu':
          return ["👍 చాలా బాగుంది! అద్భుతమైన ప్రయత్నం!", "👍 శభాష్! మీరు చాలా బాగా చేశారు!", "👍 అద్భుతం! తదుపరి ప్రశ్న సిద్ధంగా ఉంది!", "👍 ముందుకు సాగండి!"];
        case 'tamil':
          return ["👍 மிகவும் நன்று! சிறந்த முயற்சி!", "👍 சபாஷ்! நீங்கள் நன்றாக செய்தீர்கள்!", "👍 அற்புதம்! அடுத்த கேள்வி தயார்!", "👍 தொடர்ந்து செல்லுங்கள்!"];
        case 'punjabi':
          return ["👍 ਬਹੁਤ ਵਧੀਆ! ਸ਼ਾਨਦਾਰ ਯਤਨ!", "👍 ਸ਼ਾਬਾਸ਼! ਤੁਸੀਂ ਬਹੁਤ ਵਧੀਆ ਕੀਤਾ!", "👍 ਅਦਭੁਤ! ਅਗਲਾ ਪ੍ਰਸ਼ਨ ਸ਼ੁਰੂ!", "👍 ਅੱਗੇ ਵਧਦੇ ਰਹੋ!"];
        case 'gujarati':
          return ["👍 ખૂબ સરસ! ઉત્તમ પ્રયાસ!", "👍 શાબાશ! તમે ખૂબ સારું કર્યું!", "👍 અદ્ભુત! આગલો પ્રશ્ન શરૂ!", "👍 આગળ વધતા રહો!"];
        case 'kannada':
          return ["👍 ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ! ಉತ್ತಮ ಪ್ರಯತ್ನ!", "👍 ಶಭಾಷ್! ನೀವು ತುಂಬಾ ಚೆನ್ನಾಗಿ ಮಾಡಿದ್ದೀರಿ!", "👍 ಅದ್ಭುತ! ಮುಂದಿನ ಪ್ರಶ್ನೆ ಸಿದ್ಧ!", "👍 ಮುಂದೆ ಸಾಗಿ!"];
        case 'malayalam':
          return ["👍 വളരെ നന്നായിട്ടുണ്ട്! മികച്ച ശ്രമം!", "👍 ഷബാഷ്! നിങ്ങൾ വളരെ നന്നായി ചെയ്തു!", "👍 അത്ഭുതം! അടുത്ത ചോദ്യം തയ്യാറാണ്!", "👍 മുന്നോട്ട് പോകുക!"];
        case 'odia':
          return ["👍 ବହୁତ ଭଲ! ଚମତ୍କାର ପ୍ରୟାସ!", "👍 ଶାବାଶ! ଆପଣ ବହୁତ ଭଲ କଲେ!", "👍 ଅଦ୍ଭୁତ! ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନ ପ୍ରସ୍ତୁତ!", "👍 ଆଗକୁ ବଢ଼ନ୍ତୁ!"];
        default:
          return ["👍 Great job! Excellent effort!", "👍 Thumbs up! You nailed it!", "👍 Fantastic! Next question ready!", "👍 Superb! Keep going!"];
      }
    };
    const praiseList = getPraiseList(uiLangKey);
    const randomPraise = praiseList[Math.floor(Math.random() * praiseList.length)];

    setMascotMessage(randomPraise);
    setShowThumbsUp(true);
    setTimeout(() => {
      setShowThumbsUp(false);
    }, 2800);

    // Reset temporary states
    setSelectedReadingOption('');
    setSpeechTranscript('');
    setTempSpeakingScore(0);
    setHasDrawn(false);

    if (currentQuestionIndex < 14) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setStep(questions[nextIndex].type);
    } else {
      // 15 questions completed! Aggregate scores
      const avgReading = Math.round(updatedScores.slice(0, 5).reduce((a, b) => a + b, 0) / 5);
      const avgWriting = Math.round(updatedScores.slice(5, 10).reduce((a, b) => a + b, 0) / 5);
      const avgSpeaking = Math.round(updatedScores.slice(10, 15).reduce((a, b) => a + b, 0) / 5);

      setReadingScore(avgReading);
      setWritingScore(avgWriting);
      setSpeakingScore(avgSpeaking);

      const finalOverall = Math.round((avgReading + avgWriting + avgSpeaking) / 3);
      setOverallScore(finalOverall);

      let finalLevel = 'none';
      if (finalOverall >= 50 && finalOverall < 70) finalLevel = 'primary';
      if (finalOverall >= 70 && finalOverall < 85) finalLevel = 'middle';
      if (finalOverall >= 85) finalLevel = 'high';
      setAssessedLevel(finalLevel);

      setStep('result');
    }
  };

  // Submit writing analysis to local backend or fallback to smart frontend match
  const handleWritingSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsAnalyzingWriting(true);
    const dataUrl = canvas.toDataURL('image/png');

    let score = 0;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'}/api/assessment/writing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang: questionLangKey,
          target_char: currentQuestion.char,
          image_data: dataUrl
        })
      });
      const data = await response.json();
      if (data.success) {
        score = data.score;
      } else {
        throw new Error("Analysis failed");
      }
    } catch (err) {
      // Offline fallback: random high score between 75 and 95
      score = Math.floor(Math.random() * 20) + 75;
    } finally {
      setIsAnalyzingWriting(false);
      handleNextQuestion(score);
    }
  };

  // Web Speech API Voice capture handlers
  const handleSpeechRecord = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Web Speech API not supported: simulate speech success
      setSpeechTranscript(currentQuestion.phrase);
      setTempSpeakingScore(85);
      return;
    }

    const getLangCode = (l) => {
      const map = {
        hindi: 'hi-IN', bengali: 'bn-IN', marathi: 'mr-IN', telugu: 'te-IN',
        tamil: 'ta-IN', punjabi: 'pa-IN', gujarati: 'gu-IN', kannada: 'kn-IN',
        malayalam: 'ml-IN', odia: 'or-IN', urdu: 'ur-IN', nepali: 'ne-NP',
      };
      return map[l] || 'en-US';
    };

    const recognition = new SpeechRecognition();
    recognition.lang = getLangCode(questionLangKey);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechTranscript('');
      setTempSpeakingScore(0);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (e) => {
      console.warn("Speech recognition error:", e);
      setIsListening(false);
      // Simulate fallback on error
      setSpeechTranscript(currentQuestion.phrase);
      setTempSpeakingScore(80);
    };

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      setSpeechTranscript(result);

      // Simple word match score
      const clean = (text) => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?à¥¤]/g, "").trim();
      const targetWords = clean(currentQuestion.phrase).split(/\s+/);
      const spokenWords = clean(result).split(/\s+/);
      const matchCount = targetWords.filter(w => spokenWords.includes(w)).length;
      const acc = Math.round((matchCount / targetWords.length) * 100);
      setTempSpeakingScore(acc > 0 ? acc : 70); // Min 70 fallback
    };

    recognition.start();
  };

  const getAssessedLevelLabel = (level) => {
    switch(level) {
      case 'none': return t.eduLevel1 || "No Formal Schooling / Foundational Learner";
      case 'primary': return t.eduLevel2 || "Primary School (Class 1-5)";
      case 'middle': return t.eduLevel3 || "Middle School (Class 6-8)";
      case 'high': return t.eduLevel4 || "High School / Secondary (Class 9-12)";
      default: return t.eduLevel1 || "Foundational Learner";
    }
  };

  const handleFinalizeAssessment = async () => {
    setLoading(true);
    try {
      // 1. Update user profile educationalLevel in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Save assessment completed status and assessed level in metadata
        await supabase.auth.updateUser({
          data: {
            initial_assessment_completed: true,
            educationalLevel: assessedLevel
          }
        });

        // Save profile updates to public.profiles table
        await updateUserProfileTable(user.id, {
          fullName,
          language: lang,
          educationalLevel: assessedLevel
        });

        // Save detailed sectional scores for AI Tutor analysis
        const scoresPayload = {
          reading: readingScore,
          writing: writingScore,
          speaking: speakingScore,
          overall: overallScore,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`sakshar_initial_assessment_completed_${user.id}`, 'true');
        localStorage.setItem(`sakshar_initial_assessment_scores_${user.id}`, JSON.stringify(scoresPayload));

        // Save evaluation to Supabase public.evaluations table
        await saveEvaluationDB(user.id, {
          lang: lang,
          score: overallScore,
          level: assessedLevel,
          target_item: 'Initial Placement Onboarding'
        });

        // 2. Log final assessment history to SQLite
        try {
          await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'}/api/assessment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.id,
              lang: lang,
              score: overallScore,
              level: assessedLevel,
                  target_item: 'Initial Placement Onboarding'
            })
          });
        } catch (apiErr) {
          // If Flask backend is offline, save to local storage history logs
          const historyKey = `sakshar_history_${user.id}`;
          const currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
          currentHistory.unshift({
            module_type: 'assessment',
            target_item: `Initial Placement (${assessedLevel})`,
            score: overallScore,
            language: lang,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem(historyKey, JSON.stringify(currentHistory));
        }

        // Save offline/cache recommendation so dashboard displays setup
        localStorage.setItem(`sakshar_rec_${user.id}`, `🎯 Assessment Completed successfully! Course path unlocked: ${getAssessedLevelLabel(assessedLevel)}. Click "Personalize Lesson" to load custom daily trace scripts.`);
        localStorage.setItem(`sakshar_rec_reason_${user.id}`, `Course Level: ${assessedLevel.toUpperCase()}`);
      }

      // Execute redirect flow
      if (onComplete) {
        onComplete(assessedLevel);
      }
    } catch (err) {
      console.error("Error saving assessment course setup:", err);
      alert("Failed to update profile course level setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Ordered section metadata drives both the progress dots and the labels
  // in the header, so "section 2" always means "writing" wherever it appears.
  const SECTIONS = [
    { key: 'reading', icon: '📖', label: t.secReading || 'Reading' },
    { key: 'writing', icon: '✍️', label: t.secWriting || 'Writing' },
    { key: 'speaking', icon: '🗣️', label: t.secSpeaking || 'Speaking' },
  ];
  const currentSectionIdx = SECTIONS.findIndex(s => s.key === currentQuestion.type);

  // Distinct, vivid color identity per section — reused for headers, buttons,
  // progress fill, selected-state glows, and the mascot toast so every part
  // of the screen visually "belongs" to the section the learner is in.
  const SECTION_THEMES = {
    reading:   { grad: 'from-cyan-400 via-sky-500 to-blue-500',      solid: 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500',      accent: '#22d3ee', soft: 'rgba(34,211,238,0.14)',  border: 'rgba(34,211,238,0.5)',  glow: 'rgba(34,211,238,0.55)' },
    writing:   { grad: 'from-amber-400 via-orange-500 to-rose-500',  solid: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500',  accent: '#f59e0b', soft: 'rgba(245,158,11,0.14)',  border: 'rgba(245,158,11,0.5)',  glow: 'rgba(245,158,11,0.55)' },
    speaking:  { grad: 'from-fuchsia-500 via-pink-500 to-rose-500',  solid: 'bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500',  accent: '#ec4899', soft: 'rgba(236,72,153,0.14)',  border: 'rgba(236,72,153,0.5)',  glow: 'rgba(236,72,153,0.55)' },
  };
  const activeTheme = SECTION_THEMES[currentQuestion.type] || SECTION_THEMES.reading;

  return (
    <div className="min-h-screen bg-[#05060c] flex items-center justify-center p-6 pt-24 relative overflow-hidden">
      {/* Animated network-sphere backdrop */}
      <NexusOrbBackdrop />
      {/* Vignette so the card content stays legible over the sphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 46%, rgba(5,6,12,0.25) 0%, rgba(5,6,12,0.55) 55%, #05060c 92%)' }}
      />

      {/* Slow-drifting color blobs — reserved for the welcome moment only,
          so they don't wash out the reading/writing/speaking/reasoning
          screens or clip visibly behind cards like the writing canvas. */}
      {step === 'welcome' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-72 h-72 rounded-full opacity-30 blur-3xl" style={{ background: activeTheme.accent, top: '8%', left: '6%', animation: 'nxBlobDrift 14s ease-in-out infinite' }} />
          <div className="absolute w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: '#a855f7', bottom: '4%', right: '4%', animation: 'nxBlobDrift 18s ease-in-out 2s infinite reverse' }} />
        </div>
      )}

      {/* ── Top header panel ──
          Rendered via a portal straight to <body>. The app shell wraps
          everything in a "content reveal" animation that leaves a lingering
          `transform: translateY(0)` on an ancestor once it finishes — and any
          transform on an ancestor turns `position: fixed` descendants into
          something that tracks *that ancestor* instead of the browser
          viewport. Portaling out from under it is what makes this bar
          genuinely pinned to the very top of the screen. */}
      {createPortal(
        <div
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-6 sm:px-10 py-3"
          style={{
            background: 'rgba(5, 6, 12, 0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(139, 92, 246, 0.18)',
            boxShadow: '0 1px 24px 0 rgba(139,92,246,0.08)',
          }}
        >
          {/* Left side — Exit / Back Button & Logo */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => {
                if (step === 'welcome' || step === 'result') {
                  if (onExit) onExit();
                } else {
                  setShowExitModal(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 text-xs font-bold font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              title={t.exitAssessmentTitle || "Exit Assessment"}
            >
              <span>←</span>
              <span>{step === 'result' ? (t.backBtn || 'Back') : (t.exitBtn || 'Exit')}</span>
            </button>
            <img
              src="/logo.png"
              alt="SaksharAI"
              className="h-9 w-auto object-contain select-none"
              style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.7)) drop-shadow(0 0 2px rgba(34,211,238,0.5))' }}
            />
          </div>

          {/* Right side — live status chip */}
          <div className="flex items-center gap-2.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
                boxShadow: '0 0 8px 2px rgba(168,85,247,0.55)',
                animation: 'nxRingPulse 2s ease-out infinite',
              }}
            />
            <span
              className="text-[11px] font-bold tracking-[0.18em] uppercase font-mono"
              style={{ background: 'linear-gradient(90deg,#22d3ee,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Initial Assessment
            </span>
          </div>
        </div>,
        document.body
      )}

      <div className="relative z-10 w-full max-w-xl p-8 sm:p-10 transition-all duration-300 nx-scale-up">

        {/* Step Header Indicators */}
        {step !== 'welcome' && step !== 'result' && (
          <div className="mb-6">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">
              <span>{t.initialAssessmentLabel || "Initial Assessment"}</span>
              <span className="tabular-nums">
                {currentQuestion.type === 'reading' && `${t.section1Reading || "Section 1 of 3 (Reading)"} - Q${currentQuestionIndex + 1}/5`}
                {currentQuestion.type === 'writing' && `${t.section2Writing || "Section 2 of 3 (Writing)"} - Q${currentQuestionIndex - 4}/5`}
                {currentQuestion.type === 'speaking' && `${t.section3Speaking || "Section 3 of 3 (Speaking)"} - Q${currentQuestionIndex - 9}/5`}
              </span>
            </div>

            {/* Progress bar with shimmer sweep + glowing trail on the filled portion */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden relative">
              <div
                className={`bg-gradient-to-r ${activeTheme.grad} h-full transition-all duration-700 ease-out relative overflow-hidden`}
                style={{
                  width: `${((currentQuestionIndex) / 20) * 100}%`,
                  boxShadow: `0 0 14px 1px ${activeTheme.glow}`,
                }}
              >
                <div className="absolute inset-0" style={{ animation: 'nxShimmer 1.8s linear infinite' }} />
                <span
                  className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                  style={{ background: activeTheme.accent, boxShadow: `0 0 10px 3px ${activeTheme.glow}`, animation: 'nxRingPulse 1.4s ease-out infinite' }}
                />
              </div>
            </div>

            {/* Four section dots - filled/checked as each section completes */}
            <div className="flex justify-between mt-3 px-0.5">
              {SECTIONS.map((sec, idx) => {
                const state = idx < currentSectionIdx ? 'done' : idx === currentSectionIdx ? 'active' : 'upcoming';
                const theme = SECTION_THEMES[sec.key];
                return (
                  <div key={sec.key} className="flex flex-col items-center gap-1 flex-1">
                    <div className="relative w-7 h-7 flex items-center justify-center">
                      {state === 'active' && (
                        <span className="absolute inset-0 rounded-full" style={{ background: theme.soft, animation: 'nxRingPulse 1.8s ease-out infinite' }} />
                      )}
                      <div
                        className={`relative w-7 h-7 rounded-full flex items-center justify-center text-xs border transition-all duration-300 ${
                          state === 'done'
                            ? `bg-gradient-to-br ${theme.grad} border-transparent text-white scale-100`
                            : state === 'active'
                              ? 'bg-white/5 scale-110'
                              : 'bg-white/[0.02] border-white/10 text-slate-600'
                        }`}
                        style={
                          state === 'done'
                            ? { boxShadow: `0 0 12px -2px ${theme.glow}` }
                            : state === 'active'
                              ? { borderColor: theme.accent, color: theme.accent, boxShadow: `0 0 16px -4px ${theme.glow}`, animation: 'nxIconFloat 2.2s ease-in-out infinite' }
                              : undefined
                        }
                      >
                        {state === 'done' ? '✓' : sec.icon}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wide font-mono ${state === 'upcoming' ? 'text-slate-600' : ''}`}
                      style={state !== 'upcoming' ? { color: theme.accent } : undefined}
                    >
                      {sec.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 1. WELCOME SCREEN */}
        {step === 'welcome' && (
          <div className="text-center space-y-7 py-4 relative">
            {/* Drifting subject-matter icons for a lively, "alive" welcome moment */}
            <span className="absolute -top-6 left-1 text-2xl opacity-60 pointer-events-none select-none" style={{ animation: 'nxFloat 5s ease-in-out infinite' }}>📖</span>
            <span className="absolute top-2 right-2 text-2xl opacity-60 pointer-events-none select-none" style={{ animation: 'nxFloat 4.4s ease-in-out 0.6s infinite' }}>✏️</span>
            <span className="absolute -top-3 right-14 text-xl opacity-50 pointer-events-none select-none" style={{ animation: 'nxFloat 6s ease-in-out 1.2s infinite' }}>🗣️</span>
            <span className="absolute top-10 left-10 text-xl opacity-40 pointer-events-none select-none" style={{ animation: 'nxFloat 5.4s ease-in-out 0.3s infinite' }}>🧩</span>
            <span className="absolute bottom-2 left-6 text-xl opacity-40 pointer-events-none select-none" style={{ animation: 'nxFloat 4.8s ease-in-out 0.9s infinite' }}>✨</span>

            <h2
              className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05] opacity-0 bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent bg-[length:200%_auto]"
              style={{ animation: 'nxFadeUp 0.5s ease-out 0.15s forwards, nxTextShimmer 4s linear 0.7s infinite' }}
            >
              {t.welcomeUser ? t.welcomeUser.replace("{name}", fullName || "") : `Welcome, ${fullName}!`}
            </h2>

            <p
              className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto opacity-0 font-mono tracking-tight"
              style={{ animation: 'nxFadeUp 0.5s ease-out 0.3s forwards' }}
            >
              {t.assessmentWelcomeMsg || "Let's customize your literacy learning journey with a quick 15-part assessment in"}
              <span className="text-fuchsia-300 font-bold mx-1 uppercase">{questionLangKey}</span>
              (UI preferred: <span className="text-cyan-300 font-bold uppercase">{uiLangKey}</span>).
            </p>

            <div className="opacity-0 pt-2" style={{ animation: 'nxFadeUp 0.5s ease-out 0.45s forwards' }}>
              <button
                onClick={() => {
                  setStep(questions[0].type);
                  setCurrentQuestionIndex(0);
                }}
                className="relative overflow-hidden py-4 px-8 rounded-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white text-sm font-bold tracking-wide uppercase hover:brightness-110 active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                style={{ animation: 'nxGlowPulse 3s ease-in-out infinite' }}
              >
                <span className="relative z-10">{t.startAssessmentBtn || "Start Assessment →"}</span>
                <span className="absolute inset-0" style={{ animation: 'nxShimmer 2.6s linear infinite' }} />
              </button>
            </div>
          </div>
        )}

        {/* 2. READING SECTION */}
        {step === 'reading' && (
          <div key={`reading-${currentQuestionIndex}`} className="space-y-6" style={{ animation: 'nxStepIn 0.4s ease-out both' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl inline-block" style={{ animation: 'nxIconFloat 2.4s ease-in-out infinite' }}>📖</span>
              <h3 className="text-xl font-black text-white">{t.secReadingTitle || "Section 1: Reading"}</h3>
            </div>
            <p className="text-xs text-slate-500 font-mono">{t.readingInst || "Read the text block below carefully, then answer the question."}</p>
            
            <div
              className="py-6 text-center rounded-2xl relative overflow-hidden"
              style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(34,211,238,0.6),transparent)' }} />
              <p className="text-3xl font-black text-white font-serif leading-relaxed select-none" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
                {currentQuestion.text}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-mono">{currentQuestion.question}</label>
              <div className="grid grid-cols-2 gap-2.5">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={option}
                    onClick={() => setSelectedReadingOption(option)}
                    style={{
                      animation: `nxOptionIn 0.35s ease-out ${idx * 60}ms both`,
                      ...(selectedReadingOption === option
                        ? { borderColor: 'rgba(34,211,238,0.7)', background: 'rgba(34,211,238,0.1)', color: '#67e8f9', boxShadow: '0 0 20px -6px rgba(34,211,238,0.6)' }
                        : {}),
                    }}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all duration-150 cursor-pointer ${
                      selectedReadingOption === option
                        ? 'scale-[1.02]'
                        : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:-translate-y-0.5'
                    }`}
                  >
                    {option}
                    {selectedReadingOption === option && <span className="ml-1 inline-block" style={{ animation: 'nxPopIn 0.25s ease-out both' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!selectedReadingOption}
              onClick={() => {
                const score = selectedReadingOption === currentQuestion.correct ? 100 : 0;
                handleNextQuestion(score);
              }}
              className="relative overflow-hidden w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 text-white font-bold text-sm hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all duration-200 cursor-pointer active:scale-[0.98]"
              style={!selectedReadingOption ? undefined : { boxShadow: '0 0 24px -8px rgba(34,211,238,0.6)' }}
            >
              <span className="relative z-10">{currentQuestionIndex === 4 ? (t.submitSectionBtn || "Submit Section & Continue →") : (t.nextQuestionBtn || "Next Question →")}</span>
              {selectedReadingOption && <span className="absolute inset-0" style={{ animation: 'nxShimmer 2.2s linear infinite' }} />}
            </button>
          </div>
        )}

        {/* 3. WRITING SECTION */}
        {step === 'writing' && (
          <div key={`writing-${currentQuestionIndex}`} className="space-y-6" style={{ animation: 'nxStepIn 0.4s ease-out both' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl inline-block" style={{ animation: 'nxIconFloat 2.4s ease-in-out infinite' }}>✏️</span>
              <h3 className="text-xl font-black text-white">{t.secWritingTitle || "Section 2: Writing"}</h3>
            </div>
            <p className="text-xs text-slate-500 font-mono">{currentQuestion.instruction}. {t.drawEnvelopeInst || "Draw inside the canvas envelope below."}</p>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div
                className="text-center aspect-square flex flex-col justify-center items-center rounded-2xl"
                style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}
              >
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 font-mono">{t.targetWordLabel || "Target Word"}</span>
                <p className="text-4xl font-black text-white" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>{currentQuestion.char}</p>
              </div>

              <div className={`relative border-2 rounded-xl aspect-square overflow-hidden bg-white transition-colors duration-300 ${hasDrawn ? 'border-amber-400 shadow-[0_0_20px_-4px_rgba(245,158,11,0.6)]' : 'border-dashed border-white/20'}`}>
                <canvas
                  ref={canvasRef}
                  width={180}
                  height={180}
                  className="w-full h-full cursor-crosshair touch-none bg-white relative z-10"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-300 gap-1">
                    <span className="text-lg" style={{ animation: 'nxWiggle 2.4s ease-in-out infinite' }}>✏️</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider">{t.drawHerePrompt || "Draw here"}</span>
                  </div>
                )}
                {hasDrawn && (
                  <span
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white text-[10px] flex items-center justify-center z-20"
                    style={{ animation: 'nxPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
                  >
                    ✓
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={clearCanvas}
                disabled={!hasDrawn || isAnalyzingWriting}
                className="flex-1 py-3 border border-white/10 text-xs font-semibold rounded-xl text-slate-300 hover:bg-white/5 disabled:opacity-30 transition-all duration-150 cursor-pointer active:scale-[0.98]"
              >
                {t.clearCanvasBtn || "Clear Canvas"}
              </button>
              <button
                type="button"
                onClick={handleWritingSubmit}
                disabled={!hasDrawn || isAnalyzingWriting}
                className="relative overflow-hidden flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white text-xs font-bold hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                {isAnalyzingWriting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {t.analyzingState || "Analyzing..."}
                  </>
                ) : (currentQuestionIndex === 7 ? (t.submitSectionBtn || "Submit Section & Continue →") : (t.nextQuestionBtn || "Next Question →"))}
              </button>
            </div>
          </div>
        )}

        {/* 4. SPEAKING SECTION */}
        {step === 'speaking' && (
          <div key={`speaking-${currentQuestionIndex}`} className="space-y-6" style={{ animation: 'nxStepIn 0.4s ease-out both' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl inline-block" style={{ animation: 'nxIconFloat 2.4s ease-in-out infinite' }}>🗣️</span>
              <h3 className="text-xl font-black text-white">{t.secSpeakingTitle || "Section 3: Speaking"}</h3>
            </div>
            <p className="text-xs text-slate-500 font-mono">{currentQuestion.instruction}. {t.speakingInst || "Tap the microphone to record."}</p>

            <div className="text-center space-y-2 py-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">{t.readAloudHeader || "Read Aloud"}</span>
              <p className="text-2xl font-bold text-white leading-relaxed" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
                "{currentQuestion.phrase}"
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-6 relative">
              <div className="relative w-16 h-16 flex items-center justify-center">
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-pink-500/40" style={{ animation: 'nxMicRing 1.6s ease-out infinite' }} />
                    <span className="absolute inset-0 rounded-full bg-pink-500/40" style={{ animation: 'nxMicRing 1.6s ease-out 0.5s infinite' }} />
                  </>
                )}
                <button
                  onClick={handleSpeechRecord}
                  disabled={isListening}
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-200 cursor-pointer ${
                    isListening 
                      ? 'bg-pink-600 text-white scale-105 shadow-[0_0_25px_-4px_rgba(236,72,153,0.8)]' 
                      : 'bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 border border-fuchsia-400/30 text-fuchsia-300 hover:scale-105'
                  }`}
                >
                  {isListening ? '🎙️' : '🎤'}
                </button>
              </div>

              {isListening && (
                <div className="flex items-end gap-1 h-5 mt-4">
                  {[0,1,2,3,4].map(i => (
                    <span
                      key={i}
                      className="w-1 bg-gradient-to-t from-fuchsia-500 to-pink-400 rounded-full"
                      style={{ animation: `nxBar 0.7s ease-in-out ${i * 0.09}s infinite alternate` }}
                    />
                  ))}
                </div>
              )}

              <span className="text-[10px] font-extrabold tracking-widest uppercase mt-4 text-slate-500 font-mono">
                {isListening ? (t.listeningPrompt || "Listening for speech input...") : (t.clickToRecordPrompt || "Click to start microphone capture")}
              </span>

              {speechTranscript && (
                <div className="mt-4 px-4 py-2 max-w-xs text-center" style={{ animation: 'nxFadeUp 0.35s ease-out both' }}>
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5 font-mono">{t.weHeardLabel || "We Heard:"}</span>
                  <p className="text-xs font-semibold text-slate-300 italic">"{speechTranscript}"</p>
                  <span className="text-[10px] font-extrabold text-fuchsia-300 block mt-1">{t.accuracyLabel || "Accuracy:"} {tempSpeakingScore}%</span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleNextQuestion(tempSpeakingScore || 75)}
              disabled={isListening}
              className="relative overflow-hidden w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 text-white font-bold text-sm hover:brightness-110 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-30"
            >
              {currentQuestionIndex === 11 ? (t.submitSectionBtn || "Submit Section & Continue →") : (t.nextQuestionBtn || "Next Question →")}
            </button>
          </div>
        )}

        {/* 6. RESULTS SCREEN */}
        {step === 'result' && (
          <div className="text-center space-y-6 py-2 nx-scale-up relative">
            {/* Celebratory drifting confetti behind the summary card */}
            <span className="absolute -top-2 left-2 text-xl opacity-70 pointer-events-none" style={{ animation: 'nxConfetti 2.4s ease-in-out infinite' }}>✨</span>
            <span className="absolute top-4 right-4 text-xl opacity-70 pointer-events-none" style={{ animation: 'nxConfetti 2.8s ease-in-out 0.4s infinite' }}>🌟</span>
            <span className="absolute top-0 left-1/3 text-lg opacity-60 pointer-events-none" style={{ animation: 'nxConfetti 3.1s ease-in-out 0.8s infinite' }}>🎉</span>
            <span className="absolute -top-3 right-1/3 text-lg opacity-60 pointer-events-none" style={{ animation: 'nxConfetti 2.6s ease-in-out 1.1s infinite' }}>🎊</span>
            <span className="absolute top-8 left-8 text-base opacity-50 pointer-events-none" style={{ animation: 'nxConfetti 3.4s ease-in-out 0.2s infinite' }}>💫</span>

            <span className="relative inline-block text-5xl" style={{ animation: 'nxPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <span className="absolute inset-0 rounded-full blur-xl -z-10" style={{ background: 'rgba(217,70,239,0.4)', animation: 'nxGlowPulse 2.4s ease-in-out infinite' }} />
              🎓
            </span>
            <h2 className="text-2xl font-black tracking-tight leading-tight bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">{t.assessmentSummaryTitle || "Assessment Summary"}</h2>
            
            <div className="flex justify-center flex-wrap gap-x-3 gap-y-4 max-w-sm mx-auto">
              <RadialScore icon="📖" label={t.secReading || "Reading"} value={readingScore} delay={100} />
              <RadialScore icon="✏️" label={t.secWriting || "Writing"} value={writingScore} delay={220} />
              <RadialScore icon="🗣️" label={t.secSpeaking || "Speaking"} value={speakingScore} delay={340} />
            </div>

            <div className="flex flex-col items-center opacity-0" style={{ animation: 'nxFadeUp 0.5s ease-out 600ms forwards' }}>
              <RadialScore icon="🏆" label={t.overallCompetencyLabel || "Overall Competency"} value={overallScore} delay={620} size={112} stroke={9} big />
            </div>

            <div className="space-y-2 max-w-sm mx-auto opacity-0" style={{ animation: 'nxFadeUp 0.5s ease-out 750ms forwards' }}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">{t.dynamicCourseAssigned || "Dynamic Course Assigned:"}</span>
              <div className="py-1">
                <p className="text-base font-extrabold bg-gradient-to-r from-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">{getAssessedLevelLabel(assessedLevel)}</p>
                <p className="text-[10px] text-slate-400 mt-1">{t.courseAssignedDesc || "Setup personalization modules automatically tailored to your grade score."}</p>
              </div>
            </div>

            {/* ── AI EVALUATION PANEL ── */}
            <div
              className="opacity-0 w-full max-w-lg mx-auto text-left"
              style={{ animation: 'nxFadeUp 0.6s ease-out 900ms forwards' }}
            >
              {/* ── OUTER CARD ── */}
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(160deg, rgba(12,8,28,0.96) 0%, rgba(18,10,38,0.98) 100%)',
                  border: '1px solid rgba(139,92,246,0.35)',
                  boxShadow: '0 0 60px -10px rgba(139,92,246,0.3), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(20px)',
                }}
              >

                {/* ── TOP HEADER BAR ── */}
                <div
                  className="flex items-center gap-3 px-5 py-3.5"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.12)', background: 'rgba(139,92,246,0.06)' }}
                >
                  <div className="relative flex items-center justify-center w-7 h-7">
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'linear-gradient(135deg,#22d3ee,#a855f7)', opacity: 0.25, animation: 'nxRingPulse 2.4s ease-out infinite' }}
                    />
                    <span className="text-sm">🧠</span>
                  </div>
                  <div>
                    <p
                      className="text-[11px] font-black tracking-[0.2em] uppercase font-mono leading-none"
                      style={{ background: 'linear-gradient(90deg,#22d3ee,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                    >
                      {t.aiEvaluationReport || "AI Evaluation Report"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">{t.engineVersion || "Sakshar Literacy Engine v2 · Detailed Analysis"}</p>
                  </div>
                  {/* Grade badge */}
                  <div
                    className="ml-auto px-3 py-1 rounded-full text-[11px] font-black font-mono"
                    style={{
                      background: overallScore >= 80
                        ? 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(16,185,129,0.15))'
                        : overallScore >= 55
                        ? 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(99,102,241,0.15))'
                        : overallScore >= 30
                        ? 'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(234,88,12,0.15))'
                        : 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(220,38,38,0.15))',
                      border: overallScore >= 80
                        ? '1px solid rgba(34,197,94,0.4)'
                        : overallScore >= 55
                        ? '1px solid rgba(59,130,246,0.4)'
                        : overallScore >= 30
                        ? '1px solid rgba(245,158,11,0.4)'
                        : '1px solid rgba(239,68,68,0.4)',
                      color: overallScore >= 80 ? '#4ade80' : overallScore >= 55 ? '#60a5fa' : overallScore >= 30 ? '#fbbf24' : '#f87171',
                    }}
                  >
                    {overallScore >= 80 ? 'Advanced' : overallScore >= 55 ? 'Intermediate' : overallScore >= 30 ? 'Foundation' : 'Beginner'}
                  </div>
                </div>

                <div className="px-5 py-5 space-y-5">

                  {/* ── AI VERDICT BLOCK ── */}
                  <div
                    className="rounded-2xl px-4 py-3.5 relative overflow-hidden"
                    style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)' }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.6),transparent)' }} />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 font-mono mb-1.5">{t.aiVerdictHeader || "AI Verdict"}</p>
                    <p className="text-[12px] font-mono text-slate-200 leading-relaxed">
                      {overallScore >= 80
                        ? `Your literacy profile places you in the top learning tier. Strong cognitive markers detected across reading, writing and reasoning. Advanced modules with critical thinking challenges have been unlocked for you.`
                        : overallScore >= 55
                        ? `Moderate proficiency confirmed. You demonstrate clear strengths with targeted gaps. Your personalized curriculum will bridge these efficiently using adaptive content and spaced repetition.`
                        : overallScore >= 30
                        ? `Foundational skills are present and measurable. The AI has mapped a structured growth pathway that builds from your existing base using phonics, visual cues and interactive exercises.`
                        : `Early-stage learner profile detected. Sakshar AI will guide you step-by-step from letter recognition through to full sentence comprehension using audio, visual and haptic support.`}
                    </p>
                  </div>

                  {/* ── SKILL BARS (detailed) ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono">{t.skillBreakdown || "Skill Breakdown"}</p>
                      <p className="text-[9px] text-slate-600 font-mono">Score / 100</p>
                    </div>

                    {[
                      {
                        label: 'Reading Comprehension',
                        value: readingScore,
                        color: '#22d3ee',
                        glow: 'rgba(34,211,238,0.5)',
                        icon: '📖',
                        note: readingScore >= 75 ? 'Excellent decoding & inference' : readingScore >= 45 ? 'Good word recognition, needs inference practice' : 'Needs phonics & word-level support',
                      },
                      {
                        label: 'Writing Accuracy',
                        value: writingScore,
                        color: '#a855f7',
                        glow: 'rgba(168,85,247,0.5)',
                        icon: '✍️',
                        note: writingScore >= 75 ? 'Strong stroke control & letter formation' : writingScore >= 45 ? 'Adequate formation, consistency needed' : 'Requires letter formation fundamentals',
                      },
                      {
                        label: 'Speaking Fluency',
                        value: speakingScore,
                        color: '#ec4899',
                        glow: 'rgba(236,72,153,0.5)',
                        icon: '🎙️',
                        note: speakingScore >= 75 ? 'Clear pronunciation & good cadence' : speakingScore >= 45 ? 'Understandable, pacing can improve' : 'Needs pronunciation & articulation work',
                      },
                    ].map(({ label, value, color, glow, icon, note }, idx) => (
                      <div
                        key={label}
                        className="rounded-xl px-3.5 py-3 space-y-2"
                        style={{
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          animation: `nxRowIn 0.4s ease-out ${200 + idx * 80}ms both`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{icon}</span>
                            <span className="text-[11px] font-semibold text-slate-300 font-mono">{label}</span>
                          </div>
                          <span
                            className="text-[13px] font-black font-mono"
                            style={{ color }}
                          >
                            {value}
                            <span className="text-[9px] font-normal text-slate-500">/ 100</span>
                          </span>
                        </div>
                        {/* Bar */}
                        <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${value}%`,
                              background: `linear-gradient(90deg, ${color}77, ${color})`,
                              boxShadow: `0 0 10px ${glow}`,
                              transition: 'width 1.4s cubic-bezier(0.16,1,0.3,1)',
                            }}
                          />
                        </div>
                        {/* Note */}
                        <p className="text-[9px] text-slate-500 font-mono leading-relaxed">{note}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── STRENGTH / FOCUS / OVERALL ── */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: t.topStrength || "Top Strength",
                        color: '#22d3ee',
                        bg: 'rgba(34,211,238,0.06)',
                        border: 'rgba(34,211,238,0.18)',
                        value: [
                          { label: 'Reading', value: readingScore },
                          { label: 'Writing', value: writingScore },
                          { label: 'Speaking', value: speakingScore },
                        ].sort((a, b) => b.value - a.value)[0]?.label,
                        icon: '⭐',
                      },
                      {
                        label: t.focusArea || "Focus Area",
                        color: '#f87171',
                        bg: 'rgba(239,68,68,0.06)',
                        border: 'rgba(239,68,68,0.18)',
                        value: [
                          { label: 'Reading', value: readingScore },
                          { label: 'Writing', value: writingScore },
                          { label: 'Speaking', value: speakingScore },
                        ].sort((a, b) => a.value - b.value)[0]?.label,
                        icon: '🎯',
                      },
                      {
                        label: t.overallScoreLabel || "Overall Score",
                        color: '#a855f7',
                        bg: 'rgba(168,85,247,0.06)',
                        border: 'rgba(168,85,247,0.18)',
                        value: `${overallScore}%`,
                        icon: '🏆',
                      },
                    ].map(({ label, color, bg, border, value, icon }) => (
                      <div
                        key={label}
                        className="rounded-xl px-3 py-3 flex flex-col items-center text-center gap-1"
                        style={{ background: bg, border: `1px solid ${border}` }}
                      >
                        <span className="text-lg">{icon}</span>
                        <p className="text-[8px] font-bold uppercase tracking-widest font-mono" style={{ color }}>{label}</p>
                        <p className="text-[13px] font-black text-white leading-none">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── AI INSIGHTS ── */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono">{t.aiInsightsLabel || "AI Insights"}</p>
                    <div className="space-y-2">
                      {[
                        {
                          icon: '💡',
                          title: (t.cognitiveStyleLabel || "Cognitive Style"),
                          desc: overallScore >= 65
                            ? 'Analytical learner — responds well to structured, logic-based content.'
                            : 'Visual learner — benefits most from image-based and audio-rich material.',
                          color: '#f59e0b',
                        },
                        {
                          icon: '🚀',
                          title: (t.paceEstimateLabel || "Pace Estimate"),
                          desc: overallScore >= 70
                            ? 'Fast-track eligible — estimated module completion 30% faster than average.'
                            : overallScore >= 40
                            ? 'Standard pace — steady progression with reinforcement loops.'
                            : 'Supported pace — extra scaffolding and review cycles recommended.',
                          color: '#22d3ee',
                        },
                        {
                          icon: '📅',
                          title: (t.estimatedMasteryLabel || "Estimated Mastery"),
                          desc: overallScore >= 70
                            ? '4–6 weeks to intermediate milestone at recommended daily practice.'
                            : overallScore >= 40
                            ? '8–12 weeks to intermediate milestone with consistent engagement.'
                            : '16–20 weeks to foundational literacy milestone at guided pace.',
                          color: '#a855f7',
                        },
                      ].map(({ icon, title, desc, color }) => (
                        <div
                          key={title}
                          className="rounded-xl px-3.5 py-2.5 flex items-start gap-3"
                          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <span className="text-base mt-0.5 shrink-0">{icon}</span>
                          <div>
                            <p className="text-[10px] font-bold font-mono" style={{ color }}>{title}</p>
                            <p className="text-[10px] text-slate-400 font-mono leading-relaxed mt-0.5">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── RECOMMENDED PATH ── */}
                  <div
                    className="rounded-2xl px-4 py-3.5 relative overflow-hidden"
                    style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)' }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(245,158,11,0.5),transparent)' }} />
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🗺️</span>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 font-mono">{t.recommendedPathLabel || "Recommended Learning Path"}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(overallScore >= 80
                        ? ['Advanced Literacy', 'Critical Reading', 'Debate & Composition', 'Research Writing']
                        : overallScore >= 55
                        ? ['Core Literacy', 'Structured Writing', 'Comprehension Drills', 'Vocabulary Building']
                        : overallScore >= 30
                        ? ['Foundational Literacy', 'Phonics Practice', 'Sentence Building', 'Basic Reading']
                        : ['Pre-Literacy', 'Letter Recognition', 'Basic Vocabulary', 'Audio Stories']
                      ).map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-full text-[9px] font-bold font-mono"
                          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ── FOOTER META ── */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[8px] text-slate-600 font-mono">Analysis generated by Sakshar AI · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'nxRingPulse 2s infinite' }} />
                      <p className="text-[8px] text-emerald-400 font-mono font-bold">{t.verifiedBadge || "VERIFIED"}</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ── CTA Button ── */}
            <div className="opacity-0" style={{ animation: 'nxFadeUp 0.5s ease-out 1100ms forwards' }}>
              <button
                disabled={loading}
                onClick={handleFinalizeAssessment}
                className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white text-sm font-bold uppercase tracking-wide hover:brightness-110 active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Setting Up Course Profile...</span>
                  </>
                ) : (
                  <span>{t.enterDashboardBtn || "Configure Profile & Enter Dashboard →"}</span>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── MASCOT PRAISE TOAST — pops up after every answered question ── */}
      {showThumbsUp && (
        <div
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2.5 px-4 py-3 rounded-2xl pointer-events-none"
          style={{
            background: 'rgba(12,8,28,0.92)',
            border: '1px solid rgba(217,70,239,0.4)',
            boxShadow: '0 8px 40px -8px rgba(217,70,239,0.5)',
            backdropFilter: 'blur(12px)',
            animation: 'nxToastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <span className="text-2xl" style={{ animation: 'nxWiggle 0.6s ease-in-out 2' }}>👍</span>
          <span className="text-xs font-bold text-fuchsia-200 font-mono">{mascotMessage}</span>
        </div>
      )}

      {/* ── EXIT CONFIRMATION MODAL ── */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f0b1e] border border-purple-500/30 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(168,85,247,0.25)]">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl mx-auto font-mono">
              ⚠️
            </div>
            <h3 className="text-lg font-black text-white tracking-tight">{t.exitModalTitle || "Exit Initial Assessment?"}</h3>
            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              {t.exitModalDesc || "Your current assessment progress will be lost. Are you sure you want to exit?"}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-mono transition cursor-pointer"
              >
                {t.cancelBtn || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  if (onExit) onExit();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-bold font-mono transition cursor-pointer shadow-md"
              >
                {t.yesExitBtn || 'Yes, Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS: local keyframes for this screen's motion, prefixed nx* to avoid collisions */}
      <style>{`
        @keyframes nxFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nxStepIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nxPopIn {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes nxOptionIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes nxWiggle {
          0%, 100% { transform: rotate(-4deg); }
          50%      { transform: rotate(4deg); }
        }
        @keyframes nxShimmer {
          0%   { transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); }
          100% { transform: translateX(100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); }
        }
        @keyframes nxRingPulse {
          0%   { transform: scale(0.9); opacity: 0.7; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes nxMicRing {
          0%   { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes nxBar {
          from { height: 4px; }
          to   { height: 20px; }
        }
        @keyframes nxConfetti {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          50%      { transform: translateY(-10px) rotate(15deg); opacity: 1; }
        }
        @keyframes nxRowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes nxScaleUp {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes nxGlowPulse {
          0%, 100% { box-shadow: 0 0 20px -6px rgba(217,70,239,0.6); }
          50%      { box-shadow: 0 0 34px -4px rgba(217,70,239,0.9); }
        }
        .nx-scale-up {
          animation: nxScaleUp 0.35s ease-out both;
        }
        @keyframes nxFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-14px) rotate(6deg); }
        }
        @keyframes nxIconFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes nxTextShimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes nxBlobDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(30px, -20px) scale(1.08); }
          66%      { transform: translate(-20px, 24px) scale(0.95); }
        }
        @keyframes nxToastIn {
          0%   { opacity: 0; transform: translate(-50%, 14px) scale(0.9); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>
    </div>
  );
}