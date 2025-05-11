/* @refresh reload */
import './index.css'
import { render } from 'solid-js/web'

import App from './root/App'

render(() => <App />, document.getElementById('root') as HTMLElement)
