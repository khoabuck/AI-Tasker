import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <div>
      <header>AITasker</header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
