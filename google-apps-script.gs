/**
 * YuKoLi 官网表单收集 — Google Apps Script
 *
 * 统一 Schema（23 列）：
 * A: 表单来源 | B: 国家/地区 | C: 联系人 | D: 公司名称 | E: 餐厅类型/业态
 * F: 区号 | G: 手机号 | H: 联系方式渠道 | I: 联系方式账号 | J: 邮箱
 * K: 问题类型 | L: 问题描述 | M: 痛点(多选) | N: 痛点/设备补充
 * O: 设备类型(多选) | P: 产能 | Q: 预算
 * R: 人力成本(月) | S: 日餐量 | T: 减员目标 | U: 计算结果
 * V: 提交时间
 */

var HEADERS = [
  '表单来源', '国家/地区', '联系人', '公司名称', '餐厅类型/业态',
  '区号', '手机号', '联系方式渠道', '联系方式账号', '邮箱',
  '问题类型', '问题描述', '痛点(多选)', '痛点/设备补充',
  '设备类型(多选)', '产能', '预算',
  '人力成本(月)', '日餐量', '减员目标', '计算结果',
  '完整手机号', '提交时间'
];

function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);
    // 兼容 JSON 和 form-urlencoded 两种提交格式
    // - JSON (通过 server.js 代理):   e.postData.contents
    // - form-urlencoded (直连 no-cors): e.parameter
    var data = {};
    try {
      data = JSON.parse(e.postData.contents || "{}");
    } catch (err) {
      data = e.parameter || {};
    }
    // form-urlencoded 提交时 Google 会自动 decode，但部分值可能仍是 object
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch (e2) { data = {}; }
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    // 首次使用自动创建表头
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f1f5f9');
      sheet.setFrozenRows(1);
      // 自动列宽
      for (var i = 1; i <= HEADERS.length; i++) {
        sheet.setColumnWidth(i, i <= 5 ? 140 : 180);
      }
    }

    // 合并完整手机号
    var fullPhone = '';
    if (data.phoneCode && data.phone) {
      fullPhone = data.phoneCode.replace('+', '') + data.phone;
    } else if (data.phone) {
      fullPhone = data.phone;
    }

    var row = [
      data.source || '',           // A
      data.country || '',          // B
      data.contact || data.name || '', // C
      data.company || '',         // D
      data.restaurantType || data.businessType || '', // E
      data.phoneCode || '',       // F
      data.phone || '',           // G
      data.contactChannel || '',  // H
      data.contactAccount || '',  // I
      data.email || '',           // J
      data.issueType || '',       // K
      data.description || '',     // L
      data.painPoints || '',      // M
      data.painOther || '',       // N
      data.equipTypes || '',      // O
      data.capacity || '',        // P
      data.budget || '',          // Q
      data.laborCost || '',       // R
      data.dailyMeals || '',      // S
      data.operatorReduction || '', // T
      data.calcResult || '',      // U
      fullPhone,                  // V
      new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) // W
    ];

    // 写入行
    var rowNum = sheet.getLastRow() + 1;
    for (var i = 0; i < row.length; i++) {
      var val = String(row[i] || '');
      // 防止 Sheets 把 +/=/-/@ 开头的内容当作公式
      if (/^[+=\-@]/.test(val)) val = "'" + val;
      sheet.getRange(rowNum, i + 1).setValue(val);
    }

    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 测试函数：在 Apps Script 编辑器中直接运行
function testPost() {
  var test = {
    source: '联系我们',
    country: '🇮🇩 Indonesia',
    contact: '测试用户',
    company: '',
    restaurantType: 'small-restaurant',
    phoneCode: '+62',
    phone: '81234567890',
    contactChannel: 'WhatsApp',
    contactAccount: '+62 81234567890',
    email: 'test@example.com',
    issueType: '',
    description: '',
    painPoints: '招聘困难, 出餐慢',
    painOther: '',
    equipTypes: '',
    capacity: '',
    budget: '',
    laborCost: '',
    dailyMeals: '',
    operatorReduction: '',
    calcResult: ''
  };
  var e = { postData: { contents: JSON.stringify(test) } };
  var result = doPost(e);
  Logger.log(result.getContentText());
}
