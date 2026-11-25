import { Link } from 'react-router-dom'
import { Icon } from './Icon'

/** Acceso a la importación del resumen de tarjeta desde otras pantallas. */
export function ImportLink({ label = 'Importar resumen' }: { label?: string }) {
  return (
    <Link to="/app/importar" className="btn btn--small btn--ghost">
      <Icon name="upload" size={16} />
      {label}
    </Link>
  )
}
