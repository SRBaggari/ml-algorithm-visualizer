import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import StepController from '../components/StepController.jsx';
import LearningPanel from '../components/LearningPanel.jsx';
import ExplainStep from '../components/ExplainStep.jsx';
import { splitStep } from '../data/stepExplanations.js';
import { BarChart } from '../components/MiniCharts.jsx';
import { getTopic } from '../data/learningContent.js';
import MetricsCard from '../components/MetricsCard.jsx';
import { Card, Explain, Legend, PageHeader, Segmented } from '../components/ui.jsx';
import { useStepPlayer } from '../hooks/useStepPlayer.js';
import { useElementSize } from '../hooks/useElementSize.js';
import { useApp } from '../context/AppContext.jsx';
import { STUDENTS } from '../data/datasets.js';
import { trainTestSplit, validateTestPercent } from '../utils/split.js';
import { randomSeed } from '../utils/random.js';

const RATIOS = [
  { value: 0.3, label: '70 / 30' },
  { value: 0.25, label: '75 / 25' },
  { value: 0.2, label: '80 / 20' },
  { value: 'custom', label: 'Custom' },
];


const STEPS = [
  { id: 'original', title: 'Original dataset (in file order)', short: 'Original', description: 'Every student record, in the order it appears in the file.' },
  { id: 'shuffle', title: 'Shuffle the rows randomly', short: 'Shuffle', description: 'Randomising the order prevents the file order from biasing the split.' },
  { id: 'split', title: 'Move samples into training and testing sets', short: 'Split', description: 'The first part of the shuffled list becomes training data; the rest is held back for testing.' },
  { id: 'counts', title: 'Final counts', short: 'Counts', description: 'Check the sizes of both sets.' },
];

const CARD_W = 46;
const CARD_H = 34;
const GAP = 7;

function gridPositions(order, width, top = 0, left = 0) {
  const cols = Math.max(1, Math.floor((width + GAP) / (CARD_W + GAP)));
  const used = Math.min(cols, order.length) * (CARD_W + GAP) - GAP;
  const offset = left + Math.max(0, (width - used) / 2);
  const pos = {};
  order.forEach((item, i) => {
    pos[item.id] = { x: offset + (i % cols) * (CARD_W + GAP), y: top + Math.floor(i / cols) * (CARD_H + GAP) };
  });
  const rows = Math.ceil(order.length / cols);
  return { pos, height: rows * (CARD_H + GAP) - GAP };
}

