"use client";

import { useState } from "react";

export function GroupInviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }

  return (
    <div className="invite-code-card">
      <div className="invite-result">
        <input className="text-input mono" readOnly value={code} aria-label="课题组邀请码" />
        <button className="button button-secondary" type="button" onClick={copyCode}>{copied ? "已复制" : "复制"}</button>
      </div>
      <p>学生可在注册时填写，也可注册后再加入。</p>
    </div>
  );
}
