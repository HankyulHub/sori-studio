/**
 * SORI v7 — Apps Script에 합치는 조각입니다.
 * doGet 맨 앞: var _v7 = v7_doGet(e, isTest); if (_v7) return _v7;
 * doPost 분기: var _v7 = v7_doPost(JSON.parse(e.postData.contents), isTest); if (_v7) return _v7;
 * (postData 파싱 방식은 기존 프로젝트에 맞게 조정)
 *
 * 필요: loadStudents, loadInvoiceStudents, loadPaymentStatus, getRevenueStats, togglePayment, _gemini
 * 이미 generateKakao / generateNotice를 쓰고 있다면 중복 분기만 제거하고 내용만 합치세요.
 *
 * getRevenueStats(isTest) — 홈 대시보드「전월 대비 n%」는 여기서 내려준 숫자로만 계산됩니다.
 * 반환 예: { current: { total: 1650000 }, previous: { total: 1480000 } }
 * · current.total = 이번 달 매출 장부 합계(앱 매출 장부와 같은 기준)
 * · previous.total = 직전 달 같은 방식 합계(전월이 없으면 생략 가능 — 생략 시 홈에는 % 줄 안 뜸)
 * 대안: 최상위에 prevMonthTotal 숫자만 넣어도 동일하게 동작합니다.
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
    if (action === 'updateStudent') {
      v7_updateStudent(body, isTest);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'generatePaymentTemplates') {
      try {
        if (typeof _gemini !== 'function') throw new Error('_gemini 미정의');
        if (body.single) {
          var toneKey = String(body.tone || 'formal');
          var toneLab = { formal: '정중하고 격식 있는', casual: '캐주얼하고 친근한', short: '짧고 간결한' }[toneKey] || toneKey;
          var avoidArr = [];
          if (body.avoidTexts && body.avoidTexts.length) {
            for (var ai = 0; ai < body.avoidTexts.length; ai++) {
              var ax = String(body.avoidTexts[ai] || '').trim();
              if (ax) avoidArr.push(ax);
            }
          }
          var avoidBlock =
            avoidArr.length > 0
              ? '\n아래 텍스트들과는 다른 표현, 다른 문장 구조, 다른 인사말을 사용해서 새로 작성할 것:\n' +
                avoidArr
                  .map(function (t, i) {
                    return '[' + (i + 1) + '] ' + t;
                  })
                  .join('\n')
              : '';
          var ptxSingle =
            '수납 안내 카카오톡용 메시지 템플릿을 1개만 작성하세요.\n' +
            '톤: ' +
            toneLab +
            '.\n반드시 플레이스홀더 {이름}, {금액}, {월} 을 본문에 모두 포함하고, 중괄호는 그대로 유지(치환 금지).' +
            avoidBlock +
            '\n\nJSON만 출력: {"template":"여기에 한 개의 문자열"}';
          var grS = _gemini(ptxSingle, 0.75, 1200);
          var txtS = grS && grS.text ? String(grS.text).trim() : '';
          var objS = null;
          try {
            objS = JSON.parse(txtS);
          } catch (e0s) {
            var mjS = txtS.match(/\{[\s\S]*\}/);
            if (mjS)
              try {
                objS = JSON.parse(mjS[0]);
              } catch (e1s) {}
          }
          var oneTpl = objS && objS.template ? String(objS.template) : '';
          return ContentService.createTextOutput(JSON.stringify({ ok: true, data: { template: oneTpl } })).setMimeType(ContentService.MimeType.JSON);
        }
        var ptx =
          String(body.prompt || '') +
          '\n\nJSON만 출력: {"formal":"…","casual":"…","short":"…"} — {이름},{금액},{월} 플레이스홀더 필수.';
        var gr = _gemini(ptx, 0.7, 1200);
        var txt = gr && gr.text ? String(gr.text).trim() : '';
        var obj = null;
        try {
          obj = JSON.parse(txt);
        } catch (e0) {
          var mj = txt.match(/\{[\s\S]*\}/);
          if (mj)
            try {
              obj = JSON.parse(mj[0]);
            } catch (e1) {}
        }
        return ContentService.createTextOutput(JSON.stringify({ ok: true, data: obj || {} })).setMimeType(ContentService.MimeType.JSON);
      } catch (ge) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(ge && ge.message ? ge.message : ge) })).setMimeType(ContentService.MimeType.JSON);
      }
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

/** 학생 시트에 level(수강 레벨: 기초/초급/중급/고급) 열이 없으면 추가 */
function ensureLevelColumn_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('level') === -1) {
    var nc = sheet.getLastColumn() + 1;
    sheet.getRange(1, nc).setValue('level');
  }
}

/**
 * updateStudent — 행 번호(body.row) 기준으로 시트 갱신. loadStudents와 동일한 헤더명 사용.
 * level: 직접 입력 시 빈 문자열 저장 가능
 */
function v7_updateStudent(body, isTest) {
  var sheet = v7_studentSheet_(isTest);
  ensureOverdueColumns_(sheet);
  ensureLevelColumn_(sheet);
  var row = parseInt(body.row, 10);
  if (!row || row < 2) throw new Error('잘못된 행 번호');
  var map = [
    ['name', 'name'],
    ['grade', 'grade'],
    ['gender', 'gender'],
    ['phone', 'phone'],
    ['parentName', 'parentName'],
    ['freq', 'freq'],
    ['fee', 'fee'],
    ['memo', 'memo'],
    ['level', 'level']
  ];
  for (var i = 0; i < map.length; i++) {
    var key = map[i][0];
    var header = map[i][1];
    if (body[key] === undefined) continue;
    try {
      var col = getColByHeader_(sheet, header);
      sheet.getRange(row, col).setValue(body[key]);
    } catch (err) {
      if (header === 'level') {
        try {
          var col2 = getColByHeader_(sheet, 'tuition_level');
          sheet.getRange(row, col2).setValue(body[key]);
        } catch (err2) {}
      }
    }
  }
  return true;
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
