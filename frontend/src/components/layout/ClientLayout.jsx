import { Outlet } from 'react-router-dom'

export default function ClientLayout() {
  return (
    <div>
      <aside>Client Menu</aside>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
