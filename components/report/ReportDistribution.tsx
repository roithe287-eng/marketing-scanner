import React from 'react';

export type DistributionGroup = {
  id: string;
  label: string;
  count: number;
  tone: 'good' | 'attention' | 'action' | 'review' | 'neutral';
};

type Props = {
  title: string;
  groups: DistributionGroup[];
  selection: string | null;
  onSelect: (id: string | null) => void;
  controls: string;
  unit?: string;
};

export default function ReportDistribution({title, groups, selection, onSelect, controls, unit='개'}: Props) {
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  if (!total) return null;
  const selected = groups.find(group => group.id === selection);
  return <figure className="report-distribution">
    <figcaption>
      <strong>{title}</strong>
      <span role="status">{selected ? `${selected.label} ${selected.count}${unit} 표시` : `전체 ${total}${unit}`}</span>
      {selected && <button type="button" aria-controls={controls} onClick={() => onSelect(null)}>전체 보기</button>}
    </figcaption>
    <div className="report-distribution-track" aria-hidden="true">
      {groups.filter(group => group.count > 0).map(group => <i key={group.id}
        data-tone={group.tone} data-muted={!!selected && selected.id !== group.id}
        style={{width: `${group.count / total * 100}%`}}/>)}
    </div>
    <div className="report-distribution-key" style={{'--group-columns':groups.length} as React.CSSProperties} role="group" aria-label={title + ' 필터'}>
      {groups.map(group => <button type="button" key={group.id} data-state={group.id} data-tone={group.tone}
        aria-pressed={group.id === selection} aria-controls={controls} disabled={group.count === 0}
        onClick={() => onSelect(group.id === selection ? null : group.id)}>
        <span className="report-distribution-label"><i aria-hidden="true"/>{group.label}</span>
        <strong>{group.count}<small>{unit}</small></strong>
      </button>)}
    </div>
  </figure>;
}
