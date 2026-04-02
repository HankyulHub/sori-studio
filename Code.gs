/**
 * SORI v7 — Apps Script에 합치는 조각입니다.
 * doGet 맨 앞: var _v7 = v7_doGet(e, isTest); if (_v7) return _v7;
 * doPost 분기: var _v7 = v7_doPost(JSON.parse(e.postData.contents), isTest); if (_v7) return _v7;
 * (postData 파싱 방식은 기존 프로젝트에 맞게 조정)
 *
 * 필요: loadStudents, loadInvoiceStudents, loadPaymentStatus, getRevenueStats, togglePayment, _gemini
 * 이미 generateKakao / generateNotice를 쓰고 있다면 중복 분기만 제거하고 내용만 합치세요.
 */

function v7_doGet(e, isTest) {
  try {
    var action = e.parameter.action;
    if (action === 'ping') {
      return ContentService.createTextOutput('pong').setMimeType(ContentService.MimeType.TEXT);
    }
    if (action === 'loadAll') {
      var pYear = parseInt(e.parameter.year || '', 10) || new Date().getFullYear();
      var pMonth = parseInt(e.parameter.month || '', 10) || (new Date().getMonth() + 1);
      var payYear = parseInt(e.parameter.payYear || '', 10) || pYear;
      var payMonth = parseInt(e.parameter.payMonth || '', 10) || pMonth;
      var students = loadStudents(isTest);
      var invoiceStudents = loadInvoiceStudents(isTest, pYear, pMonth);
      var paymentStatus = loadPaymentStatus(isTest, payYear, payMonth);
      var revenueStats = getRevenueStats(isTest);
      var result = {
        ok: true,
        data: {
          students: students,
          invoiceStudents: invoiceStudents,
          paymentStatus: paymentStatus,
          revenueStats: revenueStats
        }
      };
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) })).setMimeType(ContentService.MimeType.JSON);
  }
  return null;
}

function v7_generateKakao(name, gg, kw, hist, type, overdueAmount, overdueMonth) {
  if (type === 'overdue') {
    var overduePrompt =
      '당신은 피아노 음악학원 원장입니다.\n' +
      '학부모에게 보내는 수납 안내 카카오톡 메시지를 작성해주세요.\n\n' +
      '학생 이름: ' +
      name +
      '\n' +
      '미납 월: ' +
      (overdueMonth || '') +
      '\n' +
      '수강료: ' +
      (overdueAmount || '') +
      '원\n\n' +
      '조건:\n' +
      '- 정중하고 부드러운 톤 (독촉이 아닌 안내)\n' +
      '- ~요 체, ^^, ㅎㅎ 자연스럽게 (원장 말투)\n' +
      '- "안녕하세요 소리마을입니다 🎵"로 시작\n' +
      '- 학생의 레슨을 응원하는 내용 한 줄 포함\n' +
      '- "혹시 확인이 어려우시면 편하게 연락 주세요" 식의 배려 문구\n' +
      '- 200자 이내\n' +
      '- 이모지 1~2개만 사용';
    var oResult = _gemini(overduePrompt, 0.7, 600);
    return oResult.text;
  }
  var histBlock = hist && String(hist).trim() ? String(hist).trim() : '이전 이력 없음';
  var fbPrompt =
    '당신은 피아노 음악학원 원장입니다.\n' +
    '학부모에게 보내는 레슨 피드백 카카오톡 메시지를 작성해주세요.\n\n' +
    '학생 이름: ' +
    name +
    '\n학년/반: ' +
    (gg || '') +
    '\n키워드: ' +
    (kw || '') +
    '\n이전 이력:\n' +
    histBlock +
    '\n\n조건: 정중하고 따뜻한 톤, 200자 내외, 이모지 1~2개, 학원 이름은 소리마을음악교습소';
  var fbResult = _gemini(fbPrompt, 0.7, 600);
  return fbResult.text;
}

