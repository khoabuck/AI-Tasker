import { Outlet } from 'react-router-dom'

export default function ExpertLayout() {
  return (
    <div>
      <aside>Expert Menu</aside>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
