import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabase';
import { updateUserProfileTable } from '../services/db';
import { updateUserAuthProfile } from '../services/auth';
import { ageSpecificReasoning } from '../data/reasoningQuestions';

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
const getAssessmentQuestions = (lang, level, ageBracket) => {
  const isHindi = lang === 'hindi';

  // ============================================================================
  // LEVEL: NONE (Pre-literate / Foundational Learner) - 20 Unique Questions
  // ============================================================================
  if (level === 'none') {
    return [
      // Reading (5)
      { type: 'reading', text: isHindi ? 'ब' : 'B', question: isHindi ? 'दिखाए गए अक्षर को पहचानें:' : 'Identify the letter shown above:', options: isHindi ? ['ब', 'क', 'म', 'न'] : ['B', 'D', 'P', 'R'], correct: isHindi ? 'ब' : 'B' },
      { type: 'reading', text: isHindi ? 'घर' : 'CAT', question: isHindi ? 'शब्द को पहचानें:' : 'Identify the word shown above:', options: isHindi ? ['घर', 'चल', 'मन', 'फल'] : ['CAT', 'BAT', 'DOG', 'RAT'], correct: isHindi ? 'घर' : 'CAT' },
      { type: 'reading', text: isHindi ? 'अ _ ार' : 'A _ P L E', question: isHindi ? 'रिक्त स्थान भरें:' : 'Find the missing letter:', options: isHindi ? ['न', 'म', 'क', 'त'] : ['P', 'B', 'T', 'M'], correct: isHindi ? 'न' : 'P' },
      { type: 'reading', text: isHindi ? 'नल' : 'SUN', question: isHindi ? 'यह क्या लिखा है?' : 'What is written above?', options: isHindi ? ['नल', 'जल', 'कल', 'थल'] : ['SUN', 'RUN', 'FUN', 'GUN'], correct: isHindi ? 'नल' : 'SUN' },
      { type: 'reading', text: isHindi ? 'आम' : 'BOY', question: isHindi ? 'सही शब्द चुनें:' : 'Choose the correct word:', options: isHindi ? ['आम', 'काम', 'नाम', 'शाम'] : ['BOY', 'TOY', 'JOY', 'SOY'], correct: isHindi ? 'आम' : 'BOY' },
      // Writing (5)
      { type: 'writing', char: isHindi ? 'अ' : 'A', instruction: isHindi ? "अक्षर 'अ' को ट्रेस करें" : "Trace the letter A" },
      { type: 'writing', char: isHindi ? 'क' : 'T', instruction: isHindi ? "अक्षर 'क' को ट्रेस करें" : "Trace the letter T" },
      { type: 'writing', char: isHindi ? 'म' : 'M', instruction: isHindi ? "अक्षर 'म' को ट्रेस करें" : "Trace the letter M" },
      { type: 'writing', char: isHindi ? 'र' : 'C', instruction: isHindi ? "अक्षर 'र' को ट्रेस करें" : "Trace the letter C" },
      { type: 'writing', char: isHindi ? 'स' : 'S', instruction: isHindi ? "अक्षर 'स' को ट्रेस करें" : "Trace the letter S" },
      // Speaking (5)
      { type: 'speaking', phrase: isHindi ? 'घर' : 'Sun', instruction: isHindi ? "बोलें 'घर'" : "Say 'Sun'" },
      { type: 'speaking', phrase: isHindi ? 'जल' : 'Water', instruction: isHindi ? "बोलें 'जल'" : "Say 'Water'" },
      { type: 'speaking', phrase: isHindi ? 'बस' : 'Bus', instruction: isHindi ? "बोलें 'बस'" : "Say 'Bus'" },
      { type: 'speaking', phrase: isHindi ? 'आम' : 'Food', instruction: isHindi ? "बोलें 'आम'" : "Say 'Food'" },
      { type: 'speaking', phrase: isHindi ? 'नमस्ते' : 'Hello', instruction: isHindi ? "बोलें 'नमस्ते'" : "Say 'Hello'" },
      // Reasoning (5)
      {
        type: 'reasoning', icon: '🥛',
        scenario: isHindi ? 'आपको बहुत तेज प्यास लगी है।' : 'You are feeling very thirsty.',
        question: isHindi ? 'आप क्या इस्तेमाल करेंगे?' : 'What will you use to drink?',
        options: isHindi ? [{ emoji: '🥛', label: 'पानी का गिलास' }, { emoji: '👞', label: 'जूता' }, { emoji: '🧱', label: 'पत्थर' }] : [{ emoji: '🥛', label: 'Glass of water' }, { emoji: '👞', label: 'Shoe' }, { emoji: '🧱', label: 'Stone' }],
        correct: isHindi ? 'पानी का गिलास' : 'Glass of water'
      },
      {
        type: 'reasoning', icon: '🧼',
        scenario: isHindi ? 'आपको भोजन करने से पहले हाथ साफ करने हैं।' : 'You need to clean your hands before eating food.',
        question: isHindi ? 'आप हाथ धोने के लिए किसका उपयोग करेंगे?' : 'What will you use to wash your hands?',
        options: isHindi ? [{ emoji: '🧼', label: 'साबुन' }, { emoji: '📰', label: 'कागज' }, { emoji: '✏️', label: 'पेंसिल' }] : [{ emoji: '🧼', label: 'Soap' }, { emoji: '📰', label: 'Newspaper' }, { emoji: '✏️', label: 'Pencil' }],
        correct: isHindi ? 'साबुन' : 'Soap'
      },
      {
        type: 'reasoning', icon: '☔',
        scenario: isHindi ? 'बाहर अचानक बहुत तेज बारिश शुरू हो गई है।' : 'Suddenly it starts raining heavily outside.',
        question: isHindi ? 'भीगने से बचने के लिए आप क्या लेंगे?' : 'What will you use to avoid getting wet?',
        options: isHindi ? [{ emoji: '☔', label: 'छाता' }, { emoji: '🥣', label: 'कटोरा' }, { emoji: '🥄', label: 'चम्मच' }] : [{ emoji: '☔', label: 'Umbrella' }, { emoji: '🥣', label: 'Bowl' }, { emoji: '🥄', label: 'Spoon' }],
        correct: isHindi ? 'छाता' : 'Umbrella'
      },
      {
        type: 'reasoning', icon: '🔦',
        scenario: isHindi ? 'रात को कमरे में अचानक बत्ती गुल होने से अंधेरा हो गया है।' : 'The lights go off at night, making the room completely dark.',
        question: isHindi ? 'रोशनी के लिए आप क्या चालू करेंगे?' : 'What will you switch on to get light?',
        options: isHindi ? [{ emoji: '🔦', label: 'टॉर्च' }, { emoji: '🌀', label: 'पंख' }, { emoji: '🍽️', label: 'थाली' }] : [{ emoji: '🔦', label: 'Torch' }, { emoji: '🌀', label: 'Fan' }, { emoji: '🍽️', label: 'Plate' }],
        correct: isHindi ? 'टॉर्च' : 'Torch'
      },
      {
        type: 'reasoning', icon: '🍞',
        scenario: isHindi ? 'आपको बहुत तेज भूख लगी है और पेट खाली है।' : 'You are feeling very hungry and your stomach is empty.',
        question: isHindi ? 'आप इनमें से क्या खाएंगे?' : 'Which of these will you eat?',
        options: isHindi ? [{ emoji: '🍞', label: 'रोटी' }, { emoji: '🧱', label: 'ईंट' }, { emoji: '📚', label: 'किताब' }] : [{ emoji: '🍞', label: 'Roti / Bread' }, { emoji: '🧱', label: 'Brick' }, { emoji: '📚', label: 'Book' }],
        correct: isHindi ? 'रोटी' : 'Roti / Bread'
      }
    ];
  }

  // ============================================================================
  // LEVEL: PRIMARY (Class 1-5 level) - 20 Unique Questions
  // ============================================================================
  if (level === 'primary') {
    return [
      // Reading (5)
      { type: 'reading', text: isHindi ? "पेड़ पर बंदर बैठा है।" : "The quick cat runs fast.", question: isHindi ? "पेड़ पर कौन बैठा है?" : "Who runs fast?", options: isHindi ? ["बंदर", "तोता", "चिड़िया", "बिल्ली"] : ["Cat", "Dog", "Rabbit", "Mouse"], correct: isHindi ? "बंदर" : "Cat" },
      { type: 'reading', text: isHindi ? "सूरज पूर्व दिशा से ______ है।" : "The sun shines in the ______.", question: isHindi ? "रिक्त स्थान भरें:" : "Fill in the blank:", options: isHindi ? ["उगता", "डूबता", "बहता", "उड़ता"] : ["sky", "water", "ground", "forest"], correct: isHindi ? "उगता" : "sky" },
      { type: 'reading', text: isHindi ? "कल स्कूल बंद रहेगा।" : "Tomorrow is a school holiday.", question: isHindi ? "कल स्कूल क्या रहेगा?" : "What is tomorrow at school?", options: isHindi ? ["खुला", "बंद", "नया", "बड़ा"] : ["Open day", "Holiday", "Exam day", "Sport day"], correct: isHindi ? "बंद" : "Holiday" },
      { type: 'reading', text: isHindi ? "मुझे आम बहुत मीठा लगा।" : "The yellow mango is very sweet.", question: isHindi ? "आम कैसा लगा?" : "How does the mango taste?", options: isHindi ? ["खट्टा", "कड़वा", "मीठा", "नमकीन"] : ["Sour", "Sweet", "Bitter", "Salty"], correct: isHindi ? "मीठा" : "Sweet" },
      { type: 'reading', text: isHindi ? "यह नीली पतंग बहुत सुंदर है।" : "This is a beautiful blue kite.", question: isHindi ? "पतंग का रंग क्या है?" : "What color is the kite?", options: isHindi ? ["पीला", "लाल", "नीला", "काला"] : ["Yellow", "Red", "Blue", "Black"], correct: isHindi ? "नीला" : "Blue" },
      // Writing (5)
      { type: 'writing', char: isHindi ? 'किताब' : 'Book', instruction: isHindi ? "शब्द 'किताब' लिखें" : "Write the word 'Book'" },
      { type: 'writing', char: isHindi ? 'कलम' : 'Pen', instruction: isHindi ? "शब्द 'कलम' लिखें" : "Write the word 'Pen'" },
      { type: 'writing', char: isHindi ? 'स्कूल' : 'Tree', instruction: isHindi ? "शब्द 'स्कूल' लिखें" : "Write the word 'Tree'" },
      { type: 'writing', char: isHindi ? 'दोस्त' : 'Friend', instruction: isHindi ? "शब्द 'दोस्त' लिखें" : "Write the word 'Friend'" },
      { type: 'writing', char: isHindi ? 'पानी' : 'Water', instruction: isHindi ? "शब्द 'पानी' लिखें" : "Write the word 'Water'" },
      // Speaking (5)
      { type: 'speaking', phrase: isHindi ? 'नमस्ते मेरे दोस्त' : 'Hello my friend', instruction: isHindi ? "बोलें 'नमस्ते मेरे दोस्त'" : "Say 'Hello my friend'" },
      { type: 'speaking', phrase: isHindi ? 'मुझे पढ़ना अच्छा लगता है' : 'I love reading books', instruction: isHindi ? "बोलें 'मुझे पढ़ना अच्छा लगता है'" : "Say 'I love reading books'" },
      { type: 'speaking', phrase: isHindi ? 'आसमान का रंग नीला है' : 'Sky is blue today', instruction: isHindi ? "बोलें 'आसमान का रंग नीला है'" : "Say 'Sky is blue today'" },
      { type: 'speaking', phrase: isHindi ? 'आज बहुत तेज धूप है' : 'It is sunny outside', instruction: isHindi ? "बोलें 'आज बहुत तेज धूप है'" : "Say 'It is sunny outside'" },
      { type: 'speaking', phrase: isHindi ? 'हम सब मिलकर खेलते हैं' : 'We play together daily', instruction: isHindi ? "बोलें 'हम सब मिलकर खेलते हैं'" : "Say 'We play together daily'" },
      // Reasoning (5)
      {
        type: 'reasoning', icon: '🚌',
        scenario: isHindi ? 'स्कूल बस का समय सुबह 7:30 बजे है और आपकी घड़ी में 7:20 बजे हैं।' : 'The school bus arrives at 7:30 AM. Your watch shows 7:20 AM.',
        question: isHindi ? 'आपके पास कितना समय बचा है?' : 'How much time do you have left?',
        options: isHindi ? [{ emoji: '⏰', label: '10 मिनट' }, { emoji: '⏰', label: '20 मिनट' }, { emoji: '⏰', label: '30 मिनट' }] : [{ emoji: '⏰', label: '10 minutes' }, { emoji: '⏰', label: '20 minutes' }, { emoji: '⏰', label: '30 minutes' }],
        correct: isHindi ? '10 मिनट' : '10 minutes'
      },
      {
        type: 'reasoning', icon: '📕',
        scenario: isHindi ? 'पुस्तकालय से ली गई किताब को 7 दिनों में वापस करना है।' : 'A library book must be returned in 7 days.',
        question: isHindi ? 'यदि आप उसे समय पर वापस नहीं करते हैं तो क्या हो सकता है?' : 'What happens if you return it late?',
        options: isHindi ? [{ emoji: '⚠️', label: 'जुर्माना लग सकता है' }, { emoji: '🎁', label: 'उपहार मिलेगा' }, { emoji: '✅', label: 'कुछ नहीं होगा' }] : [{ emoji: '⚠️', label: 'A fine may apply' }, { emoji: '🎁', label: 'Get a reward' }, { emoji: '✅', label: 'Nothing changes' }],
        correct: isHindi ? 'जुर्माना लग सकता है' : 'A fine may apply'
      },
      {
        type: 'reasoning', icon: '🥔',
        scenario: isHindi ? 'सब्जी विक्रेता कहता है कि आलू ₹20 प्रति किलो हैं।' : 'The vegetable seller says that potatoes cost $2 per kilo.',
        question: isHindi ? 'आपको 2 किलो आलू खरीदने के लिए कितने पैसे देने होंगे?' : 'How much will you pay for 2 kilos of potatoes?',
        options: isHindi ? [{ emoji: '💵', label: '₹40' }, { emoji: '💵', label: '₹20' }, { emoji: '💵', label: '₹50' }] : [{ emoji: '💵', label: '$4' }, { emoji: '💵', label: '$2' }, { emoji: '💵', label: '$5' }],
        correct: isHindi ? '₹40' : '$4'
      },
      {
        type: 'reasoning', icon: '✏️',
        scenario: isHindi ? 'आपके परीक्षा पत्र पर निर्देश लिखा है: "सभी 5 प्रश्न अनिवार्य हैं।"' : 'Your exam paper instruction states: "All 5 questions are compulsory."',
        question: isHindi ? 'आपको परीक्षा में कितने प्रश्न हल करने चाहिए?' : 'How many questions should you solve?',
        options: isHindi ? [{ emoji: '✏️', label: 'सभी 5 प्रश्न' }, { emoji: '🚫', label: 'केवल 2 प्रश्न' }, { emoji: '❌', label: 'कोई भी नहीं' }] : [{ emoji: '✏️', label: 'All 5 questions' }, { emoji: '🚫', label: 'Only 2 questions' }, { emoji: '❌', label: 'None' }],
        correct: isHindi ? 'सभी 5 प्रश्न' : 'All 5 questions'
      },
      {
        type: 'reasoning', icon: '🧸',
        scenario: isHindi ? 'खिलौने की दुकान के बाहर लिखा है: "खिलौनों पर 50% की छूट"। खिलौने की मूल कीमत ₹100 है।' : 'A toy store sign says: "50% off on toys". The original price of a toy is $100.',
        question: isHindi ? 'छूट के बाद खिलौने की कीमत क्या होगी?' : 'What will be the price of the toy after discount?',
        options: isHindi ? [{ emoji: '💵', label: '₹50' }, { emoji: '💵', label: '₹80' }, { emoji: '💵', label: '₹100' }] : [{ emoji: '💵', label: '$50' }, { emoji: '💵', label: '$80' }, { emoji: '💵', label: '$100' }],
        correct: isHindi ? '₹50' : '$50'
      }
    ];
  }

  // ============================================================================
  // LEVEL: MIDDLE (Class 6-8 level) - 20 Unique Questions
  // ============================================================================
  if (level === 'middle') {
    return [
      // Reading (5)
      { type: 'reading', text: isHindi ? "विज्ञान ने मनुष्य के जीवन को बेहद सरल बना दिया है।" : "Science has made human life very simple and comfortable.", question: isHindi ? "विज्ञान ने जीवन को कैसा बनाया है?" : "What has science done to human life?", options: isHindi ? ["बेहद सरल", "कठिन", "उदासीन", "अकेला"] : ["simple and comfortable", "difficult", "boring", "stressful"], correct: isHindi ? "बेहद सरल" : "simple and comfortable" },
      { type: 'reading', text: isHindi ? "समय का सदुपयोग करने वाले लोग हमेशा ______ होते हैं।" : "People who manage time properly always ______.", question: isHindi ? "रिक्त स्थान भरें:" : "Fill in the blank:", options: isHindi ? ["सफल", "असफल", "आलसी", "दुखी"] : ["succeed", "fail", "procrastinate", "complain"], correct: isHindi ? "सफल" : "succeed" },
      { type: 'reading', text: isHindi ? "पेड़ हमें प्राणवायु ऑक्सीजन और मीठे फल प्रदान करते हैं।" : "Trees provide us oxygen and sweet edible fruits.", question: isHindi ? "पेड़ हमें कौन सी गैस प्रदान करते हैं?" : "What gas do trees provide us?", options: isHindi ? ["ऑक्सीजन", "नाइट्रोजन", "कार्बन", "हाइड्रोजन"] : ["Oxygen", "Nitrogen", "Carbon", "Hydrogen"], correct: isHindi ? "ऑक्सीजन" : "Oxygen" },
      { type: 'reading', text: isHindi ? "स्वास्थ्य ही मनुष्य का सबसे बड़ा वास्तविक धन है।" : "Health is the greatest real wealth of human life.", question: isHindi ? "मनुष्य का सबसे बड़ा धन क्या है?" : "What is the greatest wealth of humans?", options: isHindi ? ["स्वास्थ्य", "सोना", "गाड़ी", "बंगला"] : ["Health", "Gold", "Car", "House"], correct: isHindi ? "स्वास्थ्य" : "Health" },
      { type: 'reading', text: isHindi ? "पुस्तकालय में हमेशा शांत रहकर पढ़ना चाहिए।" : "A library is a quiet place intended for studying.", question: isHindi ? "पुस्तकालय में कैसा व्यवहार करना चाहिए?" : "How should one behave in a library?", options: isHindi ? ["शांत रहना", "शोर मचाना", "खेलना", "गाना"] : ["Remain quiet", "Make noise", "Play games", "Sing songs"], correct: isHindi ? "शांत रहना" : "Remain quiet" },
      // Writing (5)
      { type: 'writing', char: isHindi ? 'विज्ञान' : 'Science', instruction: isHindi ? "शब्द 'विज्ञान' लिखें" : "Write the word 'Science'" },
      { type: 'writing', char: isHindi ? 'सफलता' : 'Success', instruction: isHindi ? "शब्द 'सफलता' लिखें" : "Write the word 'Success'" },
      { type: 'writing', char: isHindi ? 'स्वास्थ्य' : 'Health', instruction: isHindi ? "शब्द 'स्वास्थ्य' लिखें" : "Write the word 'Health'" },
      { type: 'writing', char: isHindi ? 'नियम' : 'Respect', instruction: isHindi ? "शब्द 'नियम' लिखें" : "Write the word 'Respect'" },
      { type: 'writing', char: isHindi ? 'पर्यावरण' : 'Nature', instruction: isHindi ? "शब्द 'पर्यावरण' लिखें" : "Write the word 'Nature'" },
      // Speaking (5)
      { type: 'speaking', phrase: isHindi ? 'समय का मूल्य समझें और मेहनत करें' : 'Value of time is key to success', instruction: isHindi ? "बोलें 'समय का मूल्य समझें और मेहनत करें'" : "Say 'Value of time is key to success'" },
      { type: 'speaking', phrase: isHindi ? 'पेड़ लगाओ और पर्यावरण बचाओ' : 'Plant trees to protect our environment', instruction: isHindi ? "बोलें 'पेड़ लगाओ और पर्यावरण बचाओ'" : "Say 'Plant trees to protect our environment'" },
      { type: 'speaking', phrase: isHindi ? 'पुस्तकालय ज्ञान का भंडार होता है' : 'Library is a house of knowledge', instruction: isHindi ? "बोलें 'पुस्तकालय ज्ञान का भंडार होता है'" : "Say 'Library is a house of knowledge'" },
      { type: 'speaking', phrase: isHindi ? 'नियमित योग करने से मन शांत रहता है' : 'Regular yoga keeps the mind calm', instruction: isHindi ? "बोलें 'नियमित योग करने से मन शांत रहता है'" : "Say 'Regular yoga keeps the mind calm'" },
      { type: 'speaking', phrase: isHindi ? 'सच्चाई की हमेशा जीत होती है' : 'Honesty is always the best policy', instruction: isHindi ? "बोलें 'सच्चाई की हमेशा जीत होती है'" : "Say 'Honesty is always the best policy'" },
      // Reasoning (5)
      {
        type: 'reasoning', icon: '🔬',
        scenario: isHindi ? 'स्कूल का नोटिस: "विज्ञान प्रदर्शनी में भाग लेने के लिए बुधवार तक नाम दें।"' : 'A school notice says: "Submit your names for the science exhibition by Wednesday."',
        question: isHindi ? 'यदि आप गुरुवार को पंजीकरण कराने जाते हैं तो क्या होगा?' : 'What happens if you go to register on Thursday?',
        options: isHindi ? [{ emoji: '🚫', label: 'पंजीकरण नहीं होगा' }, { emoji: '✅', label: 'पंजीकरण हो जाएगा' }, { emoji: '💵', label: 'पुरस्कार मिलेगा' }] : [{ emoji: '🚫', label: 'Registration closed' }, { emoji: '✅', label: 'Registered successfully' }, { emoji: '💵', label: 'Get a prize' }],
        correct: isHindi ? 'पंजीकरण नहीं होगा' : 'Registration closed'
      },
      {
        type: 'reasoning', icon: '💻',
        scenario: isHindi ? 'कंप्यूटर लैब गाइडलाइन: "बिना अनुमति के पेन ड्राइव या कोई बाहरी उपकरण न लगाएं।"' : 'Computer lab rule: "Do not insert pen drives or external devices without permission."',
        question: isHindi ? 'यदि आपको अपना होमवर्क कॉपी करना है, तो आप क्या करेंगे?' : 'If you need to copy your homework file, what should you do?',
        options: isHindi ? [{ emoji: '🙋', label: 'शिक्षक से अनुमति मांगें' }, { emoji: '⚡', label: 'चुपके से पेन ड्राइव लगाएं' }, { emoji: '❌', label: 'होमवर्क न करें' }] : [{ emoji: '🙋', label: 'Ask the teacher for permission' }, { emoji: '⚡', label: 'Insert it secretly' }, { emoji: '❌', label: 'Do not submit homework' }],
        correct: isHindi ? 'शिक्षक से अनुमति मांगें' : 'Ask the teacher for permission'
      },
      {
        type: 'reasoning', icon: '🚲',
        scenario: isHindi ? 'साइकिल स्टैंड बोर्ड: "अपनी साइकिल में ताला जरूर लगाएं, चोरी होने पर स्कूल जिम्मेदार नहीं होगा।"' : 'Bicycle stand sign: "Lock your cycle. School is not responsible for any thefts."',
        question: isHindi ? 'सुरक्षित पार्किंग के लिए आपको क्या करना चाहिए?' : 'What should you do for safe parking?',
        options: isHindi ? [{ emoji: '🔒', label: 'साइकिल को ताला लगाएं' }, { emoji: '🚲', label: 'बिना ताले के छोड़ दें' }, { emoji: '🛣️', label: 'सड़क पर पार्क करें' }] : [{ emoji: '🔒', label: 'Lock your cycle' }, { emoji: '🚲', label: 'Leave it unlocked' }, { emoji: '🛣️', label: 'Park on the main road' }],
        correct: isHindi ? 'साइकिल को ताला लगाएं' : 'Lock your cycle'
      },
      {
        type: 'reasoning', icon: '⚽',
        scenario: isHindi ? 'खेल विभाग की सूचना: "खेल का सामान शाम 5:00 बजे से पहले वापस जमा करें।"' : 'Sports department rule: "Return sports equipment before 5:00 PM."',
        question: isHindi ? 'यदि आप शाम 5:30 बजे सामान लौटाते हैं, तो क्या होगा?' : 'What happens if you return the equipment at 5:30 PM?',
        options: isHindi ? [{ emoji: '⚠️', label: 'नियमों का उल्लंघन माना जाएगा' }, { emoji: '🎁', label: 'विशेष इनाम मिलेगा' }, { emoji: '✅', label: 'कुछ नहीं होगा' }] : [{ emoji: '⚠️', label: 'Considered rule violation' }, { emoji: '🎁', label: 'Get a special reward' }, { emoji: '✅', label: 'Nothing happens' }],
        correct: isHindi ? 'नियमों का उल्लंघन माना जाएगा' : 'Considered rule violation'
      },
      {
        type: 'reasoning', icon: '📝',
        scenario: isHindi ? 'परीक्षा गाइडलाइन: "उत्तर पुस्तिका पर अपना रोल नंबर स्पष्ट अक्षरों में लिखें।"' : 'Exam rule: "Write your roll number clearly on the answer sheet."',
        question: isHindi ? 'रोल नंबर लिखना क्यों आवश्यक है?' : 'Why is writing your roll number necessary?',
        options: isHindi ? [{ emoji: '✍️', label: 'ताकि आपकी कॉपी पहचानी जा सके' }, { emoji: '💯', label: 'अतिरिक्त अंक पाने के लिए' }, { emoji: '🎨', label: 'केवल सजावट के लिए' }] : [{ emoji: '✍️', label: 'To identify your paper' }, { emoji: '💯', label: 'To get extra marks' }, { emoji: '🎨', label: 'Just for decoration' }],
        correct: isHindi ? 'ताकि आपकी कॉपी पहचानी जा सके' : 'To identify your paper'
      }
    ];
  }

  // ============================================================================
  // LEVEL: HIGH (Class 9-12 level) - 20 Unique Questions
  // ============================================================================
  return [
    // Reading (5)
    { type: 'reading', text: isHindi ? "लोकतंत्र में प्रत्येक नागरिक के पास मतदान का मौलिक अधिकार है।" : "In a democracy, every citizen possesses the fundamental right to vote.", question: isHindi ? "नागरिकों के पास कौन सा मौलिक अधिकार है?" : "What fundamental right is mentioned?", options: isHindi ? ["मतदान का", "यात्रा का", "व्यापार का", "भोजन का"] : ["right to vote", "right to travel", "right to trade", "right to food"], correct: isHindi ? "मतदान का" : "right to vote" },
    { type: 'reading', text: isHindi ? "डिजिटल साक्षरता आज के युग में वित्तीय सुरक्षा के लिए ______ है।" : "Digital literacy is crucial for financial ______ in modern times.", question: isHindi ? "रिक्त स्थान भरें:" : "Fill in the blank:", options: isHindi ? ["अनिवार्य", "व्यर्थ", "खतरनाक", "कठिन"] : ["security", "struggle", "loss", "trouble"], correct: isHindi ? "अनिवार्य" : "security" },
    { type: 'reading', text: isHindi ? "संवैधानिक प्रावधानों के अनुसार, कानून के समक्ष सभी नागरिक समान हैं।" : "According to constitutional provisions, all citizens are equal before law.", question: isHindi ? "कानून के समक्ष नागरिक कैसे हैं?" : "How does the law treat citizens?", options: isHindi ? ["समान", "असमान", "विशिष्ट", "विभाजित"] : ["equal", "unequal", "separated", "privileged"], correct: isHindi ? "समान" : "equal" },
    { type: 'reading', text: isHindi ? "जलवायु परिवर्तन वैश्विक कृषि उत्पादन को गंभीर रूप से प्रभावित कर रहा है।" : "Climate change is severely impacting global agricultural output.", question: isHindi ? "जलवायु परिवर्तन किसे गंभीर रूप से प्रभावित कर रहा है?" : "What is climate change severely impacting?", options: isHindi ? ["कृषि उत्पादन को", "खनिज उत्खनन को", "आईटी सेक्टर को", "फैशन जगत को"] : ["agricultural output", "mineral mining", "IT sector", "fashion world"], correct: isHindi ? "कृषि उत्पादन को" : "agricultural output" },
    { type: 'reading', text: isHindi ? "सतत विकास का अर्थ प्राकृतिक संसाधनों का जिम्मेदारी से उपयोग करना है।" : "Sustainable development means utilizing resources responsibly.", question: isHindi ? "सतत विकास का क्या अर्थ है?" : "What does sustainable development mean?", options: isHindi ? ["जिम्मेदारी से उपयोग", "संसाधनों का दोहन", "संसाधनों को नष्ट करना", "भविष्य को अनदेखा करना"] : ["utilizing resources responsibly", "exploiting all resources", "destroying natural resources", "ignoring the future"], correct: isHindi ? "जिम्मेदारी से उपयोग" : "utilizing resources responsibly" },
    // Writing (5)
    { type: 'writing', char: isHindi ? 'लोकतंत्र' : 'Democracy', instruction: isHindi ? "शब्द 'लोकतंत्र' लिखें" : "Write the word 'Democracy'" },
    { type: 'writing', char: isHindi ? 'संविधान' : 'Constitution', instruction: isHindi ? "शब्द 'संविधान' लिखें" : "Write the word 'Constitution'" },
    { type: 'writing', char: isHindi ? 'वित्तीय' : 'Financial', instruction: isHindi ? "शब्द 'वित्तीय' लिखें" : "Write the word 'Financial'" },
    { type: 'writing', char: isHindi ? 'जिम्मेदारी' : 'Responsibility', instruction: isHindi ? "शब्द 'जिम्मेदारी' लिखें" : "Write the word 'Responsibility'" },
    { type: 'writing', char: isHindi ? 'अधिकार' : 'Authority', instruction: isHindi ? "शब्द 'अधिकार' लिखें" : "Write the word 'Authority'" },
    // Speaking (5)
    { type: 'speaking', phrase: isHindi ? 'डिजिटल साक्षरता से वित्तीय सुरक्षा बढ़ती है' : 'Digital literacy enhances financial security', instruction: isHindi ? "बोलें 'डिजिटल साक्षरता से वित्तीय सुरक्षा बढ़ती है'" : "Say 'Digital literacy enhances financial security'" },
    { type: 'speaking', phrase: isHindi ? 'सभी नागरिकों को समान अधिकार प्राप्त हैं' : 'All citizens are equal under constitution', instruction: isHindi ? "बोलें 'सभी नागरिकों को समान अधिकार प्राप्त हैं'" : "Say 'All citizens are equal under constitution'" },
    { type: 'speaking', phrase: isHindi ? 'पर्यावरण संरक्षण हमारी नैतिक जिम्मेदारी है' : 'Protecting nature is our moral obligation', instruction: isHindi ? "बोलें 'पर्यावरण संरक्षण हमारी नैतिक जिम्मेदारी है'" : "Say 'Protecting nature is our moral obligation'" },
    { type: 'speaking', phrase: isHindi ? 'अनेकता में एकता भारत की विशेषता है' : 'Unity in diversity is Indias strength', instruction: isHindi ? "बोलें 'अनेकता में एकता भारत की विशेषता है'" : "Say 'Unity in diversity is Indias strength'" },
    { type: 'speaking', phrase: isHindi ? 'शिक्षा से ही समाज का विकास संभव है' : 'Education leads to progress of society', instruction: isHindi ? "बोलें 'शिक्षा से ही समाज का विकास संभव है'" : "Say 'Education leads to progress of society'" },
    // Reasoning (5)
    {
      type: 'reasoning', icon: '🏠',
      scenario: isHindi ? 'किराया समझौते में लिखा है: "हर साल किराए में 10% की वृद्धि होगी।" वर्तमान किराया ₹10,000 है।' : 'Rental agreement: "Rent will increase by 10% annually." Current rent is $10,000.',
      question: isHindi ? 'अगले वर्ष आपका मासिक किराया कितना होगा?' : 'How much will your rent be next year?',
      options: isHindi ? [{ emoji: '💵', label: '₹11,000' }, { emoji: '💵', label: '₹12,000' }, { emoji: '💵', label: '₹10,500' }] : [{ emoji: '💵', label: '$11,000' }, { emoji: '💵', label: '$12,000' }, { emoji: '💵', label: '$10,500' }],
      correct: isHindi ? '₹11,000' : '$11,000'
    },
    {
      type: 'reasoning', icon: '📝',
      scenario: isHindi ? 'आपकी सैलरी स्लिप में लिखा है: "भविष्य निधि अंशदान काटने के बाद वेतन जमा किया गया।"' : 'Your payslip reads: "Salary credited after deduction of provident fund contribution."',
      question: isHindi ? 'आपके वेतन में से क्या काटा गया है?' : 'What has been subtracted from your salary?',
      options: isHindi ? [{ emoji: '🏦', label: 'भविष्य निधि अंशदान' }, { emoji: '🍽️', label: 'भोजन भत्ता' }, { emoji: '🚌', label: 'यात्रा बोनस' }] : [{ emoji: '🏦', label: 'Provident fund contribution' }, { emoji: '🍽️', label: 'Food allowance' }, { emoji: '🚌', label: 'Travel bonus' }],
      correct: isHindi ? 'भविष्य निधि अंशदान' : 'Provident fund contribution'
    },
    {
      type: 'reasoning', icon: '🗳️',
      scenario: isHindi ? 'मतदाता सूची में नाम जुड़वाने के लिए फॉर्म 6 भरना पड़ता है।' : 'To add your name to the voter list, you must fill Form 6.',
      question: isHindi ? 'यदि आप नए शहर में वोट देना चाहते हैं, तो आप क्या करेंगे?' : 'If you move to a new city and want to vote, what will you do?',
      options: isHindi ? [{ emoji: '📝', label: 'फॉर्म 6 भरेंगे' }, { emoji: '🚫', label: 'चुनाव का बहिष्कार करेंगे' }, { emoji: '🗳️', label: 'सीधे पोलिंग बूथ चले जाएंगे' }] : [{ emoji: '📝', label: 'Fill Form 6' }, { emoji: '🚫', label: 'Boycott election' }, { emoji: '🗳️', label: 'Go directly to polling booth' }],
      correct: isHindi ? 'फॉर्म 6 भरेंगे' : 'Fill Form 6'
    },
    {
      type: 'reasoning', icon: '🏦',
      scenario: isHindi ? 'बैंक फिक्स डिपॉजिट नियम: "अवधि से पहले निकासी पर 1% जुर्माना लागू होगा।"' : 'Fixed deposit terms: "1% penalty applies on premature withdrawal."',
      question: isHindi ? 'यदि आप परिपक्वता से पहले फिक्स डिपॉजिट बंद करते हैं तो क्या होगा?' : 'What happens if you close your FD before maturity?',
      options: isHindi ? [{ emoji: '⚠️', label: '1% जुर्माना काटा जाएगा' }, { emoji: '❌', label: 'खाता बंद नहीं किया जाएगा' }, { emoji: '💰', label: 'बोनस ब्याज मिलेगा' }] : [{ emoji: '⚠️', label: '1% penalty deducted' }, { emoji: '❌', label: 'Account will not close' }, { emoji: '💰', label: 'Get bonus interest' }],
      correct: isHindi ? '1% जुर्माना काटा जाएगा' : '1% penalty deducted'
    },
    {
      type: 'reasoning', icon: '📅',
      scenario: isHindi ? 'आयकर रिटर्न दाखिल करने की अंतिम तिथि 31 जुलाई है, जिसके बाद विलंब शुल्क लागू होगा।' : 'Income tax return deadline is July 31. Late fee applies thereafter.',
      question: isHindi ? 'यदि आप 15 अगस्त को रिटर्न दाखिल करते हैं, तो क्या होगा?' : 'What happens if you file your return on August 15?',
      options: isHindi ? [{ emoji: '💵', label: 'विलंब शुल्क लगेगा' }, { emoji: '❌', label: 'रिटर्न अस्वीकार हो जाएगा' }, { emoji: '✅', label: 'बोनस रिफंड मिलेगा' }] : [{ emoji: '💵', label: 'Late fee will be charged' }, { emoji: '❌', label: 'Return will be rejected' }, { emoji: '✅', label: 'Get bonus refund' }],
      correct: isHindi ? 'विलंब शुल्क लगेगा' : 'Late fee will be charged'
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

export default function InitialAssessment({ userId, fullName, lang, age, selectedLevel, onComplete, onExit, t }) {
  const [step, setStep] = useState('welcome'); // welcome, reading, writing, speaking, reasoning, result
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionScores, setQuestionScores] = useState(Array(20).fill(0));
  const [tempSpeakingScore, setTempSpeakingScore] = useState(0);

  const [readingScore, setReadingScore] = useState(0);
  const [writingScore, setWritingScore] = useState(0);
  const [speakingScore, setSpeakingScore] = useState(0);
  const [reasoningScore, setReasoningScore] = useState(0);
  const [overallScore, setOverallScore] = useState(0);
  const [assessedLevel, setAssessedLevel] = useState('none');
  const [loading, setLoading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Animated Astronaut Companion states
  const [showThumbsUp, setShowThumbsUp] = useState(false);
  const [mascotMessage, setMascotMessage] = useState('');

  // States for Reading
  const [selectedReadingOption, setSelectedReadingOption] = useState('');

  // State for Section 4: Applied Reasoning (age + level combined scenario card)
  const [selectedReasoningCard, setSelectedReasoningCard] = useState('');

  // States for Writing
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isAnalyzingWriting, setIsAnalyzingWriting] = useState(false);

  // States for Speaking
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');

  // Fallback language & level selection
  const langKey = lang === 'hindi' ? 'hindi' : 'english';
  const levelKey = selectedLevel || 'none';
  const ageBracket = getAgeBracket(age);

  // Dynamically load the base questions
  const baseQuestions = getAssessmentQuestions(langKey, levelKey, ageBracket);
  
  // Inject the dynamically generated age-specific reasoning questions (pad to 5 to preserve UI grid logic)
  const ageGroupData = ageSpecificReasoning[ageBracket]?.[levelKey] || [];
  const specificReasoning = ageGroupData.slice(0, 3);
  const remainingReasoning = baseQuestions.slice(15, 20).filter((_, i) => i >= specificReasoning.length);
  const reasoningQuestions = [...specificReasoning, ...remainingReasoning];
  
  const questions = [...baseQuestions.slice(0, 15), ...reasoningQuestions];
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
    const praisesHindi = [
      "👍 बहुत बढ़िया! शानदार प्रयास!",
      "👍 शाबाश! आपने बहुत अच्छा किया!",
      "👍 अद्भुत! अगला प्रश्न शुरू!",
      "👍 थम्ब्स अप! आगे बढ़ते रहें!"
    ];
    const praisesEnglish = [
      "👍 Great job! Excellent effort!",
      "👍 Thumbs up! You nailed it!",
      "👍 Fantastic! Next question ready!",
      "👍 Superb! Keep going!"
    ];
    const praiseList = lang === 'hindi' ? praisesHindi : praisesEnglish;
    const randomPraise = praiseList[Math.floor(Math.random() * praiseList.length)];

    setMascotMessage(randomPraise);
    setShowThumbsUp(true);
    setTimeout(() => {
      setShowThumbsUp(false);
    }, 2800);

    // Reset temporary states
    setSelectedReadingOption('');
    setSelectedReasoningCard('');
    setSpeechTranscript('');
    setTempSpeakingScore(0);
    setHasDrawn(false);

    if (currentQuestionIndex < 19) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setStep(questions[nextIndex].type);
    } else {
      // 15 questions completed! Aggregate scores
      const avgReading = Math.round(updatedScores.slice(0, 5).reduce((a, b) => a + b, 0) / 5);
      const avgWriting = Math.round(updatedScores.slice(5, 10).reduce((a, b) => a + b, 0) / 5);
      const avgSpeaking = Math.round(updatedScores.slice(10, 15).reduce((a, b) => a + b, 0) / 5);
      const avgReasoning = Math.round(updatedScores.slice(15, 20).reduce((a, b) => a + b, 0) / 5);

      setReadingScore(avgReading);
      setWritingScore(avgWriting);
      setSpeakingScore(avgSpeaking);
      setReasoningScore(avgReasoning);

      const finalOverall = Math.round((avgReading + avgWriting + avgSpeaking + avgReasoning) / 4);
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
      const response = await fetch('http://127.0.0.1:5000/api/assessment/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang: langKey,
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

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'hindi' ? 'hi-IN' : 'en-US';
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
          reasoning: reasoningScore,
          overall: overallScore,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`sakshar_initial_assessment_completed_${user.id}`, 'true');
        localStorage.setItem(`sakshar_initial_assessment_scores_${user.id}`, JSON.stringify(scoresPayload));

        // 2. Log final assessment history to SQLite
        try {
          await fetch('http://127.0.0.1:5000/api/assessment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.id,
              lang: lang,
              score: overallScore,
              level: assessedLevel,
              reasoning_score: reasoningScore,
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
    { key: 'reading', icon: '📖', label: 'Reading' },
    { key: 'writing', icon: '✏️', label: 'Writing' },
    { key: 'speaking', icon: '🗣️', label: 'Speaking' },
    { key: 'reasoning', icon: '🧩', label: 'Reasoning' },
  ];
  const currentSectionIdx = SECTIONS.findIndex(s => s.key === currentQuestion.type);

  // Distinct, vivid color identity per section — reused for headers, buttons,
  // progress fill, selected-state glows, and the mascot toast so every part
  // of the screen visually "belongs" to the section the learner is in.
  const SECTION_THEMES = {
    reading:   { grad: 'from-cyan-400 via-sky-500 to-blue-500',      solid: 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500',      accent: '#22d3ee', soft: 'rgba(34,211,238,0.14)',  border: 'rgba(34,211,238,0.5)',  glow: 'rgba(34,211,238,0.55)' },
    writing:   { grad: 'from-amber-400 via-orange-500 to-rose-500',  solid: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500',  accent: '#f59e0b', soft: 'rgba(245,158,11,0.14)',  border: 'rgba(245,158,11,0.5)',  glow: 'rgba(245,158,11,0.55)' },
    speaking:  { grad: 'from-fuchsia-500 via-pink-500 to-rose-500',  solid: 'bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500',  accent: '#ec4899', soft: 'rgba(236,72,153,0.14)',  border: 'rgba(236,72,153,0.5)',  glow: 'rgba(236,72,153,0.55)' },
    reasoning: { grad: 'from-indigo-400 via-purple-500 to-fuchsia-500', solid: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500', accent: '#818cf8', soft: 'rgba(129,140,248,0.14)', border: 'rgba(129,140,248,0.5)', glow: 'rgba(129,140,248,0.55)' },
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
              title="Exit Assessment"
            >
              <span>←</span>
              <span>{step === 'result' ? 'Back' : 'Exit'}</span>
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
              <span>Initial Assessment</span>
              <span className="tabular-nums">
                {currentQuestion.type === 'reading' && `Section 1 of 4 (Reading) - Q${currentQuestionIndex + 1}/5`}
                {currentQuestion.type === 'writing' && `Section 2 of 4 (Writing) - Q${currentQuestionIndex - 4}/5`}
                {currentQuestion.type === 'speaking' && `Section 3 of 4 (Speaking) - Q${currentQuestionIndex - 9}/5`}
                {currentQuestion.type === 'reasoning' && `Section 4 of 4 (Reasoning) - Q${currentQuestionIndex - 14}/5`}
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
              Welcome, {fullName}!
            </h2>

            <p
              className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto opacity-0 font-mono tracking-tight"
              style={{ animation: 'nxFadeUp 0.5s ease-out 0.3s forwards' }}
            >
              Let's customize your literacy learning journey with a quick 20-part assessment, evaluated in
              <span className="text-fuchsia-300 font-bold mx-1">{lang === 'hindi' ? 'Hindi' : 'English'}</span>.
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
                <span className="relative z-10">Start Assessment →</span>
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
              <h3 className="text-xl font-black text-white">Section 1: Reading</h3>
            </div>
            <p className="text-xs text-slate-500 font-mono">Read the text block below carefully, then answer the question.</p>
            
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
              <span className="relative z-10">{currentQuestionIndex === 4 ? 'Submit Section & Continue →' : 'Next Question →'}</span>
              {selectedReadingOption && <span className="absolute inset-0" style={{ animation: 'nxShimmer 2.2s linear infinite' }} />}
            </button>
          </div>
        )}

        {/* 3. WRITING SECTION */}
        {step === 'writing' && (
          <div key={`writing-${currentQuestionIndex}`} className="space-y-6" style={{ animation: 'nxStepIn 0.4s ease-out both' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl inline-block" style={{ animation: 'nxIconFloat 2.4s ease-in-out infinite' }}>✏️</span>
              <h3 className="text-xl font-black text-white">Section 2: Writing</h3>
            </div>
            <p className="text-xs text-slate-500 font-mono">{currentQuestion.instruction}. Draw inside the canvas envelope below.</p>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div
                className="text-center aspect-square flex flex-col justify-center items-center rounded-2xl"
                style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}
              >
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 font-mono">Target Word</span>
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
                    <span className="text-[9px] font-bold uppercase tracking-wider">Draw here</span>
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
                Clear Canvas
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
                    Analyzing...
                  </>
                ) : (currentQuestionIndex === 7 ? 'Submit Section & Continue →' : 'Next Question →')}
              </button>
            </div>
          </div>
        )}

        {/* 4. SPEAKING SECTION */}
        {step === 'speaking' && (
          <div key={`speaking-${currentQuestionIndex}`} className="space-y-6" style={{ animation: 'nxStepIn 0.4s ease-out both' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl inline-block" style={{ animation: 'nxIconFloat 2.4s ease-in-out infinite' }}>🗣️</span>
              <h3 className="text-xl font-black text-white">Section 3: Speaking</h3>
            </div>
            <p className="text-xs text-slate-500 font-mono">{currentQuestion.instruction}. Tap the microphone to record.</p>

            <div className="text-center space-y-2 py-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Read Aloud</span>
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
                {isListening ? 'Listening for speech input...' : 'Click to start microphone capture'}
              </span>

              {speechTranscript && (
                <div className="mt-4 px-4 py-2 max-w-xs text-center" style={{ animation: 'nxFadeUp 0.35s ease-out both' }}>
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5 font-mono">We Heard:</span>
                  <p className="text-xs font-semibold text-slate-300 italic">"{speechTranscript}"</p>
                  <span className="text-[10px] font-extrabold text-fuchsia-300 block mt-1">Accuracy: {tempSpeakingScore}%</span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleNextQuestion(tempSpeakingScore || 75)}
              disabled={isListening}
              className="relative overflow-hidden w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 text-white font-bold text-sm hover:brightness-110 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-30"
            >
              {currentQuestionIndex === 11 ? 'Submit Section & Continue →' : 'Next Question →'}
            </button>
          </div>
        )}

        {/* 5. APPLIED REASONING SECTION */}
        {step === 'reasoning' && (
          <div key={`reasoning-${currentQuestionIndex}`} className="space-y-6" style={{ animation: 'nxStepIn 0.4s ease-out both' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl inline-block" style={{ animation: 'nxIconFloat 2.4s ease-in-out infinite' }}>🧩</span>
              <h3 className="text-xl font-black text-white">Section 4: Applied Reasoning</h3>
            </div>
            <p className="text-xs text-slate-500 font-mono">Read the situation below, then tap the card that best answers the question.</p>

            <div className="space-y-3 py-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{currentQuestion.icon}</span>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest font-mono">Real-life situation</span>
              </div>
              <p className="text-sm font-semibold text-slate-200 leading-relaxed" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>{currentQuestion.scenario}</p>
            </div>

            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block pt-1 font-mono">{currentQuestion.question}</label>

            <div className="grid grid-cols-3 gap-2">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={option.label}
                  onClick={() => setSelectedReasoningCard(option.label)}
                  style={{ animation: `nxOptionIn 0.35s ease-out ${idx * 70}ms both` }}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all duration-150 cursor-pointer ${
                    selectedReasoningCard === option.label
                      ? 'border-indigo-400 bg-indigo-500/10 scale-[1.03] shadow-[0_0_20px_-6px_rgba(129,140,248,0.6)]'
                      : 'border-white/10 bg-white/[0.02] hover:border-indigo-400/40 hover:-translate-y-0.5'
                  }`}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className={`text-[10px] font-bold leading-snug ${selectedReasoningCard === option.label ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>

            <button
              disabled={!selectedReasoningCard}
              onClick={() => {
                const score = selectedReasoningCard === currentQuestion.correct ? 100 : 0;
                handleNextQuestion(score);
              }}
              className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 text-white font-bold text-sm hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              {currentQuestionIndex === 14 ? 'Finish & View Level Results →' : 'Next Question →'}
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
            <h2 className="text-2xl font-black tracking-tight leading-tight bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">Assessment Summary</h2>
            
            <div className="flex justify-center flex-wrap gap-x-3 gap-y-4 max-w-sm mx-auto">
              <RadialScore icon="📖" label="Reading" value={readingScore} delay={100} />
              <RadialScore icon="✏️" label="Writing" value={writingScore} delay={220} />
              <RadialScore icon="🗣️" label="Speaking" value={speakingScore} delay={340} />
              <RadialScore icon="🧩" label="Reasoning" value={reasoningScore} delay={460} />
            </div>

            <div className="flex flex-col items-center opacity-0" style={{ animation: 'nxFadeUp 0.5s ease-out 600ms forwards' }}>
              <RadialScore icon="🏆" label="Overall Competency" value={overallScore} delay={620} size={112} stroke={9} big />
            </div>

            <div className="space-y-2 max-w-sm mx-auto opacity-0" style={{ animation: 'nxFadeUp 0.5s ease-out 750ms forwards' }}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Dynamic Course Assigned:</span>
              <div className="py-1">
                <p className="text-base font-extrabold bg-gradient-to-r from-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">{getAssessedLevelLabel(assessedLevel)}</p>
                <p className="text-[10px] text-slate-400 mt-1">Setup personalization modules automatically tailored to your grade score.</p>
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
                      AI Evaluation Report
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">Sakshar Literacy Engine v2 · Detailed Analysis</p>
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
                    <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 font-mono mb-1.5">AI Verdict</p>
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
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono">Skill Breakdown</p>
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
                      {
                        label: 'Applied Reasoning',
                        value: reasoningScore,
                        color: '#f59e0b',
                        glow: 'rgba(245,158,11,0.5)',
                        icon: '🧩',
                        note: reasoningScore >= 75 ? 'Strong logical inference & pattern use' : reasoningScore >= 45 ? 'Basic reasoning present, needs depth' : 'Conceptual reasoning needs scaffolding',
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
                        label: 'Top Strength',
                        color: '#22d3ee',
                        bg: 'rgba(34,211,238,0.06)',
                        border: 'rgba(34,211,238,0.18)',
                        value: [
                          { label: 'Reading', value: readingScore },
                          { label: 'Writing', value: writingScore },
                          { label: 'Speaking', value: speakingScore },
                          { label: 'Reasoning', value: reasoningScore },
                        ].sort((a, b) => b.value - a.value)[0]?.label,
                        icon: '⭐',
                      },
                      {
                        label: 'Focus Area',
                        color: '#f87171',
                        bg: 'rgba(239,68,68,0.06)',
                        border: 'rgba(239,68,68,0.18)',
                        value: [
                          { label: 'Reading', value: readingScore },
                          { label: 'Writing', value: writingScore },
                          { label: 'Speaking', value: speakingScore },
                          { label: 'Reasoning', value: reasoningScore },
                        ].sort((a, b) => a.value - b.value)[0]?.label,
                        icon: '🎯',
                      },
                      {
                        label: 'Overall Score',
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
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono">AI Insights</p>
                    <div className="space-y-2">
                      {[
                        {
                          icon: '💡',
                          title: 'Cognitive Style',
                          desc: overallScore >= 65
                            ? 'Analytical learner — responds well to structured, logic-based content.'
                            : 'Visual learner — benefits most from image-based and audio-rich material.',
                          color: '#f59e0b',
                        },
                        {
                          icon: '🚀',
                          title: 'Pace Estimate',
                          desc: overallScore >= 70
                            ? 'Fast-track eligible — estimated module completion 30% faster than average.'
                            : overallScore >= 40
                            ? 'Standard pace — steady progression with reinforcement loops.'
                            : 'Supported pace — extra scaffolding and review cycles recommended.',
                          color: '#22d3ee',
                        },
                        {
                          icon: '📅',
                          title: 'Estimated Mastery',
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
                      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 font-mono">Recommended Learning Path</p>
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
                      <p className="text-[8px] text-emerald-400 font-mono font-bold">VERIFIED</p>
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
                  'Configure Profile & Enter Dashboard →'
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
            <h3 className="text-lg font-black text-white tracking-tight">Exit Initial Assessment?</h3>
            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              Your current assessment progress will be lost. Are you sure you want to exit?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-mono transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  if (onExit) onExit();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-bold font-mono transition cursor-pointer shadow-md"
              >
                Yes, Exit
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