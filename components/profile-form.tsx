"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ProfileValues = { displayName: string; discipline: string; researchStage: string };

export function ProfileForm({ values }: { values: ProfileValues }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setState("error");
    setState("saving");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setState("error");
    const { error } = await supabase.from("profiles").update({ display_name: String(form.get("displayName") ?? "").trim(), discipline: String(form.get("discipline") ?? "").trim(), research_stage: String(form.get("researchStage") ?? "exploring") }).eq("id", user.id);
    setState(error ? "error" : "saved");
  }
  return <form className="profile-form" onSubmit={submit}><div className="form-section"><label className="field-label" htmlFor="profile-name">姓名</label><input id="profile-name" className="text-input" name="displayName" defaultValue={values.displayName} maxLength={40} required /></div><div className="form-section"><label className="field-label" htmlFor="profile-discipline">学科或研究方向</label><input id="profile-discipline" className="text-input" name="discipline" defaultValue={values.discipline} maxLength={80} placeholder="例如：机器人" /></div><div className="form-section"><label className="field-label" htmlFor="profile-stage">当前阶段 <small>不会参与 AI 评分</small></label><select id="profile-stage" className="text-input" name="researchStage" defaultValue={values.researchStage}><option value="exploring">探索阶段 / 尚未开题</option><option value="proposal">开题准备</option><option value="research">课题研究中</option><option value="writing">论文写作中</option></select></div><div className="profile-actions"><button className="button button-primary" type="submit" disabled={state === "saving"}>{state === "saving" ? "保存中…" : "保存修改"}</button>{state === "saved" && <span className="save-state success">已保存</span>}{state === "error" && <span className="save-state error">暂时无法保存</span>}</div></form>;
}
