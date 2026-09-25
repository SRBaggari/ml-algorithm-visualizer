import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <EmptyState icon="alert" title="Page not found">
      This page does not exist.{' '}
      <Link to="/" className="link">
        Go back to the dashboard
      </Link>
      .
    </EmptyState>
  );
}