function v7_doPost(body, isTest) {
  try {
    var action = body.action;
    if (action === 'generateNotice') {
      var typeNames = {
        closure: '휴원 안내',
        schedule: '수업 일정 변경 안내',
        tuition: '수강료 변경 안내',
        custom: '공지사항'
      };
      var ntcType = body.type || 'custom';
      var ntcDate = body.date || '';
      var ntcMemo = body.memo || '';
      var ntcPrompt =
        '당신은 피아노 음악학원 원장입니다.\n' +
        '학부모들에게 보내는 ' +
        (typeNames[ntcType] || '공지사항') +
        ' 카카오톡 메시지를 작성해주세요.\n\n' +
        '안내 유형: ' +
        (typeNames[ntcType] || '공지사항') +
        '\n' +
        '날짜/기간: ' +
        ntcDate +
        '\n' +
        '상세 내용: ' +
        ntcMemo +
        '\n\n' +
        '조건:\n- 정중하고 따뜻한 톤\n- 200~300자\n- 인사 → 본문 → 양해/감사 순서\n' +
        '- "문의사항은 편하게 연락 주세요" 식의 마무리\n- 이모지 2~3개\n- 학원 이름은 소리마을음악교습소';
      var ntcResult = _gemini(ntcPrompt, 0.8, 600);
      var out = { ok: true, data: { message: ntcResult.text } };
      return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'updatePayment') {
      var isPaid = !!body.value;
      var yr = parseInt(body.year || '', 10) || new Date().getFullYear();
      var mo = parseInt(body.month || '', 10) || new Date().getMonth() + 1;
      var nm = body.studentId || body.name;
      var data = togglePayment(yr, mo, nm, isPaid, isTest);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: data })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'generateKakao') {
      var text = v7_generateKakao(
        body.name,
        body.gg,
        body.kw,
        body.hist,
        body.type || 'feedback',
        body.overdueAmount,
        body.overdueMonth
      );
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: text })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'togglePayment') {
      var paid = !!body.paid;
      var ty = parseInt(body.year || '', 10) || new Date().getFullYear();
      var tm = parseInt(body.month || '', 10) || new Date().getMonth() + 1;
      var tnm = body.name;
      var tdata = togglePayment(ty, tm, tnm, paid, isTest);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: tdata })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'sendFriendTalk') {
      var ft = sendFriendTalk(body.recipients || []);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: ft })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'saveMessage') {
      v7_saveMessage(body.row, body.text, body.type || 'feedback', isTest);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'markDone') {
      v7_markDone(body.row, body.text, body.type || 'feedback', isTest);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'undoDone') {
      v7_undoDone(body.row, body.type || 'feedback', isTest);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: true })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) })).setMimeType(ContentService.MimeType.JSON);
  }
  return null;
}

/**
 * Aligo 카카오 친구톡 (스크립트 속성: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER, ALIGO_PROFILE_KEY)
 */
