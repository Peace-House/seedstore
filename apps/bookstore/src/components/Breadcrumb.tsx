import { Link, useLocation, useParams } from 'react-router-dom'

interface Crumb {
  label: string
  path: string
}

interface BreadcrumbRoute {
  label: string
  path?: string
}

interface BreadcrumbProps {
  routes?: BreadcrumbRoute[]
}

const routeMap: Record<string, string> = {
  '': 'Home',
  auth: 'Auth',
  cart: 'Cart',
  library: 'Library',
  admin: 'Admin',
  book: 'Book',
  reader: 'Reader',
  category: 'Category',
}

const Breadcrumb = ({ routes }: BreadcrumbProps) => {
  const location = useLocation()
  const params = useParams()
  const pathnames = location.pathname.split('/').filter(Boolean)

  if (routes && routes.length > 0) {
    return (
      <nav className="mb-4 text-sm" aria-label="Breadcrumb">
        <ol className="text-muted-foreground flex items-center gap-2">
          {routes.map((route, idx) => (
            <li
              key={idx + '-' + route.label}
              className="flex items-center gap-2"
            >
              {idx > 0 ? <span>/</span> : null}
              {route.path && idx !== routes.length - 1 ? (
                <Link to={route.path} className="text-primary hover:underline">
                  {route.label}
                </Link>
              ) : (
                <span className="text-foreground font-semibold">
                  {route.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    )
  }

  let path = ''
  const crumbs: Crumb[] = pathnames.map((segment, idx) => {
    path += '/' + segment
    let label = routeMap[segment] || segment
    // For dynamic routes
    if (segment === 'book' && params.id) {
      label = 'Book Details'
      // Mark as non-link for book details
      return { label, path: '' }
    }
    if (segment === 'reader' && params.bookId) label = 'Reader'
    return { label, path }
  })

  return (
    <nav className="mb-4 text-sm" aria-label="Breadcrumb">
      <ol className="text-muted-foreground flex items-center gap-2">
        <li>
          <Link to="/" className="text-primary hover:underline">
            Home
          </Link>
        </li>
        {crumbs.map((crumb, idx) => (
          <li key={idx + '-' + crumb.label} className="flex items-center gap-2">
            <span>/</span>
            {crumb.path && idx !== crumbs.length - 1 ? (
              <Link to={crumb.path} className="text-primary hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground font-semibold">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb
