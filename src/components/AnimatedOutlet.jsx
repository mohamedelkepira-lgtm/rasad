import { useLocation, useOutlet } from 'react-router-dom'

export default function AnimatedOutlet() {
  const outlet = useOutlet()
  const location = useLocation()

  return (
    <div key={location.pathname} className="page-anim page-anim-in">
      {outlet}
    </div>
  )
}
