import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ReviewRadar } from "@/components/review-radar";
import { reviewDimensions } from "@/lib/review-dimensions";

export const metadata: Metadata = { title: "论文评阅" };

export default async function PaperReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return (
    <AppShell>
      <nav className="breadcrumb" aria-label="面包屑">
        <Link href="/">本月总览</Link><span>/</span><span>陈雨航</span><span>/</span><strong>论文评阅</strong>
      </nav>
      <header className="page-header">
        <div>
          <div className="eyebrow">2026.07 / VERSION 2</div>
          <h1>面向轮腿机器人的接触状态估计方法探索</h1>
          <p>陈雨航 · 2026年7月月度论文 · 7月20日 22:14 提交</p>
        </div>
        <div className="header-actions">
          <button className="button button-secondary" type="button">下载原始 PDF</button>
          <button className="button button-primary" type="button">导出评阅报告</button>
        </div>
      </header>

      <div className="paper-layout">
        <section className="paper-panel" aria-label="PDF 在线预览">
          <div className="panel-toolbar">
            <div><strong>monthly-paper-v2.pdf</strong><span>12 pages · 3.8 MB</span></div>
            <div><button className="icon-button" type="button">−</button><span>100%</span><button className="icon-button" type="button">＋</button></div>
          </div>
          <div className="pdf-stage">
            <article className="pdf-page">
              <h2>面向轮腿机器人的接触状态估计方法探索</h2>
              <div className="authors">Yuhang Chen · E3 Laboratory</div>
              <h3>Abstract</h3>
              <p>针对轮腿机器人在非结构化地形中接触状态难以稳定估计的问题，本月工作构建了一套基于足端运动残差与电机电流信息的轻量估计流程，并在仿真环境中完成初步消融验证。实验没有证明该方法已具备跨地形泛化能力，但揭示了两类传感信息在不同落足阶段的互补关系。</p>
              <h3>I. Introduction</h3>
              <p>可靠的接触状态是全身控制与状态估计的重要输入。现有阈值法依赖人工调参，在地形刚度与速度变化时容易产生误判。本月研究的目标不是提出完整的新算法，而是回答一个更小的问题：组合运动学残差和电机电流能否降低单一阈值的误检率？</p>
              <div className="figure-placeholder">Fig. 1. Contact estimation pipeline and experimental setup</div>
              <h3>II. Method</h3>
              <p>方法包含时间对齐、特征归一化、候选接触窗口检测与置信度融合四个步骤。为区分融合策略本身的作用，实验保留了仅运动残差和仅电流阈值两组基线。</p>
              <h3>III. Preliminary Results</h3>
              <p>在三组仿真步态中，融合方法降低了高速步态下的误检，但慢速软地面场景没有稳定改善。该结果说明当前特征仍可能受到关节摩擦模型误差影响。</p>
            </article>
          </div>
        </section>

        <section className="review-panel" aria-label="评阅详情">
          <div className="review-header">
            <div className="review-header-top">
              <div><h2>AI 六维评阅</h2><p>依据统一月度科研评阅规范生成，导师评分独立保留。</p></div>
              <div className="review-total"><strong>8.2</strong><small>六维平均 / 10</small></div>
            </div>
            <div className="review-meta"><span>MODEL: GPT-5.2</span><span>PROMPT: v0.3.1</span><span>RUBRIC: v1.0</span><span>RUN: 2/3</span></div>
          </div>
          <div className="review-tabs"><span className="active">综合评阅</span><span>证据记录</span><span>原始输出</span></div>
          <div className="review-body">
            <div className="radar-and-scores">
              <div className="radar-wrap"><ReviewRadar /></div>
              <div className="score-list">
                {reviewDimensions.map((dimension) => (
                  <div className="dimension-row" key={dimension.key}>
                    <label>{dimension.name}</label><strong>{dimension.score.toFixed(1)}</strong>
                    <div><span style={{ width: `${dimension.score * 10}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="review-block">
              <h3><span />做得好的地方</h3>
              <ul>
                <li>研究问题收敛到可在一个月内验证的小问题，目标、基线和判断标准基本对应。<span className="citation">p.1</span></li>
                <li>如实报告软地面场景未获得稳定改善，并提出可能的摩擦模型影响，没有把局部结果过度包装成成功。<span className="citation">p.7–8</span></li>
              </ul>
            </div>
            <div className="review-block warning">
              <h3><span />主要不足与下一步</h3>
              <p>目前只报告汇总误检率，缺少每个场景的样本量、方差或置信区间，因此“高速步态改善”的稳健程度仍不清楚。建议下月优先补齐逐场景统计，并明确软地面实验中摩擦参数的设置范围。<span className="citation">p.6–9</span></p>
            </div>
            <div className="mentor-box">
              <header><strong>导师评分与评语</strong><span>8.5 / 10</span></header>
              <p>这个月的问题拆得比较合适，也敢于保留没有改善的结果。下个月先不要急着扩展网络结构，把软地面下的误差来源拆清楚；建议补一个真实平台上的小规模对照。</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
