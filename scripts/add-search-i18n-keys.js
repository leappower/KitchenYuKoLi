#!/usr/bin/env node
/**
 * add-search-i18n-keys.js
 * Add search-related i18n keys to all language files.
 *
 * Keys added:
 *   search_placeholder          - Search box placeholder text
 *   search_no_results           - "No results found" message
 *   search_view_all             - "View all results" link text
 *   search_results_count        - "X results found" text
 */

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT_DIR = path.resolve(__dirname, '..');
var LANG_DIR = path.join(ROOT_DIR, 'src/assets/lang');

// Search i18n translations per language
var SEARCH_I18N = {
  'en': {
    search_placeholder: 'Search equipment, models...',
    search_no_results: 'No matching products found',
    search_view_all: 'View all products',
    search_results_count: '{count} products found',
    search_hint: 'Try searching by model number or product type'
  },
  'zh-CN': {
    search_placeholder: '搜索设备、型号...',
    search_no_results: '未找到匹配的产品',
    search_view_all: '查看全部产品',
    search_results_count: '找到 {count} 个产品',
    search_hint: '试试搜索型号或产品类型'
  },
  'zh-TW': {
    search_placeholder: '搜尋設備、型號...',
    search_no_results: '未找到匹配的產品',
    search_view_all: '查看全部產品',
    search_results_count: '找到 {count} 個產品',
    search_hint: '試試搜尋型號或產品類型'
  },
  'de': {
    search_placeholder: 'Geräte, Modelle suchen...',
    search_no_results: 'Keine passenden Produkte gefunden',
    search_view_all: 'Alle Produkte anzeigen',
    search_results_count: '{count} Produkte gefunden',
    search_hint: 'Suchen Sie nach Modellnummer oder Produkttyp'
  },
  'es': {
    search_placeholder: 'Buscar equipos, modelos...',
    search_no_results: 'No se encontraron productos',
    search_view_all: 'Ver todos los productos',
    search_results_count: '{count} productos encontrados',
    search_hint: 'Intente buscar por número de modelo o tipo'
  },
  'fr': {
    search_placeholder: 'Rechercher équipements, modèles...',
    search_no_results: 'Aucun produit trouvé',
    search_view_all: 'Voir tous les produits',
    search_results_count: '{count} produits trouvés',
    search_hint: 'Essayez de rechercher par numéro de modèle ou type'
  },
  'it': {
    search_placeholder: 'Cerca attrezzature, modelli...',
    search_no_results: 'Nessun prodotto trovato',
    search_view_all: 'Vedi tutti i prodotti',
    search_results_count: '{count} prodotti trovati',
    search_hint: 'Prova a cercare per numero di modello o tipo'
  },
  'pt': {
    search_placeholder: 'Buscar equipamentos, modelos...',
    search_no_results: 'Nenhum produto encontrado',
    search_view_all: 'Ver todos os produtos',
    search_results_count: '{count} produtos encontrados',
    search_hint: 'Tente pesquisar por número de modelo ou tipo'
  },
  'nl': {
    search_placeholder: 'Zoek apparatuur, modellen...',
    search_no_results: 'Geen producten gevonden',
    search_view_all: 'Alle producten bekijken',
    search_results_count: '{count} producten gevonden',
    search_hint: 'Probeer te zoeken op modelnummer of producttype'
  },
  'pl': {
    search_placeholder: 'Szukaj sprzętu, modeli...',
    search_no_results: 'Nie znaleziono produktów',
    search_view_all: 'Zobacz wszystkie produkty',
    search_results_count: 'Znaleziono {count} produktów',
    search_hint: 'Spróbuj wyszukać po numerze modelu lub typie'
  },
  'ru': {
    search_placeholder: 'Поиск оборудования, моделей...',
    search_no_results: 'Продукты не найдены',
    search_view_all: 'Все продукты',
    search_results_count: '{count} продуктов найдено',
    search_hint: 'Попробуйте найти по номеру модели или типу'
  },
  'tr': {
    search_placeholder: 'Ekipman, modelleri ara...',
    search_no_results: 'Ürün bulunamadı',
    search_view_all: 'Tüm ürünleri gör',
    search_results_count: '{count} ürün bulundu',
    search_hint: 'Model numarası veya ürün türü ile aramayı deneyin'
  },
  'ja': {
    search_placeholder: '設備・型番を検索...',
    search_no_results: '該当する製品が見つかりません',
    search_view_all: 'すべての製品を見る',
    search_results_count: '{count}件の製品が見つかりました',
    search_hint: '型番や製品タイプで検索してみてください'
  },
  'ko': {
    search_placeholder: '장비, 모델 검색...',
    search_no_results: '일치하는 제품이 없습니다',
    search_view_all: '모든 제품 보기',
    search_results_count: '{count}개 제품 검색됨',
    search_hint: '모델 번호 또는 제품 유형으로 검색해 보세요'
  },
  'ar': {
    search_placeholder: 'البحث عن المعدات والنماذج...',
    search_no_results: 'لم يتم العثور على منتجات',
    search_view_all: 'عرض جميع المنتجات',
    search_results_count: 'تم العثور على {count} منتج',
    search_hint: 'حاول البحث برقم الطراز أو نوع المنتج'
  },
  'he': {
    search_placeholder: 'חיפוש ציוד, דגמים...',
    search_no_results: 'לא נמצאו מוצרים תואמים',
    search_view_all: 'הצג את כל המוצרים',
    search_results_count: 'נמצאו {count} מוצרים',
    search_hint: 'נסה לחפש לפי מספר דגם או סוג מוצר'
  },
  'hi': {
    search_placeholder: 'उपकरण, मॉडल खोजें...',
    search_no_results: 'कोई उत्पाद नहीं मिला',
    search_view_all: 'सभी उत्पाद देखें',
    search_results_count: '{count} उत्पाद मिले',
    search_hint: 'मॉडल नंबर या उत्पाद प्रकार से खोजने का प्रयास करें'
  },
  'id': {
    search_placeholder: 'Cari peralatan, model...',
    search_no_results: 'Tidak ada produk yang ditemukan',
    search_view_all: 'Lihat semua produk',
    search_results_count: '{count} produk ditemukan',
    search_hint: 'Coba cari berdasarkan nomor model atau jenis produk'
  },
  'ms': {
    search_placeholder: 'Cari peralatan, model...',
    search_no_results: 'Tiada produk dijumpai',
    search_view_all: 'Lihat semua produk',
    search_results_count: '{count} produk dijumpai',
    search_hint: 'Cuba cari berdasarkan nombor model atau jenis produk'
  },
  'th': {
    search_placeholder: 'ค้นหาอุปกรณ์ รุ่น...',
    search_no_results: 'ไม่พบผลิตภัณฑ์ที่ตรงกัน',
    search_view_all: 'ดูผลิตภัณฑ์ทั้งหมด',
    search_results_count: 'พบ {count} ผลิตภัณฑ์',
    search_hint: 'ลองค้นหาด้วยหมายเลขรุ่นหรือประเภทสินค้า'
  },
  'vi': {
    search_placeholder: 'Tìm thiết bị, mẫu...',
    search_no_results: 'Không tìm thấy sản phẩm phù hợp',
    search_view_all: 'Xem tất cả sản phẩm',
    search_results_count: 'Tìm thấy {count} sản phẩm',
    search_hint: 'Thử tìm theo số mô hình hoặc loại sản phẩm'
  },
  'fil': {
    search_placeholder: 'Maghanap ng kagamitan, modelo...',
    search_no_results: 'Walang nahanap na produkto',
    search_view_all: 'Tingnan lahat ng produkto',
    search_results_count: '{count} produkto na nahanap',
    search_hint: 'Subukan maghanap ayon sa numero ng modelo o uri'
  },
  'km': {
    search_placeholder: 'ស្វែងរកឧបករណ៍ ម៉ូដែល...',
    search_no_results: 'គ្មានផលិតផលដែលត្រូវគ្នាបានរកឃើញ',
    search_view_all: 'មើលផលិតផលទាំងអស់',
    search_results_count: 'រកឃើញ {count} ផលិតផល',
    search_hint: 'ព្យាយាមស្វែងរកតាមលេខាម៉ូដែល ឬប្រភេទផលិតផល'
  },
  'lo': {
    search_placeholder: 'ຄົ້ນຫາອຸປະກອນ ແບບ...',
    search_no_results: 'ບໍ່ພົບຜະລິດຕະພັນ',
    search_view_all: 'ເບິ່ງຜະລິດຕະພັນທັງໝົດ',
    search_results_count: 'ພົບ {count} ຜະລິດຕະພັນ',
    search_hint: 'ລອງຄົ້ນຫາຕາມເລກຮ່ວງ ຫຼື ປະເພດຜະລິດຕະພັນ'
  },
  'my': {
    search_placeholder: 'စက်ရှက်၊ မေရာက်မှာရှာရန်...',
    search_no_results: 'ကိုယ်ရှိသော ကုန်ပစ္စည်းများ မရှိပါ',
    search_view_all: 'ကုန်ပစ္စည်းအားလုံးကိုကြည့်ရန်',
    search_results_count: '{count} ကုန်ပစ္စည်းတွေ ရှာတွေကြည့်ရပါ',
    search_hint: 'မေရာက်နံရံ သို့မဟုတ် ကုန်ပစ္စည်းအမျိုးအစားဖြင့် ရှာရန်ကျွန်ုပ်ပါ'
  }
};

