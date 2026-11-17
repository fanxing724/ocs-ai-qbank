function buildMessages(context) {
  const typeMap = {
    single: '单选题',
    multiple: '多选题',
    judgement: '判断题',
    completion: '填空题'
  };
  const t = typeMap[context.type] || '未知题型';

  return [
    {
      role: 'system',
      content: '你是严谨的答题助手。只输出最终答案，不要解释或推理。单选题只输出选项字母（如 A）；多选题输出字母并用 # 连接（如 A#B）；判断题输出 正确 或 错误；填空题直接输出填空内容。'
    },
    {
      role: 'user',
      content: `题型：${t}\n题目：${context.title || ''}\n选项：${context.options || '无'}`
    }
  ];
}

function normalizeFullWidth(text) {
  return text.replace(/[\uFF21-\uFF3A\uFF41-\uFF5A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

function parseAnswer(content, type) {
  let answer = String(content).trim();
  answer = answer.replace(/^```[\w-]*\s*/, '').replace(/```$/, '').trim();
  answer = answer.replace(/^`([^`]+)`$/, '$1').trim();
  answer = answer.replace(/^\*{1,2}([^*]+)\*{1,2}$/, '$1').trim();
  answer = answer.replace(/^(?:答案|answer)\s*[:：]\s*/i, '').trim();
  answer = normalizeFullWidth(answer);

  let letters = answer.toUpperCase();
  if (type === 'single' && /^[A-Z][.。、)）]?$/.test(letters)) {
    return letters[0];
  }

  letters = letters.replace(/[.。!！;；:：]+$/, '').trim();
  if (type === 'multiple' && /^[A-Z]{2,}$/.test(letters)) {
    return letters.split('').join('#');
  }
  if (/^[A-Z](?:[#,，、\s]+[A-Z])+$/.test(letters)) {
    return letters.replace(/[#,，、\s]+/g, '#').replace(/#+/g, '#').replace(/^#|#$/g, '');
  }
  return answer;
}

function extractContent(data) {
  const message = data && data.choices && data.choices[0] && data.choices[0].message;
  if (!message) return '';
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part.text === 'string') return part.text;
      return '';
    }).join('');
  }
  return '';
}

function describeAiStatus(status) {
  if (status === 401 || status === 403) return 'AI 接口鉴权失败，请检查 AI_API_KEY';
  if (status === 429) return 'AI 接口限流，请稍后重试';
  if (status >= 500) return 'AI 接口暂时不可用，请稍后重试';
  return `AI 接口返回 HTTP ${status}`;
}

module.exports = { buildMessages, parseAnswer, extractContent, describeAiStatus };
