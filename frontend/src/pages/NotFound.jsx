import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="container not-found__inner">
        <p className="not-found__code">404</p>
        <h1 className="not-found__title">Page Not Found</h1>
        <p className="not-found__desc">
          The page you&apos;re looking for has wandered off. Let&apos;s bring you back.
        </p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn-primary">Back to Home</Link>
          <Link to="/shop" className="btn btn-secondary">Shop Collection</Link>
        </div>
      </div>
    </div>
  );
}
