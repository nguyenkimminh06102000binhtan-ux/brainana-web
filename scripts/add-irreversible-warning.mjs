import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../public/locales");

const TRANSLATIONS = {
  afrikaans: "Sodra dit publiek is, kan hierdie kursus nie weer privaat gemaak word nie.",
  albanian: "Pasi të bëhet publik, ky kurs nuk mund të bëhet sërish privat.",
  amharic: "ይፋዊ ከሆነ በኋላ ይህ ኮርስ እንደገና ግላዊ ሊሆን አይችልም።",
  arabic: "بمجرد نشره، لا يمكن جعل هذه الدورة خاصة مرة أخرى.",
  armenian: "Հրապարակումից հետո այս դասընթացը հնարավոր չէ դարձնել մասնավոր:",
  azerbaijani: "İctimai edildikdən sonra bu kurs yenidən gizli edilə bilməz.",
  basque: "Publikoa bihurtu ondoren, ikastaro hau ezin da berriz pribatu bihurtu.",
  belarusian: "Пасля публікацыі гэты курс нельга зноў зрабіць прыватным.",
  bengali: "একবার পাবলিক হলে, এই কোর্সটি আর প্রাইভেট করা যাবে না।",
  bosnian: "Jednom kada postane javan, ovaj kurs se više ne može učiniti privatnim.",
  bulgarian: "След публикуването, този курс не може да бъде направен отново частен.",
  catalan: "Un cop públic, aquest curs no pot tornar a ser privat.",
  "chinese-cantonese": "一旦公開，此課程將無法再設為私人。",
  "chinese-mandarin": "一旦公开，此课程将无法再设为私人。",
  croatian: "Jednom kada postane javan, ovaj tečaj više se ne može učiniti privatnim.",
  czech: "Po zveřejnění nelze tento kurz znovu nastavit jako soukromý.",
  danish: "Når det er offentliggjort, kan dette kursus ikke gøres privat igen.",
  dutch: "Zodra het openbaar is, kan dit vak niet meer privé worden gemaakt.",
  estonian: "Pärast avalikustamist ei saa seda kursust enam privaatseks muuta.",
  "filipino-tagalog": "Kapag naging pampubliko na, hindi na maaaring gawing pribado muli ang kursong ito.",
  finnish: "Kun kurssi on julkinen, sitä ei voi enää tehdä yksityiseksi.",
  french: "Une fois public, ce cours ne peut plus être rendu privé.",
  galician: "Unha vez público, este curso non pode volver ser privado.",
  georgian: "გასაჯაროვდება — ამ კურსს ვეღარ დაბრუნებთ კერძო სტატუსში.",
  german: "Sobald er öffentlich ist, kann dieser Kurs nicht mehr privat gemacht werden.",
  greek: "Μόλις γίνει δημόσιο, αυτό το μάθημα δεν μπορεί να γίνει ξανά ιδιωτικό.",
  gujarati: "એકવાર જાહેર થઈ ગયા પછી, આ કોર્સ ફરીથી ખાનગી કરી શકાતો નથી.",
  hausa: "Da zarar ya zama na jama'a, ba za a iya mai da wannan darasi zuwa mai zaman kansa ba.",
  hebrew: "לאחר פרסומו, לא ניתן להפוך קורס זה לפרטי שוב.",
  hindi: "एक बार सार्वजनिक होने के बाद, इस कोर्स को दोबारा निजी नहीं बनाया जा सकता।",
  hungarian: "Miután nyilvánossá vált, ez a kurzus többé nem tehető priváttá.",
  icelandic: "Þegar það er opinbert, er ekki hægt að gera þetta námskeið einka aftur.",
  indonesian: "Setelah menjadi publik, kursus ini tidak dapat dijadikan privat lagi.",
  irish: "Nuair atá sé poiblí, ní féidir an cúrsa seo a dhéanamh príobháideach arís.",
  italian: "Una volta pubblico, questo corso non può essere reso di nuovo privato.",
  japanese: "一度公開すると、このコースを再び非公開にすることはできません。",
  javanese: "Sawise dadi publik, kursus iki ora bisa dijadikan pribadi maneh.",
  kannada: "ಒಮ್ಮೆ ಸಾರ್ವಜನಿಕ ಆದ ನಂತರ, ಈ ಕೋರ್ಸ್ ಅನ್ನು ಮತ್ತೆ ಖಾಸಗಿ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ.",
  kazakh: "Жарияланғаннан кейін бұл курсты жекелікке қайтарып алу мүмкін емес.",
  khmer: "នៅពេលក្លាយជាសាធារណៈ វគ្គសិក្សានេះមិនអាចធ្វើឱ្យជាឯកជនវិញបានទេ។",
  korean: "공개된 후에는 이 코스를 다시 비공개로 만들 수 없습니다.",
  kurdish: "Dema ku bibe giştî, ev qurs nayê vegera taybetiyê.",
  lao: "ເມື່ອເປັນສາທາລະນະແລ້ວ ຫຼັກສູດນີ້ຈະບໍ່ສາມາດເຮັດໃຫ້ເປັນສ່ວນຕົວໄດ້ອີກ.",
  latvian: "Kad kurss ir publisks, to vairs nevar padarīt privātu.",
  lithuanian: "Kai jis tampa viešas, šio kurso nebegalima vėl padaryti privataus.",
  macedonian: "Откако ќе стане јавен, овој курс не може повторно да се направи приватен.",
  malay: "Setelah menjadi awam, kursus ini tidak boleh dijadikan peribadi semula.",
  malayalam: "പൊതുവായ ശേഷം, ഈ കോഴ്‌സ് വീണ്ടും സ്വകാര്യമാക്കാൻ കഴിയില്ല.",
  maltese: "Ladarba tkun pubblika, din il-kors ma tistax issir privata mill-ġdid.",
  maori: "Kia whakaaturia, kāore e taea te huri anō tēnei akoranga hei mea whaiaro.",
  marathi: "एकदा सार्वजनिक झाल्यावर, हा कोर्स पुन्हा खाजगी करता येणार नाही.",
  mongolian: "Нийтэд нээлттэй болсны дараа энэ курсыг дахин хувийн болгох боломжгүй.",
  nepali: "एकपटक सार्वजनिक भएपछि, यो कोर्स फेरि निजी बनाउन सकिँदैन।",
  norwegian: "Når det er offentlig, kan dette kurset ikke gjøres privat igjen.",
  other: "Once public, this course cannot be made private again.",
  pashto: "یوځل چې عامه شو، دا کورس بیا د خصوصي کیدو وړ نه دی.",
  persian: "پس از عمومی شدن، این دوره دیگر نمی‌تواند خصوصی شود.",
  polish: "Po upublicznieniu ten kurs nie może być ponownie ustawiony jako prywatny.",
  portuguese: "Uma vez público, este curso não pode ser tornado privado novamente.",
  punjabi: "ਇੱਕ ਵਾਰ ਜਨਤਕ ਹੋਣ ਤੋਂ ਬਾਅਦ, ਇਸ ਕੋਰਸ ਨੂੰ ਦੁਬਾਰਾ ਪ੍ਰਾਈਵੇਟ ਨਹੀਂ ਕੀਤਾ ਜਾ ਸਕਦਾ।",
  romanian: "Odată public, acest curs nu mai poate fi făcut privat.",
  russian: "После публикации этот курс нельзя снова сделать приватным.",
  serbian: "Jednom kada postane javan, ovaj kurs se ne može ponovo učiniti privatnim.",
  sinhala: "එක් වරක් පොදු වූ විට, මෙම පාඨමාලාව නැවත පෞද්ගලික කළ නොහැක.",
  slovak: "Po zverejnení nemožno tento kurz znova nastaviť ako súkromný.",
  slovenian: "Ko je javen, tega tečaja ni mogoče znova narediti zasebnega.",
  somali: "Markay dadweyne noqoto, koorskaan ma noqon karo mid gaarka ah mar kale.",
  spanish: "Una vez público, este curso no puede volver a ser privado.",
  swahili: "Ikishawa ya umma, kozi hii haiwezi kuwa ya kibinafsi tena.",
  swedish: "När kursen är offentlig kan den inte göras privat igen.",
  tajik: "Баъд аз нашр, ин курсро дигар хусусӣ кардан мумкин нест.",
  tamil: "ஒருமுறை பொதுவாகிவிட்டால், இந்த கோர்ஸை மீண்டும் தனிப்பட்டதாக மாற்ற முடியாது.",
  telugu: "ఒకసారి పబ్లిక్ అయిన తర్వాత, ఈ కోర్సును మళ్ళీ ప్రైవేట్‌గా చేయలేరు.",
  thai: "เมื่อเป็นสาธารณะแล้ว คอร์สนี้จะไม่สามารถทำให้เป็นส่วนตัวอีกได้",
  turkish: "Herkese açık hale getirildikten sonra bu kurs tekrar özel yapılamaz.",
  ukrainian: "Після публікації цей курс не можна знову зробити приватним.",
  urdu: "ایک بار عام ہونے کے بعد، یہ کورس دوبارہ نجی نہیں بنایا جا سکتا۔",
  uzbek: "Ommaviy bo'lgandan keyin bu kursni yana shaxsiy qilib bo'lmaydi.",
  vietnamese: "Một khi đã công khai, khóa học này không thể được đặt lại thành riêng tư.",
  welsh: "Unwaith y mae'n gyhoeddus, ni ellir gwneud y cwrs hwn yn breifat eto.",
  yoruba: "Ni kete ti o ba jẹ gbangba, ẹkọ yii ko le jẹ aṣiri mọ.",
  zulu: "Uma ususesidlalweni, lo kosi awukwazi ukuba wumuntu siqu futhi.",
};

const files = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json") && f !== "en.json");
for (const file of files) {
  const filePath = path.join(localesDir, file);
  const locale = file.replace(".json", "");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!data.createEdit) continue;
  if (data.createEdit.publicWarningIrreversible) continue;
  data.createEdit.publicWarningIrreversible = TRANSLATIONS[locale] ?? "Once public, this course cannot be made private again.";
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}
console.log("Done.");