export default function TrainTestSplit() {
  const { logActivity } = useApp();
  const [testRatio, setTestRatio] = useState(0.2);
  const [ratioChoice, setRatioChoice] = useState(0.2);
  const [customPct, setCustomPct] = useState('20');
  const ratioError = ratioChoice === 'custom' ? validateTestPercent(customPct) : null;
  const [seed, setSeed] = useState(42);
  const [started, setStarted] = useState(false);
  const player = useStepPlayer(STEPS.length, { interval: 1700 });
  // 0 until measured, so cards are never laid out for a guessed width.
  const [stageRef, { width }] = useElementSize(0);

  const split = useMemo(() => trainTestSplit(STUDENTS, testRatio, seed), [testRatio, seed]);
  const phase = started ? STEPS[player.step].id : 'original';
  const trainIds = useMemo(() => new Set(split.train.map((s) => s.id)), [split]);

  // Compute target positions for every card for the current phase.
  const layout = useMemo(() => {
    const W = width;
    if (phase === 'original' || phase === 'shuffle') {
      const order = phase === 'original' ? STUDENTS : split.shuffled;
      const g = gridPositions(order, W, 8);
      return { pos: g.pos, height: g.height + 16, zones: null };
    }
    const stacked = W < 560;
    const pad = 12;
    const labelH = 30;
    if (stacked) {
      const tr = gridPositions(split.train, W - pad * 2, labelH + pad, pad);
      const teTop = tr.height + labelH + pad * 3;
      const te = gridPositions(split.test, W - pad * 2, teTop + labelH + pad, pad);
      return {
        pos: { ...tr.pos, ...te.pos },
        height: teTop + labelH + te.height + pad * 2,
        zones: [
          { key: 'train', x: 0, y: 0, w: W, h: tr.height + labelH + pad * 2 },
          { key: 'test', x: 0, y: teTop, w: W, h: te.height + labelH + pad * 2 },
        ],
      };
    }
    const zoneGap = 16;
    const trainW = Math.max(CARD_W * 2, (W - zoneGap) * (1 - testRatio));
    const testW = W - zoneGap - trainW;
    const tr = gridPositions(split.train, trainW - pad * 2, labelH + pad, pad);
    const te = gridPositions(split.test, testW - pad * 2, labelH + pad, trainW + zoneGap + pad);
    const h = Math.max(tr.height, te.height) + labelH + pad * 2;
    return {
      pos: { ...tr.pos, ...te.pos },
      height: h,
      zones: [
        { key: 'train', x: 0, y: 0, w: trainW, h },
        { key: 'test', x: trainW + zoneGap, y: 0, w: testW, h },
      ],
    };
  }, [phase, width, split, testRatio]);

  function runSplit() {
    setStarted(true);
    player.start(0, true);
    logActivity(`Split data ${Math.round((1 - testRatio) * 100)}/${Math.round(testRatio * 100)}`, '/train-test-split', 'split');
  }

  const trainPct = Math.round((1 - testRatio) * 100);
  const testPct = Math.round(testRatio * 100);
  const splitShown = started && player.step >= 2;
  const balance = ['Pass', 'Fail'].map((r) => ({
    name: r,
    Training: split.train.filter((s) => s.result === r).length,
    Testing: split.test.filter((s) => s.result === r).length,
  }));

  return (
    <div className="page">
      <PageHeader
        icon="split"
        eyebrow="Data"
        title="Train / Test Split"
        subtitle="Hide part of the data from the model so we can check how well it handles examples it has never seen."
      />

      <Card>
        <div className="toolbar">
          <div className="field field--inline">
            <span className="field__label">Split ratio (train / test)</span>
            <Segmented
              options={RATIOS}
              value={ratioChoice}
              onChange={(v) => {
                setRatioChoice(v);
                if (v !== 'custom') setTestRatio(v);
                else if (!validateTestPercent(customPct)) setTestRatio(Number(customPct) / 100);
              }}
              label="Split ratio"
            />
            {ratioChoice === 'custom' && (
              <label className="field field--inline">
                <span className="field__label">Test %</span>
                <input
                  type="number"
                  min={5}
                  max={50}
                  step={1}
                  className="input--narrow"
                  value={customPct}
                  aria-invalid={Boolean(ratioError)}
                  aria-describedby="ratio-error"
                  onChange={(e) => {
                    setCustomPct(e.target.value);
                    if (!validateTestPercent(e.target.value)) setTestRatio(Number(e.target.value) / 100);
                  }}
                />
              </label>
            )}
          </div>
          <div className="toolbar__spacer" />
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setSeed(randomSeed());
              if (started) player.start(1, false);
            }}
            title="Use a different random shuffle"
          >
            <Icon name="shuffle" size={16} /> New shuffle
          </button>
          <button type="button" className="btn btn--primary" onClick={runSplit} disabled={Boolean(ratioError)}>
            <Icon name="split" size={16} /> Split Dataset
          </button>
        </div>
        {ratioError && (
          <p className="error-text" id="ratio-error" role="alert">
            {ratioError}
          </p>
        )}
        <StepController player={player} steps={STEPS} disabled={!started} emptyText="Press “Split Dataset” to start" />
      </Card>

      <div className="stats-grid">
        <MetricsCard label="Total samples" value={STUDENTS.length} icon={<Icon name="table" size={16} />} footer={<span className="muted">student records</span>} />
        <MetricsCard
          label="Training samples"
          value={splitShown ? split.trainSize : null}
          tone="accent"
          footer={splitShown ? <span>{trainPct}% of the data</span> : <span className="muted">Press Split Dataset</span>}
        />
        <MetricsCard
          label="Testing samples"
          value={splitShown ? split.testSize : null}
          tone="warn"
          footer={splitShown ? <span>{testPct}% of the data</span> : <span className="muted">Press Split Dataset</span>}
          hint="Test size = ceil(total × test ratio), the same rule scikit-learn uses. With 24 samples and 20% that is ceil(4.8) = 5."
        />
      </div>

      <Card
        title={started ? STEPS[player.step].title : 'Student performance dataset'}
        icon="layers"
        actions={<Legend items={[{ label: 'Pass ✓', color: 'var(--s3)' }, { label: 'Fail ✗', color: 'var(--s5)' }]} />}
      >
        <div className="split-stage" ref={stageRef} style={{ height: layout.height }}>
          {layout.zones?.map((z) => (
            <div
              key={z.key}
              className={`split-zone split-zone--${z.key}`}
              style={{ transform: `translate(${z.x}px, ${z.y}px)`, width: z.w, height: z.h }}
            >
              <span className="split-zone__label">
                {z.key === 'train' ? `Training set · ${trainPct}% · ${split.trainSize}` : `Testing set · ${testPct}% · ${split.testSize}`}
              </span>
            </div>
          ))}
          {width > 0 && STUDENTS.map((s, i) => {
            const p = layout.pos[s.id] || { x: 0, y: 0 };
            const inTest = splitShown && !trainIds.has(s.id);
            return (
              <div
                key={s.id}
                className={`sample-card sample-card--${s.result.toLowerCase()} ${inTest ? 'is-test' : ''}`}
                style={{ transform: `translate(${p.x}px, ${p.y}px)`, transitionDelay: `${(i % 12) * 18}ms` }}
                title={`${s.id}: ${s.hours} h studied, ${s.attendance}% attendance, score ${s.score} (${s.result})`}
              >
                {s.id}
                <span className="sample-card__mark" aria-hidden="true">
                  {s.result === 'Pass' ? '✓' : '✗'}
                </span>
              </div>
            );
          })}
        </div>
        {phase === 'counts' && (
          <div className="count-banner">
            <div>
              <span className="count-banner__big">Training Data: {trainPct}%</span>
              <span className="muted">{split.trainSize} samples used to learn</span>
            </div>
            <div>
              <span className="count-banner__big">Testing Data: {testPct}%</span>
              <span className="muted">{split.testSize} samples kept hidden for evaluation</span>
            </div>
          </div>
        )}
      </Card>

      <ExplainStep
        explanation={splitStep(phase, { total: STUDENTS.length, trainSize: split.trainSize, testSize: split.testSize, trainPct, testPct })}
        stepLabel={started ? `Step ${player.step + 1} of ${STEPS.length}` : 'Not started'}
      />

      <div className="grid-2">
        <Card title="Why do we split data?" icon="book">
          <div className="why-grid">
            <div>
              <strong>Training set</strong>
              <p>The model studies these examples and adjusts its parameters to fit them - like practice questions.</p>
            </div>
            <div>
              <strong>Testing set</strong>
              <p>Held back until the end, like a final exam with new questions. It shows how the model does on unseen data.</p>
            </div>
            <div>
              <strong>Catch overfitting</strong>
              <p>A model that memorises training data scores highly there but poorly on the test set. Splitting reveals this.</p>
            </div>
            <div>
              <strong>Why shuffle first?</strong>
              <p>Files are often sorted. Shuffling makes both sets representative instead of, say, all top students ending up in one set.</p>
            </div>
          </div>
        </Card>
        <Card title="Class balance in each set" icon="compare" subtitle={splitShown ? 'Pass / Fail counts after the split' : 'Shown after the split'}>
          {splitShown ? (
            <BarChart
              ariaLabel="Pass and fail counts in the training and testing sets"
              groups={balance.map((b) => ({ label: b.name, values: [{ key: 'train', value: b.Training }, { key: 'test', value: b.Testing }] }))}
              series={[
                { key: 'train', label: 'Training', color: 'var(--accent)' },
                { key: 'test', label: 'Testing', color: 'var(--warn)' },
              ]}
            />
          ) : (
            <p className="muted">Press “Split Dataset” to see how many Pass and Fail students landed in each set.</p>
          )}
        </Card>
      </div>

      {splitShown && (
        <div className="grid-2">
          <SampleTable title={`Training samples (${split.trainSize})`} rows={split.train} />
          <SampleTable title={`Testing samples (${split.testSize})`} rows={split.test} />
        </div>
      )}

      <Explain>
        A common choice is 80/20: the model learns from 80% of the rows and is graded on the other 20%. More training data usually helps the model learn;
        more test data gives a more reliable grade. The split is random, so press “New shuffle” to see that different rows end up in each set.
      </Explain>

      <LearningPanel topic={getTopic('train-test-split')} compact />
    </div>
  );
}

function SampleTable({ title, rows }) {
  return (
    <Card title={title} icon="table">
      <div className="table-wrap table-wrap--scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Hours</th>
              <th scope="col">Attendance</th>
              <th scope="col">Score</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.hours}</td>
                <td>{s.attendance}%</td>
                <td>{s.score}</td>
                <td>
                  <span className={`badge badge--${s.result === 'Pass' ? 'green' : 'red'}`}>{s.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
