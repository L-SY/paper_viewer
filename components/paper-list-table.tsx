import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import type { PaperListRow } from "@/lib/paper-list";

export function PaperListTable({
  rows,
  showMonth = false,
  showStudent = true,
}: {
  rows: PaperListRow[];
  showMonth?: boolean;
  showStudent?: boolean;
}) {
  if (!rows.length) return <p className="empty-copy">暂无论文。</p>;

  return (
    <div className="table-wrap">
      <table className="data-table paper-list-table">
        <thead>
          <tr>
            {showMonth && <th>月份</th>}
            {showStudent && <th>学生</th>}
            <th>论文</th>
            <th>版本</th>
            <th>AI</th>
            <th>导师</th>
            <th>状态</th>
            <th><span className="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.id}-${row.month}`}>
              {showMonth && <td className="mono">{row.month.replace("-", ".")}</td>}
              {showStudent && <td>{row.student}</td>}
              <td>
                <div className="paper-list-title">
                  <strong>{row.title}</strong>
                  {row.summary && <small>{row.summary}</small>}
                </div>
              </td>
              <td className="mono">v{row.version}</td>
              <td className="score">{row.aiScore == null ? row.aiReviewed ? "已评阅" : "—" : row.aiScore.toFixed(1)}</td>
              <td className="score">{row.teacherScore == null ? "—" : row.teacherScore.toFixed(1)}</td>
              <td><StatusPill status={row.status} /></td>
              <td className="action-cell"><Link className="text-link" href={`/papers/${row.id}`}>查看</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