function sendFriendTalk(recipients) {
  var props = PropertiesService.getScriptProperties();
  var API_KEY = props.getProperty('ALIGO_API_KEY');
  var USER_ID = props.getProperty('ALIGO_USER_ID');
  var SENDER = props.getProperty('ALIGO_SENDER');
  var PROFILE_KEY = props.getProperty('ALIGO_PROFILE_KEY');
  var results = [];
  if (!API_KEY || !USER_ID || !SENDER || !PROFILE_KEY) {
    for (var z = 0; z < recipients.length; z++) {
      var rz = recipients[z];
      results.push({
        phone: rz && rz.phone,
        studentName: rz && rz.studentName,
        success: false,
        message: '스크립트 속성(ALIGO_*)이 설정되지 않았습니다.'
      });
    }
    return results;
  }
  for (var i = 0; i < recipients.length; i++) {
    var r = recipients[i];
    if (!r || !r.phone) {
      results.push({ phone: '', studentName: r && r.studentName, success: false, message: '번호 없음' });
      continue;
    }
    try {
      var payload = {
        apikey: API_KEY,
        userid: USER_ID,
        token: '',
        senderkey: PROFILE_KEY,
        sender: SENDER,
        receiver_1: String(r.phone).replace(/\D/g, ''),
        subject_1: '소리마을 알림',
        message_1: String(r.message || ''),
        fimage: '',
        fwide: 'N'
      };
      var options = {
        method: 'post',
        payload: payload,
        muteHttpExceptions: true
      };
      var res = UrlFetchApp.fetch('https://kakaoapi.aligo.in/akv10/friend/send/', options);
      var text = res.getContentText();
      var json = {};
      try {
        json = JSON.parse(text);
      } catch (e1) {
        json = { code: -1, message: text };
      }
      results.push({
        phone: r.phone,
        studentName: r.studentName,
        success: json.code === 0,
        message: json.message || text || ''
      });
    } catch (err2) {
      results.push({
        phone: r.phone,
        studentName: r.studentName,
        success: false,
        message: String(err2 && err2.message ? err2.message : err2)
      });
    }
  }
  return results;
}

/** 시트 1행 헤더 기준 열 번호(1부터). loadStudents 직전에 ensureOverdueColumns_(sheet) 호출 권장 */
function getColByHeader_(sheet, headerName) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idx = headers.indexOf(headerName);
  if (idx === -1) throw new Error('컬럼 없음: ' + headerName);
  return idx + 1;
}

function ensureOverdueColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  ['msg_overdue', 'done_overdue'].forEach(function(name) {
    if (headers.indexOf(name) === -1) {
      var newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(name);
      headers.push(name);
    }
  });
}

/**
 * loadStudents에서 학생 객체에 합치기: var o = v7_studentOverduePatch_(headers, rowValues); Object.assign(student, o);
 */
function v7_studentOverduePatch_(headers, rowArr) {
  var mi = headers.indexOf('msg_overdue');
  var di = headers.indexOf('done_overdue');
  return {
    msgOverdue: mi >= 0 ? (rowArr[mi] || '') : '',
    doneOverdue: di >= 0 ? !!rowArr[di] : false
  };
}

function v7_studentSheet_(isTest) {
  if (typeof getStudentSheet_ !== 'function') {
    throw new Error('getStudentSheet_ 함수를 메인 프로젝트에 정의하고 v7과 합치세요.');
  }
  return getStudentSheet_(isTest);
}

function v7_saveMessage(row, text, msgType, isTest) {
  var sheet = v7_studentSheet_(isTest);
  ensureOverdueColumns_(sheet);
  var t = msgType || 'feedback';
  if (t === 'overdue') {
    sheet.getRange(row, getColByHeader_(sheet, 'msg_overdue')).setValue(text);
  } else {
    sheet.getRange(row, getColByHeader_(sheet, 'msg')).setValue(text);
  }
}

function v7_markDone(row, text, msgType, isTest) {
  var sheet = v7_studentSheet_(isTest);
  ensureOverdueColumns_(sheet);
  var t = msgType || 'feedback';
  if (t === 'overdue') {
    sheet.getRange(row, getColByHeader_(sheet, 'msg_overdue')).setValue(text);
    sheet.getRange(row, getColByHeader_(sheet, 'done_overdue')).setValue(true);
  } else {
    sheet.getRange(row, getColByHeader_(sheet, 'msg')).setValue(text);
    sheet.getRange(row, getColByHeader_(sheet, 'done')).setValue(true);
  }
}

function v7_undoDone(row, msgType, isTest) {
  var sheet = v7_studentSheet_(isTest);
  ensureOverdueColumns_(sheet);
  var t = msgType || 'feedback';
  if (t === 'overdue') {
    sheet.getRange(row, getColByHeader_(sheet, 'done_overdue')).setValue('');
  } else {
    sheet.getRange(row, getColByHeader_(sheet, 'done')).setValue('');
  }
}
