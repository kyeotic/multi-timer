import { Route, Router } from '@solidjs/router'
import { Component, JSX } from 'solid-js'
import IntervalTrainingStopwatch from '../timer/TimerPage'

export const HOME = '/'

export function Routes(props: { root: Component }): JSX.Element {
  return (
    <Router root={props.root}>
      <Route path={HOME} component={IntervalTrainingStopwatch} />
      {/* <Route path={UTIL} component={DataUtilities} /> */}
    </Router>
  )
}