// Keys to add (alphabetically ordered)
var KEYS = ['search_hint', 'search_no_results', 'search_placeholder', 'search_results_count', 'search_view_all'];

// Also update the master ui-i18n.json
function updateMasterFile() {
  var masterPath = path.join(ROOT_DIR, 'src/assets/ui-i18n.json');
  var master = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
  var updatedCount = 0;

  Object.keys(master).forEach(function (lang) {
    var translations = SEARCH_I18N[lang];
    if (!translations) return;
    KEYS.forEach(function (key) {
      if (!master[lang][key]) {
        master[lang][key] = translations[key];
        updatedCount++;
      }
    });
  });

  // Write back alphabetically sorted
  var sorted = {};
  Object.keys(master).sort().forEach(function (lang) {
    sorted[lang] = {};
    Object.keys(master[lang]).sort().forEach(function (key) {
      sorted[lang][key] = master[lang][key];
    });
  });

  fs.writeFileSync(masterPath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  console.log('[ui-i18n.json] Updated ' + updatedCount + ' keys');
}

function updateLangFiles() {
  var files = fs.readdirSync(LANG_DIR).filter(function (f) {
    return f.endsWith('-ui.json');
  });

  var totalUpdated = 0;

  files.forEach(function (file) {
    var langCode = file.replace('-ui.json', '');
    var translations = SEARCH_I18N[langCode];
    if (!translations) {
      // For languages without explicit translations, use English as fallback
      translations = SEARCH_I18N['en'];
    }

    var filePath = path.join(LANG_DIR, file);
    var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    var updated = 0;

    KEYS.forEach(function (key) {
      if (!data[key]) {
        data[key] = translations[key];
        updated++;
      }
    });

    if (updated > 0) {
      // Sort keys alphabetically
      var sorted = {};
      Object.keys(data).sort().forEach(function (k) {
        sorted[k] = data[k];
      });
      fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
      console.log('[' + file + '] Added ' + updated + ' keys');
      totalUpdated += updated;
    } else {
      console.log('[' + file + '] Already up to date');
    }
  });

  console.log('\nTotal: ' + totalUpdated + ' keys added across ' + files.length + ' files');
}

updateMasterFile();
updateLangFiles();
console.log('\nDone!');
