import Icon from './Icon.jsx';
import { buildReport, downloadReport } from '../utils/report.js';

/** "Download report" as JSON or plain text. `getReport` returns the report fields, or null if not ready. */
export default function ReportButton({ getReport, disabled }) {
  const save = (format) => {
    const fields = getReport();
    if (fields) downloadReport(buildReport(fields), format);
  };
  return (
    <div className="btn-group" role="group" aria-label="Download report">
      <button type="button" className="btn btn--secondary btn--sm" onClick={() => save('json')} disabled={disabled} title="Download the parameters and results as JSON">
        <Icon name="download" size={14} /> Report .json
      </button>
      <button type="button" className="btn btn--secondary btn--sm" onClick={() => save('txt')} disabled={disabled} title="Download a plain-text report">
        .txt
      </button>
    </div>
  );
}
