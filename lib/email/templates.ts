function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function frame(content: string) {
  return `<!doctype html><html><body style="margin:0;background:#f7f7f5;color:#37352f;font-family:Arial,'Microsoft YaHei',sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 22px"><div style="font-size:18px;font-weight:700;margin-bottom:26px">PaperView</div><div style="background:#fff;border:1px solid #e3e3e0;border-radius:6px;padding:28px">${content}</div><p style="margin:18px 0 0;color:#a6a5a2;font-size:11px">这是一封课题组事务邮件，请勿回复。</p></div></body></html>`;
}

export function invitationEmail(input: { groupName: string; inviterName: string; inviteUrl: string }) {
  const group = escapeHtml(input.groupName);
  const inviter = escapeHtml(input.inviterName);
  const url = escapeHtml(input.inviteUrl);
  return { subject: `${inviter} 邀请你加入 ${group}`, text: `${inviter} 邀请你加入 PaperView 课题组「${group}」。请在 7 天内打开：${input.inviteUrl}`, html: frame(`<h1 style="font-size:20px;margin:0 0 12px">加入 ${group}</h1><p style="font-size:14px;line-height:1.7;color:#575550">${inviter} 邀请你加入课题组的月度科研评阅空间。邀请链接 7 天内有效。</p><a href="${url}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#2f2f2f;color:#fff;text-decoration:none;border-radius:5px;font-size:13px">接受邀请</a>`) };
}

export function monthlyReminderEmail(input: { groupName: string; displayName: string; kind: "plan" | "paper"; deadline: string; appUrl: string }) {
  const name = escapeHtml(input.displayName);
  const group = escapeHtml(input.groupName);
  const url = escapeHtml(input.appUrl);
  const item = input.kind === "plan" ? "本月计划" : "本月论文";
  return { subject: `${group}：${item}提交提醒`, text: `${name}，你的${item}尚未提交，截止时间为 ${input.deadline}。打开 PaperView：${input.appUrl}`, html: frame(`<h1 style="font-size:20px;margin:0 0 12px">${item}提交提醒</h1><p style="font-size:14px;line-height:1.7;color:#575550">${name}，你在 ${group} 的${item}尚未提交。</p><p style="font-size:13px;color:#787774">截止时间：${escapeHtml(input.deadline)}</p><a href="${url}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#2f2f2f;color:#fff;text-decoration:none;border-radius:5px;font-size:13px">打开 PaperView</a>`) };
}
