// Demo katalog: subkategoriyalar, ~40 mahsulot (uz/ru matnlar, qadoqlar, narxlar, qoldiq) va ularning rasmlari.
// Rasmlar shu skriptda SVG sifatida chiziladi (uploads/demo/*.svg) — haqiqiy fotolar bilan admin paneldan almashtiriladi.
// Qayta ishga tushirish xavfsiz: slug va SKU bo'yicha yangilaydi, qoldiq kam bo'lsa partiya qo'shadi.
// Ishlab chiqaruvchi va ro'yxat raqami ataylab bo'sh: ular haqiqiy hujjatlardan to'ldiriladi.
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();
const IMG_DIR = join(__dirname, '..', 'uploads', 'demo');

const subcategories: [parent: string, slug: string, uz: string, ru: string][] = [
  ['vitaminlar', 'suvda-eriydigan-vitaminlar', 'Suvda eriydigan vitaminlar', 'Водорастворимые витамины'],
  ['vitaminlar', 'mineral-bloklar', 'Mineral bloklar va tuzlar', 'Минеральные блоки и соли'],
  ['vitaminlar', 'uy-hayvonlari-vitaminlari', 'Uy hayvonlari uchun vitaminlar', 'Витамины для питомцев'],
  ['parazitlarga-qarshi', 'burga-kana', 'Burga va kanaga qarshi', 'От блох и клещей'],
  ['parazitlarga-qarshi', 'boyinboglar', 'Bo‘yinbog‘lar', 'Ошейники'],
  ['parazitlarga-qarshi', 'hasharot-repellent', 'Pashsha va hasharotlardan himoya', 'Защита от мух и насекомых'],
  ['gigiyena', 'shampunlar', 'Shampunlar', 'Шампуни'],
  ['gigiyena', 'yelin-parvarishi', 'Yelin parvarishi', 'Уход за выменем'],
  ['gigiyena', 'tuyoq-parvarishi', 'Tuyoq va panja parvarishi', 'Уход за копытами и лапами'],
  ['gigiyena', 'dezinfeksiya', 'Dezinfeksiya va yara parvarishi', 'Дезинфекция и уход за ранами'],
  ['ozuqa-qoshimchalari', 'premikslar', 'Premikslar', 'Премиксы'],
  ['ozuqa-qoshimchalari', 'probiotiklar', 'Probiotiklar', 'Пробиотики'],
  ['ozuqa-qoshimchalari', 'elektrolitlar', 'Elektrolitlar', 'Электролиты'],
  ['jihozlar', 'shpritslar', 'Shpritslar va dozatorlar', 'Шприцы и дозаторы'],
  ['jihozlar', 'termometrlar', 'Termometrlar', 'Термометры'],
  ['jihozlar', 'sogish-jihozlari', 'Sog‘ish jihozlari', 'Доильный инвентарь'],
  ['jihozlar', 'birkalar', 'Birkalar va identifikatsiya', 'Бирки и идентификация'],
];

// Qo'llash matnlari: aniq dozani o'ylab topmaymiz, yo'riqnoma va veterinarga yo'naltiramiz.
const USE = {
  supp: [
    'Qadoqdagi yo‘riqnomaga ko‘ra ichimlik suviga yoki ozuqaga qo‘shib beriladi. Kurs davomiyligini veterinar bilan kelishing.',
    'Применять согласно инструкции на упаковке, добавляя в воду или корм. Длительность курса согласуйте с ветеринаром.',
  ],
  pet: [
    'Hayvon vazniga qarab qadoqdagi yo‘riqnomaga muvofiq beriladi. Boshqa vositalar bilan birga berishdan oldin veterinar bilan maslahatlashing.',
    'Давать по инструкции на упаковке в зависимости от веса животного. Перед совместным применением с другими средствами проконсультируйтесь с ветеринаром.',
  ],
  parasite: [
    'Faqat tashqi qo‘llash uchun. Yo‘riqnomadagi vazn toifasiga mos qadoqni tanlang; ko‘z va og‘izga tushishidan saqlang. Qo‘llagandan keyin qo‘lni yuving.',
    'Только для наружного применения. Выбирайте упаковку по весовой категории из инструкции; избегайте попадания в глаза и рот. После применения вымойте руки.',
  ],
  topical: [
    'Toza va quruq teriga yupqa qatlam qilib suriladi. Qo‘llash tezligi yo‘riqnomada ko‘rsatilgan.',
    'Наносить тонким слоем на чистую сухую кожу. Кратность применения указана в инструкции.',
  ],
  wash: [
    'Junni iliq suv bilan namlang, shampunni ko‘pirtirib 3–5 daqiqa qoldiring va yaxshilab chaying.',
    'Смочите шерсть тёплой водой, вспеньте шампунь, оставьте на 3–5 минут и тщательно смойте.',
  ],
  disinfect: [
    'Konsentrat yo‘riqnomadagi nisbatda suv bilan suyultiriladi. Ishlov berishda qo‘lqop va niqob taqing.',
    'Концентрат разводится водой в пропорции из инструкции. При обработке используйте перчатки и маску.',
  ],
  tool: [
    'Har foydalanishdan keyin tozalang va quruq joyda saqlang.',
    'Очищайте после каждого использования и храните в сухом месте.',
  ],
};

type Shape = 'bottle' | 'jar' | 'box' | 'tube' | 'spray' | 'bag' | 'dropper' | 'collar' | 'block' | 'thermo' | 'canister';

