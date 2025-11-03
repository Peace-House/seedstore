import { Link, useLocation, useParams } from 'react-router-dom';

interface Crumb {
  label: string;
  path: string;
}

const routeMap: Record<string, string> = {
  '': 'Home',
  'auth': 'Auth',
  'cart': 'Cart',
  'library': 'Library',
  'admin': 'Admin',
  'book': 'Book',
  'reader': 'Reader',
  'category': 'Category',
};

const Breadcrumb = () => {
  const location = useLocation();
  const params = useParams();
  const pathnames = location.pathname.split('/').filter(Boolean);

  let path = '';
  const crumbs: Crumb[] = pathnames.map((segment, idx) => {
    path += '/' + segment;
    let label = routeMap[segment] || segment;
    // For dynamic routes
    if (segment === 'book' && params.id) {
      label = 'Book Details';
      // Mark as non-link for book details
      return { label, path: '' };
    }
    if (segment === 'reader' && params.bookId) label = 'Reader';
    return { label, path };
  });

  return (
    <nav className="text-sm mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-muted-foreground">
        <li>
          <Link to="/" className="hover:underline text-primary">Home</Link>
        </li>
        {crumbs.map((crumb, idx) => (
          <li key={idx + '-' + crumb.label} className="flex items-center gap-2">
            <span>/</span>
            {crumb.path && idx !== crumbs.length - 1 ? (
              <Link to={crumb.path} className="hover:underline text-primary">{crumb.label}</Link>
            ) : (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
