import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../public/locales");

const EN = { quickReview: "Quick review", reviewCards: "Review ({count})", learnNewWords: "Learn new" };

const TRANSLATIONS = {
  afrikaans: { quickReview: "Vinnige hersiening", reviewCards: "Hersien ({count})", learnNewWords: "Leer nuut" },
  albanian: { quickReview: "Rishikim i shpejtë", reviewCards: "Rishiko ({count})", learnNewWords: "Mëso të reja" },
  amharic: { quickReview: "ፈጣን ክለሳ", reviewCards: "ክለሳ ({count})", learnNewWords: "አዲስ ተማር" },
  arabic: { quickReview: "مراجعة سريعة", reviewCards: "مراجعة ({count})", learnNewWords: "تعلم جديد" },
  armenian: { quickReview: "Արագ կրկնություն", reviewCards: "Կրկնել ({count})", learnNewWords: "Սովորել նոր" },
  azerbaijani: { quickReview: "Sürətli təkrar", reviewCards: "Təkrar et ({count})", learnNewWords: "Yeni öyrən" },
  basque: { quickReview: "Berrikuspena azkar", reviewCards: "Berrikusi ({count})", learnNewWords: "Berri ikasi" },
  belarusian: { quickReview: "Хуткае паўтарэнне", reviewCards: "Паўтарыць ({count})", learnNewWords: "Вучыць новае" },
  bengali: { quickReview: "দ্রুত পুনরালোচনা", reviewCards: "পর্যালোচনা ({count})", learnNewWords: "নতুন শিখুন" },
  bosnian: { quickReview: "Brzi pregled", reviewCards: "Pregledaj ({count})", learnNewWords: "Uči novo" },
  bulgarian: { quickReview: "Бърз преглед", reviewCards: "Преглед ({count})", learnNewWords: "Учи ново" },
  catalan: { quickReview: "Revisió ràpida", reviewCards: "Revisar ({count})", learnNewWords: "Aprèn nou" },
  "chinese-cantonese": { quickReview: "快速複習", reviewCards: "複習 ({count})", learnNewWords: "學新內容" },
  "chinese-mandarin": { quickReview: "快速复习", reviewCards: "复习 ({count})", learnNewWords: "学新内容" },
  croatian: { quickReview: "Brzi pregled", reviewCards: "Pregled ({count})", learnNewWords: "Uči novo" },
  czech: { quickReview: "Rychlé opakování", reviewCards: "Opakovat ({count})", learnNewWords: "Učit nové" },
  danish: { quickReview: "Hurtig gennemgang", reviewCards: "Gennemgå ({count})", learnNewWords: "Lær nyt" },
  dutch: { quickReview: "Snelle herhaling", reviewCards: "Herhalen ({count})", learnNewWords: "Leer nieuw" },
  estonian: { quickReview: "Kiire kordamine", reviewCards: "Korda ({count})", learnNewWords: "Õpi uut" },
  "filipino-tagalog": { quickReview: "Mabilis na review", reviewCards: "I-review ({count})", learnNewWords: "Matuto ng bago" },
  finnish: { quickReview: "Pikakerhaus", reviewCards: "Kertaa ({count})", learnNewWords: "Opi uutta" },
  french: { quickReview: "Révision rapide", reviewCards: "Réviser ({count})", learnNewWords: "Apprendre du nouveau" },
  galician: { quickReview: "Revisión rápida", reviewCards: "Revisar ({count})", learnNewWords: "Aprender novo" },
  georgian: { quickReview: "სწრაფი გამეორება", reviewCards: "გამეორება ({count})", learnNewWords: "ახლის სწავლა" },
  german: { quickReview: "Schnelle Wiederholung", reviewCards: "Wiederholen ({count})", learnNewWords: "Neues lernen" },
  greek: { quickReview: "Γρήγορη επανάληψη", reviewCards: "Επανάληψη ({count})", learnNewWords: "Μάθε νέα" },
  gujarati: { quickReview: "ઝડપી સમીક્ષા", reviewCards: "સમીક્ષા ({count})", learnNewWords: "નવું શીખો" },
  hausa: { quickReview: "Bitar sauri", reviewCards: "Sake duba ({count})", learnNewWords: "Koyi sabo" },
  hebrew: { quickReview: "סקירה מהירה", reviewCards: "סקירה ({count})", learnNewWords: "למד חדש" },
  hindi: { quickReview: "त्वरित समीक्षा", reviewCards: "समीक्षा ({count})", learnNewWords: "नया सीखें" },
  hungarian: { quickReview: "Gyors ismétlés", reviewCards: "Ismétlés ({count})", learnNewWords: "Újat tanulni" },
  icelandic: { quickReview: "Skjót endurskoðun", reviewCards: "Endurskoða ({count})", learnNewWords: "Læra nýtt" },
  indonesian: { quickReview: "Ulasan cepat", reviewCards: "Ulang ({count})", learnNewWords: "Belajar baru" },
  irish: { quickReview: "Athbhreithniú tapa", reviewCards: "Athbhreithnigh ({count})", learnNewWords: "Foghlaim nua" },
  italian: { quickReview: "Ripasso rapido", reviewCards: "Ripassare ({count})", learnNewWords: "Impara nuovo" },
  japanese: { quickReview: "クイック復習", reviewCards: "復習 ({count})", learnNewWords: "新しく学ぶ" },
  javanese: { quickReview: "Review cepet", reviewCards: "Review ({count})", learnNewWords: "Sinau anyar" },
  kannada: { quickReview: "ತ್ವರಿತ ಪರಿಶೀಲನೆ", reviewCards: "ಪರಿಶೀಲನೆ ({count})", learnNewWords: "ಹೊಸದು ಕಲಿಯಿರಿ" },
  kazakh: { quickReview: "Жылдам қайталау", reviewCards: "Қайталау ({count})", learnNewWords: "Жаңа үйрен" },
  khmer: { quickReview: "ពិនិត្យរហ័ស", reviewCards: "ពិនិត្យ ({count})", learnNewWords: "រៀនថ្មី" },
  korean: { quickReview: "빠른 복습", reviewCards: "복습 ({count})", learnNewWords: "새로 배우기" },
  kurdish: { quickReview: "Nirxandina bilez", reviewCards: "Nirxandin ({count})", learnNewWords: "Nû fêr bibe" },
  lao: { quickReview: "ທົບທວນດ່ວນ", reviewCards: "ທົບທວນ ({count})", learnNewWords: "ຮຽນໃໝ່" },
  latvian: { quickReview: "Ātrā atkārtošana", reviewCards: "Atkārtot ({count})", learnNewWords: "Mācīties jaunu" },
  lithuanian: { quickReview: "Greitas kartojimas", reviewCards: "Kartoti ({count})", learnNewWords: "Mokytis naujų" },
  macedonian: { quickReview: "Брз преглед", reviewCards: "Преглед ({count})", learnNewWords: "Учи ново" },
  malay: { quickReview: "Semakan pantas", reviewCards: "Semak ({count})", learnNewWords: "Belajar baru" },
  malayalam: { quickReview: "വേഗത്തിലുള്ള അവലോകനം", reviewCards: "അവലോകനം ({count})", learnNewWords: "പുതിയത് പഠിക്കുക" },
  maltese: { quickReview: "Reviżjoni rapida", reviewCards: "Irrevedi ({count})", learnNewWords: "Tgħallem ġdid" },
  maori: { quickReview: "Arotake tere", reviewCards: "Arotake ({count})", learnNewWords: "Ako hou" },
  marathi: { quickReview: "जलद पुनरावलोकन", reviewCards: "पुनरावलोकन ({count})", learnNewWords: "नवे शिका" },
  mongolian: { quickReview: "Хурдан давтах", reviewCards: "Давтах ({count})", learnNewWords: "Шинэ сурах" },
  nepali: { quickReview: "द्रुत समीक्षा", reviewCards: "समीक्षा ({count})", learnNewWords: "नयाँ सिक्नुहोस्" },
  norwegian: { quickReview: "Rask gjennomgang", reviewCards: "Gjennomgå ({count})", learnNewWords: "Lær nytt" },
  other: { quickReview: "Quick review", reviewCards: "Review ({count})", learnNewWords: "Learn new" },
  pashto: { quickReview: "ګړندۍ بیاکتنه", reviewCards: "بیاکتنه ({count})", learnNewWords: "نوې زده کړه" },
  persian: { quickReview: "مرور سریع", reviewCards: "مرور ({count})", learnNewWords: "یادگیری جدید" },
  polish: { quickReview: "Szybkie powtórzenie", reviewCards: "Powtórz ({count})", learnNewWords: "Ucz się nowego" },
  portuguese: { quickReview: "Revisão rápida", reviewCards: "Rever ({count})", learnNewWords: "Aprender novo" },
  punjabi: { quickReview: "ਤੇਜ਼ ਸਮੀਖਿਆ", reviewCards: "ਸਮੀਖਿਆ ({count})", learnNewWords: "ਨਵਾਂ ਸਿੱਖੋ" },
  romanian: { quickReview: "Recenzie rapidă", reviewCards: "Recenzează ({count})", learnNewWords: "Învață nou" },
  russian: { quickReview: "Быстрое повторение", reviewCards: "Повторить ({count})", learnNewWords: "Учить новое" },
  serbian: { quickReview: "Brzi pregled", reviewCards: "Pregled ({count})", learnNewWords: "Uči novo" },
  sinhala: { quickReview: "ඉක්මන් සමාලෝචනය", reviewCards: "සමාලෝචනය ({count})", learnNewWords: "නව ඉගෙනීම" },
  slovak: { quickReview: "Rýchle opakovanie", reviewCards: "Opakovať ({count})", learnNewWords: "Učiť sa nové" },
  slovenian: { quickReview: "Hitro ponavljanje", reviewCards: "Ponovi ({count})", learnNewWords: "Učiti novo" },
  somali: { quickReview: "Dib u eegis degdeg ah", reviewCards: "Dib u eeg ({count})", learnNewWords: "Baro cusub" },
  spanish: { quickReview: "Repaso rápido", reviewCards: "Repasar ({count})", learnNewWords: "Aprender nuevo" },
  swahili: { quickReview: "Mapitio ya haraka", reviewCards: "Pitia ({count})", learnNewWords: "Jifunza kipya" },
  swedish: { quickReview: "Snabb genomgång", reviewCards: "Gå igenom ({count})", learnNewWords: "Lär nytt" },
  tajik: { quickReview: "Такрори зуд", reviewCards: "Такрор кунед ({count})", learnNewWords: "Нав омӯзед" },
  tamil: { quickReview: "விரைவு மதிப்பாய்வு", reviewCards: "மதிப்பாய்வு ({count})", learnNewWords: "புதியதை கற்கவும்" },
  telugu: { quickReview: "శీఘ్ర సమీక్ష", reviewCards: "సమీక్ష ({count})", learnNewWords: "కొత్తది నేర్చుకోండి" },
  thai: { quickReview: "ทบทวนด่วน", reviewCards: "ทบทวน ({count})", learnNewWords: "เรียนใหม่" },
  turkish: { quickReview: "Hızlı tekrar", reviewCards: "Tekrar et ({count})", learnNewWords: "Yeni öğren" },
  ukrainian: { quickReview: "Швидке повторення", reviewCards: "Повторити ({count})", learnNewWords: "Вчити нове" },
  urdu: { quickReview: "فوری جائزہ", reviewCards: "جائزہ ({count})", learnNewWords: "نیا سیکھیں" },
  uzbek: { quickReview: "Tezkor takrorlash", reviewCards: "Takrorlash ({count})", learnNewWords: "Yangi o'rganish" },
  vietnamese: { quickReview: "Ôn tập nhanh", reviewCards: "Ôn tập ({count})", learnNewWords: "Học mới" },
  welsh: { quickReview: "Adolygiad cyflym", reviewCards: "Adolygu ({count})", learnNewWords: "Dysgu newydd" },
  yoruba: { quickReview: "Atunyẹwo iyara", reviewCards: "Tunwo ({count})", learnNewWords: "Kọ tuntun" },
  zulu: { quickReview: "Ukubuyekeza okusha", reviewCards: "Buyekeza ({count})", learnNewWords: "Funda okutsha" },
};

const files = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json") && f !== "en.json");
for (const file of files) {
  const filePath = path.join(localesDir, file);
  const locale = file.replace(".json", "");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!data.course) continue;
  const t = TRANSLATIONS[locale] ?? EN;
  let changed = false;
  for (const key of ["quickReview", "reviewCards", "learnNewWords"]) {
    if (!data.course[key]) { data.course[key] = t[key] ?? EN[key]; changed = true; }
  }
  if (changed) fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}
console.log("Done.");