interface P {
  slug: string;
  cat: string;
  animals: string[];
  uz: [title: string, description: string];
  ru: [title: string, description: string];
  use: keyof typeof USE;
  composition?: string;
  storage?: string;
  shape: Shape;
  color: string;
  label: string;
  isNew?: boolean;
  isTrending?: boolean;
  variants: [sku: string, packSize: string, price: number, oldPrice?: number][];
}

const FARM = ['qoramol', 'qoy-echki', 'ot'];
const PETS = ['it', 'mushuk'];

const products: P[] = [
  // ---------- Vitaminlar ----------
  {
    slug: 'multivitamin-kompleksi', cat: 'suvda-eriydigan-vitaminlar', animals: [...FARM, 'parranda'],
    uz: ['Multivitamin kompleksi, suyuq', 'A, D3, E va B guruhi vitaminlari bilan suyuq kompleks. Mavsum almashganda, tug‘ishdan keyin va ozuqa o‘zgarganda organizmni qo‘llab-quvvatlaydi.'],
    ru: ['Мультивитаминный комплекс, жидкий', 'Жидкий комплекс с витаминами A, D3, E и группы B. Поддерживает организм при смене сезона, после отёла и при смене рациона.'],
    use: 'supp', composition: 'Vitaminlar A, D3, E, B1, B2, B6, B12, nikotinamid, pantotenat.', storage: '+5…+25 °C', shape: 'bottle', color: '#059669', label: 'MULTI VIT',
    isTrending: true, variants: [['MVK-100', '100 ml', 45000], ['MVK-500', '500 ml', 180000, 199000]],
  },
  {
    slug: 'tovuqlar-uchun-vitamin-ad3e', cat: 'suvda-eriydigan-vitaminlar', animals: ['parranda'],
    uz: ['Parranda uchun vitamin AD3E', 'Tovuq, broyler va kurkalar uchun suvda eriydigan AD3E vitaminlari. Tuxum qobig‘i mustahkamligi va jo‘jalar o‘sishini qo‘llab-quvvatlaydi.'],
    ru: ['Витамин AD3E для птицы', 'Водорастворимые витамины AD3E для кур, бройлеров и индеек. Поддерживают прочность скорлупы и рост цыплят.'],
    use: 'supp', composition: 'Vitamin A, vitamin D3, vitamin E, emulgator.', storage: '+5…+25 °C', shape: 'bottle', color: '#d97706', label: 'AD3E',
    isNew: true, isTrending: true, variants: [['AD3E-100', '100 ml', 39000, 45000], ['AD3E-1000', '1 l', 245000]],
  },
  {
    slug: 'parranda-vitamin-kukuni', cat: 'suvda-eriydigan-vitaminlar', animals: ['parranda'],
    uz: ['Parranda uchun vitaminli kukun', 'Ichimlik suviga qo‘shiladigan vitamin-aminokislota kukuni. Stress, emlash va issiq kunlarda tavsiya etiladi.'],
    ru: ['Витаминный порошок для птицы', 'Витаминно-аминокислотный порошок для добавления в питьевую воду. Рекомендуется при стрессе, вакцинации и в жару.'],
    use: 'supp', composition: 'Vitaminlar A, D3, E, K3, B guruhi; lizin, metionin; glyukoza.', storage: '≤ +25 °C', shape: 'bag', color: '#ea580c', label: 'VITA PTITSA',
    variants: [['PVK-200', '200 g', 32000], ['PVK-1000', '1 kg', 135000, 150000]],
  },
  {
    slug: 'askorbin-kislota-kukuni', cat: 'suvda-eriydigan-vitaminlar', animals: ['parranda', 'qoramol'],
    uz: ['C vitamini (askorbin kislota) kukuni', 'Issiqlik stressi va transportirovkada immunitetni qo‘llab-quvvatlash uchun suvda eriydigan C vitamini.'],
    ru: ['Витамин C (аскорбиновая кислота), порошок', 'Водорастворимый витамин C для поддержки иммунитета при тепловом стрессе и транспортировке.'],
    use: 'supp', composition: 'Askorbin kislota 100%.', shape: 'bag', color: '#f59e0b', label: 'VIT C',
    variants: [['VC-500', '500 g', 29000]],
  },
  {
    slug: 'aminokislotali-vitamin-eritma', cat: 'suvda-eriydigan-vitaminlar', animals: ['parranda', 'qoy-echki', 'qoramol'],
    uz: ['Aminokislotali vitamin eritmasi', '18 ta aminokislota va vitaminlar bilan boyitilgan eritma. Kasallikdan keyin tiklanish va vazn olish davrida qo‘llaniladi.'],
    ru: ['Аминокислотный витаминный раствор', 'Раствор с 18 аминокислотами и витаминами. Применяется в период восстановления и набора веса.'],
    use: 'supp', composition: 'Aminokislotalar kompleksi, vitaminlar A, D3, E, B guruhi, sorbitol.', storage: '+5…+25 °C', shape: 'bottle', color: '#7c3aed', label: 'AMINO VIT',
    isTrending: true, variants: [['AMV-500', '500 ml', 68000], ['AMV-1000', '1 l', 120000, 135000]],
  },
  {
    slug: 'mineral-blok', cat: 'mineral-bloklar', animals: FARM,
    uz: ['Mineral yalama blok', 'Makro va mikroelementlar bilan presslangan blok. Hayvon o‘ziga kerak miqdorda yalaydi, yaylov va oxurga qo‘yish qulay.'],
    ru: ['Минеральный лизунец', 'Прессованный блок с макро- и микроэлементами. Животное потребляет столько, сколько нужно; удобно для пастбища и кормушки.'],
    use: 'supp', composition: 'Osh tuzi, kalsiy, fosfor, magniy, rux, mis, marganes, kobalt, yod, selen.', shape: 'block', color: '#64748b', label: 'MINERAL',
    isTrending: true, variants: [['MBL-5', '5 kg', 42000], ['MBL-10', '10 kg', 78000, 84000]],
  },
  {
    slug: 'yodlangan-yalama-tuz', cat: 'mineral-bloklar', animals: FARM,
    uz: ['Yodlangan yalama tuz', 'Yod bilan boyitilgan tuz bloki. Qalqonsimon bez faoliyati va ishtahani qo‘llab-quvvatlaydi.'],
    ru: ['Йодированная соль-лизунец', 'Солевой блок, обогащённый йодом. Поддерживает работу щитовидной железы и аппетит.'],
    use: 'supp', composition: 'Natriy xlorid, kaliy yodat.', shape: 'block', color: '#0ea5e9', label: 'YOD TUZ',
    variants: [['YTZ-3', '3 kg', 26000]],
  },
  {
    slug: 'parranda-uchun-ohak-aralashmasi', cat: 'mineral-bloklar', animals: ['parranda'],
    uz: ['Parranda uchun kalsiyli aralashma', 'Bo‘r va mayda chig‘anoq aralashmasi. Tuxum qobig‘i yupqa bo‘lishining oldini olishga yordam beradi.'],
    ru: ['Кальциевая смесь для птицы', 'Смесь мела и мелкой ракушки. Помогает предотвратить истончение скорлупы.'],
    use: 'supp', composition: 'Kalsiy karbonat (bo‘r), maydalangan chig‘anoq.', shape: 'bag', color: '#94a3b8', label: 'KALSIY',
    variants: [['OHK-2', '2 kg', 18000]],
  },
  {
    slug: 'itlar-uchun-multivitamin-tabletka', cat: 'uy-hayvonlari-vitaminlari', animals: ['it'],
    uz: ['Itlar uchun multivitamin tabletkalar', 'Go‘sht ta‘mli chaynaladigan tabletkalar: suyak, jun va immunitet uchun vitamin va minerallar.'],
    ru: ['Мультивитамины для собак, таблетки', 'Жевательные таблетки со вкусом мяса: витамины и минералы для костей, шерсти и иммунитета.'],
    use: 'pet', composition: 'Kalsiy, fosfor, vitaminlar A, D3, E, B guruhi, biotin, rux; go‘sht ta‘mi.', storage: '≤ +25 °C', shape: 'jar', color: '#2563eb', label: 'DOG VIT',
    isNew: true, variants: [['DVT-100', '100 tab.', 85000, 95000]],
  },
  {
    slug: 'mushuklar-uchun-vitaminli-pasta', cat: 'uy-hayvonlari-vitaminlari', animals: ['mushuk'],
    uz: ['Mushuklar uchun vitaminli pasta', 'Mazali pasta ko‘rinishidagi vitaminlar: jun to‘kilishi va ishtaha pasayganda yordam beradi.'],
    ru: ['Витаминная паста для кошек', 'Витамины в виде вкусной пасты: помогают при линьке и снижении аппетита.'],
    use: 'pet', composition: 'Malt ekstrakti, o‘simlik moylari, vitaminlar A, D3, E, taurin.', storage: '≤ +25 °C', shape: 'tube', color: '#db2777', label: 'CAT PASTA',
    isTrending: true, variants: [['CVP-100', '100 g', 59000]],
  },
  {
    slug: 'omega-3-tomchilar', cat: 'uy-hayvonlari-vitaminlari', animals: PETS,
    uz: ['Jun va teri uchun omega-3 tomchilar', 'Baliq moyi asosidagi omega-3 va omega-6. Junni yaltiroq qiladi, teri qurishini kamaytiradi.'],
    ru: ['Омега-3 капли для шерсти и кожи', 'Омега-3 и омега-6 на основе рыбьего жира. Делают шерсть блестящей, уменьшают сухость кожи.'],
    use: 'pet', composition: 'Baliq moyi, vitamin E, biotin.', storage: '+2…+8 °C', shape: 'dropper', color: '#0891b2', label: 'OMEGA 3',
    variants: [['OMG-50', '50 ml', 72000]],
  },

  // ---------- Parazitlarga qarshi ----------
  {
    slug: 'burga-kanaga-qarshi-tomchi', cat: 'burga-kana', animals: PETS,
    uz: ['Burga va kanaga qarshi tomchilar', 'Yelkaga tomiziladigan tomchilar: burga va kanadan bir necha hafta himoya qiladi. Vazn toifasiga qarab tanlanadi.'],
    ru: ['Капли от блох и клещей', 'Капли на холку: защищают от блох и клещей в течение нескольких недель. Выбираются по весу животного.'],
    use: 'parasite', storage: '≤ +25 °C', shape: 'dropper', color: '#dc2626', label: 'ANTI KANA',
    isTrending: true, variants: [['BKT-S', '≤ 4 kg', 38000], ['BKT-L', '10–20 kg', 52000], ['BKT-XL', '20–40 kg', 68000, 75000]],
  },
  {
    slug: 'burga-kanaga-qarshi-sprey', cat: 'burga-kana', animals: PETS,
    uz: ['Burga va kanaga qarshi sprey', 'Jun ustidan sepiladigan sprey. Sayr va tabiatga chiqishdan oldin qo‘shimcha himoya uchun qulay.'],
    ru: ['Спрей от блох и клещей', 'Спрей для нанесения на шерсть. Удобен для дополнительной защиты перед прогулкой и выездом на природу.'],
    use: 'parasite', storage: '≤ +25 °C', shape: 'spray', color: '#e11d48', label: 'SPREY',
    isNew: true, variants: [['BKS-200', '200 ml', 64000]],
  },
  {
    slug: 'itlar-uchun-burga-boyinbogi', cat: 'boyinboglar', animals: ['it'],
    uz: ['Itlar uchun burga va kanaga qarshi bo‘yinbog‘', 'Uzoq muddatli himoya beruvchi bo‘yinbog‘. Uzunligi sozlanadi, ortiqcha qismi qirqib tashlanadi.'],
    ru: ['Ошейник от блох и клещей для собак', 'Ошейник длительного действия. Длина регулируется, лишняя часть отрезается.'],
    use: 'parasite', storage: '≤ +25 °C', shape: 'collar', color: '#16a34a', label: 'DOG',
    isTrending: true, variants: [['BBI-65', '65 sm', 79000, 89000]],
  },
  {
    slug: 'mushuklar-uchun-burga-boyinbogi', cat: 'boyinboglar', animals: ['mushuk'],
    uz: ['Mushuklar uchun burgaga qarshi bo‘yinbog‘', 'Yengil va xavfsiz qulfli bo‘yinbog‘. Mushuk ilinib qolsa, qulf o‘zi ochiladi.'],
    ru: ['Ошейник от блох для кошек', 'Лёгкий ошейник с безопасной застёжкой: раскрывается, если кошка зацепится.'],
    use: 'parasite', storage: '≤ +25 °C', shape: 'collar', color: '#9333ea', label: 'CAT',
    variants: [['BBM-35', '35 sm', 59000]],
  },
  {
    slug: 'chorva-uchun-pashsha-repellenti', cat: 'hasharot-repellent', animals: ['qoramol', 'ot'],
    uz: ['Chorva uchun pashsha va so‘nadan himoya spreyi', 'Yozda pashsha, so‘na va qon so‘ruvchi hasharotlarni haydaydi. Hayvon tinch o‘tlaydi, mahsuldorlik pasaymaydi.'],
    ru: ['Репеллентный спрей от мух и слепней для скота', 'Отпугивает мух, слепней и кровососущих насекомых летом. Животное спокойно пасётся, продуктивность не падает.'],
    use: 'parasite', storage: '≤ +25 °C', shape: 'spray', color: '#65a30d', label: 'STOP MUXA',
    isNew: true, variants: [['PRS-500', '500 ml', 89000]],
  },
  {
    slug: 'pashsha-tutuvchi-lenta', cat: 'hasharot-repellent', animals: ['qoramol', 'parranda'],
    uz: ['Pashsha tutuvchi yopishqoq lenta (10 dona)', 'Molxona va parrandaxonaga osiladigan zaharsiz yopishqoq lenta.'],
    ru: ['Липкая лента от мух (10 шт.)', 'Нетоксичная липкая лента для коровников и птичников.'],
    use: 'tool', shape: 'box', color: '#ca8a04', label: 'LENTA',
    variants: [['PTL-10', '×10', 25000]],
  },

  // ---------- Gigiyena ----------
  {
    slug: 'it-mushuk-shampuni', cat: 'shampunlar', animals: PETS,
    uz: ['Itlar va mushuklar uchun shampun', 'Har kungi parvarish uchun yumshoq shampun. Junni tozalaydi va taralishini osonlashtiradi.'],
    ru: ['Шампунь для собак и кошек', 'Мягкий шампунь для ежедневного ухода. Очищает шерсть и облегчает расчёсывание.'],
    use: 'wash', composition: 'Yumshoq yuvuvchi moddalar, aloe vera, pantenol.', shape: 'bottle', color: '#0284c7', label: 'SHAMPUN',
    variants: [['SHM-250', '250 ml', 28000], ['SHM-500', '500 ml', 45000]],
  },
  {
    slug: 'gipoallergen-shampun', cat: 'shampunlar', animals: PETS,
    uz: ['Gipoallergen shampun (sezgir teri uchun)', 'Bo‘yoq va hidsiz shampun. Allergiyaga moyil va qichiydigan teri uchun.'],
    ru: ['Гипоаллергенный шампунь для чувствительной кожи', 'Шампунь без красителей и отдушек. Для кожи, склонной к аллергии и зуду.'],
    use: 'wash', composition: 'Suli ekstrakti, glitserin, pantenol.', shape: 'bottle', color: '#14b8a6', label: 'SENSITIVE',
    variants: [['GSH-250', '250 ml', 49000]],
  },
  {
    slug: 'otlar-uchun-shampun', cat: 'shampunlar', animals: ['ot'],
    uz: ['Otlar uchun shampun-konditsioner', 'Yol va dumni yumshatadi, chigallashishini kamaytiradi. Ko‘rgazma va musobaqalardan oldin qulay.'],
    ru: ['Шампунь-кондиционер для лошадей', 'Смягчает гриву и хвост, уменьшает спутывание. Удобен перед выставками и соревнованиями.'],
    use: 'wash', composition: 'Yuvuvchi moddalar, silikon, lanolin.', shape: 'canister', color: '#92400e', label: 'HORSE',
    variants: [['OSH-1000', '1 l', 95000]],
  },
  {
    slug: 'yelin-uchun-krem', cat: 'yelin-parvarishi', animals: ['qoramol', 'qoy-echki'],
    uz: ['Yelin uchun yumshatuvchi krem', 'Sog‘ishdan keyin yelin va so‘rg‘ich terisini yumshatadi, yoriqlarning oldini oladi.'],
    ru: ['Смягчающий крем для вымени', 'Смягчает кожу вымени и сосков после доения, предотвращает трещины.'],
    use: 'topical', composition: 'Lanolin, vazelin, kalendula ekstrakti, vitamin E.', storage: '+5…+25 °C', shape: 'jar', color: '#f472b6', label: 'YELIN',
    isTrending: true, variants: [['YLK-500', '500 g', 48000], ['YLK-1000', '1 kg', 85000]],
  },
  {
    slug: 'sogishdan-keyingi-dip', cat: 'yelin-parvarishi', animals: ['qoramol'],
    uz: ['Sog‘ishdan keyingi so‘rg‘ich dipi', 'So‘rg‘ich uchida himoya qatlami hosil qiluvchi yod asosidagi vosita. Ferma gigiyenasi uchun.'],
    ru: ['Средство для обработки сосков после доения', 'Средство на основе йода, образующее защитную плёнку на соске. Для гигиены на ферме.'],
    use: 'disinfect', composition: 'Yod kompleksi, glitserin.', storage: '+5…+25 °C', shape: 'canister', color: '#b45309', label: 'DIP',
    variants: [['SDP-1', '1 l', 72000], ['SDP-5', '5 l', 290000, 320000]],
  },
  {
    slug: 'tuyoq-malhami', cat: 'tuyoq-parvarishi', animals: FARM,
    uz: ['Tuyoq parvarishi uchun malham', 'Tuyoq shoxini mustahkamlaydi va yorilishdan saqlaydi. Ho‘l va loy sharoitda qo‘llash tavsiya etiladi.'],
    ru: ['Мазь для ухода за копытами', 'Укрепляет копытный рог и защищает от растрескивания. Рекомендуется во влажных и грязных условиях.'],
    use: 'topical', composition: 'Lavr moyi, qatron, lanolin, mum.', storage: '≤ +25 °C', shape: 'jar', color: '#78350f', label: 'TUYOQ',
    variants: [['TYM-400', '400 g', 65000], ['TYM-1000', '1 kg', 140000]],
  },
  {
    slug: 'panjalar-uchun-himoya-mumi', cat: 'tuyoq-parvarishi', animals: ['it'],
    uz: ['Panjalar uchun himoya mumi', 'Qishda tuz va muzdan, yozda issiq asfaltdan panja yostiqchalarini himoya qiladi.'],
    ru: ['Защитный воск для лап', 'Защищает подушечки лап от соли и льда зимой и от горячего асфальта летом.'],
    use: 'topical', composition: 'Asal mumi, shi moyi, kokos moyi.', shape: 'jar', color: '#ca8a04', label: 'PAW WAX',
    variants: [['PHM-50', '50 g', 39000]],
  },
  {
    slug: 'molxona-dezinfektanti', cat: 'dezinfeksiya', animals: ['qoramol', 'parranda', 'qoy-echki'],
    uz: ['Molxona va parrandaxona uchun dezinfeksiyalovchi konsentrat', 'Pol, devor, oxur va jihozlarni dezinfeksiya qilish uchun konsentrat. Hayvonlar yo‘qligida ishlov beriladi.'],
    ru: ['Дезинфицирующий концентрат для ферм и птичников', 'Концентрат для дезинфекции полов, стен, кормушек и оборудования. Обработка проводится в отсутствие животных.'],
    use: 'disinfect', composition: 'To‘rtlamchi ammoniy birikmalari, glutaraldegid.', storage: '+5…+30 °C', shape: 'canister', color: '#0f766e', label: 'DEZ',
    variants: [['MDZ-5', '5 l', 185000]],
  },
  {
    slug: 'yara-uchun-himoya-spreyi', cat: 'dezinfeksiya', animals: [...FARM, 'it'],
    uz: ['Yara usti uchun himoya spreyi', 'Tirnalish va yuzaki jarohatlar ustida nafas oladigan himoya qatlami hosil qiladi.'],
    ru: ['Защитный спрей для ран', 'Образует дышащую защитную плёнку на царапинах и поверхностных ранах.'],
    use: 'topical', composition: 'Alyuminiy kukuni, plyonka hosil qiluvchi modda.', storage: '≤ +25 °C', shape: 'spray', color: '#475569', label: 'ALU',
    variants: [['YHS-200', '200 ml', 58000]],
  },

  // ---------- Ozuqa qo'shimchalari ----------
  {
    slug: 'qoramol-uchun-premiks', cat: 'premikslar', animals: ['qoramol'],
    uz: ['Qoramol uchun vitamin-mineral premiks', 'Omuxta yemga qo‘shiladigan premiks: sut mahsuldorligi va ko‘payish salomatligini qo‘llab-quvvatlaydi.'],
    ru: ['Витаминно-минеральный премикс для КРС', 'Премикс для добавления в комбикорм: поддерживает молочную продуктивность и репродуктивное здоровье.'],
    use: 'supp', composition: 'Vitaminlar A, D3, E; rux, mis, marganes, kobalt, yod, selen; to‘ldiruvchi — kepak.', shape: 'bag', color: '#15803d', label: 'PREMIKS',
    isTrending: true, variants: [['QPR-1', '1 kg', 45000], ['QPR-25', '25 kg', 890000, 975000]],
  },
  {
    slug: 'tovuqlar-uchun-premiks', cat: 'premikslar', animals: ['parranda'],
    uz: ['Tuxum beruvchi tovuqlar uchun premiks', 'Tuxum soni va qobig‘i sifati uchun muvozanatlangan vitamin-mineral aralashma.'],
    ru: ['Премикс для кур-несушек', 'Сбалансированная витаминно-минеральная смесь для яйценоскости и качества скорлупы.'],
    use: 'supp', composition: 'Vitaminlar, kalsiy, fosfor, mikroelementlar, metionin.', shape: 'bag', color: '#c2410c', label: 'NESUSHKA',
    isNew: true, variants: [['TPR-1', '1 kg', 39000]],
  },
  {
    slug: 'probiotik-kukun', cat: 'probiotiklar', animals: ['qoramol', 'qoy-echki', 'parranda'],
    uz: ['Hazm qilish uchun probiotik kukun', 'Foydali bakteriyalar ichak mikroflorasini tiklaydi; yosh hayvonlarda ozuqa o‘zgarganda ayniqsa foydali.'],
    ru: ['Пробиотический порошок для пищеварения', 'Полезные бактерии восстанавливают микрофлору кишечника; особенно полезен молодняку при смене корма.'],
    use: 'supp', composition: 'Bacillus subtilis, Lactobacillus, to‘ldiruvchi.', storage: '+2…+20 °C', shape: 'bag', color: '#0d9488', label: 'PROBIO',
    variants: [['PRB-500', '500 g', 62000]],
  },
  {
    slug: 'itlar-va-mushuklar-uchun-probiotik', cat: 'probiotiklar', animals: PETS,
    uz: ['Itlar va mushuklar uchun probiotik pasta', 'Ichak ishini yaxshilovchi pasta: ozuqa almashganda va safarda qulay.'],
    ru: ['Пробиотическая паста для собак и кошек', 'Паста для нормализации пищеварения: удобна при смене корма и в поездках.'],
    use: 'pet', composition: 'Enterococcus faecium, prebiotik tolalar, kaolin.', storage: '+2…+25 °C', shape: 'tube', color: '#4f46e5', label: 'PROBIO',
    variants: [['PIP-30', '30 g', 55000]],
  },
  {
    slug: 'buzoq-elektrolit', cat: 'elektrolitlar', animals: ['qoramol', 'qoy-echki'],
    uz: ['Buzoqlar uchun elektrolit kukuni', 'Diareyada yo‘qotilgan suv va tuzlarni tiklash uchun. Har bir paket bir martalik eritma uchun.'],
    ru: ['Электролит для телят', 'Для восполнения воды и солей, потерянных при диарее. Каждый пакет — на один приём раствора.'],
    use: 'supp', composition: 'Glyukoza, natriy xlorid, kaliy xlorid, natriy bikarbonat, glitsin.', shape: 'box', color: '#2563eb', label: 'ELEKTROLIT',
    variants: [['BEL-100', '100 g ×10', 75000]],
  },
  {
    slug: 'parranda-uchun-elektrolit', cat: 'elektrolitlar', animals: ['parranda'],
    uz: ['Parranda uchun elektrolit (issiq kunlar uchun)', 'Issiqlik stressida suv-tuz muvozanatini saqlaydi, parranda nobudligini kamaytirishga yordam beradi.'],
    ru: ['Электролит для птицы (для жаркой погоды)', 'Поддерживает водно-солевой баланс при тепловом стрессе, помогает снизить падёж.'],
    use: 'supp', composition: 'Elektrolitlar, glyukoza, C vitamini.', shape: 'bag', color: '#0284c7', label: 'ELEKTRO',
    variants: [['PEL-1', '1 kg', 48000]],
  },

  // ---------- Jihozlar ----------
  {
    slug: 'shprits-tarqatgich', cat: 'shpritslar', animals: [...FARM, ...PETS],
    uz: ['Dozalovchi shprits-tarqatgich', 'Suyuq vosita va pastalarni og‘iz orqali aniq dozada berish uchun ko‘p martalik shprits.'],
    ru: ['Шприц-дозатор', 'Многоразовый шприц для точного перорального введения жидких средств и паст.'],
    use: 'tool', shape: 'box', color: '#334155', label: 'DOZATOR',
    variants: [['SHT-50', '50 ml', 55000]],
  },
  {
    slug: 'bir-martalik-shpritslar', cat: 'shpritslar', animals: [...FARM, ...PETS],
    uz: ['Bir martalik shpritslar (100 dona)', 'Steril bir martalik shpritslar, igna bilan. Har biri alohida qadoqda.'],
    ru: ['Шприцы одноразовые (100 шт.)', 'Стерильные одноразовые шприцы с иглой, в индивидуальной упаковке.'],
    use: 'tool', shape: 'box', color: '#0ea5e9', label: 'SHPRITS',
    variants: [['BMS-5', '5 ml ×100', 48000], ['BMS-10', '10 ml ×100', 65000]],
  },
  {
    slug: 'veterinariya-elektron-termometri', cat: 'termometrlar', animals: [...FARM, ...PETS, 'parranda'],
    uz: ['Veterinariya elektron termometri', 'Tez o‘lchaydigan elektron termometr, egiluvchan uchli. Natija 10–30 soniyada, ovozli signal bilan.'],
    ru: ['Ветеринарный электронный термометр', 'Быстрый электронный термометр с гибким наконечником. Результат за 10–30 секунд со звуковым сигналом.'],
    use: 'tool', shape: 'thermo', color: '#0f172a', label: '38.5°',
    isNew: true, variants: [['VTM-1', '×1', 45000]],
  },
  {
    slug: 'sut-filtri', cat: 'sogish-jihozlari', animals: ['qoramol', 'qoy-echki'],
    uz: ['Sut filtri (100 dona)', 'Sog‘ilgan sutni mexanik aralashmalardan tozalash uchun bir martalik filtrlar.'],
    ru: ['Фильтр для молока (100 шт.)', 'Одноразовые фильтры для очистки надоенного молока от механических примесей.'],
    use: 'tool', shape: 'box', color: '#38bdf8', label: 'FILTR',
    variants: [['STF-100', '×100', 39000]],
  },
  {
    slug: 'sorgich-dipi-uchun-stakan', cat: 'sogish-jihozlari', animals: ['qoramol'],
    uz: ['So‘rg‘ich dipi uchun stakan', 'Qaytmas klapanli stakan: dip ifloslanmaydi va tejaladi.'],
    ru: ['Стакан для обработки сосков', 'Стакан с обратным клапаном: средство не загрязняется и расходуется экономно.'],
    use: 'tool', shape: 'bottle', color: '#f97316', label: 'DIP CUP',
    variants: [['SDS-1', '×1', 35000]],
  },
  {
    slug: 'raqamli-quloq-birkalari', cat: 'birkalar', animals: ['qoramol', 'qoy-echki'],
    uz: ['Raqamli quloq birkalari (100 dona)', 'Chorva hisobini yuritish uchun raqamlangan plastik birkalar. Quyosh va sovuqqa chidamli.'],
    ru: ['Ушные бирки с номерами (100 шт.)', 'Пронумерованные пластиковые бирки для учёта скота. Устойчивы к солнцу и морозу.'],
    use: 'tool', shape: 'box', color: '#eab308', label: 'BIRKA',
    variants: [['QBR-100', '×100', 250000, 275000]],
  },
  {
    slug: 'birka-ornatish-ombiri', cat: 'birkalar', animals: ['qoramol', 'qoy-echki'],
    uz: ['Birka o‘rnatish ombiri', 'Quloq birkalarini tez va kam og‘riq bilan o‘rnatish uchun metall ombir.'],
    ru: ['Щипцы для установки бирок', 'Металлические щипцы для быстрой и малотравматичной установки ушных бирок.'],
    use: 'tool', shape: 'box', color: '#52525b', label: 'OMBIR',
    variants: [['BOO-1', '×1', 120000]],
  },
];

