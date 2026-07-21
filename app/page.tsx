import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { students } from "@/lib/demo-data";

export default function Home() {
  return (
    <AppShell>
      <header className="page-header">
        <div>
          <div className="eyebrow">E3 LAB / 2026.07</div>
          <h1>本月评阅总览</h1>
          <p>集中查看计划、论文提交、AI 评阅和导师反馈进度。</p>
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

      <section className="notice-bar" aria-label="演示模式说明">
        <span className="notice-dot" />
        <span>
          当前为界面原型，展示的是演示数据。接入 Supabase 后会自动切换为课题组真实数据。
        </span>
      </section>

      <section className="cycle-strip" aria-label="本月流程">
        <div className="cycle-current">
          <span className="cycle-label">当前阶段</span>
          <strong>月末论文提交</strong>
          <span>截止 7月31日 23:59</span>
        </div>
        <div className="cycle-steps">
          <div className="cycle-step complete"><span>1</span><div><strong>月初计划</strong><small>7月5日截止</small></div></div>
          <div className="cycle-line complete" />
          <div className="cycle-step active"><span>2</span><div><strong>月末论文</strong><small>正在进行</small></div></div>
          <div className="cycle-line" />
          <div className="cycle-step"><span>3</span><div><strong>AI 评阅</strong><small>最多 3 次</small></div></div>
          <div className="cycle-line" />
          <div className="cycle-step"><span>4</span><div><strong>导师评语</strong><small>独立评分</small></div></div>
        </div>
      </section>

      <section className="metric-row" aria-label="提交统计">
        <div><span>组内学生</span><strong>12</strong><small>在读成员</small></div>
        <div><span>已提交</span><strong>8</strong><small>含 2 份待评语</small></div>
        <div><span>待提交</span><strong>4</strong><small>距离截止 10 天</small></div>
        <div><span>本月均分</span><strong>8.1</strong><small>AI 六维平均</small></div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <h2>学生进度</h2>
            <p>一名学生每月对应一条记录，历史补交与多个 PDF 版本均保留。</p>
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

      <div className="dashboard-lower">
        <section className="content-section compact-section">
          <div className="section-heading"><div><h2>待办事项</h2><p>按处理优先级排列。</p></div></div>
          <div className="task-list">
            <div><span className="task-mark orange" /><div><strong>2 篇论文等待导师评语</strong><small>完成评语后，本月记录将自动归档。</small></div><button className="text-link" type="button">去评阅</button></div>
            <div><span className="task-mark blue" /><div><strong>4 名学生尚未提交论文</strong><small>系统会在截止前 3 天自动发送邮件提醒。</small></div><button className="text-link" type="button">查看名单</button></div>
          </div>
        </section>
        <section className="content-section compact-section">
          <div className="section-heading"><div><h2>本月设置</h2><p>由导师统一管理。</p></div></div>
          <dl className="settings-list">
            <div><dt>计划截止</dt><dd className="mono">07-05 23:59</dd></div>
            <div><dt>论文截止</dt><dd className="mono">07-31 23:59</dd></div>
            <div><dt>AI 评阅上限</dt><dd>每人 3 次</dd></div>
            <div><dt>可见范围</dt><dd>组内公开</dd></div>
          </dl>
        </section>
      </div>
    </AppShell>
  );
}
