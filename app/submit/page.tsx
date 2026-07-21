import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "我的提交" };

export default function SubmitPage() {
  return (
    <AppShell>
      <header className="page-header">
        <div><div className="eyebrow">MY SUBMISSION / 2026.07</div><h1>本月计划与论文</h1><p>一个月只建立一条记录；修改论文时会保留此前的 PDF 版本和评阅结果。</p></div>
        <div className="header-actions"><button className="button button-secondary" type="button">补交往期</button><button className="button button-primary" type="button">保存本月记录</button></div>
      </header>
      <section className="notice-bar"><span className="notice-dot" /><span>本月论文截止：7月31日 23:59。当前版本仅演示交互结构，配置 Supabase 后启用真实上传。</span></section>
      <div className="form-layout">
        <div>
          <section className="form-section">
            <label className="field-label" htmlFor="plan">月初计划 <small>已于 7月4日 21:06 提交，可继续补充</small></label>
            <textarea id="plan" className="text-area" defaultValue="1. 完成接触状态估计流程的仿真基线；\n2. 对比运动学残差、电机电流与两者融合三种方案；\n3. 记录失败场景并分析误差来源。" />
          </section>
          <section className="form-section">
            <div className="field-label"><span>论文 PDF</span><small>仅 PDF · 最大 30 MB · 最多 40 页</small></div>
            <label className="upload-zone" htmlFor="paper-upload">
              <input id="paper-upload" type="file" accept="application/pdf" />
              <span className="upload-icon">PDF</span>
              <strong>拖入文件或点击选择</strong>
              <span>上传新文件将生成 v3，不会覆盖 v1、v2</span>
            </label>
          </section>
          <section className="form-section">
            <div className="field-label"><span>往期引用</span><small>可选，用于说明本月工作和历史记录的关系</small></div>
            <button className="button button-secondary" type="button">＋ 关联一篇往期论文</button>
          </section>
        </div>
        <aside>
          <section className="aside-card"><h3>AI 评阅额度</h3><p>成功生成结果才消耗一次额度；API 调用失败不计数。</p><div className="quota"><span className="used" /><span className="used" /><span /></div><p><strong>已使用 2 / 3 次</strong><br />当前正式版本：v2</p><button className="button button-primary" type="button" disabled>上传新版本后重新评阅</button></section>
          <section className="aside-card"><h3>历史版本</h3><ol className="version-list"><li><span>v2</span><div><strong>当前正式版本 · 已完成评阅</strong><small>7月20日 22:14 · 3.8 MB · 12页</small></div></li><li><span>v1</span><div><strong>初次提交 · 已保留 AI 结果</strong><small>7月18日 19:42 · 3.4 MB · 11页</small></div></li></ol></section>
          <section className="aside-card"><h3>谁可以看到？</h3><p>本课题组内所有在读成员和导师都可以查看 PDF、AI 评阅与导师评语；组外人员不可访问。</p></section>
        </aside>
      </div>
    </AppShell>
  );
}
