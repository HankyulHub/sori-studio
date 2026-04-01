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
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) })).setMimeType(ContentService.MimeType.JSON);
  }
  return null;
}
