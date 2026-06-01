import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../public/locales");

const EN = {
  duplicateCourse: "Duplicate to my library",
  duplicating: "Duplicating…",
  duplicateUpsell: "Plus / Pro feature — upgrade to duplicate",
};

const TRANSLATIONS = {
  afrikaans: { duplicateCourse: "Dupliseer na my biblioteek", duplicating: "Dupliseer…", duplicateUpsell: "Plus/Pro-funksie — opgradeer om te dupliseer" },
  albanian: { duplicateCourse: "Dupliko në bibliotekën time", duplicating: "Duke duplifikuar…", duplicateUpsell: "Veçori Plus/Pro — përmirëso për të duplifikuar" },
  amharic: { duplicateCourse: "ወደ ቤተ-መጻሕፍቴ ቅዳ", duplicating: "በመቅዳት ላይ…", duplicateUpsell: "Plus/Pro ባህሪ — ለማባዛት አሻሽል" },
  arabic: { duplicateCourse: "نسخ إلى مكتبتي", duplicating: "جارٍ النسخ…", duplicateUpsell: "ميزة Plus/Pro — رقّ خطتك للنسخ" },
  armenian: { duplicateCourse: "Կրկնօրինակել իմ գրադարան", duplicating: "Կրկնօրինակում…", duplicateUpsell: "Plus/Pro հատկություն — բարձրացրեք պլանն ու կրկնօրինակեք" },
  azerbaijani: { duplicateCourse: "Kitabxanama kopyala", duplicating: "Kopyalanır…", duplicateUpsell: "Plus/Pro funksiyası — kopyalamaq üçün yüksəldin" },
  basque: { duplicateCourse: "Bikoiztu nire liburutegian", duplicating: "Bikoizten…", duplicateUpsell: "Plus/Pro eginbidea — eguneratu bikoizteko" },
  belarusian: { duplicateCourse: "Скапіяваць у маю бібліятэку", duplicating: "Капіраванне…", duplicateUpsell: "Функцыя Plus/Pro — абнавіце план для капіравання" },
  bengali: { duplicateCourse: "আমার লাইব্রেরিতে কপি করুন", duplicating: "কপি হচ্ছে…", duplicateUpsell: "Plus/Pro ফিচার — কপি করতে আপগ্রেড করুন" },
  bosnian: { duplicateCourse: "Dupliciraj u moju biblioteku", duplicating: "Dupliciranje…", duplicateUpsell: "Plus/Pro funkcija — nadogradite za dupliciranje" },
  bulgarian: { duplicateCourse: "Дублирай в моята библиотека", duplicating: "Дублиране…", duplicateUpsell: "Функция Plus/Pro — надградете за дублиране" },
  catalan: { duplicateCourse: "Duplica a la meva biblioteca", duplicating: "Duplicant…", duplicateUpsell: "Funció Plus/Pro — actualitza per duplicar" },
  "chinese-cantonese": { duplicateCourse: "複製到我的書庫", duplicating: "複製中…", duplicateUpsell: "Plus/Pro 功能 — 升級以複製" },
  "chinese-mandarin": { duplicateCourse: "复制到我的库", duplicating: "复制中…", duplicateUpsell: "Plus/Pro 功能 — 升级以复制" },
  croatian: { duplicateCourse: "Dupliciraj u moju biblioteku", duplicating: "Dupliciranje…", duplicateUpsell: "Plus/Pro značajka — nadogradite za dupliciranje" },
  czech: { duplicateCourse: "Duplikovat do mé knihovny", duplicating: "Duplikování…", duplicateUpsell: "Funkce Plus/Pro — upgradujte pro duplikování" },
  danish: { duplicateCourse: "Dupliker til mit bibliotek", duplicating: "Duplikerer…", duplicateUpsell: "Plus/Pro-funktion — opgrader for at duplikere" },
  dutch: { duplicateCourse: "Dupliceer naar mijn bibliotheek", duplicating: "Dupliceren…", duplicateUpsell: "Plus/Pro-functie — upgrade om te dupliceren" },
  estonian: { duplicateCourse: "Dubleeri minu kogusse", duplicating: "Dubleerimine…", duplicateUpsell: "Plus/Pro funktsioon — uuenda dubleerimiseks" },
  "filipino-tagalog": { duplicateCourse: "I-duplicate sa aking library", duplicating: "Dina-duplicate…", duplicateUpsell: "Plus/Pro feature — i-upgrade para mag-duplicate" },
  finnish: { duplicateCourse: "Kopioi kirjastooni", duplicating: "Kopioidaan…", duplicateUpsell: "Plus/Pro-ominaisuus — päivitä kopioidaksesi" },
  french: { duplicateCourse: "Dupliquer dans ma bibliothèque", duplicating: "Duplication…", duplicateUpsell: "Fonctionnalité Plus/Pro — mettez à niveau pour dupliquer" },
  galician: { duplicateCourse: "Duplicar na miña biblioteca", duplicating: "Duplicando…", duplicateUpsell: "Función Plus/Pro — actualiza para duplicar" },
  georgian: { duplicateCourse: "ჩემს ბიბლიოთეკაში დუბლირება", duplicating: "დუბლირება…", duplicateUpsell: "Plus/Pro ფუნქცია — განაახლეთ დუბლირებისთვის" },
  german: { duplicateCourse: "In meine Bibliothek duplizieren", duplicating: "Duplizieren…", duplicateUpsell: "Plus/Pro-Funktion — Upgrade zum Duplizieren" },
  greek: { duplicateCourse: "Αντιγραφή στη βιβλιοθήκη μου", duplicating: "Αντιγραφή…", duplicateUpsell: "Λειτουργία Plus/Pro — αναβαθμίστε για αντιγραφή" },
  gujarati: { duplicateCourse: "મારી લાઇબ્રેરીમાં ડુપ્લિકેટ કરો", duplicating: "ડુપ્લિકેટ થઈ રહ્યું છે…", duplicateUpsell: "Plus/Pro સુવિધા — ડુપ્લિકેટ કરવા અપગ્રેડ કરો" },
  hausa: { duplicateCourse: "Kwafi zuwa ɗakin karatu na", duplicating: "Ana kwafawa…", duplicateUpsell: "Fasali na Plus/Pro — inganta don kwafawa" },
  hebrew: { duplicateCourse: "שכפל לספריה שלי", duplicating: "משכפל…", duplicateUpsell: "תכונת Plus/Pro — שדרג לשכפול" },
  hindi: { duplicateCourse: "मेरी लाइब्रेरी में डुप्लिकेट करें", duplicating: "डुप्लिकेट हो रहा है…", duplicateUpsell: "Plus/Pro सुविधा — डुप्लिकेट करने के लिए अपग्रेड करें" },
  hungarian: { duplicateCourse: "Másolás a könyvtáramba", duplicating: "Másolás…", duplicateUpsell: "Plus/Pro funkció — frissítsen a másoláshoz" },
  icelandic: { duplicateCourse: "Tvöfalda í mitt bókasafn", duplicating: "Tvöfalda…", duplicateUpsell: "Plus/Pro eiginleiki — uppfærðu til að tvöfalda" },
  indonesian: { duplicateCourse: "Duplikasi ke perpustakaan saya", duplicating: "Menduplikasi…", duplicateUpsell: "Fitur Plus/Pro — upgrade untuk menduplikasi" },
  irish: { duplicateCourse: "Dúblaigh chuig mo leabharlann", duplicating: "Dúblú…", duplicateUpsell: "Gné Plus/Pro — uasghrádaigh le dúblú" },
  italian: { duplicateCourse: "Duplica nella mia libreria", duplicating: "Duplicazione…", duplicateUpsell: "Funzione Plus/Pro — aggiorna per duplicare" },
  japanese: { duplicateCourse: "マイライブラリに複製", duplicating: "複製中…", duplicateUpsell: "Plus/Pro機能 — 複製するにはアップグレード" },
  javanese: { duplicateCourse: "Duplikat menyang perpustakaan saya", duplicating: "Duplikasi…", duplicateUpsell: "Fitur Plus/Pro — upgrade kanggo duplikasi" },
  kannada: { duplicateCourse: "ನನ್ನ ಲೈಬ್ರರಿಗೆ ನಕಲಿಸಿ", duplicating: "ನಕಲಿಸಲಾಗುತ್ತಿದೆ…", duplicateUpsell: "Plus/Pro ವೈಶಿಷ್ಟ್ಯ — ನಕಲಿಸಲು ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ" },
  kazakh: { duplicateCourse: "Менің кітапханама көшіру", duplicating: "Көшіру…", duplicateUpsell: "Plus/Pro мүмкіндігі — көшіру үшін жаңартыңыз" },
  khmer: { duplicateCourse: "ចម្លងទៅបណ្ណាល័យរបស់ខ្ញុំ", duplicating: "កំពុងចម្លង…", duplicateUpsell: "មុខងារ Plus/Pro — upgrade ដើម្បីចម្លង" },
  korean: { duplicateCourse: "내 라이브러리에 복제", duplicating: "복제 중…", duplicateUpsell: "Plus/Pro 기능 — 복제하려면 업그레이드" },
  kurdish: { duplicateCourse: "Li pirtûkxaneya min dubare bike", duplicating: "Dubarekirin…", duplicateUpsell: "Taybetmendiya Plus/Pro — ji bo dubarekirin xwe bilind bike" },
  lao: { duplicateCourse: "ຄັດລອກໄປຫ້ອງສະໝຸດຂອງຂ້ອຍ", duplicating: "ກຳລັງຄັດລອກ…", duplicateUpsell: "ຄຸນສົມບັດ Plus/Pro — ອັບເກຣດເພື່ອຄັດລອກ" },
  latvian: { duplicateCourse: "Dublēt manā bibliotēkā", duplicating: "Dublēšana…", duplicateUpsell: "Plus/Pro funkcija — jauniniet, lai dublētu" },
  lithuanian: { duplicateCourse: "Kopijuoti į mano biblioteką", duplicating: "Kopijuojama…", duplicateUpsell: "Plus/Pro funkcija — atnaujinkite kopijavimui" },
  macedonian: { duplicateCourse: "Дупликат во мојата библиотека", duplicating: "Дупликат…", duplicateUpsell: "Plus/Pro функција — надградете за дупликат" },
  malay: { duplicateCourse: "Duplikat ke perpustakaan saya", duplicating: "Menduplikat…", duplicateUpsell: "Ciri Plus/Pro — naik taraf untuk menduplikat" },
  malayalam: { duplicateCourse: "എന്റെ ലൈബ്രറിയിലേക്ക് പകർത്തുക", duplicating: "പകർത്തുന്നു…", duplicateUpsell: "Plus/Pro ഫീച്ചർ — പകർത്താൻ അപ്‌ഗ്രേഡ് ചെയ്യുക" },
  maltese: { duplicateCourse: "Idduplika fil-librerija tiegħi", duplicating: "Qed tidduplika…", duplicateUpsell: "Karatteristika Plus/Pro — aġġorna biex tidduplika" },
  maori: { duplicateCourse: "Tārua ki tōku whare pukapuka", duplicating: "E tārua ana…", duplicateUpsell: "Āhuatanga Plus/Pro — whakahou ki te tārua" },
  marathi: { duplicateCourse: "माझ्या लायब्ररीत डुप्लिकेट करा", duplicating: "डुप्लिकेट होत आहे…", duplicateUpsell: "Plus/Pro वैशिष्ट्य — डुप्लिकेट करण्यासाठी अपग्रेड करा" },
  mongolian: { duplicateCourse: "Миний номын санд хуулах", duplicating: "Хуулж байна…", duplicateUpsell: "Plus/Pro функц — хуулахын тулд шинэчлэх" },
  nepali: { duplicateCourse: "मेरो पुस्तकालयमा नक्कल गर्नुहोस्", duplicating: "नक्कल हुँदैछ…", duplicateUpsell: "Plus/Pro सुविधा — नक्कल गर्न अपग्रेड गर्नुहोस्" },
  norwegian: { duplicateCourse: "Dupliser til mitt bibliotek", duplicating: "Dupliserer…", duplicateUpsell: "Plus/Pro-funksjon — oppgrader for å duplisere" },
  other: { duplicateCourse: "Duplicate to my library", duplicating: "Duplicating…", duplicateUpsell: "Plus / Pro feature — upgrade to duplicate" },
  pashto: { duplicateCourse: "زما کتابتون ته کاپي کړئ", duplicating: "کاپي کیږي…", duplicateUpsell: "د Plus/Pro ځانګړتیا — د کاپي کولو لپاره ارتقا ورکړئ" },
  persian: { duplicateCourse: "تکثیر به کتابخانه‌ام", duplicating: "در حال تکثیر…", duplicateUpsell: "قابلیت Plus/Pro — برای تکثیر ارتقا دهید" },
  polish: { duplicateCourse: "Duplikuj do mojej biblioteki", duplicating: "Duplikowanie…", duplicateUpsell: "Funkcja Plus/Pro — uaktualnij, aby duplikować" },
  portuguese: { duplicateCourse: "Duplicar para a minha biblioteca", duplicating: "A duplicar…", duplicateUpsell: "Funcionalidade Plus/Pro — atualize para duplicar" },
  punjabi: { duplicateCourse: "ਮੇਰੀ ਲਾਇਬ੍ਰੇਰੀ ਵਿੱਚ ਨਕਲ ਕਰੋ", duplicating: "ਨਕਲ ਹੋ ਰਹੀ ਹੈ…", duplicateUpsell: "Plus/Pro ਵਿਸ਼ੇਸ਼ਤਾ — ਨਕਲ ਕਰਨ ਲਈ ਅਪਗ੍ਰੇਡ ਕਰੋ" },
  romanian: { duplicateCourse: "Duplicați în biblioteca mea", duplicating: "Duplicare…", duplicateUpsell: "Funcție Plus/Pro — actualizați pentru a duplica" },
  russian: { duplicateCourse: "Дублировать в мою библиотеку", duplicating: "Дублирование…", duplicateUpsell: "Функция Plus/Pro — обновите план для дублирования" },
  serbian: { duplicateCourse: "Dupliraj u moju biblioteku", duplicating: "Dupliciranje…", duplicateUpsell: "Plus/Pro funkcija — nadogradite za dupliciranje" },
  sinhala: { duplicateCourse: "මගේ පුස්තකාලයට නකල් කරන්න", duplicating: "නකල් කෙරෙමින්…", duplicateUpsell: "Plus/Pro විශේෂාංගය — නකල් කිරීමට උත්‍සාහ කරන්න" },
  slovak: { duplicateCourse: "Duplikovať do mojej knižnice", duplicating: "Duplikovanie…", duplicateUpsell: "Funkcia Plus/Pro — aktualizujte na duplikovanie" },
  slovenian: { duplicateCourse: "Podvoji v mojo knjižnico", duplicating: "Podvajanje…", duplicateUpsell: "Funkcija Plus/Pro — nadgradite za podvajanje" },
  somali: { duplicateCourse: "U nuqul gaar maktabadeyda", duplicating: "Koobiyaynta…", duplicateUpsell: "Astaamaha Plus/Pro — kor u qaad si aad u nuqul gaarto" },
  spanish: { duplicateCourse: "Duplicar en mi biblioteca", duplicating: "Duplicando…", duplicateUpsell: "Función Plus/Pro — actualiza para duplicar" },
  swahili: { duplicateCourse: "Nakili kwenye maktaba yangu", duplicating: "Kunakili…", duplicateUpsell: "Kipengele cha Plus/Pro — boresha ili kunakili" },
  swedish: { duplicateCourse: "Duplicera till mitt bibliotek", duplicating: "Duplicerar…", duplicateUpsell: "Plus/Pro-funktion — uppgradera för att duplicera" },
  tajik: { duplicateCourse: "Ба китобхонаи ман нусхабардорӣ кунед", duplicating: "Нусхабардорӣ…", duplicateUpsell: "Функсияи Plus/Pro — барои нусхабардорӣ навсозӣ кунед" },
  tamil: { duplicateCourse: "என் நூலகத்தில் நகலெடு", duplicating: "நகலெடுக்கிறது…", duplicateUpsell: "Plus/Pro அம்சம் — நகலெடுக்க மேம்படுத்தவும்" },
  telugu: { duplicateCourse: "నా లైబ్రరీకి డూప్లికేట్ చేయి", duplicating: "డూప్లికేట్ అవుతోంది…", duplicateUpsell: "Plus/Pro ఫీచర్ — డూప్లికేట్ చేయడానికి అప్‌గ్రేడ్ చేయండి" },
  thai: { duplicateCourse: "ทำสำเนาลงในคลังของฉัน", duplicating: "กำลังทำสำเนา…", duplicateUpsell: "ฟีเจอร์ Plus/Pro — อัปเกรดเพื่อทำสำเนา" },
  turkish: { duplicateCourse: "Kütüphaneime kopyala", duplicating: "Kopyalanıyor…", duplicateUpsell: "Plus/Pro özelliği — kopyalamak için yükselt" },
  ukrainian: { duplicateCourse: "Дублювати до моєї бібліотеки", duplicating: "Дублювання…", duplicateUpsell: "Функція Plus/Pro — оновіть план для дублювання" },
  urdu: { duplicateCourse: "میری لائبریری میں نقل کریں", duplicating: "نقل ہو رہا ہے…", duplicateUpsell: "Plus/Pro فیچر — نقل کرنے کے لیے اپگریڈ کریں" },
  uzbek: { duplicateCourse: "Kutubxonamga nusxa olish", duplicating: "Nusxa olinmoqda…", duplicateUpsell: "Plus/Pro xususiyati — nusxa olish uchun yangilang" },
  vietnamese: { duplicateCourse: "Nhân bản vào thư viện của tôi", duplicating: "Đang nhân bản…", duplicateUpsell: "Tính năng Plus/Pro — nâng cấp để nhân bản" },
  welsh: { duplicateCourse: "Dyblygu i fy llyfrgell", duplicating: "Yn dyblygu…", duplicateUpsell: "Nodwedd Plus/Pro — uwchraddiwch i ddyblygu" },
  yoruba: { duplicateCourse: "Ṣe ẹdà si ile-ikawe mi", duplicating: "Ṣiṣe ẹdà…", duplicateUpsell: "Ẹya Plus/Pro — gba ìgbésókè lati ṣe ẹdà" },
  zulu: { duplicateCourse: "Phindaphinda kubhulokhi lami", duplicating: "Iyaphindaphinda…", duplicateUpsell: "Isici se-Plus/Pro — thola ukuphakanyiswa ukuphindaphinda" },
};

const files = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json") && f !== "en.json");
const KEYS = ["duplicateCourse", "duplicating", "duplicateUpsell"];
for (const file of files) {
  const filePath = path.join(localesDir, file);
  const locale = file.replace(".json", "");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!data.course) continue;
  const t = TRANSLATIONS[locale] ?? { duplicateCourse: EN.duplicateCourse, duplicating: EN.duplicating, duplicateUpsell: EN.duplicateUpsell };
  let changed = false;
  for (const key of KEYS) {
    if (!data.course[key]) { data.course[key] = t[key] ?? EN[key]; changed = true; }
  }
  if (changed) fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}
console.log("Done.");
