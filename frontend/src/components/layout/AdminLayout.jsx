import { Outlet } from 'react-router-dom'

export default function AdminLayout() {
  return (
    <div>
      <aside>Admin Menu</aside>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