// ---------- Rasm (SVG qadoq) ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('')}`;
}

// Yorliq: oq plashka, nom (1–2 qator) va qadoq hajmi.
function label(cx: number, cy: number, w: number, h: number, color: string, text: string, sub: string) {
  const lines = text.split(' ').reduce<string[]>((acc, word) => {
    const last = acc[acc.length - 1];
    if (last && (last + ' ' + word).length <= 9) acc[acc.length - 1] = last + ' ' + word;
    else acc.push(word);
    return acc;
  }, []);
  const size = Math.min(46, Math.floor((w - 24) / (Math.max(...lines.map((l) => l.length)) * 0.62)));
  const top = cy - ((lines.length - 1) * size) / 2 - 8;
  return `
  <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="14" fill="#fff"/>
  <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="10" rx="5" fill="${shade(color, 0.35)}"/>
  ${lines.map((l, i) => `<text x="${cx}" y="${top + i * size}" font-size="${size}" font-weight="800" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Segoe UI,Arial,sans-serif">${esc(l)}</text>`).join('')}
  <text x="${cx}" y="${cy + h / 2 - 22}" font-size="22" font-weight="600" fill="#64748b" text-anchor="middle" font-family="Inter,Segoe UI,Arial,sans-serif">${esc(sub)}</text>`;
}

function packshot(p: P) {
  const c = p.color;
  const sub = p.variants[0][1];
  const body = `url(#g)`;
  const shapes: Record<Shape, string> = {
    bottle: `<rect x="255" y="70" width="90" height="60" rx="10" fill="${shade(c, -0.35)}"/><rect x="270" y="125" width="60" height="35" fill="${shade(c, -0.2)}"/>
      <rect x="185" y="150" width="230" height="390" rx="48" fill="${body}"/>${label(300, 360, 190, 190, c, p.label, sub)}`,
    canister: `<rect x="320" y="70" width="70" height="55" rx="10" fill="${shade(c, -0.35)}"/><path d="M170 150 h250 a30 30 0 0 1 30 30 v330 a30 30 0 0 1 -30 30 h-250 a30 30 0 0 1 -30 -30 v-330 a30 30 0 0 1 30 -30z" fill="${body}"/>
      <path d="M190 120 h90 a20 20 0 0 1 20 20 v20 h-130 v-20 a20 20 0 0 1 20 -20z" fill="${shade(c, -0.25)}"/>${label(295, 365, 230, 200, c, p.label, sub)}`,
    jar: `<rect x="165" y="150" width="270" height="70" rx="16" fill="${shade(c, -0.35)}"/><rect x="155" y="210" width="290" height="290" rx="44" fill="${body}"/>${label(300, 355, 220, 170, c, p.label, sub)}`,
    box: `<path d="M170 140 l40 -40 h260 l-40 40z" fill="${shade(c, 0.25)}"/><path d="M430 140 l40 -40 v360 l-40 40z" fill="${shade(c, -0.35)}"/>
      <rect x="170" y="140" width="260" height="360" rx="6" fill="${body}"/>${label(300, 320, 210, 200, c, p.label, sub)}`,
    tube: `<path d="M200 90 h200 l-20 30 l-30 340 h-100 l-30 -340 z" fill="${body}"/><rect x="200" y="78" width="200" height="22" rx="4" fill="${shade(c, -0.3)}"/>
      <rect x="262" y="455" width="76" height="80" rx="12" fill="${shade(c, -0.4)}"/>${label(300, 270, 150, 190, c, p.label, sub)}`,
    spray: `<rect x="255" y="60" width="70" height="45" rx="8" fill="${shade(c, -0.4)}"/><rect x="320" y="72" width="40" height="14" rx="7" fill="${shade(c, -0.4)}"/>
      <rect x="240" y="100" width="120" height="70" rx="16" fill="#e2e8f0"/><rect x="210" y="160" width="180" height="380" rx="40" fill="${body}"/>${label(300, 360, 150, 210, c, p.label, sub)}`,
    bag: `<path d="M170 120 h260 l10 30 q20 190 0 380 h-280 q-20 -190 0 -380z" fill="${body}"/><rect x="170" y="110" width="260" height="22" rx="6" fill="${shade(c, -0.3)}"/>
      <circle cx="300" cy="150" r="8" fill="#fff" opacity=".7"/>${label(300, 345, 210, 210, c, p.label, sub)}`,
    dropper: `<rect x="280" y="40" width="40" height="80" rx="20" fill="#e2e8f0"/><rect x="250" y="110" width="100" height="70" rx="12" fill="${shade(c, -0.35)}"/>
      <rect x="205" y="170" width="190" height="350" rx="46" fill="${body}"/>${label(300, 355, 160, 190, c, p.label, sub)}`,
    collar: `<rect x="140" y="140" width="320" height="320" rx="40" fill="${body}"/><circle cx="300" cy="300" r="110" fill="none" stroke="#fff" stroke-width="26" opacity=".9"/>
      <rect x="275" y="175" width="50" height="40" rx="8" fill="${shade(c, -0.4)}"/>${label(300, 300, 150, 110, c, p.label, sub)}`,
    block: `<path d="M150 230 l150 -80 l150 80 l-150 80z" fill="${shade(c, 0.35)}"/><path d="M150 230 l150 80 v190 l-150 -80z" fill="${body}"/>
      <path d="M450 230 l-150 80 v190 l150 -80z" fill="${shade(c, -0.3)}"/>${label(225, 365, 120, 130, c, p.label, sub)}`,
    thermo: `<rect x="250" y="80" width="100" height="330" rx="50" fill="${body}"/><rect x="270" y="130" width="60" height="90" rx="10" fill="#bbf7d0"/>
      <text x="300" y="178" font-size="26" font-weight="800" fill="#065f46" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif">${esc(p.label)}</text>
      <circle cx="300" cy="270" r="18" fill="${shade(c, 0.4)}"/><rect x="292" y="400" width="16" height="140" rx="8" fill="#cbd5e1"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${shade(c, 0.15)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.25)}"/></linearGradient></defs>
  <ellipse cx="300" cy="555" rx="190" ry="22" fill="#0f172a" opacity=".08"/>
  ${shapes[p.shape]}
</svg>`;
}

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

async function main() {
  mkdirSync(IMG_DIR, { recursive: true });

  for (const [i, [parent, slug, nameUz, nameRu]] of subcategories.entries()) {
    const p = await prisma.category.findUniqueOrThrow({ where: { slug: parent } });
    await prisma.category.upsert({ where: { slug }, update: { parentId: p.id, nameUz, nameRu }, create: { slug, parentId: p.id, nameUz, nameRu, position: i } });
  }

  const admin = await prisma.user.findUnique({ where: { phone: '+998900000001' } });

  for (const [idx, p] of products.entries()) {
    writeFileSync(join(IMG_DIR, `${p.slug}.svg`), packshot(p));
    const cat = await prisma.category.findUniqueOrThrow({ where: { slug: p.cat } });
    const [use, useRu] = USE[p.use];
    const fields = {
      categoryId: cat.id,
      titleUz: p.uz[0],
      titleRu: p.ru[0],
      descriptionUz: p.uz[1],
      descriptionRu: p.ru[1],
      dosageUz: use,
      dosageRu: useRu,
      composition: p.composition ?? '',
      storageTemp: p.storage ?? null,
      manufacturer: '',
      status: 'ACTIVE' as const,
      isNew: !!p.isNew,
      isTrending: !!p.isTrending,
      animalTypes: { set: p.animals.map((slug) => ({ slug })) },
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: fields,
      create: { ...fields, slug: p.slug, animalTypes: { connect: p.animals.map((slug) => ({ slug })) } },
    });
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({ data: { productId: product.id, url: `/uploads/demo/${p.slug}.svg`, position: 0 } });

    for (const [sku, packSize, price, oldPrice] of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku },
        update: { productId: product.id, packSize, price, oldPrice: oldPrice ?? null, active: true },
        create: { productId: product.id, sku, packSize, price, oldPrice: oldPrice ?? null },
      });
      // Sotuvga yaroqli qoldiq kam bo'lsa, demo partiya qo'shiladi.
      const stock = await prisma.batch.aggregate({ where: { variantId: variant.id, expiryDate: { gt: new Date() } }, _sum: { qty: true } });
      if ((stock._sum.qty ?? 0) < 10) {
        const qty = 20 + ((idx * 7) % 60);
        await prisma.batch.create({
          data: {
            variantId: variant.id,
            batchNo: `DEMO-${sku}-${Date.now().toString(36)}`,
            expiryDate: inDays(240 + ((idx * 37) % 480)),
            qty,
            purchasePrice: Math.round(price * 0.7),
            movements: { create: { type: 'RECEIPT', qty, userId: admin?.id, reason: 'Demo katalog' } },
          },
        });
      }
    }
  }
  console.log(`Demo katalog tayyor: ${subcategories.length} subkategoriya, ${products.length} mahsulot`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
