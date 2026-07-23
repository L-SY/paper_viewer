"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function GroupSettingsForm({ groupId, planDay, planTime, paperTime }: { groupId: string | null; planDay: number; planTime: string; paperTime: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !groupId) return setState("error");
    const form = new FormData(event.currentTarget);
    setState("saving");
    const { error } = await supabase.from("groups").update({ plan_deadline_day: Number(form.get("planDay")), plan_deadline_time: String(form.get("planTime")), paper_deadline_rule: "last_day", paper_deadline_time: String(form.get("paperTime")) }).eq("id", groupId);
    setState(error ? "error" : "saved");
  }
  return <form className="group-settings-form" onSubmit={submit}><label>计划截止日<input className="text-input" name="planDay" type="number" min="1" max="28" defaultValue={planDay} /></label><label>计划截止时间<input className="text-input mono" name="planTime" type="time" defaultValue={planTime} /></label><label>论文截止日<input className="text-input" value="每月最后一天" readOnly /></label><label>论文截止时间<input className="text-input mono" name="paperTime" type="time" defaultValue={paperTime} /></label><div><button className="button button-primary" type="submit" disabled={state === "saving"}>{state === "saving" ? "保存中…" : "保存规则"}</button>{state === "saved" && <span className="save-state success">已保存</span>}{state === "error" && <span className="save-state error">保存失败</span>}</div></form>;
}
