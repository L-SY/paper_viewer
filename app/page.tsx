import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { students } from "@/lib/demo-data";

export default function Home() {
  return (
    <AppShell>
      <header className="page-header">
        <div>
          <div className="eyebrow">E3 LAB / 月度总览 <span className="demo-tag">演示</span></div>
          <h1>2026年7月</h1>
          <p>论文截止 7月31日 23:59 · 距离截止还有 10 天</p>
        </div>
        <div className="header-actions">
          <button className="button button-secondary" type="button">
            导出月度档案
          </button>
          <button className="button button-primary" type="button">
            管理本月设置
          </button>
        </div>
      </header>

      <section className="month-bar" aria-label="本月流程与统计">
        <div className="month-stage"><span>当前</span><strong>月末论文提交</strong></div>
        <ol className="simple-flow"><li className="done">计划</li><li className="active">论文</li><li>AI评阅</li><li>导师评语</li></ol>
        <dl className="inline-metrics"><div><dt>已提交</dt><dd>8</dd></div><div><dt>待评语</dt><dd>2</dd></div><div><dt>未提交</dt><dd>4</dd></div><div><dt>AI均分</dt><dd>8.1</dd></div></dl>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <h2>学生进度</h2>
            <p>每名学生每月一条记录，所有 PDF 版本均保留。</p>
          </div>
          <div className="segmented" aria-label="进度筛选">
            <button className="selected" type="button">全部 12</button>
            <button type="button">待处理 6</button>
            <button type="button">已完成 6</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>学生</th>
                <th>月初计划</th>
                <th>论文版本</th>
                <th>AI 评阅</th>
                <th>导师评分</th>
                <th>状态</th>
                <th><span className="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="person-cell">
                      <span className="avatar">{student.initials}</span>
                      <div><strong>{student.name}</strong><small>{student.topic}</small></div>
                    </div>
                  </td>
                  <td><span className={student.planDone ? "check-text" : "muted-text"}>{student.planDone ? "已填写" : "未填写"}</span></td>
                  <td className="mono">{student.version ? `v${student.version}` : "—"}</td>
                  <td>{student.aiScore ? <strong className="score">{student.aiScore.toFixed(1)}</strong> : <span className="muted-text">—</span>}</td>
                  <td>{student.mentorScore ? <strong className="score">{student.mentorScore.toFixed(1)}</strong> : <span className="muted-text">—</span>}</td>
                  <td><StatusPill status={student.status} /></td>
                  <td className="action-cell">
                    {student.id === "chen-yuhang" ? (
                      <Link className="text-link" href={`/papers/${student.id}`}>查看评阅</Link>
                    ) : (
                      <button className="text-link" type="button">查看记录</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="content-section compact-section">
        <div className="section-heading"><div><h2>需要处理</h2><p>2 篇论文等待导师评语，4 名学生尚未提交。</p></div><button className="text-link" type="button">查看全部</button></div>
      </section>
    </AppShell>
  );
}
