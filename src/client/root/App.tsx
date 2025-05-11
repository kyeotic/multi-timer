import { ErrorBoundary, JSX, ParentProps } from 'solid-js'
import { MODAL_ROOT_ID } from '../components/Modal/Modal'
import { Toaster } from 'solid-toast'

import NavBar from './NavBar'
import { Routes } from './routes'

export default function Root() {
  return <Routes root={App} />
}

export function App(props: ParentProps): JSX.Element {
  return (
    <ErrorBoundary fallback={(err) => err}>
      <div class="w-full flex flex-col min-h-screen max-h-screen">
        <main class="w-full max-h-full p-4 grow overflow-scroll flex flex-col">
          {props.children}
        </main>
        {/* <Footer /> */}
        <Toaster position="bottom-right" />
        <div id={MODAL_ROOT_ID} />
      </div>
    </ErrorBoundary>
  )
}
